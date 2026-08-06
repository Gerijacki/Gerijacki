/**
 * Minimal SVG primitives.
 *
 * Everything is emitted as plain strings: a drawing library would add a dependency (and a
 * supply-chain surface) for markup this simple. Numbers go through `n()` so the output is
 * byte-identical between runs — float noise in a coordinate would make the generator look
 * like it changed the card when it didn't, and trigger a commit.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** Escapes text and attribute values. Every string from the API must go through this. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]!);
}

/** Rounds to 2dp and strips a trailing `.0`, so `10` stays `10` rather than `10.00`. */
export function n(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(Math.round(value * 100) / 100);
}

export function attrs(map: Record<string, string | number | undefined>): string {
  return Object.entries(map)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}="${typeof value === "number" ? n(value) : esc(String(value))}"`)
    .join(" ");
}

export interface TextOptions {
  x: number;
  y: number;
  fill: string;
  size: number;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  opacity?: number;
  letterSpacing?: number;
  className?: string;
}

export function text(content: string, options: TextOptions): string {
  return `<text ${attrs({
    x: options.x,
    y: options.y,
    fill: options.fill,
    "font-size": options.size,
    "font-weight": options.weight ?? 400,
    "text-anchor": options.anchor ?? "start",
    "letter-spacing": options.letterSpacing,
    opacity: options.opacity,
    class: options.className,
  })}>${esc(content)}</text>`;
}

export function rect(options: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  rx?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  className?: string;
}): string {
  return `<rect ${attrs({
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    rx: options.rx,
    fill: options.fill,
    stroke: options.stroke,
    "stroke-width": options.strokeWidth,
    opacity: options.opacity,
    class: options.className,
  })} />`;
}

export function path(d: string, options: Record<string, string | number | undefined>): string {
  return `<path ${attrs({ d, ...options })} />`;
}

export function circle(cx: number, cy: number, r: number, fill: string, opacity?: number): string {
  return `<circle ${attrs({ cx, cy, r, fill, opacity })} />`;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Catmull-Rom-to-Bezier smoothing.
 *
 * A polyline through weekly contribution buckets is visually harsh; this rounds the corners
 * without overshooting the data the way a naive quadratic through midpoints does.
 */
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${n(p.x)},${n(p.y)}`).join(" ");
  }

  const segments: string[] = [`M${n(points[0]!.x)},${n(points[0]!.y)}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };

    segments.push(`C${n(c1.x)},${n(c1.y)} ${n(c2.x)},${n(c2.y)} ${n(p2.x)},${n(p2.y)}`);
  }

  return segments.join(" ");
}

/** Truncates to `max` characters on a word boundary where possible, adding an ellipsis. */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** `1234` → `1.2k`. Keeps KPI tiles from wrapping. */
export function compact(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${Math.round(value / 100) / 10}k`;
  return `${Math.round(value / 100_000) / 10}M`;
}
