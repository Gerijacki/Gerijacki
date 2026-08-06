import { MONO, SIZES, THEMES, type Palette, type ThemeName } from "../config.js";
import { esc, rect, text } from "./svg.js";

export interface CardContext {
  theme: ThemeName;
  palette: Palette;
}

export const CARD_CONTEXTS: CardContext[] = (Object.keys(THEMES) as ThemeName[]).map((theme) => ({
  theme,
  palette: THEMES[theme],
}));

export interface CardOptions {
  palette: Palette;
  width?: number;
  height: number;
  /** Small label in the top-left corner. Omit for a card that draws its own header. */
  title?: string;
  /** Muted text in the top-right corner. */
  meta?: string;
  /** Accessible name — this is what a screen reader announces for the image. */
  label: string;
  /** Extra CSS appended inside the card's `<style>` block. */
  css?: string;
  /** Content injected into `<defs>`, e.g. gradients. */
  defs?: string;
}

/**
 * Wraps card content in a complete, standalone SVG document.
 *
 * The card is self-contained by necessity: GitHub proxies these through Camo, which strips
 * scripts and refuses external references, so fonts, styles and gradients all have to live
 * inside the file.
 */
export function card(options: CardOptions, body: string): string {
  const { palette } = options;
  const width = options.width ?? SIZES.cardWidth;
  const pad = SIZES.pad;

  const header = [
    options.title
      ? text(options.title, {
          x: pad,
          y: pad + 14,
          fill: palette.accent,
          size: 13,
          weight: 700,
          letterSpacing: 1.6,
        })
      : "",
    options.meta
      ? text(options.meta, {
          x: width - pad,
          y: pad + 14,
          fill: palette.muted,
          size: 12,
          anchor: "end",
        })
      : "",
  ].join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${options.height}"`,
    ` viewBox="0 0 ${width} ${options.height}" role="img" aria-labelledby="cardTitle" fill="none">`,
    `<title id="cardTitle">${esc(options.label)}</title>`,
    `<style>text{font-family:${MONO};dominant-baseline:auto}${options.css ?? ""}</style>`,
    options.defs ? `<defs>${options.defs}</defs>` : "",
    rect({
      x: 0.5,
      y: 0.5,
      width: width - 1,
      height: options.height - 1,
      rx: SIZES.radius,
      fill: palette.bg,
      stroke: palette.border,
      strokeWidth: 1,
    }),
    header,
    body,
    "</svg>",
  ].join("");
}

/** Vertical gradient used by the activity area fill. */
export function areaGradient(id: string, color: string): string {
  return [
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0%" stop-color="${color}" stop-opacity="0.45"/>`,
    `<stop offset="100%" stop-color="${color}" stop-opacity="0"/>`,
    "</linearGradient>",
  ].join("");
}
