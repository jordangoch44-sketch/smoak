import Image from "next/image";
import {
  BRAND_NAME,
  WORDMARK_HEIGHT,
  WORDMARK_SRC,
  WORDMARK_WIDTH,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

interface SmoacBrandNameProps {
  /** Optional prefix, e.g. "Welcome to" */
  prefix?: string;
  className?: string;
  wordmarkClassName?: string;
}

/**
 * Renders the official SMOAC letterforms (wordmark raster) inline.
 * Use for UI brand callouts — body copy stays plain text for accessibility/SEO.
 */
export function SmoacBrandName({
  prefix,
  className,
  wordmarkClassName,
}: SmoacBrandNameProps) {
  return (
    <span className={cn("smoac-brand-name", className)}>
      {prefix ? <span className="smoac-brand-name__prefix">{prefix}</span> : null}
      <Image
        src={WORDMARK_SRC}
        alt={BRAND_NAME}
        width={WORDMARK_WIDTH}
        height={WORDMARK_HEIGHT}
        unoptimized
        className={cn(
          "smoac-brand-name__wordmark select-none object-contain object-left",
          wordmarkClassName
        )}
      />
    </span>
  );
}
