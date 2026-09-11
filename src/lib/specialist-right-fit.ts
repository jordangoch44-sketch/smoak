/** Public profile + edit copy for client/specialist match. */

export const RIGHT_FIT_SECTION_TITLE = "Are we the right fit?";

export const RIGHT_FIT_OWN_ID = "own" as const;

export const RIGHT_FIT_STARTERS = [
  {
    id: "ideal-client",
    label: "My ideal client is…",
    prefix: "My ideal client is ",
  },
  {
    id: "work-best-with",
    label: "I work best with clients who…",
    prefix: "I work best with clients who ",
  },
  {
    id: "great-fit",
    label: "We will be a great fit if…",
    prefix: "We will be a great fit if ",
  },
] as const;

export type RightFitStarterId =
  | (typeof RIGHT_FIT_STARTERS)[number]["id"]
  | typeof RIGHT_FIT_OWN_ID;

function prefixBoundary(after: string): boolean {
  return after.length === 0 || /^[\s.…,]/.test(after);
}

function startsWithPrefix(text: string, prefix: string): boolean {
  const source = text.trimStart();
  const needle = prefix.trim();
  if (source.length < needle.length) return false;
  if (source.slice(0, needle.length).toLowerCase() !== needle.toLowerCase()) {
    return false;
  }
  return prefixBoundary(source.slice(needle.length));
}

function stripKnownPrefix(text: string): string {
  const source = text.trimStart();
  for (const starter of RIGHT_FIT_STARTERS) {
    const needle = starter.prefix.trim();
    if (!startsWithPrefix(source, starter.prefix)) continue;
    return source.slice(needle.length).replace(/^[\s.…,]+/, "");
  }
  return text.trim();
}

export function rightFitCopyFromItems(
  items: string[] | null | undefined
): string {
  if (!Array.isArray(items)) return "";
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];
  return cleaned.join(", ");
}

export function matchRightFitStarter(text: string): RightFitStarterId {
  const source = text.trimStart();
  if (!source) return RIGHT_FIT_OWN_ID;
  for (const starter of RIGHT_FIT_STARTERS) {
    if (startsWithPrefix(source, starter.prefix)) return starter.id;
  }
  return RIGHT_FIT_OWN_ID;
}

export function applyRightFitStarter(
  text: string,
  starterId: RightFitStarterId
): string {
  const rest = stripKnownPrefix(text);
  if (starterId === RIGHT_FIT_OWN_ID) return rest;
  const starter = RIGHT_FIT_STARTERS.find((item) => item.id === starterId);
  if (!starter) return text;
  return rest ? `${starter.prefix}${rest}` : starter.prefix;
}
