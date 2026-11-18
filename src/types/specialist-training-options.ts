/** How a specialist runs sessions — separate from in-person / virtual service area. */

export const SPECIALIST_TRAINING_OPTION_IDS = [
  "one-on-one",
  "semi-private",
  "class",
  "online",
  "hybrid",
] as const;

export type SpecialistTrainingOptionId =
  (typeof SPECIALIST_TRAINING_OPTION_IDS)[number];

export const SPECIALIST_TRAINING_OPTIONS: readonly {
  id: SpecialistTrainingOptionId;
  label: string;
  description: string;
  points: readonly string[];
}[] = [
  {
    id: "one-on-one",
    label: "One-on-one",
    description: "A private session, just you and your specialist.",
    points: [
      "The hour is yours alone",
      "Coaching paced to your goals",
      "You train together in person",
    ],
  },
  {
    id: "semi-private",
    label: "Semi-private",
    description: "A few clients, with coaching still on you.",
    points: [
      "A small group, not a full class",
      "You still get hands-on cues",
      "Shared energy, individual attention",
    ],
  },
  {
    id: "class",
    label: "Class",
    description: "A scheduled session with the group.",
    points: [
      "You train alongside other clients",
      "Your specialist leads the room",
      "The time is set on the schedule",
    ],
  },
  {
    id: "online",
    label: "Online",
    description: "The same coaching, from anywhere.",
    points: [
      "You meet on a video session",
      "No commute to the gym",
      "Coaching stays with your specialist",
    ],
  },
  {
    id: "hybrid",
    label: "Hybrid",
    description: "In person when you can, online when you can't.",
    points: [
      "Some sessions together, some virtual",
      "One specialist across both",
      "Easier to stay consistent",
    ],
  },
] as const;

export const DEFAULT_SPECIALIST_TRAINING_OPTIONS: readonly SpecialistTrainingOptionId[] =
  ["one-on-one"];

export function isSpecialistTrainingOptionId(
  value: string
): value is SpecialistTrainingOptionId {
  return (SPECIALIST_TRAINING_OPTION_IDS as readonly string[]).includes(value);
}

function uniqueValid(
  ids: readonly string[]
): SpecialistTrainingOptionId[] {
  const seen = new Set<SpecialistTrainingOptionId>();
  const next: SpecialistTrainingOptionId[] = [];
  for (const raw of ids) {
    const id = raw.trim().toLowerCase();
    if (!isSpecialistTrainingOptionId(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

export function parseTrainingOptions(
  value: unknown,
  legacy?: {
    groupTrainingAvailable?: boolean;
    onlineCoachingAvailable?: boolean;
    sessionExperience?: readonly string[];
  }
): SpecialistTrainingOptionId[] {
  const fromValue = Array.isArray(value)
    ? uniqueValid(value.map((item) => String(item)))
    : [];
  if (fromValue.length > 0) return fromValue;

  const inferred: SpecialistTrainingOptionId[] = ["one-on-one"];
  const session = (legacy?.sessionExperience ?? [])
    .map((item) => item.toLowerCase())
    .join(" ");
  if (
    legacy?.groupTrainingAvailable ||
    /semi-?private|small group|group training/.test(session)
  ) {
    inferred.push("semi-private");
  }
  if (/\bclass(es)?\b/.test(session)) {
    inferred.push("class");
  }
  if (legacy?.onlineCoachingAvailable || /online|virtual/.test(session)) {
    inferred.push("online");
  }
  if (/\bhybrid\b/.test(session)) {
    inferred.push("hybrid");
  }
  return uniqueValid(inferred);
}

export function toggleTrainingOption(
  current: readonly SpecialistTrainingOptionId[],
  id: SpecialistTrainingOptionId
): SpecialistTrainingOptionId[] {
  const has = current.includes(id);
  if (has) {
    const next = current.filter((item) => item !== id);
    return next.length > 0 ? next : [...current];
  }
  return uniqueValid([...current, id]);
}

export function groupTrainingAvailableFromOptions(
  options: readonly SpecialistTrainingOptionId[]
): boolean {
  return options.includes("semi-private") || options.includes("class");
}

export function formatTrainingOptionsLabel(
  options: readonly SpecialistTrainingOptionId[]
): string {
  const labels = SPECIALIST_TRAINING_OPTIONS.filter((option) =>
    options.includes(option.id)
  ).map((option) => option.label);
  return labels.join(" · ");
}

export function defaultTrainingOptionsForProfession(
  profession: string
): SpecialistTrainingOptionId[] {
  if (/yoga|pilates/i.test(profession)) {
    return ["one-on-one", "class"];
  }
  return [...DEFAULT_SPECIALIST_TRAINING_OPTIONS];
}
