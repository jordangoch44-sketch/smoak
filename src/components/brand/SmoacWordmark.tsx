import Image from "next/image";
import {
  WORDMARK_HEIGHT,
  WORDMARK_SRC,
  WORDMARK_WIDTH,
} from "@/lib/brand";
import type { BrandWordmarkTone, BrandWordmarkVariant } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface SmoacWordmarkProps {
  variant?: BrandWordmarkVariant;
  tone?: BrandWordmarkTone;
  className?: string;
  priority?: boolean;
}

const variantClass: Record<BrandWordmarkVariant, string> = {
  primary: "smoac-wordmark--primary",
  compact: "smoac-wordmark--compact",
  display: "smoac-wordmark--display",
};

const toneClass: Record<BrandWordmarkTone, string> = {
  metallic: "smoac-wordmark--metallic",
  silver: "smoac-wordmark--silver",
  white: "smoac-wordmark--white",
};

/** Official SMOAC wordmark — transparent metallic logotype raster */
export function SmoacWordmark({
  variant = "primary",
  tone = "metallic",
  className,
  priority = false,
}: SmoacWordmarkProps) {
  return (
    <Image
      src={WORDMARK_SRC}
      alt=""
      width={WORDMARK_WIDTH}
      height={WORDMARK_HEIGHT}
      unoptimized
      priority={priority}
      quality={100}
      aria-hidden
      className={cn(
        "brand-logo__wordmark smoac-wordmark select-none object-contain object-left transition-[opacity,filter] duration-300 ease-out",
        variantClass[variant],
        toneClass[tone],
        className
      )}
      sizes="(max-width: 640px) 120px, 160px"
    />
  );
}
