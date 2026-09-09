/**
 * Public specialist profile URLs.
 * Internal specialist id stays the data key; `slug` is the shareable path.
 */
export type TrainerPublicIdentity = {
  id: string;
  slug?: string | null;
};

const RESERVED_SLUGS = new Set([
  "placeholder",
  "new",
  "edit",
  "index",
  "trainers",
  "explore",
  "saved",
  "admin",
  "login",
  "preview",
]);

const SLUG_MAX = 48;

export function slugifySpecialistName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export function isValidSpecialistSlug(value: string): boolean {
  const slug = value.trim().toLowerCase();
  if (slug.length < 2 || slug.length > 60) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function allocateUniqueSpecialistSlug(input: {
  name: string;
  city?: string;
  taken: Iterable<string>;
  preferred?: string | null;
}): string {
  const taken = new Set(
    [...input.taken].map((item) => item.trim().toLowerCase()).filter(Boolean)
  );

  const preferred = input.preferred?.trim().toLowerCase() ?? "";
  if (preferred && isValidSpecialistSlug(preferred) && !taken.has(preferred)) {
    return preferred;
  }

  const base = slugifySpecialistName(input.name) || "specialist";
  if (!taken.has(base) && isValidSpecialistSlug(base)) return base;

  const cityPart = slugifySpecialistName(input.city ?? "");
  if (cityPart) {
    const withCity = `${base}-${cityPart}`.slice(0, 60).replace(/-+$/g, "");
    if (!taken.has(withCity) && isValidSpecialistSlug(withCity)) return withCity;
  }

  for (let n = 2; n < 100; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate) && isValidSpecialistSlug(candidate)) {
      return candidate;
    }
  }

  return `${base}-${Date.now().toString(36)}`.slice(0, 60);
}

/** Canonical public path segment — slug when set, otherwise id. */
export function publicTrainerSlug(trainer: TrainerPublicIdentity): string {
  const slug = trainer.slug?.trim();
  if (slug && isValidSpecialistSlug(slug)) return slug;
  return trainer.id;
}

export function trainerProfilePath(trainer: TrainerPublicIdentity): string {
  return `/trainers/${encodeURIComponent(publicTrainerSlug(trainer))}`;
}

export function trainerMatchesPublicKey(
  trainer: TrainerPublicIdentity,
  key: string
): boolean {
  const decoded = decodePublicTrainerKey(key);
  if (!decoded) return false;
  if (trainer.id === decoded || trainer.id === key) return true;
  const slug = trainer.slug?.trim().toLowerCase();
  return Boolean(slug && slug === decoded.toLowerCase());
}

export function decodePublicTrainerKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export function findTrainerByPublicKey<T extends TrainerPublicIdentity>(
  trainers: readonly T[],
  key: string
): T | undefined {
  const decoded = decodePublicTrainerKey(key);
  if (!decoded) return undefined;
  const byId = trainers.find((trainer) => trainer.id === decoded);
  if (byId) return byId;
  const lower = decoded.toLowerCase();
  return trainers.find(
    (trainer) => trainer.slug?.trim().toLowerCase() === lower
  );
}

/**
 * Fill missing public slugs from listing names. Deterministic for a given
 * catalog so existing live profiles get curated URLs before the next save.
 */
export function hydrateTrainerPublicSlugs<T extends TrainerPublicIdentity & {
  name?: string;
  city?: string;
}>(trainers: readonly T[]): T[] {
  if (trainers.length === 0) return [];

  const taken = new Set<string>();
  const ordered = [...trainers].sort((a, b) => a.id.localeCompare(b.id));
  for (const trainer of ordered) {
    taken.add(trainer.id.toLowerCase());
    const existing = trainer.slug?.trim().toLowerCase();
    if (existing) taken.add(existing);
  }

  const slugById = new Map<string, string>();
  for (const trainer of ordered) {
    const existing = trainer.slug?.trim().toLowerCase() ?? "";
    if (existing && isValidSpecialistSlug(existing)) {
      slugById.set(trainer.id, existing);
      continue;
    }

    taken.delete(trainer.id.toLowerCase());
    const slug = allocateUniqueSpecialistSlug({
      name: trainer.name ?? "",
      city: trainer.city,
      taken,
    });
    taken.add(trainer.id.toLowerCase());
    taken.add(slug);
    slugById.set(trainer.id, slug);
  }

  return trainers.map((trainer) => ({
    ...trainer,
    slug: slugById.get(trainer.id) ?? trainer.slug,
  }));
}
