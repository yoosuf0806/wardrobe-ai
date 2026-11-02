/**
 * Downloads real photos for the demo wardrobe and the style quiz from Pexels
 * (free API, photos free for commercial use – https://www.pexels.com/license/)
 * and saves them into public/samples/photos + src/lib/samples/photo-manifest.json.
 *
 *   PEXELS_API_KEY=xxxx npm run samples:photos            # fetch missing photos
 *   PEXELS_API_KEY=xxxx npm run samples:photos -- --force # re-fetch everything
 *   ... -- --only quiz | --only wardrobe
 *   ... -- --redo m-camel-coat,white-oxford-shirt         # pick the next result for these
 *
 * Get a free key at https://www.pexels.com/api/ . Run it on any machine with
 * internet, then commit the downloaded images.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { seedPhotoQueries } from "../src/lib/data/seed";
import { slug, type SamplePhoto } from "../src/lib/samples/photos";
import { LOOK_PHOTO_QUERY } from "../src/lib/style/looks";

const API = process.env.PEXELS_API_BASE || "https://api.pexels.com/v1";
const KEY = process.env.PEXELS_API_KEY;
const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "src/lib/samples/photo-manifest.json");
const OUT = path.join(ROOT, "public/samples/photos");

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const redo = new Set((args.includes("--redo") ? args[args.indexOf("--redo") + 1] : "").split(",").filter(Boolean));

interface PexelsPhoto {
  id: number;
  url: string;
  photographer: string;
  src: { large: string; large2x: string; portrait: string; medium: string };
}

type Manifest = { source: string; wardrobe: Record<string, SamplePhoto & { pexels_id?: number }>; quiz: Record<string, SamplePhoto & { pexels_id?: number }> };

async function search(query: string, orientation: "portrait" | "square"): Promise<PexelsPhoto[]> {
  const url = `${API}/search?${new URLSearchParams({ query, per_page: "15", orientation })}`;
  const res = await fetch(url, { headers: { Authorization: KEY! } });
  if (res.status === 429) throw new Error("Pexels rate limit reached – wait an hour and run again (already-downloaded photos are kept).");
  if (!res.ok) throw new Error(`Pexels search failed (${res.status}) for "${query}"`);
  return ((await res.json()) as { photos: PexelsPhoto[] }).photos ?? [];
}

async function download(src: string, file: string) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`download failed (${res.status}) ${src}`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  if (!KEY) {
    console.error("Set PEXELS_API_KEY (free at https://www.pexels.com/api/).");
    process.exit(1);
  }
  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const used = new Set<number>([...Object.values(manifest.wardrobe), ...Object.values(manifest.quiz)].map((p) => p.pexels_id ?? -1));

  const jobs: { group: "wardrobe" | "quiz"; key: string; query: string; orientation: "portrait" | "square"; size: keyof PexelsPhoto["src"] }[] = [];
  if (only !== "quiz") for (const q of seedPhotoQueries()) jobs.push({ group: "wardrobe", key: slug(q.key), query: q.query, orientation: "portrait", size: "large" });
  if (only !== "wardrobe") for (const [id, query] of Object.entries(LOOK_PHOTO_QUERY)) jobs.push({ group: "quiz", key: id, query, orientation: "portrait", size: "portrait" });

  let fetched = 0;
  for (const job of jobs) {
    const existing = manifest[job.group][job.key];
    const again = redo.has(job.key);
    if (existing && !force && !again && existsSync(path.join(ROOT, "public", existing.path))) continue;
    const results = await search(job.query, job.orientation);
    // skip photos already used elsewhere (and the current one when --redo)
    const pick = results.find((p) => !used.has(p.id) && p.id !== existing?.pexels_id);
    if (!pick) {
      console.warn(`  no new result for ${job.group}/${job.key} ("${job.query}") – edit the query and retry`);
      continue;
    }
    const rel = `/samples/photos/${job.group}/${job.key}.jpg`;
    await download(pick.src[job.size], path.join(ROOT, "public", rel));
    used.add(pick.id);
    manifest[job.group][job.key] = { path: rel, photographer: pick.photographer, source_url: pick.url, pexels_id: pick.id };
    fetched++;
    console.log(`  ✓ ${job.group}/${job.key}  ← ${pick.photographer} (${pick.url})`);
    writeFileSync(MANIFEST, JSON.stringify({ ...manifest, source: "Pexels (https://www.pexels.com/license/)" }, null, 2) + "\n");
  }
  console.log(`Done – ${fetched} photo(s) downloaded. Commit public/samples/photos and src/lib/samples/photo-manifest.json.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
