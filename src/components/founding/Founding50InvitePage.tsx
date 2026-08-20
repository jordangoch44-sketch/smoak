"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import {
  FOUNDING_50_LABEL,
  FOUNDING_INVITE_CODE_PARAM,
  buildFounding50InviteHref,
  buildFounding50JoinHref,
  formatFounding50SpotsRemaining,
  persistFounding50InviteSession,
  FOUNDING_50_CAP,
} from "@/lib/founding-50-invite";
import type { Founding50InviteStatus } from "@/lib/founding-50-invite-server";
import { cn } from "@/lib/utils";

interface Founding50InvitePageProps {
  initialStatus: Founding50InviteStatus;
  inviteCode: string | null;
}

export function Founding50InvitePage({
  initialStatus,
  inviteCode,
}: Founding50InvitePageProps) {
  const router = useRouter();
  const formId = useId();
  const [draftCode, setDraftCode] = useState(inviteCode ?? "");
  const accessGranted = initialStatus.accessGranted;
  const joinHref = buildFounding50JoinHref({
    inviteCode: inviteCode?.trim() || undefined,
  });

  useEffect(() => {
    if (!accessGranted || !inviteCode?.trim()) return;
    persistFounding50InviteSession({
      code: inviteCode.trim(),
      acceptedAt: new Date().toISOString(),
    });
  }, [accessGranted, inviteCode]);

  const spotsLabel =
    initialStatus.spotsRemaining === null
      ? "—"
      : formatFounding50SpotsRemaining(
          initialStatus.claimed ?? 0,
          initialStatus.cap
        );

  const isFull = initialStatus.isFull;

  return (
    <div className="founding-invite-page">
      <div className="founding-invite-page__backdrop" aria-hidden />

      <main className="founding-invite-page__main">
        <div className="founding-invite-page__mark">
          <Logo href={null} markOnly priority className="founding-invite-page__logo" />
        </div>

        {!accessGranted ? (
          <section
            className="founding-invite-page__panel founding-invite-page__panel--gate"
            aria-labelledby={`${formId}-title`}
          >
            <p className="founding-invite-page__eyebrow">{FOUNDING_50_LABEL}</p>
            <h1 id={`${formId}-title`} className="founding-invite-page__title">
              Clearance required.
            </h1>
            <p className="founding-invite-page__lede">
              Enter your {FOUNDING_50_LABEL} invite code to continue.
            </p>

            <form
              className="founding-invite-page__code-form"
              onSubmit={(event) => {
                event.preventDefault();
                router.push(buildFounding50InviteHref(draftCode));
              }}
            >
              <label className="founding-invite-page__code-label" htmlFor={formId}>
                Invite code
              </label>
              <input
                id={formId}
                name={FOUNDING_INVITE_CODE_PARAM}
                className="founding-invite-page__code-input"
                value={draftCode}
                onChange={(event) => setDraftCode(event.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="••••••••"
              />
              <button type="submit" className="founding-invite-page__cta">
                Verify clearance
              </button>
            </form>
          </section>
        ) : isFull ? (
          <section className="founding-invite-page__panel">
            <p className="founding-invite-page__eyebrow">{FOUNDING_50_LABEL}</p>
            <h1 className="founding-invite-page__title">All 50 spots claimed.</h1>
            <p className="founding-invite-page__lede">
              {FOUNDING_50_LABEL} invitations are closed. We&apos;ll open the
              next wave quietly — watch your inbox.
            </p>
            <Link href="/" className="founding-invite-page__ghost-link">
              Return to marketplace
            </Link>
          </section>
        ) : (
          <section className="founding-invite-page__panel">
            <p className="founding-invite-page__eyebrow">
              SMOAC&nbsp;&nbsp;|&nbsp;&nbsp;FIND FITNESS ANYWHERE
            </p>
            <h1 className="founding-invite-page__title founding-invite-page__title--countdown">
              You&apos;re invited
            </h1>
            <p className="founding-invite-page__lede">
              SMOAC — Explore. Discover. Move. Find health and wellness
              professionals near you, at your fingertips.
            </p>
            <p className="founding-invite-page__lede founding-invite-page__lede--invite">
              You&apos;ve been invited to join the {FOUNDING_50_LABEL} on SMOAC.
              Enjoy one free month on our Pro tier — analytics, boosted profiles,
              tools, and more.
            </p>

            <dl className="founding-invite-page__dossier">
              <div>
                <dt>Spots left</dt>
                <dd>{spotsLabel}</dd>
              </div>
              <div>
                <dt>Total spots</dt>
                <dd>{FOUNDING_50_CAP}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>Open</dd>
              </div>
            </dl>

            <Link
              href={joinHref}
              className={cn(
                "founding-invite-page__cta",
                "founding-invite-page__cta--primary"
              )}
            >
              Accept invitation
            </Link>

            <p className="founding-invite-page__fineprint">
              Accepting your invitation continues into specialist onboarding and
              admin review.
            </p>
          </section>
        )}

        <footer className="founding-invite-page__footer">
          <span>SMOAC</span>
          <span aria-hidden>·</span>
          <span>{FOUNDING_50_LABEL}</span>
        </footer>
      </main>
    </div>
  );
}
