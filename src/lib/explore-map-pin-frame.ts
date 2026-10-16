/** Room for the scaled pin, its caret, and the purple selection ring. */
const SELECTED_PIN_CLEARANCE_PX = 44;
/** Footprint of the specialist card before it has mounted. */
const RESERVED_CARD_PX = 220;

export type PinClearBox = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/**
 * Screen box where a selected pin stays fully visible: below the search
 * controls and above the specialist card.
 */
export function selectedPinClearBox(container: HTMLElement): PinClearBox {
  const bounds = container.getBoundingClientRect();
  let top = bounds.top + 96;
  const controls = document.querySelector(
    ".explore-map-hero__controls, .explore-page__map-rail-controls"
  );
  if (controls instanceof HTMLElement) {
    const covered = controls.getBoundingClientRect().bottom;
    if (covered > bounds.top) top = covered + SELECTED_PIN_CLEARANCE_PX;
  }

  return {
    top,
    right: bounds.right - 24,
    bottom: cardCoverTop(bounds) - SELECTED_PIN_CLEARANCE_PX,
    left: bounds.left + 24,
  };
}

/** Pixel shift to apply to the map center so the pin lands inside the box. */
export function cameraShiftToClearPin(
  pinX: number,
  pinY: number,
  box: PinClearBox
): { x: number; y: number } | null {
  let x = 0;
  let y = 0;
  if (pinY > box.bottom) y = pinY - box.bottom;
  else if (pinY < box.top) y = pinY - box.top;
  if (pinX > box.right) x = pinX - box.right;
  else if (pinX < box.left) x = pinX - box.left;
  if (x === 0 && y === 0) return null;
  return { x, y };
}

/** Paint the purple ring on the live pin and lift it above neighboring pins. */
export function syncExploreMapPinSelection(
  root: ParentNode | null,
  clusterId: string | null
): HTMLElement | null {
  if (!root) return null;

  root.querySelectorAll(".explore-map-pin--selected").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.getAttribute("data-cluster-id") !== clusterId) {
      el.classList.remove("explore-map-pin--selected");
    }
  });
  root
    .querySelectorAll(".explore-map-pin-frame--selected")
    .forEach((el) => el.classList.remove("explore-map-pin-frame--selected"));

  if (!clusterId) return null;
  const pins = root.querySelectorAll(".explore-map-pin");
  for (const pin of pins) {
    if (!(pin instanceof HTMLElement)) continue;
    if (pin.getAttribute("data-cluster-id") !== clusterId) continue;
    pin.classList.add("explore-map-pin--selected");
    pin
      .closest(".explore-map-annotation-wrapper, .explore-map-marker-container")
      ?.classList.add("explore-map-pin-frame--selected");
    return pin;
  }
  return null;
}

function cardCoverTop(mapBounds: DOMRect): number {
  const card = document.querySelector(".explore-bottom-card-dock");
  if (card instanceof HTMLElement && card.offsetHeight > 0) {
    return cardRestingTop(card);
  }

  const nav = document.querySelector(".mobile-bottom-nav");
  const navHeight =
    nav instanceof HTMLElement && getComputedStyle(nav).display !== "none"
      ? nav.getBoundingClientRect().height
      : 0;
  return mapBounds.bottom - navHeight - RESERVED_CARD_PX;
}

/** Where the card sits once its enter animation finishes. */
function cardRestingTop(card: HTMLElement): number {
  const style = getComputedStyle(card);
  const bottomInset = Number.parseFloat(style.bottom);
  if (!Number.isFinite(bottomInset)) return card.getBoundingClientRect().top;

  if (style.position === "fixed") {
    return window.innerHeight - bottomInset - card.offsetHeight;
  }

  const host =
    card.offsetParent instanceof HTMLElement
      ? card.offsetParent.getBoundingClientRect()
      : card.getBoundingClientRect();
  return host.bottom - bottomInset - card.offsetHeight;
}
