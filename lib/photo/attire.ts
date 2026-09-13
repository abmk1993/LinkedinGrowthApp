import type { ImageEditProvider } from "../ai/imageEditProvider";

/**
 * Generative attire replacement — the one correction sharp cannot do,
 * since it means inventing pixels rather than transforming them.
 *
 * The instruction is written to pin down everything except clothing.
 * Identity drift (a subtly different face coming back) is the main
 * failure mode of this kind of edit, and the wording below is what
 * keeps it in check.
 */
export async function replaceAttire(
  provider: ImageEditProvider,
  imageBuffer: Buffer,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  industry: string
): Promise<Buffer> {
  const instruction = [
    `Edit this professional headshot for someone working in ${industry}.`,
    "Replace ONLY the clothing with business-casual professional attire appropriate for that industry — for example a collared shirt, blouse, knit, or blazer.",
    "Keep everything else pixel-identical: the person's face, facial features, expression, skin tone, hair, glasses, head position and angle, body pose, shoulders, framing, lighting, and the background.",
    "Do not slim, reshape, retouch, or beautify the person. Do not change their apparent age, gender presentation, or ethnicity.",
    "The result must be a photorealistic photograph that the same person would recognise as themselves, not an illustration.",
  ].join(" ");

  const edited = await provider.edit(instruction, {
    base64: imageBuffer.toString("base64"),
    mediaType,
  });

  return Buffer.from(edited.base64, "base64");
}
