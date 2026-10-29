import type { Trainer } from "@/types";
import { getTrainerCoordinates } from "@/lib/trainer-location";
import { formatProviderLocation } from "@/lib/provider-location";
import { escapeExploreMapHtml, safeExploreMapImageSrc } from "@/lib/explore-map-popup";
import { isTrainerVerified } from "@/lib/trainer-sponsorship";

/**
 * Proximity threshold for grouping specialists at the exact same or adjacent facility.
 * ~0.0008 deg latitude/longitude is approx 80-90 meters (~260 feet).
 */
export const CLUSTER_PROXIMITY_DEGREES = 0.0008;

export interface ExploreMapCluster {
  id: string;
  latitude: number;
  longitude: number;
  trainers: Trainer[];
  primaryTrainer: Trainer;
  secondaryTrainer?: Trainer;
  count: number;
  isMulti: boolean;
  locationLabel: string;
  facilityName?: string;
}

function getTrainerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "SP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Score a specialist so the most prominent/verified specialist is ranked primary
 * within the cluster stack.
 */
function getTrainerProminenceScore(trainer: Trainer): number {
  let score = 0;
  if (trainer.sponsored) score += 50;
  if (isTrainerVerified(trainer)) score += 30;
  if (trainer.rating) score += trainer.rating * 4;
  if (trainer.reviewCount) score += Math.min(20, trainer.reviewCount * 0.1);
  if (trainer.image) score += 10;
  return score;
}

function resolveClusterLocationLabel(trainers: Trainer[]): {
  locationLabel: string;
  facilityName?: string;
} {
  const primary = trainers[0];
  if (!primary) return { locationLabel: "San Diego, CA" };

  // Check if any trainer has a work address or facility name
  for (const t of trainers) {
    if (t.workAddress?.trim()) {
      const raw = t.workAddress.trim();
      // If work address has comma separation (e.g. "Self Made Gym, 8040 Arjons Dr, San Diego"),
      // extract the facility name from the first part
      const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
      const facility = parts[0];
      const neighborhood = primary.neighborhood?.trim();
      const city = primary.city?.trim() || "San Diego";
      const cleanLoc = neighborhood ? `${neighborhood}, ${city}` : `${city}, CA`;

      return {
        locationLabel: cleanLoc,
        facilityName: facility,
      };
    }
  }

  const formatted = formatProviderLocation(primary);
  if (formatted) {
    return { locationLabel: formatted };
  }

  const neighborhood = primary.neighborhood?.trim();
  const city = primary.city?.trim();
  if (neighborhood && city) {
    return { locationLabel: `${neighborhood}, ${city}` };
  }

  if (primary.location?.trim()) {
    return { locationLabel: primary.location.trim() };
  }

  if (city) {
    return { locationLabel: city };
  }

  return { locationLabel: "San Diego, CA" };
}

/**
 * Clean, non-redundant location header info for multi-specialist hub displays.
 */
export function getClusterHeaderInfo(cluster: {
  trainers: Trainer[];
  count: number;
  facilityName?: string;
  locationLabel: string;
  primaryTrainer: Trainer;
}): {
  title: string;
  subtitle: string;
} {
  const { count, facilityName, primaryTrainer } = cluster;
  const neighborhood = primaryTrainer.neighborhood?.trim();
  const city = primaryTrainer.city?.trim() || "San Diego";
  const state = primaryTrainer.state?.trim() || "CA";

  if (facilityName) {
    const cleanFacility = facilityName.split(",")[0].trim();
    const title = `${cleanFacility} · ${count} Specialists`;
    const subtitle =
      neighborhood && neighborhood.toLowerCase() !== cleanFacility.toLowerCase()
        ? `${neighborhood}, ${city}`
        : `${city}, ${state}`;
    return { title, subtitle };
  }

  if (neighborhood) {
    const title = `${neighborhood} · ${count} Specialists`;
    const subtitle = `${city}, ${state}`;
    return { title, subtitle };
  }

  if (city) {
    const title = `${city} · ${count} Specialists`;
    const subtitle = `${city}, ${state}`;
    return { title, subtitle };
  }

  return {
    title: `${count} Specialists`,
    subtitle: `${city}, ${state}`,
  };
}

const STREET_SUFFIXES: Record<string, string> = {
  street: "st",
  st: "st",
  avenue: "ave",
  ave: "ave",
  av: "ave",
  boulevard: "blvd",
  blvd: "blvd",
  drive: "dr",
  dr: "dr",
  road: "rd",
  rd: "rd",
  lane: "ln",
  ln: "ln",
  court: "ct",
  ct: "ct",
  place: "pl",
  pl: "pl",
  way: "way",
  wy: "way",
  circle: "cir",
  cir: "cir",
  terrace: "ter",
  ter: "ter",
  highway: "hwy",
  hwy: "hwy",
  parkway: "pkwy",
  pkwy: "pkwy",
};

