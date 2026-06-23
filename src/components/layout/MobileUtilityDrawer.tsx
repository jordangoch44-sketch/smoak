"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { TapLink } from "@/components/ui/TapLink";
import {
  CalendarIcon,
  CloseIcon,
  HeartIcon,
  HomeIcon,
  LayoutGridIcon,
  SearchIcon,
  TrophyIcon,
  UserIcon,
} from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useStableClientState } from "@/hooks/useStableClientState";
import { isDashboardPath, LOGIN_PATH } from "@/lib/auth-routes";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import { getUserRole, isLoggedIn } from "@/lib/specialist-saves";
import {
  getUtilityDrawerPrimaryLinks,
  isUtilityDrawerPrimaryActive,
  resolveUtilityDrawerDashboardHref,
  utilityDrawerLegalLinks,
  utilityDrawerSecondaryLinks,
  type UtilityDrawerNavItem,
  type UtilityDrawerPrimaryId,
  type UtilityDrawerPrimaryItem,
} from "@/lib/utility-drawer-menu";
import { cn } from "@/lib/utils";
import "@/styles/mobile-utility-drawer.css";

interface MobileUtilityDrawerProps {
  open: boolean;
  onClose: () => void;
}

const PRIMARY_ICONS: Record<UtilityDrawerPrimaryId, ReactNode> = {
  home: <HomeIcon className="mobile-utility-drawer__row-icon-svg" />,
  explore: <SearchIcon className="mobile-utility-drawer__row-icon-svg" />,
  saved: <HeartIcon className="mobile-utility-drawer__row-icon-svg" />,
  rankings: <TrophyIcon className="mobile-utility-drawer__row-icon-svg" />,
  events: <CalendarIcon className="mobile-utility-drawer__row-icon-svg" />,
  dashboard: <LayoutGridIcon className="mobile-utility-drawer__row-icon-svg" />,
};

function DrawerPrimaryRow({
  item,
  active,
  animate,
  delayMs,
  onNavigate,
}: {
  item: UtilityDrawerPrimaryItem;
  active: boolean;
  animate: boolean;
  delayMs: number;
  onNavigate: () => void;
}) {
  if (item.href == null) {
    return (
      <li>
        <div
          className={cn(
            "mobile-utility-drawer__row mobile-utility-drawer__row--disabled",
            animate && "mobile-utility-drawer__row--animate"
          )}
          style={animate ? { animationDelay: `${delayMs}ms` } : undefined}
          aria-disabled="true"
        >
          <span className="mobile-utility-drawer__row-icon" aria-hidden>
            {PRIMARY_ICONS[item.id]}
          </span>
          <span className="mobile-utility-drawer__row-copy">
            <span className="mobile-utility-drawer__row-label">{item.label}</span>
            <span className="mobile-utility-drawer__row-desc">
              {item.description}
            </span>
          </span>
        </div>
      </li>
    );
  }

  return (
    <li>
      <TapLink
        href={item.href}
        className={cn(
          "mobile-utility-drawer__row smoac-hit-target",
          active && "mobile-utility-drawer__row--active",
          animate && "mobile-utility-drawer__row--animate"
        )}
        style={animate ? { animationDelay: `${delayMs}ms` } : undefined}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
      >
        <span className="mobile-utility-drawer__row-icon" aria-hidden>
          {PRIMARY_ICONS[item.id]}
        </span>
        <span className="mobile-utility-drawer__row-copy">
          <span className="mobile-utility-drawer__row-label">{item.label}</span>
          <span className="mobile-utility-drawer__row-desc">
            {item.description}
          </span>
        </span>
      </TapLink>
    </li>
  );
}

function DrawerTextRow({
  item,
  animate,
  delayMs,
  onNavigate,
}: {
  item: UtilityDrawerNavItem;
  animate: boolean;
  delayMs: number;
  onNavigate?: () => void;
}) {
  if (item.href == null) {
    return (
      <li>
        <div
          className={cn(
            "mobile-utility-drawer__row mobile-utility-drawer__row--disabled",
            animate && "mobile-utility-drawer__row--animate"
          )}
          style={animate ? { animationDelay: `${delayMs}ms` } : undefined}
          aria-disabled="true"
        >
          <span className="mobile-utility-drawer__row-copy">
            <span className="mobile-utility-drawer__row-label">{item.label}</span>
            <span className="mobile-utility-drawer__row-desc">Coming soon</span>
          </span>
        </div>
      </li>
    );
  }

  const href = item.href;

  return (
    <li>
      <TapLink
        href={href}
        className={cn(
          "mobile-utility-drawer__row mobile-utility-drawer__row--compact smoac-hit-target",
          animate && "mobile-utility-drawer__row--animate"
        )}
        style={animate ? { animationDelay: `${delayMs}ms` } : undefined}
        onClick={onNavigate}
      >
        <span className="mobile-utility-drawer__row-label">{item.label}</span>
      </TapLink>
    </li>
  );
}

