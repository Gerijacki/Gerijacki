/**
 * Region substitution for the README template.
 *
 * Generated content lives between `<!-- gen:NAME:start -->` and `<!-- gen:NAME:end -->`.
 * Prose outside those markers is yours and is never touched.
 *
 * Every mismatch is a hard error. A silently skipped region would ship a README with a
 * stale or empty section and nothing would flag it — the whole point of `--check` is that
 * the generated output is either correct or the build fails.
 */

export class MarkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarkerError";
  }
}

const START = (name: string): string => `<!-- gen:${name}:start -->`;
const END = (name: string): string => `<!-- gen:${name}:end -->`;

/** Region names present in the document, in order of appearance. */
export function findRegions(source: string): string[] {
  const names: string[] = [];
  const pattern = /<!--\s*gen:([A-Za-z0-9_-]+):start\s*-->/g;

  for (const match of source.matchAll(pattern)) names.push(match[1]!);

  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicates.length > 0) {
    throw new MarkerError(`Duplicate region marker(s): ${[...new Set(duplicates)].join(", ")}`);
  }

  return names;
}

export function replaceRegion(source: string, name: string, content: string): string {
  const startTag = START(name);
  const endTag = END(name);

  const startIndex = source.indexOf(startTag);
  if (startIndex === -1) throw new MarkerError(`Missing start marker for region "${name}"`);

  const endIndex = source.indexOf(endTag, startIndex);
  if (endIndex === -1) throw new MarkerError(`Missing end marker for region "${name}"`);

  const head = source.slice(0, startIndex + startTag.length);
  const tail = source.slice(endIndex);

  return `${head}\n${content.trim()}\n${tail}`;
}

/**
 * Applies every section and verifies the template and the section map agree exactly.
 *
 * A region in the template with no section is an empty hole; a section with no region is
 * generated work that never reaches the page. Both are bugs, so both throw.
 */
export function applySections(template: string, sections: Record<string, string>): string {
  const regions = findRegions(template);
  const provided = Object.keys(sections);

  const missing = regions.filter((name) => !provided.includes(name));
  if (missing.length > 0) {
    throw new MarkerError(`Template region(s) with no generated content: ${missing.join(", ")}`);
  }

  const unused = provided.filter((name) => !regions.includes(name));
  if (unused.length > 0) {
    throw new MarkerError(`Generated content with no template region: ${unused.join(", ")}`);
  }

  return regions.reduce((document, name) => replaceRegion(document, name, sections[name]!), template);
}
