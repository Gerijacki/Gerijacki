import { SIZES } from "../config.js";
import type { LanguageShare } from "../data/languages.js";
import { card, type CardContext } from "./theme.js";
import { circle, n, rect, text, truncate } from "./svg.js";

const BAR_Y = 64;
const BAR_HEIGHT = 16;
const LEGEND_TOP = 110;
const LEGEND_ROW = 26;
const LEGEND_COLUMNS = 3;

/**
 * Language mix across owned repositories.
 *
 * Segments are clipped to a rounded rectangle so the bar keeps its pill shape without each
 * segment needing its own corner geometry.
 */
export function renderLanguages(ctx: CardContext, languages: LanguageShare[]): string {
  const { palette } = ctx;
  const width = SIZES.cardWidth;
  const height = SIZES.languagesHeight;
  const left = SIZES.pad;
  const barWidth = width - SIZES.pad * 2;

  const parts: string[] = [];

  parts.push(rect({ x: left, y: BAR_Y, width: barWidth, height: BAR_HEIGHT, rx: BAR_HEIGHT / 2, fill: palette.grid }));

  if (languages.length > 0) {
    const segments: string[] = [];
    let cursor = left;

    for (const language of languages) {
      const segmentWidth = (language.percent / 100) * barWidth;
      segments.push(
        rect({ x: cursor, y: BAR_Y, width: segmentWidth, height: BAR_HEIGHT, fill: language.color }),
      );
      cursor += segmentWidth;
    }

    parts.push(
      `<clipPath id="barClip"><rect ${[
        `x="${n(left)}"`,
        `y="${n(BAR_Y)}"`,
        `width="${n(barWidth)}"`,
        `height="${n(BAR_HEIGHT)}"`,
        `rx="${n(BAR_HEIGHT / 2)}"`,
      ].join(" ")} /></clipPath>`,
      `<g clip-path="url(#barClip)">${segments.join("")}</g>`,
    );
  }

  const columnWidth = barWidth / LEGEND_COLUMNS;

  languages.forEach((language, index) => {
    const column = index % LEGEND_COLUMNS;
    const row = Math.floor(index / LEGEND_COLUMNS);
    const x = left + column * columnWidth;
    const y = LEGEND_TOP + row * LEGEND_ROW;

    parts.push(circle(x + 6, y - 4, 5, language.color));
    parts.push(
      text(truncate(language.name, 18), { x: x + 20, y, fill: palette.text, size: 12.5 }),
      text(`${language.percent.toFixed(1)}%`, {
        x: x + columnWidth - 24,
        y,
        fill: palette.muted,
        size: 12.5,
        anchor: "end",
      }),
    );
  });

  const leader = languages[0];

  return card(
    {
      palette,
      height,
      title: "LANGUAGE MIX",
      meta: leader ? `${leader.name} leads at ${leader.percent.toFixed(1)}%` : "no data",
      label: languages.length
        ? `Language mix: ${languages.map((l) => `${l.name} ${l.percent}%`).join(", ")}`
        : "Language mix: no data",
    },
    parts.join(""),
  );
}
