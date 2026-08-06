import { SIZES } from "../config.js";
import type { ContributionStats } from "../data/contributions.js";
import type { ContributionDay } from "../github/types.js";
import { card, type CardContext } from "./theme.js";
import { rect, text } from "./svg.js";

const CELL = 12;
const GAP = 2.5;
const STEP = CELL + GAP;
const GRID_X = 60;
const GRID_Y = 62;
const MONTH_LABEL_Y = 56;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Opacity per intensity level, index 0 being an empty day. */
const LEVEL_OPACITY = [0, 0.28, 0.5, 0.75, 1];

/**
 * Thresholds for the four non-empty intensity levels.
 *
 * Quartiles of the *non-zero* days rather than fixed counts: a fixed scale is either all
 * dark or all bright depending on how busy the year was, and says nothing either way.
 */
export function levelThresholds(days: ContributionDay[]): [number, number, number] {
  const active = days
    .map((day) => day.contributionCount)
    .filter((count) => count > 0)
    .sort((a, b) => a - b);

  if (active.length === 0) return [1, 2, 3];

  const at = (fraction: number): number =>
    active[Math.min(active.length - 1, Math.floor(active.length * fraction))]!;

  // Levels must be strictly increasing or several buckets collapse into one shade.
  const q1 = at(0.25);
  const q2 = Math.max(q1 + 1, at(0.5));
  const q3 = Math.max(q2 + 1, at(0.8));

  return [q1, q2, q3];
}

export function levelFor(count: number, thresholds: [number, number, number]): number {
  if (count <= 0) return 0;
  if (count < thresholds[0]) return 1;
  if (count < thresholds[1]) return 2;
  if (count < thresholds[2]) return 3;
  return 4;
}

/**
 * Summary line for the card.
 *
 * The busiest day is what makes a sparse year legible: two streak numbers alone don't say
 * whether the quiet stretches sit next to real bursts of work or nothing at all.
 */
export function heatmapMeta(stats: ContributionStats): string {
  const parts = [`${stats.currentStreak}d streak`, `${stats.longestStreak}d best`];
  const busiest = stats.busiestDay;

  if (busiest && busiest.contributionCount > 0) {
    const day = Number(busiest.date.slice(8, 10));
    const month = MONTHS[Number(busiest.date.slice(5, 7)) - 1]!;
    parts.push(`busiest ${busiest.contributionCount} on ${day} ${month}`);
  }

  return parts.join(" · ");
}

/** Day-by-day contribution calendar, generated locally instead of scraped from a widget. */
export function renderHeatmap(ctx: CardContext, stats: ContributionStats): string {
  const { palette } = ctx;
  const width = SIZES.cardWidth;
  const height = SIZES.heatmapHeight;
  const thresholds = levelThresholds(stats.days);

  const parts: string[] = [];
  const firstWeekday = stats.days[0]?.weekday ?? 0;
  let lastLabelledMonth = -1;

  stats.days.forEach((day, index) => {
    const column = Math.floor((index + firstWeekday) / 7);
    const row = day.weekday;
    const x = GRID_X + column * STEP;
    const y = GRID_Y + row * STEP;
    const level = levelFor(day.contributionCount, thresholds);

    parts.push(
      rect({
        x,
        y,
        width: CELL,
        height: CELL,
        rx: 2.5,
        fill: level === 0 ? palette.grid : palette.accent,
        opacity: level === 0 ? 1 : LEVEL_OPACITY[level]!,
      }),
    );

    // Label a month the first time its 1st falls in a column.
    const month = Number(day.date.slice(5, 7)) - 1;
    if (Number(day.date.slice(8, 10)) <= 7 && month !== lastLabelledMonth) {
      lastLabelledMonth = month;
      parts.push(text(MONTHS[month]!, { x, y: MONTH_LABEL_Y, fill: palette.muted, size: 10, opacity: 0.8 }));
    }
  });

  for (const [row, label] of [
    [1, "Mon"],
    [3, "Wed"],
    [5, "Fri"],
  ] as const) {
    parts.push(
      text(label, {
        x: GRID_X - 8,
        y: GRID_Y + row * STEP + CELL - 2,
        fill: palette.muted,
        size: 10,
        anchor: "end",
        opacity: 0.8,
      }),
    );
  }

  parts.push(...legend(ctx, width - SIZES.pad, height - 18));

  return card(
    {
      palette,
      height,
      title: "COMMIT CALENDAR",
      meta: heatmapMeta(stats),
      label: `Contribution calendar for the last year: ${stats.total} contributions, current streak ${stats.currentStreak} days`,
    },
    parts.join(""),
  );
}

function legend(ctx: CardContext, rightEdge: number, y: number): string[] {
  const { palette } = ctx;
  const swatches = LEVEL_OPACITY.length;
  const legendWidth = swatches * (CELL + 3);
  const startX = rightEdge - legendWidth - 30;
  const out: string[] = [];

  out.push(
    text("less", { x: startX - 6, y: y + CELL - 2, fill: palette.muted, size: 10, anchor: "end", opacity: 0.8 }),
  );

  LEVEL_OPACITY.forEach((opacity, level) => {
    out.push(
      rect({
        x: startX + level * (CELL + 3),
        y,
        width: CELL,
        height: CELL,
        rx: 2.5,
        fill: level === 0 ? palette.grid : palette.accent,
        opacity: level === 0 ? 1 : opacity,
      }),
    );
  });

  out.push(
    text("more", {
      x: startX + legendWidth + 3,
      y: y + CELL - 2,
      fill: palette.muted,
      size: 10,
      opacity: 0.8,
    }),
  );

  return out;
}
