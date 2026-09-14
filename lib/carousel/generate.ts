import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { escapeXml, truncate, clippedRow } from "../svg/textSafety";
import type { Carousel } from "../ai/agents/carouselAgent";

/**
 * Templated (non-generative) LinkedIn carousel — a "document post" PDF,
 * the native swipeable format LinkedIn currently rewards with meaningfully
 * higher dwell time than a plain text post. Same deterministic sharp/SVG
 * approach as lib/banner/generate.ts: no image-gen API key, no per-slide
 * cost. LinkedIn document posts are commonly built at a 1:1 ratio.
 */

const SLIDE_SIZE = 1080;
const MARGIN = 96;
const CONTENT_WIDTH = SLIDE_SIZE - MARGIN * 2;

export const CAROUSEL_THEMES = ["ink", "paper", "brass"] as const;
export type CarouselTheme = (typeof CAROUSEL_THEMES)[number];

const THEMES: Record<
  CarouselTheme,
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

type Palette = (typeof THEMES)[CarouselTheme];

/** Wraps text into lines that fit CONTENT_WIDTH at the given font size, capped at maxLines. */
function wrapLines(text: string, fontSize: number, maxLines: number): string[] {
  const avgCharWidth = fontSize * 0.56;
  const charsPerLine = Math.max(1, Math.floor(CONTENT_WIDTH / avgCharWidth));
  const words = text.split(/\s+/).filter(Boolean);

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > charsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    const last = lines[maxLines - 1] ?? "";
    lines[maxLines - 1] = truncate(last, Math.max(1, last.length - 1));
  }

  return lines;
}

function renderSlideSvg(
  palette: Palette,
  title: string,
  body: string | undefined,
  slideNumber: number,
  totalSlides: number,
  isCover: boolean
): string {
  const kicker = `${slideNumber}/${totalSlides}`;
  const titleFontSize = isCover ? 64 : 44;
  const titleLines = wrapLines(truncate(title, 140), titleFontSize, isCover ? 5 : 3);
  const bodyLines = body ? wrapLines(truncate(body, 320), 28, 6) : [];

  const titleY = isCover ? SLIDE_SIZE / 2 - titleLines.length * (titleFontSize * 0.6) : MARGIN + 100;
  const titleMarkup = titleLines
    .map((line, i) => {
      const y = titleY + i * (titleFontSize * 1.2);
      const clipId = `titleClip-${slideNumber}-${i}`;
      return `
        ${clippedRow(clipId, MARGIN, y - titleFontSize, CONTENT_WIDTH, titleFontSize * 1.3)}
        <text x="${isCover ? SLIDE_SIZE / 2 : MARGIN}" y="${y}" font-family="Georgia, 'Times New Roman', serif" font-size="${titleFontSize}" font-weight="600" fill="${palette.text}" text-anchor="${isCover ? "middle" : "start"}" clip-path="url(#${clipId})">${escapeXml(line)}</text>
      `;
    })
    .join("");

  const bodyStartY = titleY + titleLines.length * (titleFontSize * 1.2) + 56;
  const bodyMarkup = bodyLines
    .map((line, i) => {
      const y = bodyStartY + i * 40;
      const clipId = `bodyClip-${slideNumber}-${i}`;
      return `
        ${clippedRow(clipId, MARGIN, y - 26, CONTENT_WIDTH, 36)}
        <text x="${MARGIN}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="${palette.subtext}" clip-path="url(#${clipId})">${escapeXml(line)}</text>
      `;
    })
    .join("");

  return `
    <svg width="${SLIDE_SIZE}" height="${SLIDE_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${palette.background}"/>
      <circle cx="${SLIDE_SIZE - 80}" cy="80" r="160" fill="${palette.accentSoft}" opacity="0.3"/>
      ${
        isCover
          ? `<rect x="${SLIDE_SIZE / 2 - 32}" y="${titleY - titleFontSize - 60}" width="64" height="4" fill="${palette.accent}"/>`
          : `<rect x="${MARGIN}" y="${MARGIN + 30}" width="48" height="4" fill="${palette.accent}"/>`
      }
      <text x="${SLIDE_SIZE - MARGIN}" y="${SLIDE_SIZE - 56}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" fill="${palette.subtext}" text-anchor="end">${kicker}</text>
      ${titleMarkup}
      ${bodyMarkup}
    </svg>
  `;
}

async function renderSlidePng(
  palette: Palette,
  title: string,
  body: string | undefined,
  slideNumber: number,
  totalSlides: number,
  isCover: boolean
): Promise<Buffer> {
  const svg = renderSlideSvg(palette, title, body, slideNumber, totalSlides, isCover);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function generateCarouselPdf(
  carousel: Carousel,
  theme: CarouselTheme
): Promise<Buffer> {
  const palette = THEMES[theme];
  const total = carousel.slides.length;

  const pngs = await Promise.all(
    carousel.slides.map((slide, i) =>
      renderSlidePng(palette, slide.title, slide.body, i + 1, total, i === 0)
    )
  );

  const pdfDoc = await PDFDocument.create();
  for (const png of pngs) {
    const image = await pdfDoc.embedPng(png);
    const page = pdfDoc.addPage([SLIDE_SIZE, SLIDE_SIZE]);
    page.drawImage(image, { x: 0, y: 0, width: SLIDE_SIZE, height: SLIDE_SIZE });
  }

  return Buffer.from(await pdfDoc.save());
}
