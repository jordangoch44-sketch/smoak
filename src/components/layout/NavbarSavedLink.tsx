"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface NavbarSavedLinkProps {
  className?: string;
  showLabel?: boolean;
}

export function NavbarSavedLink({
  className,
  showLabel = false,
}: NavbarSavedLinkProps) {
  const pathname = usePathname();
  const { savedCount } = useSavedTrainers();
  const active = pathname === "/saved";

  return (
    <Link
      href="/saved"
      className={cn(
        "relative inline-flex min-h-11 items-center justify-center rounded-full transition-colors",
        showLabel ? "gap-2 px-3" : "h-11 w-11",
        active
          ? "text-white"
          : "text-silver-400 active:text-white md:hover:text-white",
        className
      )}
      aria-label={
        savedCount > 0
          ? `Saved specialists, ${savedCount} saved`
          : "Saved specialists"
      }
    >
      <span className="inline-flex items-center justify-center">
        <HeartIcon className="h-5 w-5" filled={savedCount > 0} />
      </span>
      {showLabel && (
        <span className="text-sm tracking-wide">Saved</span>
      )}
      {savedCount > 0 && (
        <span
          className={cn(
            "flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-none text-black",
            showLabel ? "ml-0.5" : "absolute -top-0.5 -right-1"
          )}
        >
          {savedCount > 9 ? "9+" : savedCount}
        </span>
      )}
    </Link>
  );
}
