"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SmoacWordmark } from "@/components/brand/SmoacWordmark";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import { navigateAfterAuth } from "@/lib/post-login-flow";
import { SITE_ROUTES } from "@/lib/navigation";
import { getUserRole, isLoggedIn } from "@/lib/specialist-saves";
import "@/styles/profile-hub.css";

const PROFILE_BENEFITS = [
  "Save and compare specialists in one private shortlist",
  "Pick up where you left off across devices",
  "Get a faster path to consultations and follow-ups",
] as const;

export function ProfileHubPageClient() {
  const hydrated = useHydrated();
  const { isReady, session } = useAuthSession();

  const signedIn = isLoggedIn(session);
  const role = getUserRole(session);

  useEffect(() => {
    if (!hydrated || !isReady) return;
    if (!signedIn || !role) return;
    navigateAfterAuth(getDashboardPathForRole(role));
  }, [hydrated, isReady, role, signedIn]);

  if (!hydrated || !isReady) {
    return (
      <div className="profile-hub profile-hub--loading" aria-busy="true">
        <p className="profile-hub__loading-text">Loading your profile…</p>
      </div>
    );
  }

  if (signedIn && role) {
    return (
      <div className="profile-hub profile-hub--loading" aria-busy="true">
        <p className="profile-hub__loading-text">Opening your account…</p>
      </div>
    );
  }

  return (
    <div className="profile-hub">
      <div className="profile-hub__canvas" aria-hidden>
        <AuroraAtmosphere
          intensity="soft"
          starDensity="none"
          glowPosition="center"
          glowColor="magenta"
          enableMotion
          className="profile-hub__cosmic"
        />
      </div>

      <div className="profile-hub__shell">
        <div className="profile-hub__card">
          <div className="profile-hub__aurora" aria-hidden />
          <div className="profile-hub__sheen" aria-hidden />

          <div className="profile-hub__brand">
            <SmoacWordmark className="profile-hub__wordmark" />
          </div>

          <p className="profile-hub__eyebrow">Your account</p>
          <h1 className="profile-hub__title">Welcome to SMOAC</h1>
          <p className="profile-hub__lede">
            Create a free account to save specialists, build your shortlist, and
            manage everything from one place.
          </p>

          <ul className="profile-hub__benefits">
            {PROFILE_BENEFITS.map((benefit) => (
              <li key={benefit} className="profile-hub__benefit">
                {benefit}
              </li>
            ))}
          </ul>

          <div className="profile-hub__actions">
            <Link
              href={SITE_ROUTES.join}
              className="smoac-control profile-hub__cta-primary"
            >
              Create Free Account
            </Link>
            <Link
              href={SITE_ROUTES.login}
              className="smoac-control profile-hub__cta-secondary"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