const STATE_NAMES: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
};

const UNIT_LABELS = new Set(["suite", "ste", "unit", "apt", "apartment"]);

/**
 * One key for the same street address written two ways
 * ("Mira Lee Way, California" and "Mira Lee Wy, CA").
 * Returns null when there is no street number, so a city-only string
 * cannot group unrelated specialists.
 */
function facilityAddressKey(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  let text = trimmed
    .toLowerCase()
    .replace(/[#,.]/g, " ")
    .replace(/\bunited states\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [name, abbr] of Object.entries(STATE_NAMES)) {
    if (name.includes(" ")) {
      text = text.replaceAll(name, abbr);
    }
  }

  const tokens = text.split(" ").filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token || token === "usa" || token === "us") continue;
    if (UNIT_LABELS.has(token)) {
      const next = tokens[i + 1];
      if (next && /^[a-z0-9-]+$/.test(next)) i += 1;
      continue;
    }
    out.push(STREET_SUFFIXES[token] ?? STATE_NAMES[token] ?? token);
  }

  const hasStreetNumber = out.some((token) => /^\d/.test(token));
  const hasStreetName = out.some(
    (token) => /[a-z]/.test(token) && token.length > 2 && !Object.values(STATE_NAMES).includes(token)
  );
  if (!hasStreetNumber || !hasStreetName) return null;
  return out.join(" ");
}

function sameFacilityAddress(
  left: string | undefined,
  right: string | undefined
): boolean {
  const a = facilityAddressKey(left);
  const b = facilityAddressKey(right);
  return Boolean(a && b && a === b);
}

/**
 * Group marketplace specialists into geographical clusters for map pins.
 * Multiple specialists with identical or near-identical coordinates (< 80m)
 * or the same street address are grouped into a single cluster.
 */
export function clusterTrainersForMap(
  trainers: Trainer[],
  faceSeed = 0
): ExploreMapCluster[] {
  const mappable: Array<{ trainer: Trainer; lat: number; lng: number }> = [];

  for (const trainer of trainers) {
    const coords = getTrainerCoordinates(trainer);
    if (!coords) continue;
    mappable.push({
      trainer,
      lat: coords.latitude,
      lng: coords.longitude,
    });
  }

  const clusters: Array<{
    latitude: number;
    longitude: number;
    trainers: Trainer[];
  }> = [];

  for (const item of mappable) {
    let matchedCluster: (typeof clusters)[0] | null = null;

    for (const cluster of clusters) {
      // 1. Exact or near-identical coordinates
      const latDiff = Math.abs(cluster.latitude - item.lat);
      const lngDiff = Math.abs(cluster.longitude - item.lng);
      if (latDiff <= CLUSTER_PROXIMITY_DEGREES && lngDiff <= CLUSTER_PROXIMITY_DEGREES) {
        matchedCluster = cluster;
        break;
      }

      // 2. Same building, even when the saved address wording differs
      const clusterWorkAddress = cluster.trainers.find((t) => t.workAddress?.trim())
        ?.workAddress;
      if (sameFacilityAddress(clusterWorkAddress, item.trainer.workAddress)) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      matchedCluster.trainers.push(item.trainer);
    } else {
      clusters.push({
        latitude: item.lat,
        longitude: item.lng,
        trainers: [item.trainer],
      });
    }
  }

  return clusters.map((c, index) => {
    const ordered = orderClusterTrainers(c.trainers, faceSeed);
    const primaryTrainer = ordered[0];
    const secondaryTrainer = ordered.length > 1 ? ordered[1] : undefined;
    const { locationLabel, facilityName } = resolveClusterLocationLabel(ordered);
    const id = `cluster-${index}-${c.latitude.toFixed(4)}-${c.longitude.toFixed(4)}`;

    return {
      id,
      latitude: c.latitude,
      longitude: c.longitude,
      trainers: ordered,
      primaryTrainer,
      secondaryTrainer,
      count: ordered.length,
      isMulti: ordered.length > 1,
      locationLabel,
      facilityName,
    };
  });
}

/**
 * Front face is chosen from `faceSeed` (a new seed on each search).
 * The rest stay in a stable prominence order so paging does not reshuffle.
 */
