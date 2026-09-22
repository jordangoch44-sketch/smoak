/**
 * Freeze the document behind a portaled inquiries/saved overlay.
 *
 * iOS Safari pans html/body under position:fixed layers, especially when
 * the overlay scroller isn’t overflowing. Cover the viewport behind the
 * site header and pin the body with `--overlay-lock-top`.
 */
export function lockOverlayDocumentScroll(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const y = window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.style.setProperty("--overlay-lock-top", `-${y}px`);

  let lastY = 0;

  function onTouchStart(event: TouchEvent) {
    lastY = event.touches[0]?.clientY ?? 0;
  }

  function onTouchMove(event: TouchEvent) {
    if (event.touches.length > 1) return;
    const touchY = event.touches[0]?.clientY ?? lastY;
    const dy = touchY - lastY;
    lastY = touchY;

    const target = event.target;
    if (!(target instanceof Element)) {
      event.preventDefault();
      return;
    }

    const scroller = target.closest(
      ".inquiry-inbox-page__body, .inquiry-thread__scroller, .client-workouts-body, .client-workouts-day__body"
    );
    if (scroller instanceof HTMLElement) {
      const { scrollTop, scrollHeight, clientHeight } = scroller;
      const canScroll = scrollHeight > clientHeight + 1;
      if (!canScroll) {
        event.preventDefault();
        return;
      }
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      if ((dy > 0 && atTop) || (dy < 0 && atBottom)) {
        event.preventDefault();
      }
      return;
    }

    event.preventDefault();
  }

  document.addEventListener("touchstart", onTouchStart, {
    passive: true,
    capture: true,
  });
  document.addEventListener("touchmove", onTouchMove, {
    passive: false,
    capture: true,
  });

  return () => {
    document.removeEventListener("touchstart", onTouchStart, true);
    document.removeEventListener("touchmove", onTouchMove, true);
    document.documentElement.style.removeProperty("--overlay-lock-top");
    window.scrollTo(0, y);
  };
}
