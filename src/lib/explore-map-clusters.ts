import type { Trainer } from "@/types";
import { getTrainerCoordinates } from "@/lib/trainer-location";
import { formatProviderLocation } from "@/lib/provider-location";
import { escapeExploreMapHtml, safeExploreMapImageSrc } from "@/lib/explore-map-popup";

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
  if (trainer.verified) score += 30;
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

/**
 * Group marketplace specialists into geographical clusters for map pins.
 * Multiple specialists with identical or near-identical coordinates (< 80m)
 * or matching work address/facility are grouped into a single cluster.
 */
export function clusterTrainersForMap(trainers: Trainer[]): ExploreMapCluster[] {
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

      // 2. Same facility or work address if available
      const clusterWorkAddress = cluster.trainers
        .find((t) => t.workAddress?.trim())
        ?.workAddress?.trim()
        ?.toLowerCase();
      const itemWorkAddress = item.trainer.workAddress?.trim()?.toLowerCase();

      if (
        clusterWorkAddress &&
        itemWorkAddress &&
        clusterWorkAddress === itemWorkAddress
      ) {
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
    // Sort trainers within cluster by prominence
    const sorted = [...c.trainers].sort(
      (a, b) => getTrainerProminenceScore(b) - getTrainerProminenceScore(a)
    );
    const primaryTrainer = sorted[0];
    const secondaryTrainer = sorted.length > 1 ? sorted[1] : undefined;
    const { locationLabel, facilityName } = resolveClusterLocationLabel(sorted);
    const id = `cluster-${index}-${c.latitude.toFixed(4)}-${c.longitude.toFixed(4)}`;

    return {
      id,
      latitude: c.latitude,
      longitude: c.longitude,
      trainers: sorted,
      primaryTrainer,
      secondaryTrainer,
      count: sorted.length,
      isMulti: sorted.length > 1,
      locationLabel,
      facilityName,
    };
  });
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
    return `<img class="${sizeClass}" src="${escapeExploreMapHtml(photoSrc)}" alt="" loading="lazy" decoding="async" />`;
  }
  const initials = getTrainerInitials(trainer.name);
  return `<span class="${sizeClass} ${sizeClass}--fallback" aria-hidden="true">${escapeExploreMapHtml(initials)}</span>`;
}

/** Leaflet / MapKit hit box for a single specialist pin (photo circle + caret). */
export const EXPLORE_MAP_SINGLE_PIN_SIZE = { width: 36, height: 40 } as const;
export const EXPLORE_MAP_CLUSTER_PIN_SIZE = { width: 88, height: 56 } as const;

/**
 * Option B Map Pin HTML:
 * - Single trainer: Circular avatar + location caret
 * - Multi-trainer (2+): Overlapping avatar stack + count badge (+1, +2, etc.) + pulsing hub ring + count pill
 */
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

  // Multi-trainer cluster (Option B)
  const primaryAvatar = buildTrainerAvatarHtml(
    cluster.primaryTrainer,
    "explore-map-pin__avatar-img explore-map-pin__avatar-img--primary"
  );
  const secondaryAvatar = cluster.secondaryTrainer
    ? buildTrainerAvatarHtml(
        cluster.secondaryTrainer,
        "explore-map-pin__avatar-img explore-map-pin__avatar-img--secondary"
      )
    : "";
  const remainingCount = cluster.count - 1;
  const badgeText = remainingCount > 0 ? `+${remainingCount}` : `${cluster.count}`;

  return `<div class="explore-map-pin explore-map-pin--cluster ${selectedClass}" data-cluster-id="${escapeExploreMapHtml(cluster.id)}" data-count="${cluster.count}">
    <span class="explore-map-pin__glow" aria-hidden="true"></span>
    <div class="explore-map-pin__cluster-body">
      <div class="explore-map-pin__avatar-stack">
        <div class="explore-map-pin__avatar-ring explore-map-pin__avatar-ring--primary">
          ${primaryAvatar}
        </div>
        ${
          secondaryAvatar
            ? `<div class="explore-map-pin__avatar-ring explore-map-pin__avatar-ring--secondary">
                ${secondaryAvatar}
              </div>`
            : ""
        }
        <span class="explore-map-pin__badge" aria-label="${cluster.count} specialists at this location">${badgeText}</span>
      </div>
      <div class="explore-map-pin__hub-pill">
        <span class="explore-map-pin__hub-dot" aria-hidden="true"></span>
        <span class="explore-map-pin__hub-label">${cluster.count} Specialists</span>
        <span class="explore-map-pin__caret" aria-hidden="true"></span>
      </div>
    </div>
  </div>`;
}
