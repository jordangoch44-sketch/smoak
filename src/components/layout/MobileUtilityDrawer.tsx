"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { QuickClientAccountModal } from "@/components/auth/QuickClientAccountModal";
import { Logo } from "@/components/ui/Logo";
import { TapLink } from "@/components/ui/TapLink";
import {
  ChartIcon,
  CloseIcon,
  EyeIcon,
  HeartIcon,
  HelpCircleIcon,
  InfoIcon,
  LogOutIcon,
  MessageBubbleIcon,
  TrophyIcon,
} from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { useStableClientState } from "@/hooks/useStableClientState";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import { DEMO_SPECIALIST_ID } from "@/constants/specialist-dashboard-mock";
import { isDemoSpecialistDashboard } from "@/lib/managed-specialist-profile";
import { getSpecialistProfileAnalytics } from "@/lib/specialist-dashboard-analytics";
import { getUserRole, isLoggedIn } from "@/lib/specialist-saves";
import { showToast } from "@/lib/toast-store";
import {
  getSpecialistAnalyticsHref,
  getUtilityDrawerAccountCard,
  isUtilityDrawerAccountActive,
  UTILITY_DRAWER_APP_VERSION,
  utilityDrawerCompanyLinks,
  utilityDrawerLegalLinks,
  utilityDrawerSpecialistLinks,
  type UtilityDrawerAccountCard,
  type UtilityDrawerNavItem,
} from "@/lib/utility-drawer-menu";
import { cn } from "@/lib/utils";
import "@/styles/mobile-utility-drawer.css";

interface MobileUtilityDrawerProps {
  open: boolean;
  onClose: () => void;
}

const COMPANY_ICONS: Record<string, ReactNode> = {
  about: <InfoIcon className="mobile-utility-drawer__row-icon-svg" />,
  support: <HelpCircleIcon className="mobile-utility-drawer__row-icon-svg" />,
};

function formatMetric(value: number): string {
  return value.toLocaleString("en-US");
}

function DrawerAccountCard({
  card,
  active,
  animate,
  delayMs,
  onContinue,
  onNavigate,
}: {
  card: UtilityDrawerAccountCard;
  active: boolean;
  animate: boolean;
  delayMs: number;
  onContinue?: () => void;
  onNavigate: () => void;
}) {
  const body = (
    <>
      <span className="mobile-utility-drawer__account-avatar" aria-hidden>
        {card.variant === "profile" && card.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- session avatars may be remote (Supabase) without next/image allowlist
          <img
            src={card.avatarUrl}
            alt=""
            className="mobile-utility-drawer__account-photo"
          />
        ) : (
          <span className="mobile-utility-drawer__account-initials">
            {card.initials}
          </span>
        )}
      </span>
      <span className="mobile-utility-drawer__account-copy">
        <span className="mobile-utility-drawer__account-title">{card.title}</span>
        <span className="mobile-utility-drawer__account-subtitle">
          {card.subtitle}
        </span>
        <span className="mobile-utility-drawer__account-cta">
          {card.actionLabel}
        </span>
      </span>
    </>
  );

  const className = cn(
    "mobile-utility-drawer__account smoac-hit-target",
    card.variant === "auth" && "mobile-utility-drawer__account--auth",
    card.variant === "profile" && "mobile-utility-drawer__account--profile",
    active && "mobile-utility-drawer__account--active",
    animate && "mobile-utility-drawer__account--animate"
  );
  const style = animate ? { animationDelay: `${delayMs}ms` } : undefined;

  if (card.variant === "auth") {
    return (
      <button
        type="button"
        className={cn(className, "smoac-control")}
        style={style}
        onClick={onContinue}
      >
        {body}
      </button>
    );
  }

  if (!card.href) return null;

  return (
    <TapLink
      href={card.href}
      className={className}
      style={style}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {body}
    </TapLink>
  );
}

