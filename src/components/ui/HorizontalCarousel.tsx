import { cn } from "@/lib/utils";

interface HorizontalCarouselProps {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  /** Accessible name for the scroll region */
  ariaLabel: string;
}

/**
 * Snap-scrolling horizontal gallery — hidden scrollbar, momentum on touch.
 */
export function HorizontalCarousel({
  children,
  className,
  trackClassName,
  ariaLabel,
}: HorizontalCarouselProps) {
  return (
    <div className={cn("horizontal-carousel", className)}>
      <div
        className={cn("horizontal-carousel__track", trackClassName)}
        role="list"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>
  );
}
