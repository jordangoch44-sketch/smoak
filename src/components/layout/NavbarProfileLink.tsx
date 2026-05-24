"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CREATE_ACCOUNT_PATH } from "@/components/auth/LoginGateModal";
import { UserIcon } from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  getDashboardPathForRole,
  isDashboardPath,
  LOGIN_PATH,
} from "@/lib/auth-routes";
import { getUserRole, isLoggedIn } from "@/lib/specialist-saves";
import { afterLogoutNavigation, logoutWithToast } from "@/lib/logout-with-toast";
import { cn } from "@/lib/utils";

const SAVED_PATH = "/saved";

interface NavbarProfileLinkProps {
  className?: string;
}

export function NavbarProfileLink({ className }: NavbarProfileLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { isReady, session } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [openPath, setOpenPath] = useState(pathname);

  const signedIn = isReady && isLoggedIn(session);
  const role = getUserRole(session);

  if (pathname !== openPath) {
    setOpenPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleLogout() {
    logoutWithToast();
    setOpen(false);
    afterLogoutNavigation(() => {
      if (isDashboardPath(pathname) || pathname === LOGIN_PATH) {
        router.push(LOGIN_PATH);
      } else {
        router.refresh();
      }
    });
  }

  const dashboardHref =
    role != null ? getDashboardPathForRole(role) : LOGIN_PATH;

  return (
    <div ref={rootRef} className={cn("nav-profile", className)}>
      <button
        type="button"
        className={cn(
          "nav-profile__trigger",
          signedIn
            ? "nav-profile__trigger--signed-in"
            : "nav-profile__trigger--guest",
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
        onClick={() => setOpen((prev) => !prev)}
      >
        <UserIcon className="h-5 w-5" />
        <span
          className={cn(
            "nav-profile__status",
            signedIn
              ? "nav-profile__status--signed-in"
              : "nav-profile__status--guest"
          )}
          aria-hidden
        />
      </button>

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
                className="nav-profile__item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href={SAVED_PATH}
                className="nav-profile__item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Saved specialists
              </Link>
              <div className="nav-profile__divider" role="separator" />
              <button
                type="button"
                className="nav-profile__item nav-profile__item--danger"
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
                className="nav-profile__item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Log in
              </Link>
              <Link
                href={CREATE_ACCOUNT_PATH}
                className="nav-profile__item"
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
