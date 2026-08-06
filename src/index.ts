import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { build, type BuildResult } from "./build.js";
import { TEMPLATE_FILE } from "./config.js";

const ROOT = process.cwd();

async function main(): Promise<void> {
  const [command, ...flags] = process.argv.slice(2);

  if (command !== "build") {
    console.error("usage: node dist/index.js build [--dry-run]");
    process.exitCode = 2;
    return;
  }

  const dryRun = flags.includes("--dry-run");
  const template = await readFile(path.join(ROOT, TEMPLATE_FILE), "utf8");
  const result = await build(template, new Date());

  const changed = await findChanges(result.files);

  if (dryRun) {
    console.log(
      changed.length === 0
        ? "Dry run: output already matches the committed files."
        : `Dry run: ${changed.length} file(s) would change:\n${changed.map((f) => `  ${f}`).join("\n")}`,
    );
    await writeSummary(changed, result, true);
    return;
  }

  for (const [file, content] of result.files) {
    const target = path.join(ROOT, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }

  console.log(
    changed.length === 0
      ? "No changes — output already matches the current GitHub data."
      : `Updated ${changed.length} file(s):\n${changed.map((f) => `  ${f}`).join("\n")}`,
  );

  await writeSummary(changed, result);
}

/** Files whose generated content differs from what is on disk (missing counts as changed). */
async function findChanges(files: Map<string, string>): Promise<string[]> {
  const changed: string[] = [];

  for (const [file, content] of files) {
    let existing: string | null = null;
    try {
      existing = await readFile(path.join(ROOT, file), "utf8");
    } catch {
      existing = null;
    }
    if (existing !== content) changed.push(file);
  }

  return changed.sort();
}

/**
 * Writes the run's numbers to the Actions job summary. A build that silently succeeds tells
 * you nothing later; this makes each run auditable from the workflow page alone.
 *
 * There is deliberately no "committed output is stale" gate. The inputs are live — the
 * contribution count changes daily — so such a check would fail on almost every pull
 * request for reasons that have nothing to do with the change under review. What CI can
 * meaningfully assert is that the build *runs*: the template's markers and the generator's
 * sections still agree (`applySections` throws otherwise) and every card renders.
 */
async function writeSummary(
  changed: string[],
  result: BuildResult,
  dryRun = false,
): Promise<void> {
  const summaryPath = process.env["GITHUB_STEP_SUMMARY"];
  if (!summaryPath) return;

  const { stats } = result;
  const lines = [
    `## Profile build${dryRun ? " (dry run)" : ""}`,
    "",
    "| Metric | Value |",
    "| :-- | --: |",
    `| Files ${dryRun ? "that would change" : "changed"} | ${changed.length} |`,
    `| API requests | ${stats.apiRequests} |`,
    `| GraphQL cost / remaining | ${stats.graphqlCost} / ${stats.graphqlRemaining} |`,
    `| Contributions (12 mo) | ${stats.contributions} |`,
    `| Projects listed | ${stats.projects} |`,
    `| Duration | ${(stats.durationMs / 1000).toFixed(1)}s |`,
    "",
  ];

  if (changed.length > 0) {
    lines.push("<details><summary>Changed files</summary>", "");
    lines.push(...changed.map((file) => `- \`${file}\``));
    lines.push("", "</details>", "");
  }

  await appendFile(summaryPath, lines.join("\n"), "utf8");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
