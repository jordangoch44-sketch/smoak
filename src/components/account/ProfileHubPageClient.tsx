"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { UserPlusIcon } from "@/components/ui/icons";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import { navigateAfterAuth } from "@/lib/post-login-flow";
import { SITE_ROUTES } from "@/lib/navigation";
import { getUserRole, isLoggedIn } from "@/lib/specialist-saves";
import "@/styles/profile-hub.css";

const PROFILE_FEATURES: {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    id: "save",
    title: "Save your favorite specialists",
    description: "Build your private list and compare easily.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="profile-hub__feature-glyph">
        <path
          d="M12 3.5l2.35 4.76 5.25.76-3.8 3.7.9 5.24L12 15.48l-4.7 2.48.9-5.24-3.8-3.7 5.25-.76L12 3.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "contact",
    title: "Contact specialists faster",
    description: "Message, book, or request info in one tap.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="profile-hub__feature-glyph">
        <path
          d="M13 3L5.5 13.5H12l-.8 7.5L18.5 10H12L13 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "free",
    title: "Free — no credit card required",
    description: "Always free to create your account.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="profile-hub__feature-glyph">
        <path
          d="M12 3.5c-2.4 1.35-4.9 2-7.5 2v6.4c0 4.35 3.05 7.95 7.5 9.1 4.45-1.15 7.5-4.75 7.5-9.1V5.5c-2.6 0-5.1-.65-7.5-2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 12.1l1.7 1.7 3.5-3.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

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

          <div className="profile-hub__hero-badge" aria-hidden>
            <span className="profile-hub__hero-badge-ring" />
            <UserPlusIcon className="profile-hub__hero-badge-icon" />
          </div>

          <h1 className="profile-hub__title">
            Sign up{" "}
            <span className="profile-hub__title-accent">for free</span>
          </h1>
          <p className="profile-hub__lede">20 sec sign up then connect!</p>

          <div className="profile-hub__divider" aria-hidden>
            <span className="profile-hub__divider-line" />
            <span className="profile-hub__divider-spark" />
            <span className="profile-hub__divider-line" />
          </div>

          <ul className="profile-hub__features">
            {PROFILE_FEATURES.map((feature) => (
              <li key={feature.id} className="profile-hub__feature">
                <span className="profile-hub__feature-icon">{feature.icon}</span>
                <span className="profile-hub__feature-copy">
                  <span className="profile-hub__feature-title">{feature.title}</span>
                  <span className="profile-hub__feature-desc">
                    {feature.description}
                  </span>
                </span>
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
            <p className="profile-hub__timing">
              <svg
                className="profile-hub__timing-icon"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <circle
                  cx="12"
                  cy="12"
                  r="7.25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M12 8.5V12l2.5 1.75"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Takes less than 60 seconds
            </p>
            <Link
              href={SITE_ROUTES.login}
              className="smoac-control profile-hub__cta-secondary"
            >
              Log In
            </Link>
          </div>
        </div>

        <div className="profile-hub__footer-brand">
          <Logo href={null} size="sm" className="profile-hub__footer-logo" />
          <p className="profile-hub__footer-tagline">
            Connecting people with trusted fitness specialists.
          </p>
        </div>
      </div>
    </div>
  );
}
