/**
 * Words that cannot appear on a shared sticker. Matched as whole words after
 * leetspeak and repeated letters are folded, so a workout name stays shareable
 * when it is only a lookalike.
 */
const BLOCKED = [
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "bastard",
  "ass",
  "asshole",
  "dumbass",
  "jackass",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "whore",
  "slut",
  "fag",
  "faggot",
  "nigger",
  "nigga",
  "retard",
  "twat",
  "wank",
  "cum",
  "jizz",
  "blowjob",
  "handjob",
  "shithead",
  "fuckface",
  "dickhead",
] as const;

function collapseRepeats(word: string): string {
  return word.replace(/(.)\1+/g, "$1");
}

function tokens(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/\$/g, "s")
    .replace(/[^a-z]+/g, " ");
  return normalized.split(/\s+/).filter(Boolean);
}

function matches(part: string, target: string): boolean {
  const folded = collapseRepeats(part);
  if (part === target || folded === target) return true;
  return part.length >= target.length && folded === collapseRepeats(target);
}

export function containsBlockedLanguage(text: string): boolean {
  const parts = tokens(text);
  if (parts.length === 0) return false;
  const compact = collapseRepeats(parts.join(""));
  const spelled = parts.filter((part) => part.length === 1).join("");
  for (const word of BLOCKED) {
    if (parts.some((part) => matches(part, word))) return true;
    if (word.length >= 6 && compact.includes(collapseRepeats(word))) return true;
    if (spelled.length >= 3 && spelled.includes(word)) return true;
  }
  return false;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Title printed on a sticker. A blocked name becomes "Workout". */
export function shareSafeTitle(title: string): { text: string; blocked: boolean } {
  const trimmed = title.replace(/\s+/g, " ").trim();
  if (!trimmed) return { text: "Workout", blocked: false };
  if (containsBlockedLanguage(trimmed)) return { text: "Workout", blocked: true };
  return { text: titleCase(trimmed), blocked: false };
}

/** Exercise name printed on a sticker. A blocked name becomes the fallback. */
export function shareSafeName(name: string, fallback: string): { text: string; blocked: boolean } {
  const trimmed = name.replace(/\s+/g, " ").trim();
  if (!trimmed || containsBlockedLanguage(trimmed)) return { text: fallback, blocked: Boolean(trimmed) };
  return { text: titleCase(trimmed), blocked: false };
}
