import "server-only";
import { randomUUID } from "node:crypto";
import type { NewImage, Repository } from "./repository";
import { DEMO_USER_ID, seedItems, seedLogs, seedProfile } from "./seed";
import type { StyleGap } from "../engine/gaps";
import type { RankedProduct } from "../shopping/types";
import type { GarmentAttributes, OutfitLog, Profile, WardrobeItem, Weather } from "../types";

// In-memory store for DEMO mode (no Supabase configured). Survives hot reloads
// via globalThis, resets on server restart. Single shared demo user.
interface DemoState {
  profile: Profile;
  items: WardrobeItem[];
  logs: OutfitLog[];
  gaps: { gap: StyleGap; products: RankedProduct[] }[];
  swipes: { occasion: string; item_ids: string[]; decision: "accept" | "reject"; round: number; at: string }[];
}

const g = globalThis as unknown as { __smartstylistDemo?: DemoState };
function state(): DemoState {
  if (!g.__smartstylistDemo) {
    const items = seedItems();
    g.__smartstylistDemo = { profile: seedProfile(), items, logs: seedLogs(items), gaps: [], swipes: [] };
  }
  return g.__smartstylistDemo;
}

export class DemoRepository implements Repository {
  readonly mode = "demo" as const;
  readonly userId = DEMO_USER_ID;

  async getProfile() {
    return structuredClone(state().profile);
  }
  async updateProfile(patch: Partial<Omit<Profile, "id">>) {
    const s = state();
    s.profile = { ...s.profile, ...patch };
    return structuredClone(s.profile);
  }
  async listItems() {
    return structuredClone(state().items);
  }
  async addItem(attrs: GarmentAttributes, image: NewImage | null): Promise<WardrobeItem> {
    const item: WardrobeItem = {
      ...attrs,
      id: randomUUID(),
      user_id: DEMO_USER_ID,
      image_url: image ? `data:${image.contentType};base64,${image.data.toString("base64")}` : null,
      image_path: null,
      wear_count: 0,
      last_worn_at: null,
      in_laundry_since: null,
      created_at: new Date().toISOString(),
    };
    state().items.unshift(item);
    return structuredClone(item);
  }
  async updateItem(id: string, attrs: Partial<GarmentAttributes>) {
    const s = state();
    s.items = s.items.map((i) => (i.id === id ? { ...i, ...attrs } : i));
  }
  async updateItemImage(id: string, image: NewImage) {
    const s = state();
    s.items = s.items.map((i) => (i.id === id ? { ...i, image_url: `data:${image.contentType};base64,${image.data.toString("base64")}` } : i));
  }
  async archiveItem(id: string) {
    const s = state();
    s.items = s.items.filter((i) => i.id !== id);
  }
  async listLogs(sinceDays: number) {
    const since = Date.now() - sinceDays * 86_400_000;
    return structuredClone(state().logs.filter((l) => new Date(l.worn_on).getTime() >= since));
  }
  async addLog(log: { occasion: string; item_ids: string[]; weather: Weather | null; stylist_note: string | null }) {
    const now = new Date();
    const entry: OutfitLog = { ...log, id: randomUUID(), user_id: DEMO_USER_ID, feedback: null, worn_on: now.toISOString().slice(0, 10), created_at: now.toISOString() };
    const s = state();
    s.logs.unshift(entry);
    s.items = s.items.map((i) => (log.item_ids.includes(i.id) ? { ...i, wear_count: i.wear_count + 1, last_worn_at: now.toISOString() } : i));
    return structuredClone(entry);
  }
  async setFeedback(logId: string, rating: number) {
    const s = state();
    s.logs = s.logs.map((l) => (l.id === logId ? { ...l, feedback: rating } : l));
  }
  async saveGap(gap: StyleGap, products: RankedProduct[]) {
    state().gaps.unshift({ gap, products });
  }
  async setLaundry(itemIds: string[], inLaundry: boolean) {
    const s = state();
    const at = inLaundry ? new Date().toISOString() : null;
    s.items = s.items.map((i) => (itemIds.includes(i.id) ? { ...i, in_laundry_since: at } : i));
  }
  async listSwipes(days: number) {
    const since = Date.now() - days * 86_400_000;
    return structuredClone(state().swipes.filter((s) => new Date(s.at).getTime() >= since));
  }
  async recordSwipe(swipe: { occasion: string; item_ids: string[]; decision: "accept" | "reject"; round: number }) {
    state().swipes.unshift({ ...swipe, at: new Date().toISOString() });
  }
}