function orderClusterTrainers(trainers: Trainer[], faceSeed: number): Trainer[] {
  if (trainers.length <= 1) return trainers;
  const ids = trainers.map((trainer) => trainer.id).sort();
  const pickedId = ids[hashToIndex(faceSeed, ids)];
  const frontIndex = trainers.findIndex((trainer) => trainer.id === pickedId);
  const safeFront = frontIndex >= 0 ? frontIndex : 0;
  const front = trainers[safeFront];
  const rest = trainers
    .filter((_, index) => index !== safeFront)
    .sort((a, b) => getTrainerProminenceScore(b) - getTrainerProminenceScore(a));
  return front ? [front, ...rest] : trainers;
}

function hashToIndex(seed: number, ids: string[]): number {
  const key = `${seed.toString(36)}:${ids.join("|")}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % ids.length;
}

/**
 * Build sleek HTML for an avatar image or initials fallback.
 */
export function buildTrainerAvatarHtml(
  trainer: Trainer,
  sizeClass = "explore-map-pin__photo"
): string {
  const photoSrc = safeExploreMapImageSrc(trainer.image);
  if (photoSrc) {
    return `<img class="${sizeClass}" src="${escapeExploreMapHtml(photoSrc)}" alt="" loading="eager" decoding="async" />`;
  }
  const initials = getTrainerInitials(trainer.name);
  return `<span class="${sizeClass} ${sizeClass}--fallback" aria-hidden="true">${escapeExploreMapHtml(initials)}</span>`;
}

/** Leaflet / MapKit hit box for a single specialist pin (photo circle + caret). */
export const EXPLORE_MAP_SINGLE_PIN_SIZE = { width: 36, height: 40 } as const;
/** Front pin + shadow disc + count chip. Matches `.explore-map-pin--stack`. */
export const EXPLORE_MAP_CLUSTER_PIN_SIZE = { width: 50, height: 48 } as const;

/** Finger taps wander. Treat anything inside this radius as a pin tap. */
export const PIN_TAP_SLOP_PX = 36;

/** Stable key so pin layers skip a full rebuild when membership/coords are unchanged. */
export function clustersPinSignature(clusters: ExploreMapCluster[]): string {
  if (clusters.length === 0) return "pins:empty";
  return clusters
    .map(
      (cluster) =>
        `${cluster.id}:${cluster.primaryTrainer.id}:${cluster.count}:${cluster.latitude.toFixed(5)}:${cluster.longitude.toFixed(5)}`
    )
    .join("|");
}

/** Select on pointer-up so the card does not wait for a delayed click. */
export function bindExploreMapPinSelect(
  el: HTMLElement,
  onSelect: () => void,
  onPress?: () => void
): void {
  let startX = 0;
  let startY = 0;

  el.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    startX = e.clientX;
    startY = e.clientY;
    onPress?.();
  });

  el.addEventListener("pointerup", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > PIN_TAP_SLOP_PX) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    onSelect();
  });
}

/**
 * Map pin HTML:
 * - Single trainer: circular avatar + location caret
 * - Several at one place: that same avatar, a shadow pin behind, and +x
 */
export interface ExploreMapCardSlide {
  trainer: Trainer;
  clusterId: string;
}

export function buildExploreMapPinHtml(
  cluster: ExploreMapCluster,
  isSelected = false
): string {
  const selectedClass = isSelected ? "explore-map-pin--selected" : "";

  if (!cluster.isMulti) {
    const trainer = cluster.primaryTrainer;
    const avatarHtml = buildTrainerAvatarHtml(trainer, "explore-map-pin__avatar-img");

    return `<div class="explore-map-pin explore-map-pin--single ${selectedClass}" data-cluster-id="${escapeExploreMapHtml(cluster.id)}" data-trainer-id="${escapeExploreMapHtml(trainer.id)}">
      <div class="explore-map-pin__single-body">
        <div class="explore-map-pin__avatar-ring">
          ${avatarHtml}
        </div>
        <span class="explore-map-pin__caret" aria-hidden="true"></span>
      </div>
    </div>`;
  }

  const trainer = cluster.primaryTrainer;
  const avatarHtml = buildTrainerAvatarHtml(trainer, "explore-map-pin__avatar-img");
  const moreCount = cluster.count - 1;

  return `<div class="explore-map-pin explore-map-pin--stack ${selectedClass}" data-cluster-id="${escapeExploreMapHtml(cluster.id)}" data-trainer-id="${escapeExploreMapHtml(trainer.id)}" data-count="${cluster.count}">
    <div class="explore-map-pin__stack-body">
      <span class="explore-map-pin__shadow" aria-hidden="true"></span>
      <div class="explore-map-pin__avatar-ring">
        ${avatarHtml}
      </div>
      <span class="explore-map-pin__badge" aria-label="${moreCount} more specialists at this location">+${moreCount}</span>
      <span class="explore-map-pin__caret" aria-hidden="true"></span>
    </div>
  </div>`;
}
