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
