"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

export interface SiteHeaderMobileProps {
  menuOpen: boolean;
  onLogoClick: () => void;
  onMenuClick: () => void;
}

/** Mobile utility bar — logo + minimal menu (primary nav is bottom bar). */
export function SiteHeaderMobile({
  menuOpen,
  onLogoClick,
  onMenuClick,
}: SiteHeaderMobileProps) {
  return (
    <>
      <div className="site-header__frost" aria-hidden />
      <div className="site-header__aurora" aria-hidden />
      <div className="site-header__edge-light" aria-hidden />

      <div className="site-header__toolbar site-header__toolbar--utility">
        <Link
          href="/"
          data-header-btn="logo"
          className="smoac-control site-header__btn site-header__btn--logo"
          aria-label="SMOAC home"
          onClick={onLogoClick}
        >
          <Logo href={null} size="md" priority className="navbar-brand" />
        </Link>

        <button
          type="button"
          data-header-btn="menu"
          className={cn(
            "smoac-control site-header__btn site-header__btn--utility-menu",
            menuOpen && "site-header__btn--active"
          )}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-utility-drawer"
          onClick={onMenuClick}
        >
          <span className="site-header__menu-minimal" aria-hidden>
            <span
              className={cn(
                "site-header__menu-minimal-line",
                menuOpen && "site-header__menu-minimal-line--top-open"
              )}
            />
            <span
              className={cn(
                "site-header__menu-minimal-line",
                menuOpen && "site-header__menu-minimal-line--bottom-open"
              )}
            />
          </span>
        </button>
      </div>
    </>
  );
}
