import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_ROUTES } from "@/lib/navigation";

export interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

interface LegalDocumentPageProps {
  title: string;
  description: string;
  effectiveDate: string;
  sections: LegalSection[];
  related?: { label: string; href: string }[];
  children?: ReactNode;
}

export function LegalDocumentPage({
  title,
  description,
  effectiveDate,
  sections,
  related,
  children,
}: LegalDocumentPageProps) {
  return (
    <main className="legal-page">
      <article className="legal-page__article">
        <header className="legal-page__header">
          <p className="legal-page__eyebrow">SMOAC</p>
          <h1 className="legal-page__title">{title}</h1>
          <p className="legal-page__lede">{description}</p>
          <p className="legal-page__meta">Effective {effectiveDate}</p>
        </header>

        <div className="legal-page__body">
          {sections.map((section) => (
            <section key={section.title} className="legal-page__section">
              <h2 className="legal-page__section-title">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="legal-page__p">
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="legal-page__list">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
          {children}
        </div>

        <footer className="legal-page__footer">
          {(related ?? [
            { label: "Privacy Policy", href: SITE_ROUTES.privacy },
            { label: "Terms of Service", href: SITE_ROUTES.terms },
            { label: "Help & Support", href: SITE_ROUTES.support },
          ]).map((link) => (
            <Link key={link.href} href={link.href} className="legal-page__link">
              {link.label}
            </Link>
          ))}
        </footer>
      </article>
    </main>
  );
}
