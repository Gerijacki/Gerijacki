import { describe, expect, it } from "vitest";

import { THEMES, type ThemeName } from "../src/config.js";
import { currentStreak, longestStreak, type ContributionStats } from "../src/data/contributions.js";
import { renderActivity } from "../src/render/activity.svg.js";
import { levelFor, levelThresholds, renderHeatmap } from "../src/render/heatmap.svg.js";
import { renderLanguages } from "../src/render/languages.svg.js";
import { chipWidthFor, renderStack, stackHeight } from "../src/render/stack.svg.js";
import { renderStats } from "../src/render/stats.svg.js";
import { renderTerminal } from "../src/render/terminal.svg.js";
import { compact, esc, smoothPath, truncate } from "../src/render/svg.js";
import { SIZES } from "../src/config.js";
import { makeCalendar } from "./fixtures.js";

const days = makeCalendar(365);

const STATS: ContributionStats = {
  days,
  total: days.reduce((sum, day) => sum + day.contributionCount, 0),
  privateTotal: 12,
  commits: 640,
  pullRequests: 48,
  reviews: 21,
  issues: 9,
  reposCreated: 6,
  currentStreak: currentStreak(days),
  longestStreak: longestStreak(days),
  busiestDay: days[100]!,
  dailyAverage: 3.4,
};

const LANGUAGES = [
  { name: "Python", bytes: 400, percent: 40, color: "#3776AB" },
  { name: "TypeScript", bytes: 300, percent: 30, color: "#3178C6" },
  { name: "Go", bytes: 200, percent: 20, color: "#00ADD8" },
  { name: "C", bytes: 100, percent: 10, color: "#A8B9CC" },
];

const KPIS = [
  { value: 1240, label: "CONTRIBUTIONS" },
  { value: 640, label: "COMMITS" },
  { value: 48, label: "PULL REQUESTS" },
  { value: 19, label: "PUBLIC REPOS" },
  { value: 3, label: "STARS EARNED" },
  { value: 17, label: "FOLLOWERS" },
];

const CARDS: [string, (theme: ThemeName) => string][] = [
  ["terminal", (theme) => renderTerminal({ theme, palette: THEMES[theme] })],
  ["stats", (theme) => renderStats({ theme, palette: THEMES[theme] }, KPIS, "241 unique visitors")],
  ["activity", (theme) => renderActivity({ theme, palette: THEMES[theme] }, STATS)],
  ["heatmap", (theme) => renderHeatmap({ theme, palette: THEMES[theme] }, STATS)],
  ["languages", (theme) => renderLanguages({ theme, palette: THEMES[theme] }, LANGUAGES)],
  ["stack", (theme) => renderStack({ theme, palette: THEMES[theme] })],
];

describe.each(CARDS)("%s card", (name, render) => {
  for (const theme of ["dark", "light"] as ThemeName[]) {
    it(`matches the ${theme} snapshot`, () => {
      expect(render(theme)).toMatchSnapshot();
    });
  }

  it("is a complete standalone SVG document", () => {
    const svg = render("dark");
    expect(svg.startsWith("<svg xmlns=")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain("<title");
  });

  /**
   * The reason this repository exists. If a card ever references an outside host, the
   * README is back to depending on someone else's uptime.
   */
  it("references no external host", () => {
    for (const theme of ["dark", "light"] as ThemeName[]) {
      const withoutNamespace = render(theme).replace(
        /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g,
        "",
      );
      expect(withoutNamespace).not.toMatch(/https?:\/\//);
      expect(withoutNamespace).not.toMatch(/<(script|image|foreignObject)\b/);
    }
  });

  it("renders identically when called twice", () => {
    expect(render("dark")).toBe(render("dark"));
  });
});

describe("card geometry", () => {
  it("keeps the stack card's chips inside the content width", () => {
    const widest = Math.max(...["GitHub Actions", "Flipper Zero", "PostgreSQL"].map(chipWidthFor));
    expect(widest).toBeLessThan(SIZES.cardWidth - SIZES.pad * 2);
  });

  it("grows the stack card to fit its rows", () => {
    expect(stackHeight()).toBeGreaterThan(SIZES.pad * 2);
    expect(renderStack({ theme: "dark", palette: THEMES.dark })).toContain(
      `height="${stackHeight()}"`,
    );
  });
});

describe("heatmap levels", () => {
  it("maps an empty day to level 0", () => {
    expect(levelFor(0, [2, 5, 9])).toBe(0);
  });

  it("increases with contribution count", () => {
    const thresholds: [number, number, number] = [2, 5, 9];
    expect(levelFor(1, thresholds)).toBe(1);
    expect(levelFor(3, thresholds)).toBe(2);
    expect(levelFor(7, thresholds)).toBe(3);
    expect(levelFor(20, thresholds)).toBe(4);
  });

  // Equal quartiles would collapse several shades into one, which reads as a flatter year
  // than it was.
  it("produces strictly increasing thresholds even on flat data", () => {
    const flat = Array.from({ length: 50 }, () => ({
      date: "2026-01-01",
      contributionCount: 3,
      weekday: 1,
    }));

    const [a, b, c] = levelThresholds(flat);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("falls back sensibly when nothing was contributed", () => {
    expect(levelThresholds([])).toEqual([1, 2, 3]);
  });
});

describe("svg primitives", () => {
  it("escapes every XML-significant character", () => {
    expect(esc(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;");
  });

  it("formats compact counts", () => {
    expect(compact(999)).toBe("999");
    expect(compact(1240)).toBe("1.2k");
    expect(compact(1_500_000)).toBe("1.5M");
  });

  it("truncates on a word boundary", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("a much longer label", 12)).toMatch(/…$/);
  });

  it("degrades to a line for fewer than three points", () => {
    expect(smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe("M0,0 L10,10");
    expect(smoothPath([])).toBe("");
  });
});
