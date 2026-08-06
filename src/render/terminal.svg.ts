import { SIZES, TERMINAL_LINES } from "../config.js";
import { card, type CardContext } from "./theme.js";
import { circle, n, rect, text } from "./svg.js";

const FONT_SIZE = 13.5;
/** Advance width of one glyph in a monospace face, as a fraction of font size. */
const CHAR_RATIO = 0.6;
const LINE_HEIGHT = 24;
const PANEL_X = 16;
const PANEL_Y = 44;
const TEXT_X = 36;
const FIRST_BASELINE = 72;

interface Line {
  kind: "prompt" | "output";
  content: string;
}

function layoutLines(): Line[] {
  const lines: Line[] = [];

  for (const entry of TERMINAL_LINES) {
    lines.push({ kind: "prompt", content: entry.prompt });
    for (const output of entry.output) lines.push({ kind: "output", content: output });
  }

  return lines;
}

/**
 * Animated terminal header.
 *
 * Replaces the third-party typing-SVG service. The typing effect is a solid rectangle in the
 * panel colour that slides off each line in character-sized steps — CSS transforms are the
 * only animation primitive that survives being loaded through an `<img>` tag, which is how
 * GitHub renders README images (scripts and SMIL are unreliable there, transforms are not).
 */
export function renderTerminal(ctx: CardContext): string {
  const { palette } = ctx;
  const width = SIZES.cardWidth;
  const height = SIZES.terminalHeight;
  const lines = layoutLines();

  const panelHeight = height - PANEL_Y - 16;
  const charWidth = FONT_SIZE * CHAR_RATIO;

  const parts: string[] = [];
  const css: string[] = [];

  // Title bar: window dots and the shell label.
  parts.push(circle(28, 26, 5, "#FF5F57", 0.9));
  parts.push(circle(46, 26, 5, "#FEBC2E", 0.9));
  parts.push(circle(64, 26, 5, "#28C840", 0.9));
  parts.push(
    text("gerard@profile: ~", {
      x: width / 2,
      y: 30,
      fill: palette.muted,
      size: 12,
      anchor: "middle",
    }),
  );

  parts.push(
    rect({
      x: PANEL_X,
      y: PANEL_Y,
      width: width - PANEL_X * 2,
      height: panelHeight,
      rx: 8,
      fill: palette.panel,
    }),
  );

  // Covers are collected separately and drawn last, inside a clip of the panel: once a
  // line is revealed the cover has slid past the panel's right edge, and unclipped it
  // would show as a panel-coloured block sitting on the card background.
  const covers: string[] = [];
  let delay = 0.35;

  lines.forEach((line, index) => {
    const baseline = FIRST_BASELINE + index * LINE_HEIGHT;
    const rendered = line.kind === "prompt" ? `❯ ${line.content}` : line.content;
    const columns = rendered.length;
    const lineWidth = columns * charWidth + 2;

    if (line.kind === "prompt") {
      parts.push(text("❯", { x: TEXT_X, y: baseline, fill: palette.green, size: FONT_SIZE, weight: 700 }));
      parts.push(
        text(line.content, {
          x: TEXT_X + charWidth * 2,
          y: baseline,
          fill: palette.text,
          size: FONT_SIZE,
          weight: 600,
        }),
      );
    } else {
      parts.push(
        text(line.content, { x: TEXT_X, y: baseline, fill: palette.muted, size: FONT_SIZE }),
      );
    }

    // A cover rectangle in the panel colour slides right to reveal the line.
    //
    // Its resting position is the *revealed* one, and the keyframe runs backwards from
    // "covering". That ordering matters: if animations never run — reduced motion, a
    // throttled background tab, a renderer that ignores CSS in SVG, someone screenshotting
    // the card — the fallback is fully readable text rather than a blank panel. Animating
    // from covered to revealed would make "no animation" mean "no content".
    const duration = Math.max(0.25, columns * 0.028);
    const id = `t${index}`;

    covers.push(
      rect({
        x: TEXT_X - 2,
        y: baseline - FONT_SIZE,
        width: lineWidth,
        height: LINE_HEIGHT,
        fill: palette.panel,
        className: id,
      }),
    );

    css.push(
      `.${id}{transform:translateX(${n(lineWidth)}px);` +
        `animation:type-${id} ${n(duration)}s steps(${columns}) ${n(delay)}s backwards}` +
        `@keyframes type-${id}{from{transform:translateX(0)}}`,
    );

    // A pause after the last line of each command block, so the two blocks read as two
    // separate things you ran rather than one wall of text.
    const isBlockEnd = lines[index + 1]?.kind === "prompt";
    delay += duration + (isBlockEnd ? 0.45 : 0.08);
  });

  // Trailing prompt with a cursor that keeps blinking once the transcript finishes.
  const cursorBaseline = FIRST_BASELINE + lines.length * LINE_HEIGHT;
  parts.push(
    text("❯", { x: TEXT_X, y: cursorBaseline, fill: palette.green, size: FONT_SIZE, weight: 700 }),
  );
  parts.push(
    rect({
      x: TEXT_X + charWidth * 2,
      y: cursorBaseline - FONT_SIZE + 2,
      width: charWidth,
      height: FONT_SIZE,
      fill: palette.accent,
      className: "cursor",
    }),
  );
  css.push(
    `.cursor{animation:blink 1.1s steps(1) ${n(delay)}s infinite}` +
      "@keyframes blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}",
  );

  // Respect the OS setting. Cancelling the animations is enough — every element's resting
  // state is already the finished transcript.
  css.push(
    "@media (prefers-reduced-motion:reduce){" +
      [...lines.map((_, index) => `.t${index}`), ".cursor"].join(",") +
      "{animation:none}}",
  );

  parts.push(`<g clip-path="url(#panelClip)">${covers.join("")}</g>`);

  return card(
    {
      palette,
      height,
      label: "Terminal transcript: whoami and principles for Gerard Loriz",
      css: css.join(""),
      defs:
        `<clipPath id="panelClip">${rect({
          x: PANEL_X,
          y: PANEL_Y,
          width: width - PANEL_X * 2,
          height: panelHeight,
          rx: 8,
          fill: "none",
        })}</clipPath>`,
    },
    parts.join(""),
  );
}
