import type { Trainer } from "@/types";
import { formatTrainerPriceLabel } from "@/lib/home-discovery";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { formatProviderLocation } from "@/lib/provider-location";
import {
  type ExploreMapCluster,
  getClusterHeaderInfo,
} from "@/lib/explore-map-clusters";

export function escapeExploreMapHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function safeExploreMapImageSrc(
  url: string | undefined | null
): string | null {
  const value = url?.trim() ?? "";
  if (!value) return null;
  if (/^(javascript|data|vbscript):/i.test(value)) return null;
  if (/^(https?:\/\/|\/)/i.test(value)) return value;
  return null;
}

function getTrainerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "SP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Single specialist popup HTML.
 */
export function buildExploreMapSinglePopupHtml(trainer: Trainer): string {
  const profession =
    resolveTrainerProfessionCategory(trainer) ||
    trainer.profession ||
    "Specialist";
  const price = formatTrainerPriceLabel(trainer.pricePerSession);
  const address =
    formatProviderLocation(trainer) || trainer.location?.trim() || "";
  const href = `/trainers/${encodeURIComponent(trainer.id)}`;
  const photoSrc = safeExploreMapImageSrc(trainer.image);
  const photoHtml = photoSrc
    ? `<img class="explore-map-popup__photo" src="${escapeExploreMapHtml(photoSrc)}" alt="${escapeExploreMapHtml(trainer.name)}" width="72" height="72" loading="lazy" decoding="async" />`
    : `<span class="explore-map-popup__photo explore-map-popup__photo--empty" aria-hidden="true">${escapeExploreMapHtml(getTrainerInitials(trainer.name))}</span>`;
  const facts = [price, address].filter(Boolean).join(" · ");
  const chevronIcon =
    `<svg class="explore-map-popup__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  return `<div class="explore-map-popup">
          <div class="explore-map-popup__body">
            ${photoHtml}
            <div class="explore-map-popup__copy">
              <div class="explore-map-popup__name-row">
                <p class="explore-map-popup__name">${escapeExploreMapHtml(trainer.name)}</p>
                ${trainer.verified ? `<span class="explore-map-popup__verified-badge" title="Verified Specialist" aria-label="Verified Specialist"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5L9.5 17L19 7"/></svg></span>` : ""}
              </div>
              <p class="explore-map-popup__meta">${escapeExploreMapHtml(profession)}</p>
              ${
                facts
                  ? `<p class="explore-map-popup__facts">${escapeExploreMapHtml(facts)}</p>`
                  : ""
              }
            </div>
          </div>
          <a class="explore-map-popup__link" href="${href}" data-trainer-id="${escapeExploreMapHtml(trainer.id)}"><span>View profile</span>${chevronIcon}</a>
        </div>`;
}

/**
 * Option B Multi-trainer cluster popup HTML with horizontal swipeable mini-card carousel.
 */
export function buildExploreMapClusterPopupHtml(cluster: ExploreMapCluster): string {
  const { trainers, count } = cluster;
  const headerInfo = getClusterHeaderInfo(cluster);
  const headerTitle = headerInfo.title;
  const subTitle = headerInfo.subtitle;

  const cardsHtml = trainers
    .map((trainer, index) => {
      const profession =
        resolveTrainerProfessionCategory(trainer) ||
        trainer.profession ||
        "Specialist";
      const price = formatTrainerPriceLabel(trainer.pricePerSession);
      const href = `/trainers/${encodeURIComponent(trainer.id)}`;
      const photoSrc = safeExploreMapImageSrc(trainer.image);
      const photoHtml = photoSrc
        ? `<img class="explore-map-cluster-card__photo" src="${escapeExploreMapHtml(photoSrc)}" alt="${escapeExploreMapHtml(trainer.name)}" width="56" height="56" loading="lazy" decoding="async" />`
        : `<span class="explore-map-cluster-card__photo explore-map-cluster-card__photo--empty" aria-hidden="true">${escapeExploreMapHtml(getTrainerInitials(trainer.name))}</span>`;
      const specialtiesPreview = trainer.specialty?.slice(0, 2).join(" · ") || "";

      return `<div class="explore-map-cluster-card" data-index="${index}">
        <div class="explore-map-cluster-card__header">
          <div class="explore-map-cluster-card__photo-wrap">
            ${photoHtml}
            ${trainer.verified ? `<span class="explore-map-cluster-card__verified-badge" title="Verified Specialist" aria-label="Verified Specialist"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5L9.5 17L19 7"/></svg></span>` : ""}
          </div>
          <div class="explore-map-cluster-card__header-text">
            <h4 class="explore-map-cluster-card__name">${escapeExploreMapHtml(trainer.name)}</h4>
            <p class="explore-map-cluster-card__profession">${escapeExploreMapHtml(profession)}</p>
            <div class="explore-map-cluster-card__tags">
              ${price ? `<span class="explore-map-cluster-card__price">${escapeExploreMapHtml(price)}</span>` : ""}
              ${trainer.rating ? `<span class="explore-map-cluster-card__rating">★ ${trainer.rating.toFixed(1)}</span>` : ""}
            </div>
          </div>
        </div>
        ${specialtiesPreview ? `<p class="explore-map-cluster-card__specialties">${escapeExploreMapHtml(specialtiesPreview)}</p>` : ""}
        <a class="explore-map-cluster-card__link explore-map-popup__link" href="${href}" data-trainer-id="${escapeExploreMapHtml(trainer.id)}">
          <span>View Profile</span>
          <svg class="explore-map-popup__chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>`;
    })
    .join("");

  return `<div class="explore-map-cluster-popup">
    <div class="explore-map-cluster-popup__header">
      <div class="explore-map-cluster-popup__hub-badge">
        <span class="explore-map-cluster-popup__pulse-dot" aria-hidden="true"></span>
        <span class="explore-map-cluster-popup__hub-title">Multi-Specialist Hub</span>
        <span class="explore-map-cluster-popup__count-pill">${count}</span>
      </div>
      <div class="explore-map-cluster-popup__location-copy">
        <h3 class="explore-map-cluster-popup__title">${escapeExploreMapHtml(headerTitle)}</h3>
        <p class="explore-map-cluster-popup__subtitle">${escapeExploreMapHtml(subTitle)}</p>
      </div>
    </div>
    <div class="explore-map-cluster-popup__carousel-shell">
      <div class="explore-map-cluster-popup__carousel" tabindex="0" role="region" aria-label="Specialists at this location">
        ${cardsHtml}
      </div>
    </div>
    <div class="explore-map-cluster-popup__footer">
      <span class="explore-map-cluster-popup__hint">
        <svg class="explore-map-cluster-popup__hint-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        Swipe horizontally to compare all ${count} specialists
      </span>
    </div>
  </div>`;
}

/**
 * Universal popup HTML builder:
 * Handles single Trainer, an array of Trainers, or an ExploreMapCluster.
 */
export function buildExploreMapPopupHtml(
  target: Trainer | Trainer[] | ExploreMapCluster
): string {
  if (Array.isArray(target)) {
    if (target.length === 0) return "";
    if (target.length === 1) return buildExploreMapSinglePopupHtml(target[0]);
    // Synthesize cluster
    const cluster: ExploreMapCluster = {
      id: `cluster-synth-${target[0].id}`,
      latitude: target[0].latitude,
      longitude: target[0].longitude,
      trainers: target,
      primaryTrainer: target[0],
      secondaryTrainer: target[1],
      count: target.length,
      isMulti: true,
      locationLabel: formatProviderLocation(target[0]) || target[0].location || "Location",
    };
    return buildExploreMapClusterPopupHtml(cluster);
  }

  if ("isMulti" in target) {
    if (!target.isMulti) {
      return buildExploreMapSinglePopupHtml(target.primaryTrainer);
    }
    return buildExploreMapClusterPopupHtml(target);
  }

  return buildExploreMapSinglePopupHtml(target);
}
