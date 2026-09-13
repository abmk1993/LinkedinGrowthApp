import sharp from "sharp";
import type { PhotoAudit } from "../ai/agents/photoAuditAgent";

/**
 * Deterministic image corrections driven by the issues array from the
 * Photo Audit Agent. This is plain image processing (sharp), not a
 * generative model — see the dev plan's note on why we don't redraw
 * faces: identity drift risk, cost, and no reliable open model for it.
 *
 * "attire" is handled elsewhere (lib/photo/attire.ts) — clothing
 * changes need generative editing, which sharp cannot do.
 *
 * "background" uses a center-weighted radial mask rather than true
 * subject segmentation (no segmentation model in this stack) — it
 * approximates a portrait-mode blur assuming a roughly centered,
 * head-and-shoulders headshot, which holds for the framing this tool
 * targets.
 */

const FRAME_SIZE = 600;

/** What correctPhoto can act on. "attire" is generative — see lib/photo/attire.ts. */
export const SHARP_CORRECTABLE_ISSUES = [
  "background",
  "lighting",
  "framing",
  "resolution",
] as const;

async function upscaleIfLowRes(buffer: Buffer): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(buffer).metadata();
  const minDimension = Math.min(width, height);
  if (minDimension === 0 || minDimension >= FRAME_SIZE) return buffer;

  const scale = FRAME_SIZE / minDimension;
  return sharp(buffer)
    .resize({
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .toBuffer();
}

async function blurBackground(buffer: Buffer): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(buffer).metadata();
  if (!width || !height) return buffer;

  const maskSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="subject" cx="50%" cy="42%" r="65%">
        <stop offset="55%" stop-color="white" stop-opacity="1"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#subject)"/>
  </svg>`;

  const sharpSubject = await sharp(buffer)
    .ensureAlpha()
    .composite([{ input: Buffer.from(maskSvg), blend: "dest-in" }])
    .png()
    .toBuffer();

  const blurredBackground = await sharp(buffer).blur(24).toBuffer();

  return sharp(blurredBackground)
    .composite([{ input: sharpSubject, blend: "over" }])
    .toBuffer();
}

export async function correctPhoto(
  inputBuffer: Buffer,
  issues: PhotoAudit["issues"]
): Promise<Buffer> {
  let buffer = inputBuffer;

  if (issues.includes("resolution")) {
    buffer = await upscaleIfLowRes(buffer);
  }

  if (issues.includes("framing")) {
    buffer = await sharp(buffer)
      .resize(FRAME_SIZE, FRAME_SIZE, { fit: "cover", position: "attention" })
      .toBuffer();
  }

  if (issues.includes("lighting")) {
    buffer = await sharp(buffer).normalize().modulate({ brightness: 1.08 }).toBuffer();
  }

  if (issues.includes("background")) {
    buffer = await blurBackground(buffer);
  }

  return sharp(buffer).jpeg({ quality: 90 }).toBuffer();
}
