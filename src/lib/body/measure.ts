"use client";
// On-device body measurement with MediaPipe Pose Landmarker.
// The photo is processed entirely in the browser – only ratios leave the device.
//
// Method:
//  1. Pose landmarks give shoulder (11,12) and hip (23,24) heights + body centre.
//  2. The pose segmentation mask gives the silhouette. For a given image row we
//     take the contiguous "person" run that contains the body centre, which
//     excludes arms held slightly away from the body (A-pose).
//  3. shoulder = width just below the shoulder line, waist = narrowest row in the
//     lower torso, hip = widest row from the hip joints down to ~upper thigh.

import type { PoseLandmarker } from "@mediapipe/tasks-vision";

const VISION_VERSION = "1.2.0";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

async function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "IMAGE",
        numPoses: 1,
        outputSegmentationMasks: true,
      });
    })();
  }
  return landmarkerPromise;
}

export interface FrontalMeasurement {
  shoulder: number;
  waist: number;
  hip: number;
  torso_to_leg: number;
  quality: number; // 0..1 – landmark visibility
  warnings: string[];
}

export async function measureFromImage(img: HTMLImageElement): Promise<FrontalMeasurement> {
  const landmarker = await getLandmarker();
  const result = landmarker.detect(img);
  const lm = result.landmarks[0];
  const mask = result.segmentationMasks?.[0];
  if (!lm || !mask) throw new Error("No person detected. Use a well-lit, full-body, front-facing photo.");

  const W = mask.width;
  const H = mask.height;
  const data = mask.getAsFloat32Array();
  mask.close();

  const warnings: string[] = [];
  const key = [11, 12, 23, 24, 27, 28];
  const quality = key.reduce((a, i) => a + (lm[i]?.visibility ?? 0), 0) / key.length;
  if (quality < 0.6) warnings.push("Some joints are hard to see – stand fully in frame with ankles visible.");
  const shoulderTilt = Math.abs(lm[11].y - lm[12].y);
  if (shoulderTilt > 0.03) warnings.push("Shoulders look tilted – stand straight, facing the camera.");

  const shoulderY = ((lm[11].y + lm[12].y) / 2) * H;
  const hipY = ((lm[23].y + lm[24].y) / 2) * H;
  const ankleY = ((lm[27].y + lm[28].y) / 2) * H;
  const centerX = ((lm[11].x + lm[12].x + lm[23].x + lm[24].x) / 4) * W;
  const torso = hipY - shoulderY;
  if (torso <= 10) throw new Error("Couldn't find your torso. Try a photo taken from further away.");

  const rowWidth = (y: number): number => {
    const row = Math.round(Math.max(0, Math.min(H - 1, y)));
    const cx = Math.round(Math.max(0, Math.min(W - 1, centerX)));
    const on = (x: number) => data[row * W + x] > 0.5;
    if (!on(cx)) return 0;
    let l = cx;
    let r = cx;
    while (l > 0 && on(l - 1)) l--;
    while (r < W - 1 && on(r + 1)) r++;
    return r - l + 1;
  };
  const scan = (from: number, to: number, pick: (a: number, b: number) => number) => {
    let best = rowWidth(from);
    const step = Math.max(1, Math.round((to - from) / 30));
    for (let y = from; y <= to; y += step) {
      const w = rowWidth(y);
      if (w > 0) best = pick(best, w);
    }
    return best;
  };

  const shoulder = scan(shoulderY + torso * 0.05, shoulderY + torso * 0.12, Math.max);
  const waist = scan(shoulderY + torso * 0.45, hipY - torso * 0.1, (a, b) => (a === 0 ? b : Math.min(a, b)));
  const hip = scan(hipY - torso * 0.05, hipY + torso * 0.25, Math.max);
  if (!shoulder || !waist || !hip) throw new Error("Couldn't read your silhouette. Try a plain background and fitted clothing.");
  if (hip > shoulder * 1.6) warnings.push("Arms may be touching your sides – hold them slightly away from your body.");

  return { shoulder, waist, hip, torso_to_leg: torso / Math.max(1, ankleY - hipY), quality, warnings };
}
