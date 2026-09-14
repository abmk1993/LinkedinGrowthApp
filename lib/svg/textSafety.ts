/**
 * Shared helpers for building safe SVG text that sharp/librsvg will
 * actually render within bounds. Extracted from lib/banner/generate.ts
 * (see the comment there for the story): SVG's own textLength/lengthAdjust
 * is NOT reliably honored by librsvg — over-budget text still overflowed
 * in testing even with it set — so a clipPath is the real guarantee,
 * since it's standard rasterization rather than text layout.
 */

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

export function clippedRow(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath>`;
}
