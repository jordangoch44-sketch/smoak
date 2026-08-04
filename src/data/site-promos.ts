import type { SitePromoCampaign } from "@/types/site-promo";

/**
 * Swappable house campaigns. Edit this file (or later Admin) to rotate deals —
 * slot layouts stay fixed.
 *
 * Claim hygiene: prefer softer copy until analytics can back “3× / 25%” lines.
 */
export const SITE_PROMO_CAMPAIGNS: readonly SitePromoCampaign[] = [
  {
    id: "boost-launch-2026",
    priority: 100,
    active: true,
    slotIds: [
      "specialist_dashboard_boost",
      "explore_results_rail",
      "rankings_footer_promo",
    ],
    audience: "specialist",
    eyebrow: "Grow on SMOAC",
    headline: "Boost your profile where clients look",
    body: "Sponsored, Featured spotlight, category pins, and ranking boosts put you in paid discovery — separate from Pro analytics.",
    stat: "Specialists who boost get more profile appearances in Explore and homepage rails.",
    ctaLabel: "Explore boosts",
    ctaKind: "open_boost",
    dismissible: true,
  },
  {
    id: "pro-continue-2026",
    priority: 90,
    active: true,
    slotIds: ["specialist_dashboard_hero"],
    audience: "specialist",
    eyebrow: "SMOAC Pro",
    headline: "Unlock full analytics",
    body: "Ranking analytics, profile visibility insights, client engagement metrics, and growth trends for your marketplace profile.",
    stat: "Pro is analytics — Sponsored placement is a separate paid boost.",
    ctaLabel: "Continue Pro · $9.99/mo",
    ctaKind: "open_pro",
    dismissible: true,
  },
  {
    id: "home-specialists-grow-2026",
    priority: 80,
    active: true,
    slotIds: ["home_mid_promo"],
    audience: "all",
    eyebrow: "For specialists",
    headline: "Get discovered by clients near you",
    body: "Join SMOAC, then boost Sponsored or Featured placements when you’re ready to grow faster.",
    ctaLabel: "Become a specialist",
    ctaKind: "link",
    ctaHref: "/create-account?role=specialist&intro=1",
    dismissible: true,
  },
  {
    id: "home-clients-quick-signup-2026",
    priority: 80,
    active: true,
    slotIds: ["home_client_promo"],
    audience: "guest",
    eyebrow: "For clients",
    headline: "Looking for a trainer?",
    body: "Sign up free in 5 seconds and compare specialists instantly.",
    ctaLabel: "Quick sign up",
    ctaKind: "link",
    ctaHref: "/create-account?role=client",
    dismissible: true,
  },
  {
    id: "rankings-boost-deal-2026",
    priority: 70,
    active: true,
    slotIds: ["rankings_footer_promo"],
    audience: "specialist",
    eyebrow: "Ranking boost",
    headline: "Show up beside city rankings — without buying a fake rank",
    body: "Paid ranking boosts sit in a labeled strip. Organic SMOAC review ranks stay honest.",
    ctaLabel: "Get a ranking boost",
    ctaKind: "open_boost",
    dismissible: true,
  },
];
