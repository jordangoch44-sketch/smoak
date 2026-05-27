"use client";

import { usePathname } from "next/navigation";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { useAuthSession } from "@/hooks/useAuthSession";
import { canSaveSpecialists } from "@/lib/specialist-saves";
import { HeartIcon } from "@/components/ui/icons";
import { useStableClientState } from "@/hooks/useStableClientState";
import { cn } from "@/lib/utils";

interface NavbarSavedLinkProps {
  open: boolean;
  onToggle: () => void;
  className?: string;
  showLabel?: boolean;
}

export function NavbarSavedLink({
  open,
  onToggle,
  className,
  showLabel = false,
}: NavbarSavedLinkProps) {
  const pathname = usePathname();
  const { clientReady } = useStableClientState();
  const { isReady, savedCount } = useSavedTrainers();
  const { session } = useAuthSession();
  const showBadge =
    clientReady && isReady && canSaveSpecialists(session) && savedCount > 0;
  const onSavedRoute = pathname === "/saved";
  const active = open || onSavedRoute;
  return (
    <button
      type="button"
      data-header-control="saved"
      className={cn(
        "navbar-saved-trigger smoac-hit-target relative rounded-full",
        showLabel ? "gap-2 px-3" : "",
        active
          ? "navbar-saved-trigger--active text-white"
          : "text-silver-400 md:hover:text-white",
        showBadge && "navbar-saved-trigger--has-saves",
        className
      )}
      onClick={onToggle}
      aria-label={
        open
          ? "Close saved specialists"
          : showBadge
            ? `Saved specialists, ${savedCount} saved`
            : "Saved specialists"
      }
      aria-expanded={open}
      aria-controls="saved-panel-dropdown"
    >
      <span className="inline-flex items-center justify-center pointer-events-none">
        <HeartIcon className="h-5 w-5" filled={open} />
      </span>
      {showLabel && (
        <span className="pointer-events-none text-sm tracking-wide">Saved</span>
      )}
      <span
        className={cn(
          "pointer-events-none flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-none text-black transition-opacity duration-150",
          showLabel ? "ml-0.5" : "absolute -top-0.5 -right-1",
          showBadge ? "opacity-100" : "opacity-0 scale-75"
        )}
        aria-hidden={!showBadge}
      >
        {showBadge ? (savedCount > 9 ? "9+" : savedCount) : "0"}
      </span>
    </button>
  );
}
