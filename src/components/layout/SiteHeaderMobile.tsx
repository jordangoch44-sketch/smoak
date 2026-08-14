"use client";

import Link from "next/link";
import { SiteLocationPill } from "@/components/location/SiteLocationPill";
import { Logo } from "@/components/ui/Logo";
import { useAuthSession } from "@/hooks/useAuthSession";
import { SITE_ROUTES } from "@/lib/navigation";
import { SiteHeaderProBadge } from "./SiteHeaderProBadge";

export interface SiteHeaderMobileProps {
  onLogoClick: () => void;
}

/** Mobile utility bar — logo, ZIP, Sign up (primary nav is bottom bar). */
export function SiteHeaderMobile({ onLogoClick }: SiteHeaderMobileProps) {
  const { isReady, isSignedIn } = useAuthSession();
  const showSignUp = isReady && !isSignedIn;

  return (
    <>
      <div className="site-header__frost" aria-hidden />
      <div className="site-header__aurora" aria-hidden />
      <div className="site-header__edge-light" aria-hidden />

      <div className="site-header__toolbar site-header__toolbar--utility">
        <div className="site-header__brand">
          <Link
            href="/"
            data-header-btn="logo"
            className="smoac-control site-header__btn site-header__btn--logo site-header__logo-slot"
            aria-label="SMOAC home"
            onClick={onLogoClick}
          >
            <Logo href={null} size="md" priority className="navbar-brand" />
          </Link>
          <SiteHeaderProBadge />
        </div>

        <div className="site-header__utility-end">
          <SiteLocationPill className="site-header__location" compact primary />

          {showSignUp ? (
            <Link
              href={SITE_ROUTES.profile}
              data-header-btn="signup"
              className="smoac-control site-header__signup"
            >
              Sign up
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}
