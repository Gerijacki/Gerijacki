import { SIZES } from "../config.js";
import { bucketDays, type ContributionStats } from "../data/contributions.js";
import { areaGradient, card, type CardContext } from "./theme.js";
import { circle, compact, n, path, rect, smoothPath, text, type Point } from "./svg.js";

const BUCKETS = 52;
const CHART_TOP = 62;
const CHART_BOTTOM = 176;
const AXIS_Y = 198;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Contribution activity over the trailing year.
 *
 * Replaces `github-readme-activity-graph.vercel.app`. Days are bucketed into roughly weeks
 * before plotting — 365 points across 800px is noise, and the shape of the year is the
 * only thing this chart is meant to communicate.
 */
export function renderActivity(ctx: CardContext, stats: ContributionStats): string {
  const { palette } = ctx;
  const width = SIZES.cardWidth;
  const height = SIZES.activityHeight;
  const left = SIZES.pad + 8;
  const right = width - SIZES.pad - 8;
  const chartWidth = right - left;
  const chartHeight = CHART_BOTTOM - CHART_TOP;

  const buckets = bucketDays(stats.days, BUCKETS);
  const peak = Math.max(1, ...buckets);

  const points: Point[] = buckets.map((value, index) => ({
    x: left + (buckets.length === 1 ? chartWidth / 2 : (index / (buckets.length - 1)) * chartWidth),
    y: CHART_BOTTOM - (value / peak) * chartHeight,
  }));

  const line = smoothPath(points);
  const area =
    points.length > 0
      ? `${line} L${n(points[points.length - 1]!.x)},${n(CHART_BOTTOM)} L${n(points[0]!.x)},${n(CHART_BOTTOM)} Z`
      : "";

  const parts: string[] = [];

  // Horizontal guides at 0, half and peak. Without them the area has no sense of scale.
  for (const fraction of [0, 0.5, 1]) {
    const y = CHART_BOTTOM - fraction * chartHeight;
    parts.push(
      rect({ x: left, y, width: chartWidth, height: 1, fill: palette.grid }),
      text(compact(Math.round(peak * fraction)), {
        x: left - 6,
        y: y + 4,
        fill: palette.muted,
        size: 10,
        anchor: "end",
        opacity: 0.75,
      }),
    );
  }

  if (area) {
    parts.push(path(area, { fill: "url(#activityFill)" }));
    parts.push(
      path(line, {
        stroke: palette.accent,
        "stroke-width": 2.5,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        fill: "none",
      }),
    );
  }

  // Mark the busiest week so the eye has somewhere to land.
  const peakIndex = buckets.indexOf(peak);
  const peakPoint = points[peakIndex];
  if (peakPoint && peak > 0) {
    parts.push(circle(peakPoint.x, peakPoint.y, 5, palette.bg));
    parts.push(circle(peakPoint.x, peakPoint.y, 3.5, palette.green));
  }

  parts.push(...monthTicks(stats, left, chartWidth, palette.muted));

  return card(
    {
      palette,
      height,
      title: "CONTRIBUTION ACTIVITY",
      meta: `${stats.total.toLocaleString("en-US")} contributions · last 12 months`,
      label: `Contribution activity: ${stats.total} contributions over the last 12 months, peaking at ${peak} in one week`,
      defs: areaGradient("activityFill", palette.accent),
    },
    parts.join(""),
  );
}

/** One label per month, positioned by where that month starts in the day series. */
function monthTicks(
  stats: ContributionStats,
  left: number,
  chartWidth: number,
  color: string,
): string[] {
  const out: string[] = [];
  const span = Math.max(1, stats.days.length - 1);
  let lastMonth = -1;

  stats.days.forEach((day, index) => {
    const month = Number(day.date.slice(5, 7)) - 1;
    if (month === lastMonth) return;
    lastMonth = month;

    const x = left + (index / span) * chartWidth;
    // Drop labels that would collide with the card edge rather than clipping them.
    if (x < left - 4 || x > left + chartWidth - 18) return;

    out.push(text(MONTHS[month]!, { x, y: AXIS_Y, fill: color, size: 10, opacity: 0.8 }));
  });

  return out;
}
