import type { StyleGap } from "../engine/gaps";
import type { RankedProduct } from "../shopping/types";
import type { GarmentAttributes, OutfitLog, Profile, WardrobeItem, Weather } from "../types";

export interface NewImage {
  data: Buffer;
  contentType: string;
}

export interface Repository {
  readonly mode: "supabase" | "demo";
  readonly userId: string;
  getProfile(): Promise<Profile>;
  updateProfile(patch: Partial<Omit<Profile, "id">>): Promise<Profile>;
  listItems(): Promise<WardrobeItem[]>;
  addItem(attrs: GarmentAttributes, image: NewImage | null, embedding: number[] | null, aiRaw: unknown): Promise<WardrobeItem>;
  updateItem(id: string, attrs: Partial<GarmentAttributes>): Promise<void>;
  /** Insert sample pieces whose image is a public static file (e.g. /samples/photos/x.jpg) or none. */
  addSampleItems(items: { attrs: GarmentAttributes; static_image: string | null }[]): Promise<number>;
  archiveItem(id: string): Promise<void>;
  /** Replace an item's photo (and embedding). */
  updateItemImage(id: string, image: NewImage, embedding: number[] | null): Promise<void>;
  listLogs(sinceDays: number): Promise<OutfitLog[]>;
  addLog(log: { occasion: string; item_ids: string[]; weather: Weather | null; stylist_note: string | null }): Promise<OutfitLog>;
  setFeedback(logId: string, rating: number): Promise<void>;
  saveGap(gap: StyleGap, products: RankedProduct[]): Promise<void>;
  /** Put items in / take items out of the laundry. */
  setLaundry(itemIds: string[], inLaundry: boolean): Promise<void>;
  /** Record a swipe decision (training signal for future personalisation). */
  /** Swipe decisions from the last `days` days (cooldown + preference learning). */
  listSwipes(days: number): Promise<{ item_ids: string[]; decision: "accept" | "reject"; at: string }[]>;
  recordSwipe(swipe: { occasion: string; item_ids: string[]; decision: "accept" | "reject"; round: number }): Promise<void>;
}
