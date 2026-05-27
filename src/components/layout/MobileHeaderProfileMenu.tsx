"use client";

import { TapLink } from "@/components/ui/TapLink";
import { usePathname, useRouter } from "next/navigation";
import { buildJoinFlowHref } from "@/lib/join-flow";
import { isAdminSession } from "@/lib/admin-auth";
import {
  getDashboardPathForRole,
  isDashboardPath,
  LOGIN_PATH,
} from "@/lib/auth-routes";
import { getUserRole, isLoggedIn } from "@/lib/specialist-saves";
import { afterLogoutNavigation, logoutWithToast } from "@/lib/logout-with-toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useStableClientState } from "@/hooks/useStableClientState";
import { cn } from "@/lib/utils";

const SAVED_PATH = "/saved";

interface MobileHeaderProfileMenuProps {
  onClose: () => void;
  className?: string;
}

export function MobileHeaderProfileMenu({
  onClose,
  className,
}: MobileHeaderProfileMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, session } = useAuthSession();
  const { clientReady } = useStableClientState();
  const signedIn = clientReady && isReady && isLoggedIn(session);
  const role = getUserRole(session);
  const dashboardHref =
    role != null ? getDashboardPathForRole(role) : LOGIN_PATH;
  const showAdminLink = isAdminSession(session);

  function handleLogout() {
    logoutWithToast();
    onClose();
    afterLogoutNavigation(() => {
      if (isDashboardPath(pathname) || pathname === LOGIN_PATH) {
        router.push(LOGIN_PATH);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div
      id="mobile-header-profile-menu"
      data-header-overlay-panel="profile"
      className={cn("header-profile-menu", className)}
      role="menu"
      aria-orientation="vertical"
    >
      {signedIn ? (
        <>
          <TapLink
            href={dashboardHref}
            className="nav-profile__item"
            role="menuitem"
            onClick={onClose}
          >
            {showAdminLink ? "Admin dashboard" : "Dashboard"}
          </TapLink>
          {showAdminLink ? null : (
          <TapLink
            href={SAVED_PATH}
            className="nav-profile__item"
            role="menuitem"
            onClick={onClose}
          >
            Saved specialists
          </TapLink>
          )}
          <div className="nav-profile__divider" role="separator" />
          <button
            type="button"
            className="smoac-control nav-profile__item nav-profile__item--danger"
            role="menuitem"
            onClick={handleLogout}
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <TapLink
            href={LOGIN_PATH}
            className="nav-profile__item"
            role="menuitem"
            onClick={onClose}
          >
            Log in
          </TapLink>
          <TapLink
            href={buildJoinFlowHref()}
            className="nav-profile__item"
            role="menuitem"
            onClick={onClose}
          >
            Create account
          </TapLink>
        </>
      )}
    </div>
  );
}
