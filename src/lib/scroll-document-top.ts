/** Reset window and app-main so wizard steps open at the heading, not the CTA. */
export function scrollDocumentToTop(): void {
  if (typeof window === "undefined") return;

  window.scrollTo(0, 0);
  const scrolling = document.scrollingElement;
  if (scrolling) scrolling.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const main = document.querySelector(".app-main");
  if (main instanceof HTMLElement) {
    main.scrollTop = 0;
    main.scrollTo?.(0, 0);
  }
}
