import sharp from "sharp";
import { escapeXml, truncate, clippedRow } from "../svg/textSafety";

/**
 * Templated (non-generative) LinkedIn cover banner, built with sharp from
 * an SVG string — same "deterministic, not generative" approach as
 * lib/photo/correct.ts, so this needs no image-gen API key or cost per
 * generation.
 *
 * Text uses generic system font stacks (Georgia/Arial), not the app's own
 * Fraunces/Inter webfonts — sharp's SVG renderer (librsvg) has no access
 * to those at render time, only to fonts actually installed on the host.
 */

export const BANNER_WIDTH = 1584;
export const BANNER_HEIGHT = 396;

export const BANNER_THEMES = ["ink", "paper", "brass"] as const;
export type BannerTheme = (typeof BANNER_THEMES)[number];

const THEMES: Record<
  BannerTheme,
  { background: string; accent: string; accentSoft: string; text: string; subtext: string }
> = {
  ink: {
    background: "#1B212B",
    accent: "#C6A15C",
    accentSoft: "#3A4353",
    text: "#F7F5F0",
    subtext: "#9AA3B0",
  },
  paper: {
    background: "#F7F5F0",
    accent: "#8A6A2F",
    accentSoft: "#E4E7EC",
    text: "#1B212B",
    subtext: "#5C6675",
  },
  brass: {
    background: "#8A6A2F",
    accent: "#F1E6CC",
    accentSoft: "#A9823D",
    text: "#F7F5F0",
    subtext: "#F1E6CC",
  },
};

export interface BannerContent {
  profession: string;
  industry: string;
  pillars: string[];
}

// LinkedIn overlays the profile photo circle on the bottom-left corner of
// the banner (roughly the bottom ~120px of the leftmost ~260px), so every
// text element stays clear of that zone rather than getting hidden behind it.
const SAFE_LEFT = 300;
const MAX_ROW_WIDTH = BANNER_WIDTH - SAFE_LEFT - 60;

function buildPillarChips(pillars: string[], palette: (typeof THEMES)[BannerTheme]): string {
  const chips = pillars.slice(0, 3).map((pillar) => {
    const label = truncate(pillar, 28);
    return { label, width: Math.min(300, 48 + label.length * 9) };
  });

  let x = SAFE_LEFT;
  const markup: string[] = [];
  for (const chip of chips) {
    if (x + chip.width > SAFE_LEFT + MAX_ROW_WIDTH) break;
    const clipId = `chipClip-${x}`;
    markup.push(`
      ${clippedRow(clipId, x, 262, chip.width, 40)}
      <rect x="${x}" y="262" width="${chip.width}" height="40" rx="20" fill="${palette.accentSoft}" opacity="0.6"/>
      <text x="${x + chip.width / 2}" y="288" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="600" fill="${palette.text}" text-anchor="middle" clip-path="url(#${clipId})">${escapeXml(chip.label)}</text>
    `);
    x += chip.width + 16;
  }
  return markup.join("");
}

export async function generateBanner(
  content: BannerContent,
  theme: BannerTheme
): Promise<Buffer> {
  const palette = THEMES[theme];
  const profession = escapeXml(truncate(content.profession, 40));
  const industry = escapeXml(truncate(content.industry, 70));

  const svg = `
    <svg width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${palette.background}"/>
      <circle cx="${BANNER_WIDTH - 120}" cy="70" r="200" fill="${palette.accentSoft}" opacity="0.35"/>
      <circle cx="${BANNER_WIDTH - 340}" cy="340" r="90" fill="${palette.accent}" opacity="0.18"/>
      <rect x="${SAFE_LEFT}" y="118" width="64" height="4" fill="${palette.accent}"/>
      ${clippedRow("headlineClip", SAFE_LEFT, 140, MAX_ROW_WIDTH, 70)}
      ${clippedRow("subtextClip", SAFE_LEFT, 215, MAX_ROW_WIDTH, 34)}
      <text x="${SAFE_LEFT}" y="196" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="600" fill="${palette.text}" clip-path="url(#headlineClip)">${profession}</text>
      <text x="${SAFE_LEFT}" y="236" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="${palette.subtext}" clip-path="url(#subtextClip)">${industry}</text>
      ${buildPillarChips(content.pillars, palette)}
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
