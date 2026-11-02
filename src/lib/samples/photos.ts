// Real sample photos, filled in by `npm run samples:photos` (see
// scripts/fetch-sample-photos.ts). Until it has been run, the app falls back
// to the built-in illustrations.

import manifest from "./photo-manifest.json";

export interface SamplePhoto {
  path: string; // "/samples/photos/wardrobe/white-oxford-shirt.jpg"
  photographer: string;
  source_url: string; // photo page, for attribution
}

type Manifest = { source: string; wardrobe: Record<string, SamplePhoto>; quiz: Record<string, SamplePhoto> };
const M = manifest as Manifest;

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function wardrobePhoto(subcategory: string): SamplePhoto | null {
  return M.wardrobe[slug(subcategory)] ?? null;
}

export function quizPhoto(lookId: string): SamplePhoto | null {
  return M.quiz[lookId] ?? null;
}

export const photoSource = () => M.source;
