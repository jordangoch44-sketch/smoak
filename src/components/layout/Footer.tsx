import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { FOOTER_NAV_GROUPS } from "@/lib/footer-nav";

const MARKETPLACE_DISCLAIMER =
  "SMOAC is a marketplace that helps clients discover independent fitness and wellness professionals. Specialists listed on SMOAC are independent providers and are not employees, agents, or representatives of SMOAC.";

/**
 * Global site footer — mounted in `(site)/layout` after AppMain.
 * Stays outside profile intercept modals and the mobile bottom nav.
 */
export function Footer() {
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="site-footer__glow" aria-hidden />
      <div className="site-footer__inner">
        <div className="site-footer__main">
          <div className="site-footer__brand">
            <Logo href="/" size="lg" className="site-footer__logo" />
            <p className="site-footer__tagline">
              Connecting people with trusted fitness specialists.
            </p>
            <p className="site-footer__support">
              Discover trainers, coaches, nutritionists, therapists, and
              wellness professionals near you.
            </p>
          </div>

          <nav className="site-footer__nav" aria-label="Footer">
            {FOOTER_NAV_GROUPS.map((group) => (
              <div key={group.title} className="site-footer__group">
                <h2 className="site-footer__group-title">{group.title}</h2>
                <ul className="site-footer__list">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="site-footer__link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="site-footer__bottom">
          <p className="site-footer__copyright">
            © 2026 SMOAC. All rights reserved.
          </p>
          <p className="site-footer__disclaimer">{MARKETPLACE_DISCLAIMER}</p>
        </div>
      </div>
    </footer>
  );
}
