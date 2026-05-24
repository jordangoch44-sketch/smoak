import Image from "next/image";
import Link from "next/link";
import { SmoacWordmark } from "@/components/brand/SmoacWordmark";
import { BRAND_NAME, LOGO_SRC } from "@/lib/brand";
import { cn } from "@/lib/utils";

const markSizeMap = {
  sm: "h-5 w-5",
  md: "h-6 w-6 sm:h-7 sm:w-7",
  lg: "h-7 w-7 sm:h-8 sm:w-8",
} as const;

const wordmarkVariantMap = {
  sm: "compact",
  md: "primary",
  lg: "display",
} as const;

interface LogoProps {
  href?: string | null;
  size?: keyof typeof markSizeMap;
  className?: string;
  priority?: boolean;
}

export function Logo({
  href = "/",
  size = "md",
  className,
  priority = false,
}: LogoProps) {
  const content = (
    <span className={cn("brand-logo", className)}>
      <Image
        src={LOGO_SRC}
        alt=""
        width={1024}
        height={1024}
        unoptimized
        priority={priority}
        quality={100}
        aria-hidden
        className={cn(
          "brand-logo__mark select-none object-contain transition-[opacity,transform,filter] duration-300 ease-out",
          markSizeMap[size]
        )}
        sizes="(max-width: 768px) 28px, 36px"
      />
      <SmoacWordmark
        variant={wordmarkVariantMap[size]}
        tone="metallic"
        priority={priority}
      />
    </span>
  );

  if (href === null) {
    return content;
  }

  return (
    <Link
      href={href}
      className="group inline-flex shrink-0 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[rgba(139,124,168,0.45)]"
      aria-label={`${BRAND_NAME} home`}
    >
      {content}
    </Link>
  );
}