function DrawerCompanyRow({
  item,
  animate,
  delayMs,
  onNavigate,
}: {
  item: UtilityDrawerNavItem;
  animate: boolean;
  delayMs: number;
  onNavigate: () => void;
}) {
  const className = cn(
    "smoac-control mobile-utility-drawer__row smoac-hit-target",
    animate && "mobile-utility-drawer__row--animate"
  );
  const style = animate ? { animationDelay: `${delayMs}ms` } : undefined;
  const content = (
    <>
      <span className="mobile-utility-drawer__row-icon" aria-hidden>
        {COMPANY_ICONS[item.id] ?? (
          <InfoIcon className="mobile-utility-drawer__row-icon-svg" />
        )}
      </span>
      <span className="mobile-utility-drawer__row-copy">
        <span className="mobile-utility-drawer__row-label">{item.label}</span>
        {item.description ? (
          <span className="mobile-utility-drawer__row-desc">
            {item.description}
          </span>
        ) : null}
      </span>
    </>
  );

  if (item.href) {
    return (
      <li>
        <TapLink
          href={item.href}
          className={className}
          style={style}
          onClick={onNavigate}
        >
          {content}
        </TapLink>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        className={className}
        style={style}
        onClick={() =>
          showToast({
            type: "info",
            message: `${item.label} is coming soon.`,
          })
        }
      >
        {content}
      </button>
    </li>
  );
}

function DrawerSpecialistAnalytics({
  animate,
  delayMs,
  onNavigate,
}: {
  animate: boolean;
  delayMs: number;
  onNavigate: () => void;
}) {
  const { session } = useAuthSession();
  const { trainerId, trainer, profileCompletion } = useManagedSpecialistProfile();
  const useDemoMetrics = isDemoSpecialistDashboard(trainerId, session?.email);
  const analyticsId =
    trainerId ?? (useDemoMetrics ? DEMO_SPECIALIST_ID : "empty");

  const analytics = getSpecialistProfileAnalytics(analyticsId, {
    profileCompletionPercent: profileCompletion,
    rankingPosition: null,
    useDemoMetrics,
  });

  const viewsMetric = analytics.coreMetrics.find((m) => m.id === "profile-views");
  const growth =
    viewsMetric?.trend.direction === "up"
      ? `+${viewsMetric.trend.percentChange}%`
      : viewsMetric?.trend.direction === "down"
        ? `-${viewsMetric.trend.percentChange}%`
        : null;

  return (
    <section
      className={cn(
        "mobile-utility-drawer__section mobile-utility-drawer__section--analytics",
        animate && "mobile-utility-drawer__analytics--animate"
      )}
      style={animate ? { animationDelay: `${delayMs}ms` } : undefined}
      aria-label="Analytics"
    >
      <p className="mobile-utility-drawer__section-label">Analytics</p>
      <div className="mobile-utility-drawer__analytics">
        <p className="mobile-utility-drawer__analytics-period">
          {analytics.periodLabel}
          {trainer?.name ? ` · ${trainer.name.split(" ")[0]}` : ""}
        </p>
        <ul className="mobile-utility-drawer__analytics-grid">
          <li>
            <span className="mobile-utility-drawer__metric-icon" aria-hidden>
              <EyeIcon className="mobile-utility-drawer__row-icon-svg" />
            </span>
            <span className="mobile-utility-drawer__metric-value">
              {formatMetric(analytics.profileViews)}
            </span>
            <span className="mobile-utility-drawer__metric-label">
              Profile Views
            </span>
          </li>
          <li>
            <span className="mobile-utility-drawer__metric-icon" aria-hidden>
              <HeartIcon className="mobile-utility-drawer__row-icon-svg" />
            </span>
            <span className="mobile-utility-drawer__metric-value">
              {formatMetric(analytics.savedByClients)}
            </span>
            <span className="mobile-utility-drawer__metric-label">Saves</span>
          </li>
          <li>
            <span className="mobile-utility-drawer__metric-icon" aria-hidden>
              <MessageBubbleIcon className="mobile-utility-drawer__row-icon-svg" />
            </span>
            <span className="mobile-utility-drawer__metric-value">
              {formatMetric(analytics.contactClicks)}
            </span>
            <span className="mobile-utility-drawer__metric-label">
              Inquiries
            </span>
          </li>
          <li>
            <span className="mobile-utility-drawer__metric-icon" aria-hidden>
              <TrophyIcon className="mobile-utility-drawer__row-icon-svg" />
            </span>
            <span className="mobile-utility-drawer__metric-value">
              {analytics.rankingPosition != null
                ? `#${analytics.rankingPosition}`
                : "—"}
            </span>
            <span className="mobile-utility-drawer__metric-label">Ranking</span>
          </li>
        </ul>
        {growth ? (
          <p className="mobile-utility-drawer__analytics-growth">
            <ChartIcon className="mobile-utility-drawer__growth-icon" />
            {growth} Growth
          </p>
        ) : null}
        <TapLink
          href={getSpecialistAnalyticsHref()}
          className="smoac-control mobile-utility-drawer__analytics-cta smoac-hit-target"
          onClick={onNavigate}
        >
          View Full Analytics
        </TapLink>
      </div>
    </section>
  );
}

export function MobileUtilityDrawer({ open, onClose }: MobileUtilityDrawerProps) {
  const pathname = usePathname();
  const { isReady, session, signOut } = useAuthSession();
  const { clientReady } = useStableClientState();
  const { trainer: managedTrainer } = useManagedSpecialistProfile();
  const [quickAccountOpen, setQuickAccountOpen] = useState(false);
  const signedIn = clientReady && isReady && isLoggedIn(session);
  const role = getUserRole(session);
  const specialistDisplayName =
    role === "specialist"
      ? managedTrainer?.name?.trim() || session?.displayName
      : session?.displayName;
  const accountCard = getUtilityDrawerAccountCard({
    signedIn,
    role,
    firstName: session?.firstName,
    displayName: specialistDisplayName,
    email: session?.email,
    avatarUrl: session?.avatarUrl ?? managedTrainer?.image,
  });

  function handleLogout() {
    void signOut().then(() => {
      onClose();
      afterLogoutNavigation("/profile");
    });
  }

  function openQuickAccount() {
    setQuickAccountOpen(true);
  }

  let staggerIndex = 0;
  const nextDelay = () => 40 + staggerIndex++ * 32;

  return (
    <>
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
          <div className="mobile-utility-drawer__aurora-drift" aria-hidden />
          <div className="mobile-utility-drawer__sheen" aria-hidden />
          <div className="mobile-utility-drawer__edge-glow" aria-hidden />

          <header className="mobile-utility-drawer__masthead">
            <div className="mobile-utility-drawer__brand">
              <Logo
                href={null}
                size="sm"
                className="mobile-utility-drawer__logo"
              />
              <p
                id="mobile-utility-drawer-title"
                className="mobile-utility-drawer__menu-label"
              >
                Account
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
              className="mobile-utility-drawer__section mobile-utility-drawer__section--account"
              aria-label={signedIn ? "Account" : "Sign in"}
            >
              <DrawerAccountCard
                card={accountCard}
                active={
                  signedIn ? isUtilityDrawerAccountActive(pathname) : false
                }
                animate={open}
                delayMs={nextDelay()}
                onContinue={openQuickAccount}
                onNavigate={onClose}
              />
            </section>

            {signedIn && role === "specialist" ? (
              <DrawerSpecialistAnalytics
                animate={open}
                delayMs={nextDelay()}
                onNavigate={onClose}
              />
            ) : null}

            {signedIn && role === "specialist" && utilityDrawerSpecialistLinks.length > 0 ? (
              <section
                className="mobile-utility-drawer__section"
                aria-label="Shortlist"
              >
                <p className="mobile-utility-drawer__section-label">Shortlist</p>
                <ul className="mobile-utility-drawer__list">
                  {utilityDrawerSpecialistLinks.map((item) => (
                    <DrawerCompanyRow
                      key={item.id}
                      item={item}
                      animate={open}
                      delayMs={nextDelay()}
                      onNavigate={onClose}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            <section
              className="mobile-utility-drawer__section"
              aria-label="Company"
            >
              <p className="mobile-utility-drawer__section-label">Company</p>
              <ul className="mobile-utility-drawer__list">
                {utilityDrawerCompanyLinks.map((item) => (
                  <DrawerCompanyRow
                    key={item.id}
                    item={item}
                    animate={open}
                    delayMs={nextDelay()}
                    onNavigate={onClose}
                  />
                ))}
              </ul>
            </section>

            {signedIn ? (
              <section
                className="mobile-utility-drawer__section"
                aria-label="Session"
              >
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
                    <LogOutIcon className="mobile-utility-drawer__row-icon-svg" />
                  </span>
                  <span className="mobile-utility-drawer__row-copy">
                    <span className="mobile-utility-drawer__row-label">
                      Log Out
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
            <ul className="mobile-utility-drawer__footer-links">
              {utilityDrawerLegalLinks.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <TapLink
                      href={item.href}
                      className="smoac-control mobile-utility-drawer__footer-link"
                      onClick={onClose}
                    >
                      {item.label}
                    </TapLink>
                  ) : (
                    <button
                      type="button"
                      className="smoac-control mobile-utility-drawer__footer-link"
                      onClick={() =>
                        showToast({
                          type: "info",
                          message: `${item.label} is coming soon.`,
                        })
                      }
                    >
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mobile-utility-drawer__footer-version">
              App Version {UTILITY_DRAWER_APP_VERSION}
            </p>
          </footer>
        </aside>
      </div>

      <QuickClientAccountModal
        open={quickAccountOpen}
        onClose={() => setQuickAccountOpen(false)}
        purpose="account"
        returnPath={pathname || "/"}
        signupTitle="Create your account"
        signupSupport="Enter your first name and email to save specialists, send inquiries, and manage your account."
        signupCta="Continue"
        onAuthenticated={() => {
          setQuickAccountOpen(false);
          onClose();
        }}
      />
    </>
  );
}
