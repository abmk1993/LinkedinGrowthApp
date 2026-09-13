/**
 * Image-editing provider abstraction — pixels in, pixels out.
 *
 * Deliberately separate from AIProvider: that interface is text-out
 * (vision-in at most), and Claude cannot generate or edit images at
 * all. Attire correction is the only caller today.
 */

export interface EditableImage {
  /** Base64-encoded bytes, no data URL prefix. */
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export interface ImageEditProvider {
  edit(instruction: string, image: EditableImage): Promise<EditableImage>;
}
