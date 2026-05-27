"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { HeartIcon, UserIcon } from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { useStableClientState } from "@/hooks/useStableClientState";
import { canSaveSpecialists, isLoggedIn } from "@/lib/specialist-saves";
import { cn } from "@/lib/utils";

export interface SiteHeaderMobileProps {
  menuOpen: boolean;
  savedPanelOpen: boolean;
  profileMenuOpen: boolean;
  onLogoClick: () => void;
  onSavedClick: () => void;
  onProfileClick: () => void;
  onMenuClick: () => void;
}

/** Mobile header — native buttons, direct onClick (same pattern as /tap-test) */
export function SiteHeaderMobile({
  menuOpen,
  savedPanelOpen,
  profileMenuOpen,
  onLogoClick,
  onSavedClick,
  onProfileClick,
  onMenuClick,
}: SiteHeaderMobileProps) {
  const { clientReady } = useStableClientState();
  const { isReady, savedCount } = useSavedTrainers();
  const { session } = useAuthSession();
  const showBadge =
    clientReady && isReady && canSaveSpecialists(session) && savedCount > 0;

  return (
    <>
      <div className="site-header__frost" aria-hidden />
      <div className="site-header__toolbar">
        <Link
          href="/"
          data-header-btn="logo"
          className="smoac-control site-header__btn site-header__btn--logo"
          aria-label="SMOAC home"
          onClick={onLogoClick}
        >
          <Logo href={null} size="md" priority className="navbar-brand" />
        </Link>

        <div className="site-header__actions">
          <button
            type="button"
            data-header-btn="saved"
            className={cn(
              "smoac-control site-header__btn site-header__btn--saved navbar-saved-trigger",
              savedPanelOpen && "site-header__btn--active navbar-saved-trigger--active",
              showBadge && "site-header__btn--has-saves navbar-saved-trigger--has-saves"
            )}
            aria-label={
              savedPanelOpen
                ? "Close saved specialists"
                : showBadge
                  ? `Saved specialists, ${savedCount} saved`
                  : "Saved specialists"
            }
            aria-expanded={savedPanelOpen}
            aria-controls="saved-panel-dropdown"
            onClick={onSavedClick}
          >
            <HeartIcon className="h-5 w-5" filled={savedPanelOpen} />
            {clientReady && showBadge ? (
              <span
                className="site-header__badge site-header__badge--visible"
                aria-hidden={false}
              >
                {savedCount > 9 ? "9+" : savedCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            data-header-btn="profile"
            className={cn(
              "smoac-control site-header__btn site-header__btn--profile nav-profile__trigger nav-profile__trigger--guest",
              clientReady &&
                isReady &&
                isLoggedIn(session) &&
                "nav-profile__trigger--signed-in",
              profileMenuOpen && "site-header__btn--active nav-profile__trigger--open"
            )}
            aria-label="Account menu"
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            aria-controls="mobile-header-profile-menu"
            onClick={onProfileClick}
          >
            <UserIcon className="h-5 w-5" />
            <span
              className={cn(
                "nav-profile__status",
                clientReady && isReady && isLoggedIn(session)
                  ? "nav-profile__status--signed-in"
                  : "nav-profile__status--guest"
              )}
              aria-hidden
            />
          </button>

          <button
            type="button"
            data-header-btn="menu"
            className={cn(
              "smoac-control site-header__btn site-header__btn--menu navbar-menu-trigger",
              menuOpen && "site-header__btn--active navbar-menu-trigger--open"
            )}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            onClick={onMenuClick}
          >
            <span className="site-header__menu-bars" aria-hidden>
              <span
                className={cn(
                  "site-header__menu-line",
                  menuOpen && "site-header__menu-line--top-open"
                )}
              />
              <span
                className={cn(
                  "site-header__menu-line site-header__menu-line--mid",
                  menuOpen && "site-header__menu-line--mid-open"
                )}
              />
              <span
                className={cn(
                  "site-header__menu-line",
                  menuOpen && "site-header__menu-line--bottom-open"
                )}
              />
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
