/**
 * Single source of truth for the generator. Nothing else in `src/` should hard-code
 * a colour, a size or a repository name — if you want to retune the profile, retune it here.
 */

export const LOGIN = "Gerijacki";

/** The profile repo itself. Used for the traffic API and for workflow badge links. */
export const REPO = "Gerijacki";

export const SITE = "https://www.gerardloriz.com";

/**
 * Repos never shown in the "selected work" section, even if they score well.
 * Forks are excluded automatically by the GraphQL query; this is for owned repos
 * that just aren't worth surfacing.
 */
export const EXCLUDED_REPOS = new Set<string>([
  "Gerijacki", // this repo — the README already is the artefact
]);

/**
 * Repos pinned to the top of the "selected work" list regardless of score,
 * in the order given. Anything not listed is ranked by `scoreRepo()`.
 */
export const FEATURED_REPOS: string[] = ["soc", "BreachMap", "credweaver", "Orgit", "rans"];

/** How many projects the generated table shows. */
export const PROJECT_COUNT = 6;

/** How many languages the bar shows before collapsing the rest into "Other". */
export const LANGUAGE_COUNT = 8;

/**
 * Languages that skew the picture without saying anything about what you build:
 * markup, config and generated output.
 */
export const IGNORED_LANGUAGES = new Set<string>([
  "HTML",
  "CSS",
  "SCSS",
  "Makefile",
  "Dockerfile",
  "Batchfile",
  "Roff",
  "Jupyter Notebook",
]);

export interface Palette {
  /** Card background. */
  bg: string;
  /** Inset panel / terminal body. */
  panel: string;
  /** Card border. */
  border: string;
  /** Primary text. */
  text: string;
  /** Secondary text, axis labels. */
  muted: string;
  /** Brand purple. */
  accent: string;
  /** Brand purple, lighter — gradient end. */
  accentSoft: string;
  /** Brand green, for positive/secondary emphasis. */
  green: string;
  /** Gridlines and empty heatmap cells. */
  grid: string;
}

export const THEMES = {
  dark: {
    bg: "#0D0A14",
    panel: "#151022",
    border: "#2A2140",
    text: "#EDE8F7",
    muted: "#A99FC0",
    accent: "#7C5CD0",
    accentSoft: "#B79BF0",
    green: "#63C69A",
    grid: "#221B36",
  },
  light: {
    bg: "#FFFFFF",
    panel: "#F7F4FE",
    border: "#DED5F2",
    text: "#1A1526",
    muted: "#5F5677",
    accent: "#6742C0",
    accentSoft: "#9A79E0",
    green: "#1F7F58",
    grid: "#E7E0F7",
  },
} as const satisfies Record<string, Palette>;

export type ThemeName = keyof typeof THEMES;
export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

/**
 * Font stack. The font is not embedded: a subsetted JetBrains Mono would add ~15 kB to
 * every card for a rendering difference most viewers never see. The stack degrades to the
 * platform monospace, which is what GitHub itself uses.
 */
export const MONO = "'JetBrains Mono','SFMono-Regular',ui-monospace,Menlo,Consolas,monospace";

/** Card geometry. Widths are viewBox units; GitHub scales them to the column width. */
export const SIZES = {
  cardWidth: 860,
  terminalHeight: 280,
  activityHeight: 220,
  heatmapHeight: 200,
  languagesHeight: 200,
  statsHeight: 130,
  radius: 12,
  pad: 24,
} as const;

/**
 * The stack card, replacing the shields.io badge row.
 *
 * Colours are the projects' own brand colours so the card still reads at a glance, but the
 * chips are drawn here rather than fetched — the README shouldn't break because a badge
 * service is down or rate-limiting.
 */
export const STACK: { group: string; items: { name: string; color: string }[] }[] = [
  {
    group: "LANGUAGES",
    items: [
      { name: "Python", color: "#3776AB" },
      { name: "TypeScript", color: "#3178C6" },
      { name: "Go", color: "#00ADD8" },
      { name: "PHP", color: "#777BB4" },
      { name: "C", color: "#A8B9CC" },
      { name: "Bash", color: "#4EAA25" },
    ],
  },
  {
    group: "BACKEND",
    items: [
      { name: "Laravel", color: "#FF2D20" },
      { name: "Node.js", color: "#5FA04E" },
      { name: "FastAPI", color: "#009688" },
      { name: "MySQL", color: "#4479A1" },
      { name: "PostgreSQL", color: "#4169E1" },
      { name: "Redis", color: "#DC382D" },
    ],
  },
  {
    group: "DEVOPS",
    items: [
      { name: "Docker", color: "#2496ED" },
      { name: "Linux", color: "#FCC624" },
      { name: "GitHub Actions", color: "#2088FF" },
      { name: "Nginx", color: "#009639" },
      { name: "Grafana", color: "#F46800" },
      { name: "Git", color: "#F05032" },
    ],
  },
  {
    group: "SECURITY",
    items: [
      { name: "Wazuh", color: "#3B7DDD" },
      { name: "Suricata", color: "#E8483F" },
      { name: "Burp Suite", color: "#FF6633" },
      { name: "Nmap", color: "#4682B4" },
      { name: "Flipper Zero", color: "#FF8200" },
      { name: "Tor", color: "#7D4698" },
    ],
  },
];

/** Lines typed out by the animated terminal header, in order. */
export const TERMINAL_LINES: { prompt: string; output: string[] }[] = [
  {
    prompt: "whoami",
    output: ["Gerard Loriz — Backend Developer · Cybersecurity · AI", "Barcelona, ES"],
  },
  {
    prompt: "cat principles.txt",
    output: ["secure by design", "ship · measure · harden", "build it — then try to break it"],
  },
];

/** Where generated cards are written, relative to the repo root. */
export const ASSETS_DIR = "assets";

/** Template read by the generator and README it writes. */
export const TEMPLATE_FILE = "README.tpl.md";
export const OUTPUT_FILE = "README.md";
