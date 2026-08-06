import { SIZES } from "../config.js";
import { card, type CardContext } from "./theme.js";
import { compact, rect, text } from "./svg.js";

export interface Kpi {
  value: number;
  label: string;
}

const VALUE_BASELINE = 82;
const LABEL_BASELINE = 104;

/** Six-up KPI strip. `meta` carries the traffic figure when the token can read it. */
export function renderStats(ctx: CardContext, kpis: Kpi[], meta: string): string {
  const { palette } = ctx;
  const width = SIZES.cardWidth;
  const height = SIZES.statsHeight;
  const left = SIZES.pad;
  const usable = width - SIZES.pad * 2;
  const columnWidth = usable / Math.max(1, kpis.length);

  const parts: string[] = [];

  kpis.forEach((kpi, index) => {
    const centre = left + columnWidth * (index + 0.5);

    parts.push(
      text(compact(kpi.value), {
        x: centre,
        y: VALUE_BASELINE,
        fill: palette.text,
        size: 26,
        weight: 700,
        anchor: "middle",
      }),
      text(kpi.label, {
        x: centre,
        y: LABEL_BASELINE,
        fill: palette.muted,
        size: 10,
        anchor: "middle",
        letterSpacing: 1.1,
      }),
    );

    if (index > 0) {
      parts.push(
        rect({
          x: left + columnWidth * index,
          y: 56,
          width: 1,
          height: 54,
          fill: palette.border,
        }),
      );
    }
  });

  return card(
    {
      palette,
      height,
      title: "SNAPSHOT",
      meta,
      label: `Profile snapshot: ${kpis.map((kpi) => `${kpi.value} ${kpi.label}`).join(", ")}`,
    },
    parts.join(""),
  );
}
