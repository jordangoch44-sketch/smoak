"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteLocationPill } from "@/components/location/SiteLocationPill";
import { Logo } from "@/components/ui/Logo";
import { primaryNavLinks } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { NavbarSavedLink } from "./NavbarSavedLink";
import { NavbarProfileLink } from "./NavbarProfileLink";
import { SiteHeaderProBadge } from "./SiteHeaderProBadge";

interface SiteHeaderDesktopProps {
  savedPanelOpen: boolean;
  onSavedClick: () => void;
  onCloseSavedPanel: () => void;
  isHomePage: boolean;
}

export function SiteHeaderDesktop({
  savedPanelOpen,
  onSavedClick,
  onCloseSavedPanel,
  isHomePage,
}: SiteHeaderDesktopProps) {
  const pathname = usePathname();

  return (
    <>
      <div className="site-navbar__frost site-header__frost" aria-hidden />
      <div className="site-navbar__inner site-header__toolbar mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6 lg:h-[72px]">
        <div className="site-header__brand">
          <Link
            href="/"
            className="smoac-hit-target group inline-flex shrink-0 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[rgba(139,124,168,0.45)]"
            aria-label="SMOAC home"
          >
            <Logo href={null} size="md" priority className="navbar-brand" />
          </Link>
          <SiteHeaderProBadge />
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-6 lg:gap-8">
          {primaryNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "smoac-tap text-sm tracking-wide transition-colors",
                pathname === link.href
                  ? "text-white"
                  : "text-silver-400 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
          <NavbarSavedLink
            open={savedPanelOpen}
            onToggle={onSavedClick}
            showLabel
          />
          <NavbarProfileLink
            isHomePage={isHomePage}
            navMenuOpen={savedPanelOpen}
            savedPanelOpen={savedPanelOpen}
            onCloseSavedPanel={onCloseSavedPanel}
          />
          <SiteLocationPill className="site-header__location hidden sm:inline-flex" />
          <Link
            href="/explore"
            className="smoac-tap inline-flex min-h-11 items-center rounded-full bg-white px-6 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Find Your Specialist
          </Link>
        </div>
      </div>
    </>
  );
}