export function MobileUtilityDrawer({ open, onClose }: MobileUtilityDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, session, signOut } = useAuthSession();
  const { clientReady } = useStableClientState();
  const signedIn = clientReady && isReady && isLoggedIn(session);
  const role = getUserRole(session);
  const dashboardHref = resolveUtilityDrawerDashboardHref(signedIn, role);
  const primaryLinks = getUtilityDrawerPrimaryLinks(dashboardHref);

  function handleLogout() {
    void signOut().then(() => {
      onClose();
      afterLogoutNavigation(() => {
        if (isDashboardPath(pathname) || pathname === LOGIN_PATH) {
          router.push(LOGIN_PATH);
        } else {
          router.refresh();
        }
      });
    });
  }

  let staggerIndex = 0;
  const nextDelay = () => 48 + staggerIndex++ * 36;

  return (
    <div
      data-header-overlay-panel="menu"
      className={cn(
        "mobile-utility-drawer",
        open && "mobile-utility-drawer--open"
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="smoac-control mobile-utility-drawer__backdrop"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />

      <aside
        id="mobile-utility-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-utility-drawer-title"
        className="mobile-utility-drawer__panel"
      >
        <div className="mobile-utility-drawer__aurora" aria-hidden />
        <div className="mobile-utility-drawer__sheen" aria-hidden />
        <div className="mobile-utility-drawer__edge-glow" aria-hidden />

        <header className="mobile-utility-drawer__masthead">
          <div className="mobile-utility-drawer__brand">
            <Logo href={null} size="sm" className="mobile-utility-drawer__logo" />
            <p
              id="mobile-utility-drawer-title"
              className="mobile-utility-drawer__menu-label"
            >
              MENU
            </p>
            <p className="mobile-utility-drawer__tagline">
              Navigate your specialist network.
            </p>
          </div>
          <button
            type="button"
            className="smoac-control mobile-utility-drawer__close"
            aria-label="Close menu"
            onClick={onClose}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="mobile-utility-drawer__scroll">
          <section
            className="mobile-utility-drawer__section"
            aria-label="Primary navigation"
          >
            <ul className="mobile-utility-drawer__list">
              {primaryLinks.map((item) => (
                <DrawerPrimaryRow
                  key={item.id}
                  item={item}
                  active={isUtilityDrawerPrimaryActive(item.id, pathname)}
                  animate={open}
                  delayMs={nextDelay()}
                  onNavigate={onClose}
                />
              ))}
            </ul>
          </section>

          <section
            className="mobile-utility-drawer__section"
            aria-label="Company"
          >
            <p className="mobile-utility-drawer__section-label">Company</p>
            <ul className="mobile-utility-drawer__list mobile-utility-drawer__list--compact">
              {utilityDrawerSecondaryLinks.map((item) => (
                <DrawerTextRow
                  key={item.id}
                  item={item}
                  animate={open}
                  delayMs={nextDelay()}
                />
              ))}
            </ul>
          </section>

          <section
            className="mobile-utility-drawer__section"
            aria-label="Legal"
          >
            <p className="mobile-utility-drawer__section-label">Legal</p>
            <ul className="mobile-utility-drawer__list mobile-utility-drawer__list--compact">
              {utilityDrawerLegalLinks.map((item) => (
                <DrawerTextRow
                  key={item.id}
                  item={item}
                  animate={open}
                  delayMs={nextDelay()}
                />
              ))}
            </ul>
          </section>

          {signedIn ? (
            <section className="mobile-utility-drawer__section">
              <button
                type="button"
                className={cn(
                  "smoac-control mobile-utility-drawer__row mobile-utility-drawer__row--sign-out smoac-hit-target",
                  open && "mobile-utility-drawer__row--animate"
                )}
                style={
                  open ? { animationDelay: `${nextDelay()}ms` } : undefined
                }
                onClick={handleLogout}
              >
                <span className="mobile-utility-drawer__row-icon" aria-hidden>
                  <UserIcon className="mobile-utility-drawer__row-icon-svg" />
                </span>
                <span className="mobile-utility-drawer__row-copy">
                  <span className="mobile-utility-drawer__row-label">
                    Sign out
                  </span>
                  <span className="mobile-utility-drawer__row-desc">
                    End your session on this device
                  </span>
                </span>
              </button>
            </section>
          ) : null}
        </div>

        <footer className="mobile-utility-drawer__footer">
          <p className="mobile-utility-drawer__footer-brand">SMOAC LLC</p>
          <p className="mobile-utility-drawer__footer-line">
            San Diego, California
          </p>
          <p className="mobile-utility-drawer__footer-copy">
            © 2026 SMOAC LLC
          </p>
        </footer>
      </aside>
    </div>
  );
}
