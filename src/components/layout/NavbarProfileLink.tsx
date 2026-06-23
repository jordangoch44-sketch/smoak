"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { buildJoinFlowHref } from "@/lib/join-flow";
import { UserIcon } from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  getDashboardPathForRole,
  isDashboardPath,
  LOGIN_PATH,
} from "@/lib/auth-routes";
import { getUserRole, isLoggedIn } from "@/lib/specialist-saves";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import { useStableClientState } from "@/hooks/useStableClientState";
import { cn } from "@/lib/utils";
import { LoginSuggestionPopover } from "./LoginSuggestionPopover";

const SAVED_PATH = "/saved";

interface NavbarProfileLinkProps {
  className?: string;
  isHomePage?: boolean;
  /** When true, suppresses login suggestion (e.g. saved panel open on desktop) */
  navMenuOpen?: boolean;
  savedPanelOpen?: boolean;
  onCloseSavedPanel?: () => void;
}

export function NavbarProfileLink({
  className,
  isHomePage = false,
  navMenuOpen = false,
  savedPanelOpen = false,
  onCloseSavedPanel,
}: NavbarProfileLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { isReady, session, signOut } = useAuthSession();
  const { clientReady } = useStableClientState();
  const [open, setOpen] = useState(false);

  const signedIn = clientReady && isReady && isLoggedIn(session);
  const suppressLoginTip = !clientReady || !isReady || signedIn;
  const role = getUserRole(session);

  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("click", onClickOutside);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClickOutside);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleLogout() {
    void signOut().then(() => {
      setOpen(false);
      afterLogoutNavigation(() => {
        if (isDashboardPath(pathname) || pathname === LOGIN_PATH) {
          router.push(LOGIN_PATH);
        } else {
          router.refresh();
        }
      });
    });
  }

  const dashboardHref =
    role != null ? getDashboardPathForRole(role) : LOGIN_PATH;

  return (
    <div ref={rootRef} className={cn("nav-profile", className)}>
      <button
        type="button"
        data-header-control="profile"
        className={cn(
          "nav-profile__trigger smoac-hit-target nav-profile__trigger--guest",
          clientReady && signedIn && "nav-profile__trigger--signed-in",
          open && "nav-profile__trigger--open"
        )}
        aria-label={
          signedIn
            ? "Account menu"
            : "Sign in menu"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => {
          if (savedPanelOpen) onCloseSavedPanel?.();
          setOpen((prev) => !prev);
        }}
      >
        <UserIcon className="pointer-events-none h-5 w-5" />
        <span
          className={cn(
            "nav-profile__status pointer-events-none",
            clientReady && signedIn
              ? "nav-profile__status--signed-in"
              : "nav-profile__status--guest"
          )}
          aria-hidden
        />
      </button>

      <div className="hidden md:block">
        <LoginSuggestionPopover
          isLoggedIn={suppressLoginTip}
          isHomePage={isHomePage}
          profileMenuOpen={open}
          navMenuOpen={navMenuOpen}
          anchorRef={rootRef}
          onLoginClick={() => setOpen(true)}
        />
      </div>

      {open ? (
        <div
          id={menuId}
          className="nav-profile__menu"
          role="menu"
          aria-orientation="vertical"
        >
          {signedIn ? (
            <>
              <Link
                href={dashboardHref}
                className="nav-profile__item smoac-tap"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href={SAVED_PATH}
                className="nav-profile__item smoac-tap"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Saved specialists
              </Link>
              <div className="nav-profile__divider" role="separator" />
              <button
                type="button"
                className="nav-profile__item nav-profile__item--danger smoac-tap"
                role="menuitem"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href={LOGIN_PATH}
                className="nav-profile__item smoac-tap"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Log in
              </Link>
              <Link
                href={buildJoinFlowHref()}
                className="nav-profile__item smoac-tap"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Create account
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
