import { SITE_ROUTES } from "@/lib/navigation";

export interface FooterNavLink {
  label: string;
  href: string;
}

export interface FooterNavGroup {
  title: string;
  links: readonly FooterNavLink[];
}

/** Global site footer link groups — every href is a real route. */
export const FOOTER_NAV_GROUPS: readonly FooterNavGroup[] = [
  {
    title: "Platform",
    links: [
      { label: "Explore Specialists", href: SITE_ROUTES.explore },
      { label: "Become a Specialist", href: SITE_ROUTES.join },
      { label: "Pricing", href: SITE_ROUTES.pricing },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About SMOAC", href: SITE_ROUTES.about },
      { label: "Contact Us", href: SITE_ROUTES.contact },
      { label: "Help Center", href: SITE_ROUTES.support },
      { label: "FAQ", href: SITE_ROUTES.faq },
    ],
  },
  {
    title: "Trust & Safety",
    links: [
      { label: "Safety & Trust", href: SITE_ROUTES.safety },
      { label: "Community Guidelines", href: SITE_ROUTES.communityGuidelines },
      { label: "Report a Concern", href: SITE_ROUTES.report },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: SITE_ROUTES.privacy },
      { label: "Terms of Service", href: SITE_ROUTES.terms },
      { label: "Cookie Policy", href: SITE_ROUTES.cookies },
      { label: "Accessibility", href: SITE_ROUTES.accessibility },
    ],
  },
] as const;
