import { SIZES, STACK } from "../config.js";
import { card, type CardContext } from "./theme.js";
import { circle, rect, text } from "./svg.js";

const CHIP_HEIGHT = 28;
const CHIP_GAP = 8;
const ROW_GAP = 14;
const GROUP_GAP = 22;
const LABEL_OFFSET = 14;
const FONT_SIZE = 12.5;
/** Advance width of one glyph, as a fraction of font size, for the fallback sans stack. */
const CHAR_RATIO = 0.58;

function chipWidth(label: string): number {
  return Math.round(label.length * FONT_SIZE * CHAR_RATIO) + 34;
}

/**
 * Height depends on how the chips wrap, so it is computed rather than fixed. Exported so
 * the card and its container agree without one of them guessing.
 */
export function stackHeight(width = SIZES.cardWidth): number {
  const usable = width - SIZES.pad * 2;
  let y = SIZES.pad + 34;

  for (const group of STACK) {
    y += LABEL_OFFSET + 6;
    let cursor = 0;

    for (const item of group.items) {
      const w = chipWidth(item.name);
      if (cursor > 0 && cursor + w > usable) {
        cursor = 0;
        y += CHIP_HEIGHT + ROW_GAP;
      }
      cursor += w + CHIP_GAP;
    }

    y += CHIP_HEIGHT + GROUP_GAP;
  }

  return y - GROUP_GAP + SIZES.pad;
}

/** Grouped technology chips. Replaces the row of shields.io badges. */
export function renderStack(ctx: CardContext): string {
  const { palette } = ctx;
  const width = SIZES.cardWidth;
  const height = stackHeight(width);
  const left = SIZES.pad;
  const usable = width - SIZES.pad * 2;

  const parts: string[] = [];
  let y = SIZES.pad + 34;

  for (const group of STACK) {
    parts.push(
      text(group.group, {
        x: left,
        y: y + LABEL_OFFSET,
        fill: palette.muted,
        size: 10,
        weight: 700,
        letterSpacing: 1.4,
      }),
    );
    y += LABEL_OFFSET + 6;

    let cursor = 0;

    for (const item of group.items) {
      const w = chipWidth(item.name);
      if (cursor > 0 && cursor + w > usable) {
        cursor = 0;
        y += CHIP_HEIGHT + ROW_GAP;
      }

      const x = left + cursor;

      parts.push(
        rect({
          x,
          y,
          width: w,
          height: CHIP_HEIGHT,
          rx: CHIP_HEIGHT / 2,
          fill: item.color,
          opacity: 0.14,
        }),
        rect({
          x: x + 0.5,
          y: y + 0.5,
          width: w - 1,
          height: CHIP_HEIGHT - 1,
          rx: (CHIP_HEIGHT - 1) / 2,
          fill: "none",
          stroke: item.color,
          strokeWidth: 1,
          opacity: 0.45,
        }),
        circle(x + 15, y + CHIP_HEIGHT / 2, 4, item.color),
        text(item.name, {
          x: x + 25,
          y: y + CHIP_HEIGHT / 2 + 4.5,
          fill: palette.text,
          size: FONT_SIZE,
          weight: 500,
        }),
      );

      cursor += w + CHIP_GAP;
    }

    y += CHIP_HEIGHT + GROUP_GAP;
  }

  const total = STACK.reduce((sum, group) => sum + group.items.length, 0);

  return card(
    {
      palette,
      height,
      title: "STACK",
      meta: `${total} tools across ${STACK.length} areas`,
      label: `Stack: ${STACK.map((g) => `${g.group} — ${g.items.map((i) => i.name).join(", ")}`).join("; ")}`,
    },
    parts.join(""),
  );
}

/** Exported for the layout test, which asserts chips wrap inside the card width. */
export const chipWidthFor = chipWidth;
