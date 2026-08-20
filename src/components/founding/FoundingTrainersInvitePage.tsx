"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import {
  FOUNDING_INVITE_CODE_PARAM,
  buildFoundingTrainersInviteHref,
  buildFoundingTrainerJoinHref,
  formatFoundingCohortIndex,
  formatFoundingSpotsRemaining,
  persistFoundingTrainerInviteSession,
} from "@/lib/founding-trainer-invite";
import type { FoundingTrainerInviteStatus } from "@/lib/founding-trainer-invite-server";
import { cn } from "@/lib/utils";

interface FoundingTrainersInvitePageProps {
  initialStatus: FoundingTrainerInviteStatus;
  inviteCode: string | null;
}

export function FoundingTrainersInvitePage({
  initialStatus,
  inviteCode,
}: FoundingTrainersInvitePageProps) {
  const router = useRouter();
  const formId = useId();
  const [draftCode, setDraftCode] = useState(inviteCode ?? "");
  const accessGranted = initialStatus.accessGranted;
  const joinHref = buildFoundingTrainerJoinHref({
    inviteCode: inviteCode?.trim() || undefined,
  });

  useEffect(() => {
    if (!accessGranted || !inviteCode?.trim()) return;
    persistFoundingTrainerInviteSession({
      code: inviteCode.trim(),
      acceptedAt: new Date().toISOString(),
    });
  }, [accessGranted, inviteCode]);

  const spotsLabel =
    initialStatus.spotsRemaining === null
      ? "—"
      : formatFoundingSpotsRemaining(initialStatus.claimed ?? 0, initialStatus.cap);

  const cohortLabel =
    initialStatus.claimed === null
      ? "—"
      : formatFoundingCohortIndex(initialStatus.claimed, initialStatus.cap);

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
            <p className="founding-invite-page__eyebrow">Restricted access</p>
            <h1 id={`${formId}-title`} className="founding-invite-page__title">
              Clearance required.
            </h1>
            <p className="founding-invite-page__lede">
              Enter the invite code from your SMOAC dossier to continue.
            </p>

            <form
              className="founding-invite-page__code-form"
              onSubmit={(event) => {
                event.preventDefault();
                router.push(buildFoundingTrainersInviteHref(draftCode));
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
        ) : initialStatus.cohortFull ? (
          <section className="founding-invite-page__panel">
            <p className="founding-invite-page__eyebrow">Cohort sealed</p>
            <h1 className="founding-invite-page__title">The first fifty are in.</h1>
            <p className="founding-invite-page__lede">
              Founding specialist invitations are closed. We&apos;ll open the
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
              You&apos;ve been invited to join as one of the original 50
              specialists on SMOAC. Enjoy one free month on our Pro tier —
              analytics, boosted profiles, tools, and more.
            </p>

            <dl className="founding-invite-page__dossier">
              <div>
                <dt>Cohort</dt>
                <dd>{cohortLabel}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>{spotsLabel}</dd>
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
          <span>San Diego</span>
        </footer>
      </main>
    </div>
  );
}
