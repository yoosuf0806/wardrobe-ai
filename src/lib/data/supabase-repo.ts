import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewImage, Repository } from "./repository";
import type { StyleGap } from "../engine/gaps";
import type { RankedProduct } from "../shopping/types";
import { DEFAULT_FIT_PREFERENCES, type GarmentAttributes, type OutfitLog, type Profile, type WardrobeItem, type Weather } from "../types";

const BUCKET = "wardrobe";
const ITEM_COLUMNS =
  "id,user_id,image_path,category,subcategory,color_hex,color_name,secondary_colors,pattern,fabric_type,fabric_weight,sleeve_length,fit,length,formality,seasonality,waterproof,wear_count,last_worn_at,created_at";

type ItemRow = Omit<WardrobeItem, "image_url">;

export class SupabaseRepository implements Repository {
  readonly mode = "supabase" as const;
  constructor(private db: SupabaseClient, readonly userId: string) {}

  async getProfile(): Promise<Profile> {
    const { data, error } = await this.db.from("profiles").select("*").eq("id", this.userId).maybeSingle();
    if (error) throw error;
    if (!data) {
      const { data: created, error: e2 } = await this.db.from("profiles").insert({ id: this.userId }).select("*").single();
      if (e2) throw e2;
      return toProfile(created);
    }
    return toProfile(data);
  }

  async updateProfile(patch: Partial<Omit<Profile, "id">>): Promise<Profile> {
    const { data, error } = await this.db
      .from("profiles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", this.userId)
      .select("*")
      .single();
    if (error) throw error;
    return toProfile(data);
  }

  async listItems(): Promise<WardrobeItem[]> {
    const { data, error } = await this.db.from("wardrobe_items").select(ITEM_COLUMNS).eq("archived", false).order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as ItemRow[];
    const paths = rows.map((r) => r.image_path).filter((p): p is string => !!p);
    const urls = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await this.db.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
      for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
    }
    return rows.map((r) => ({ ...r, image_url: r.image_path ? urls.get(r.image_path) ?? null : null }));
  }

  async addItem(attrs: GarmentAttributes, image: NewImage | null, embedding: number[] | null, aiRaw: unknown): Promise<WardrobeItem> {
    let image_path: string | null = null;
    if (image) {
      const ext = image.contentType === "image/png" ? "png" : image.contentType === "image/webp" ? "webp" : "jpg";
      image_path = `${this.userId}/${randomUUID()}.${ext}`;
      const { error } = await this.db.storage.from(BUCKET).upload(image_path, image.data, { contentType: image.contentType, upsert: false });
      if (error) throw error;
    }
    const { data, error } = await this.db
      .from("wardrobe_items")
      .insert({
        ...attrs,
        user_id: this.userId,
        image_path,
        item_embedding: embedding ? JSON.stringify(embedding) : null,
        ai_raw: aiRaw ?? null,
      })
      .select(ITEM_COLUMNS)
      .single();
    if (error) throw error;
    let image_url: string | null = null;
    if (image_path) image_url = (await this.db.storage.from(BUCKET).createSignedUrl(image_path, 3600)).data?.signedUrl ?? null;
    return { ...(data as ItemRow), image_url };
  }

  async updateItem(id: string, attrs: Partial<GarmentAttributes>): Promise<void> {
    const { error } = await this.db.from("wardrobe_items").update({ ...attrs, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  }

  async archiveItem(id: string): Promise<void> {
    const { error } = await this.db.from("wardrobe_items").update({ archived: true }).eq("id", id);
    if (error) throw error;
  }

  async listLogs(sinceDays: number): Promise<OutfitLog[]> {
    const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await this.db.from("outfit_logs").select("*").gte("worn_on", since).order("worn_on", { ascending: false });
    if (error) throw error;
    return (data ?? []) as OutfitLog[];
  }

  async addLog(log: { occasion: string; item_ids: string[]; weather: Weather | null; stylist_note: string | null }): Promise<OutfitLog> {
    const { data, error } = await this.db.from("outfit_logs").insert({ ...log, user_id: this.userId }).select("*").single();
    if (error) throw error;
    return data as OutfitLog;
  }

  async setFeedback(logId: string, rating: number): Promise<void> {
    const { error } = await this.db.from("outfit_logs").update({ feedback: rating }).eq("id", logId);
    if (error) throw error;
  }

  async saveGap(gap: StyleGap, products: RankedProduct[]): Promise<void> {
    const { data, error } = await this.db
      .from("style_gaps")
      .insert({ user_id: this.userId, trigger: gap.trigger, occasion: gap.occasion, spec: gap.spec, urgency: gap.urgency })
      .select("id")
      .single();
    if (error) throw error;
    if (products.length) {
      const { error: e2 } = await this.db.from("product_suggestions").insert(
        products.map((p) => ({
          gap_id: data.id,
          user_id: this.userId,
          title: p.title,
          merchant: p.merchant,
          price: p.price,
          currency: p.currency,
          url: p.url,
          image_url: p.image_url,
          score: p.score,
          provider: p.provider,
        })),
      );
      if (e2) throw e2;
    }
  }
}

function toProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    display_name: (row.display_name as string) ?? null,
    body_shape: (row.body_shape as Profile["body_shape"]) ?? null,
    body_shape_source: (row.body_shape_source as Profile["body_shape_source"]) ?? null,
    body_metrics: (row.body_metrics as Profile["body_metrics"]) ?? null,
    fit_preferences: { ...DEFAULT_FIT_PREFERENCES, ...((row.fit_preferences as object) ?? {}) },
    budget: (row.budget as Profile["budget"]) ?? { max_per_item: 150, currency: "USD" },
    department: (row.department as Profile["department"]) ?? "unisex",
  };
}
