/** Shared mobile breakpoint — matches Tailwind `md` (768px) */
export const MOBILE_MAX_WIDTH_QUERY = "(max-width: 767px)";

/** Mobile + tablet — floating bottom nav visible below Tailwind `lg` (1024px) */
export const TABLET_MAX_WIDTH_QUERY = "(max-width: 1023px)";

export function subscribeMobileMaxWidth(onStoreChange: () => void): () => void {
  const mq = window.matchMedia(MOBILE_MAX_WIDTH_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

export function getMobileMaxWidthSnapshot(): boolean {
  return window.matchMedia(MOBILE_MAX_WIDTH_QUERY).matches;
}

export function subscribeTabletMaxWidth(onStoreChange: () => void): () => void {
  const mq = window.matchMedia(TABLET_MAX_WIDTH_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

export function getTabletMaxWidthSnapshot(): boolean {
  return window.matchMedia(TABLET_MAX_WIDTH_QUERY).matches;
}
