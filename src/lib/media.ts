import "server-only";

/** Background removal via remove.bg when configured; otherwise returns the original image. */
export async function removeBackground(image: Buffer): Promise<{ data: Buffer; contentType: string; removed: boolean }> {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) return { data: image, contentType: "image/jpeg", removed: false };
  try {
    const form = new FormData();
    form.append("image_file", new Blob([new Uint8Array(image)]), "garment.jpg");
    form.append("size", "auto");
    form.append("format", "png");
    const res = await fetch("https://api.remove.bg/v1.0/removebg", { method: "POST", headers: { "X-Api-Key": key }, body: form });
    if (!res.ok) throw new Error(`remove.bg ${res.status}`);
    return { data: Buffer.from(await res.arrayBuffer()), contentType: "image/png", removed: true };
  } catch (err) {
    console.error("background removal failed, keeping original", err);
    return { data: image, contentType: "image/jpeg", removed: false };
  }
}

/**
 * Fashion-CLIP image embedding (512-d). Point FASHION_CLIP_ENDPOINT at any
 * service that accepts {image: base64} and returns {embedding: number[]}, e.g. a
 * Hugging Face Inference Endpoint or Modal/Replicate deployment of patrickjohncyh/fashion-clip.
 */
export async function embedImage(image: Buffer): Promise<number[] | null> {
  const url = process.env.FASHION_CLIP_ENDPOINT;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.FASHION_CLIP_TOKEN ? { Authorization: `Bearer ${process.env.FASHION_CLIP_TOKEN}` } : {}) },
      body: JSON.stringify({ image: image.toString("base64") }),
    });
    if (!res.ok) throw new Error(`embedding endpoint ${res.status}`);
    const { embedding } = (await res.json()) as { embedding?: number[] };
    return Array.isArray(embedding) && embedding.length === 512 ? embedding : null;
  } catch (err) {
    console.error("embedding failed", err);
    return null;
  }
}
