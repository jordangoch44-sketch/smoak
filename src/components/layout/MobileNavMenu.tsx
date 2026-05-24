"use client";

/** Mobile-only glass nav overlay — desktop uses inline links in Navbar */
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MENU_EASE, primaryNavLinks } from "@/lib/navigation";

interface MobileNavMenuProps {
  open: boolean;
  pathname: string;
  onClose: () => void;
  onOpenSavedPanel: () => void;
  savedPanelOpen: boolean;
}

export function MobileNavMenu({
  open,
  pathname,
  onClose,
  onOpenSavedPanel,
  savedPanelOpen,
}: MobileNavMenuProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-40 md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-500",
          open ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionTimingFunction: MENU_EASE }}
      />

      <div
        id="mobile-nav-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "absolute right-4 left-4 top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.5rem)] rounded-2xl border border-white/[0.12] bg-white/[0.04] shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl backdrop-saturate-150 sm:top-[calc(4rem+env(safe-area-inset-top,0px)+0.5rem)]",
          "transition-[opacity,transform] duration-500 will-change-transform",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-3 scale-[0.97] opacity-0"
        )}
        style={{ transitionTimingFunction: MENU_EASE }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-4">
          <nav className="flex flex-col gap-2">
            {primaryNavLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  "group flex min-h-[52px] items-center rounded-xl px-4 text-[17px] tracking-wide transition-[background-color,color] duration-200 active:bg-white/[0.08]",
                  open && "mobile-nav-link",
                  pathname === link.href
                    ? "bg-white/[0.08] font-medium text-white"
                    : "text-silver-200 active:text-white"
                )}
                style={
                  open ? { animationDelay: `${80 + index * 55}ms` } : undefined
                }
              >
                <span className="flex w-full items-center justify-between">
                  {link.label}
                  <span
                    className={cn(
                      "text-silver-500 transition-transform duration-300 group-active:translate-x-0.5",
                      pathname === link.href && "text-white/60"
                    )}
                    aria-hidden
                  >
                    →
                  </span>
                </span>
              </Link>
            ))}

            <button
              type="button"
              onClick={() => {
                onOpenSavedPanel();
              }}
              className={cn(
                "flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 text-left text-[17px] tracking-wide transition-[background-color,color] duration-200 active:bg-white/[0.08]",
                open && "mobile-nav-link",
                savedPanelOpen || pathname === "/saved"
                  ? "bg-white/[0.08] font-medium text-white"
                  : "text-silver-200 active:text-white"
              )}
              style={open ? { animationDelay: "165ms" } : undefined}
            >
              Saved specialists
            </button>

            <div
              className={cn("mt-2 pt-2", open && "mobile-nav-link")}
              style={open ? { animationDelay: "220ms" } : undefined}
            >
              <div className="mb-3 h-px bg-white/[0.06]" />
              <Link
                href="/explore"
                onClick={onClose}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-white px-6 text-[15px] font-medium tracking-wide text-black shadow-[0_4px_24px_rgba(255,255,255,0.12)] transition-[transform,opacity,box-shadow] duration-200 active:scale-[0.98] active:opacity-90"
              >
                Find Your Specialist
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
