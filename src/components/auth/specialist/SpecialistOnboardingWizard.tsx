"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LegalAgreementNotice } from "@/components/legal/LegalAgreementNotice";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { useToast } from "@/components/ui/toast";
import { SmoacSavingMark } from "@/components/brand/SmoacSavingMark";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useProfilePhotoCropSession } from "@/hooks/useProfilePhotoCropSession";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { SPECIALIST_ONBOARDING_TOTAL_STEPS } from "@/constants/specialist-onboarding-options";
import { LOGIN_PATH, SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import { getAuthSessionSnapshot } from "@/lib/auth-session-store";
import { ApplicationSubmitError } from "@/lib/specialist-application-validation";
import { submitSpecialistApplication } from "@/lib/specialist-application-submit";
import {
  clearSpecialistOnboardingDraft,
  findSpecialistApplicationByEmail,
  findSpecialistApplicationByUserId,
  loadSpecialistOnboardingDraftRecord,
  parseSpecialistOnboardingDraftRecord,
  persistSpecialistOnboardingDraft,
} from "@/lib/specialist-application-storage";
import { patchAuthSessionAvatarUrl } from "@/lib/profiles/update-profile-avatar";
import {
  getSpecialistOnboardingAuthGaps,
  type SpecialistOnboardingStep,
} from "@/lib/specialist-onboarding-validation";
import {
  firstBeatIdForSection,
  getSpecialistInterviewBeatError,
  getSpecialistInterviewResumeBeatId,
  isLastAccountInterviewBeat,
  isSpecialistInterviewBeatRequired,
  listSpecialistInterviewBeats,
  type SpecialistInterviewBeatId,
} from "@/lib/specialist-onboarding-interview";
import { scrollDocumentToTop } from "@/lib/scroll-document-top";
import { cn } from "@/lib/utils";
import {
  INITIAL_SPECIALIST_ONBOARDING_STATE,
  type SpecialistOnboardingState,
} from "@/types/specialist-application";
import { SpecialistInterviewTrailIcon } from "@/components/auth/specialist/SpecialistInterviewTrailIcon";
import { SpecialistOnboardingSteps } from "@/components/auth/specialist/SpecialistOnboardingSteps";
import {
  abandonUnconfirmedSpecialistSignupClient,
  sendSpecialistEmailVerificationCode,
  verifySpecialistEmailVerificationCode,
} from "@/lib/auth/specialist-email-verify";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { saveSpecialistSignupProfile } from "@/lib/profiles/profile-service";

type OnboardingStep = SpecialistOnboardingStep;

const INTERVIEW_KEYBOARD_CLASS = "specialist-interview-keyboard-open";
const INTERVIEW_KEYBOARD_INSET_PX = 80;

function isInterviewEditableField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  return target.isContentEditable;
}

function readInterviewKeyboardInset(): number {
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const top = viewport?.offsetTop ?? 0;
  const inset = Math.max(0, window.innerHeight - height - top);
  return inset > INTERVIEW_KEYBOARD_INSET_PX ? inset : 0;
}

function specialistSessionMatchesEmail(email: string): boolean {
  const session = getAuthSessionSnapshot();
  const trimmed = email.trim().toLowerCase();
  return Boolean(
    session &&
      session.role === "specialist" &&
      trimmed.length > 0 &&
      session.email.trim().toLowerCase() === trimmed
  );
}

async function loadRemoteSpecialistOnboardingDraft(userId: string) {
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_data")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return parseSpecialistOnboardingDraftRecord(data.onboarding_data);
  } catch {
    return null;
  }
}

async function persistVerifiedOnboardingProgress(
  state: SpecialistOnboardingState,
  wizardStep: OnboardingStep,
  wizardBeatId: SpecialistInterviewBeatId
) {
  persistSpecialistOnboardingDraft(state, { wizardStep, wizardBeatId });
  if (!isMarketplaceSupabaseActive()) return;
  const session = getAuthSessionSnapshot();
  const supabase = getMarketplaceAuthClient();
  if (!supabase || !session?.userId) return;
  await saveSpecialistSignupProfile(supabase, session.userId, state, {
    wizardStep,
    wizardBeatId,
  });
}

interface SpecialistOnboardingWizardProps {
  onBackToRole: () => void;
}

export function SpecialistOnboardingWizard({
  onBackToRole,
}: SpecialistOnboardingWizardProps) {
  const router = useRouter();
  const { signInWithPassword, refreshSession, isReady } = useAuthSession();
  const { showToast } = useToast();
  const [state, setState] = useState<SpecialistOnboardingState>(
    INITIAL_SPECIALIST_ONBOARDING_STATE
  );
  const [beatId, setBeatId] = useState<SpecialistInterviewBeatId>(
    "professional-type"
  );
  const [draftReady, setDraftReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState<string | null>(
    null
  );
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [resendingConfirm, setResendingConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFieldsError, setPasswordFieldsError] = useState(false);
  const [shakePasswordFields, setShakePasswordFields] = useState(false);
  const [invalidFieldLabels, setInvalidFieldLabels] = useState<string[]>([]);
  const profilePhotoCrop = useProfilePhotoCropSession();
  const pageRef = useRef<HTMLDivElement>(null);
  const verifiedRef = useRef(false);
  const credentialsRef = useRef({ email: "", password: "" });
  const abandonTimerRef = useRef<number | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [stackMotion, setStackMotion] = useState<"forward" | "back">("forward");
  const [cardPhase, setCardPhase] = useState<"idle" | "exit-left" | "enter-pop" | "from-back">(
    "idle"
  );
  const pendingBeatRef = useRef<{
    id: SpecialistInterviewBeatId;
    motion: "forward" | "back";
  } | null>(null);
  const cardMotionTimerRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const cardBusy = cardPhase === "exit-left";

  function flagPasswordFieldsError(message: string) {
    setError(message);
    setPasswordFieldsError(true);
    setShakePasswordFields(true);
  }

  function clearPasswordFieldsError() {
    setPasswordFieldsError(false);
    setError(null);
  }

  const accountAlreadyCreated = specialistSessionMatchesEmail(state.email);
  const interviewContext = useMemo(
    () => ({
      skipPassword: accountAlreadyCreated,
      serviceType: state.serviceType,
    }),
    [accountAlreadyCreated, state.serviceType]
  );
  const beats = useMemo(
    () => listSpecialistInterviewBeats(interviewContext),
    [interviewContext]
  );
  const beatIndex = Math.max(
    0,
    beats.findIndex((beat) => beat.id === beatId)
  );
  const beat = beats[beatIndex] ?? beats[0];
  const currentBeatId = beat?.id ?? "professional-type";
  const step: OnboardingStep = beat?.section ?? 1;
  const upcomingBeats = beats.slice(beatIndex + 1, beatIndex + 9);
  const progressPercent =
    beats.length <= 1
      ? 0
      : Math.round((beatIndex / (beats.length - 1)) * 100);
  const missingFieldOptions = { skipPassword: accountAlreadyCreated };
  verifiedRef.current = Boolean(verifiedEmail || accountAlreadyCreated);
  credentialsRef.current = {
    email: state.email,
    password: state.password,
  };

  useEffect(() => {
    if (beats.some((item) => item.id === beatId)) return;
    setBeatId(beats[0]?.id ?? "professional-type");
  }, [beats, beatId]);

  useEffect(() => {
    try {
      const local = loadSpecialistOnboardingDraftRecord();
      const session = getAuthSessionSnapshot();
      const localState = local?.state ?? INITIAL_SPECIALIST_ONBOARDING_STATE;
      const merged: SpecialistOnboardingState = {
        ...localState,
        email: localState.email.trim() || session?.email || "",
        fullName: localState.fullName.trim() || session?.firstName?.trim() || "",
      };
      setState(merged);
      setBeatId(
        getSpecialistInterviewResumeBeatId(merged, {
          skipPassword: specialistSessionMatchesEmail(merged.email),
          savedBeatId: local?.wizardBeatId ?? null,
          savedStep: local?.wizardStep ?? null,
        })
      );
      if (specialistSessionMatchesEmail(merged.email)) {
        setVerifiedEmail(merged.email.trim().toLowerCase());
      }
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady || !draftReady) return;
    const session = getAuthSessionSnapshot();
    if (
      session?.role !== "specialist" ||
      !session.userId ||
      !isMarketplaceSupabaseActive()
    ) {
      return;
    }

    let cancelled = false;
    void loadRemoteSpecialistOnboardingDraft(session.userId).then((remote) => {
      if (cancelled || !remote?.state) return;
      const remoteState = remote.state;
      const hasProgress = Boolean(
        remoteState.professionalType ||
          remoteState.fullName.trim() ||
          remoteState.displayName.trim() ||
          remoteState.specialties.length > 0 ||
          remoteState.bio.trim()
      );
      if (!hasProgress) return;
      setState((localState) => ({
        ...remoteState,
        email: remoteState.email.trim() || session.email || localState.email,
        fullName:
          remoteState.fullName.trim() ||
          session.firstName?.trim() ||
          localState.fullName,
        password: localState.password || remoteState.password,
      }));
      setBeatId(
        getSpecialistInterviewResumeBeatId(remoteState, {
          skipPassword: true,
          savedBeatId: remote.wizardBeatId,
          savedStep: remote.wizardStep,
        })
      );
      setVerifiedEmail(session.email.trim().toLowerCase());
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, draftReady]);

  useEffect(() => {
    if (!draftReady) return;
    persistSpecialistOnboardingDraft(state, {
      wizardStep: step,
      wizardBeatId: currentBeatId,
    });
  }, [draftReady, state, step, currentBeatId]);

  useEffect(() => {
    if (!draftReady || !accountAlreadyCreated) return;
    const handle = window.setTimeout(() => {
      void persistVerifiedOnboardingProgress(state, step, currentBeatId);
    }, 800);
    return () => window.clearTimeout(handle);
  }, [draftReady, accountAlreadyCreated, state, step, currentBeatId]);

  useEffect(() => {
    if (abandonTimerRef.current) {
      window.clearTimeout(abandonTimerRef.current);
      abandonTimerRef.current = null;
    }

    function abandonUnverifiedProgress() {
      if (verifiedRef.current) return;
      clearSpecialistOnboardingDraft();
      const { email, password } = credentialsRef.current;
      void abandonUnconfirmedSpecialistSignupClient({ email, password });
    }

    function onPageHide() {
      abandonUnverifiedProgress();
    }

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (verifiedRef.current) return;
      abandonTimerRef.current = window.setTimeout(() => {
        if (window.location.pathname.startsWith("/create-account")) {
          abandonTimerRef.current = null;
          return;
        }
        abandonUnverifiedProgress();
        abandonTimerRef.current = null;
      }, 400);
    };
  }, []);

  useEffect(() => {
    const page = pageRef.current;

    function pinScroll() {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const main = document.querySelector(".app-main");
      if (main instanceof HTMLElement) main.scrollTop = 0;
    }

    function syncKeyboard() {
      const focusedInside =
        page != null &&
        isInterviewEditableField(document.activeElement) &&
        page.contains(document.activeElement);
      const mobile = window.matchMedia("(max-width: 1023px)").matches;
      const active =
        readInterviewKeyboardInset() > 0 || (focusedInside && mobile);
      document.body.classList.toggle(INTERVIEW_KEYBOARD_CLASS, active);
      if (active) pinScroll();
      setKeyboardOpen((prev) => (prev === active ? prev : active));
    }

    function onFocusIn(event: FocusEvent) {
      if (!page?.contains(event.target as Node)) return;
      if (!isInterviewEditableField(event.target)) return;
      pinScroll();
      window.setTimeout(syncKeyboard, 60);
    }

    function onFocusOut() {
      window.requestAnimationFrame(() => {
        syncKeyboard();
      });
    }

    syncKeyboard();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", syncKeyboard);
    viewport?.addEventListener("scroll", pinScroll);
    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);
    return () => {
      viewport?.removeEventListener("resize", syncKeyboard);
      viewport?.removeEventListener("scroll", pinScroll);
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
      document.body.classList.remove(INTERVIEW_KEYBOARD_CLASS);
    };
  }, []);

  /* Each Continue / Back question should land at the heading — not the CTA. */
  useLayoutEffect(() => {
    if (!draftReady || keyboardOpen) return;
    const run = () => {
      scrollDocumentToTop();
    };
    run();
    const frame = window.requestAnimationFrame(run);
    const retrySoon = window.setTimeout(run, 60);
    const retryAfterPaint = window.setTimeout(run, 360);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retrySoon);
      window.clearTimeout(retryAfterPaint);
    };
  }, [currentBeatId, draftReady, keyboardOpen]);

  const goToPendingApplicationPortal = useCallback(async () => {
    const priorAvatar = getAuthSessionSnapshot()?.avatarUrl?.trim() || "";
    try {
      await refreshSession();
    } catch {
      /* Session may already be current — still open the pending portal. */
    }

    const session = getAuthSessionSnapshot();
    const application =
      (session?.userId
        ? findSpecialistApplicationByUserId(session.userId)
        : null) ??
      (session?.email
        ? findSpecialistApplicationByEmail(session.email)
        : null);
    const photoFromApp = application?.media.profilePhotoUrl?.trim() || "";
    const nextAvatar = photoFromApp || priorAvatar;
    if (nextAvatar) {
      patchAuthSessionAvatarUrl(nextAvatar);
    }

    router.replace(`${SPECIALIST_DASHBOARD_PATH}?submitted=1`);
  }, [refreshSession, router]);

  const patchState = useCallback((partial: Partial<SpecialistOnboardingState>) => {
    setState((prev) => {
      if (
        partial.email !== undefined &&
        partial.email.trim().toLowerCase() !== prev.email.trim().toLowerCase()
      ) {
        setVerifiedEmail(null);
        setAwaitingEmailConfirm(null);
        setEmailOtpCode("");
      }
      return {
        ...prev,
        ...partial,
        pricing: partial.pricing
          ? { ...prev.pricing, ...partial.pricing }
          : prev.pricing,
        availability: partial.availability
          ? { ...prev.availability, ...partial.availability }
          : prev.availability,
        social: partial.social ? { ...prev.social, ...partial.social } : prev.social,
        media: partial.media ? { ...prev.media, ...partial.media } : prev.media,
      };
    });
    setError(null);
    setInvalidFieldLabels([]);
  }, []);

  function clearCardMotionTimer() {
    if (cardMotionTimerRef.current == null) return;
    window.clearTimeout(cardMotionTimerRef.current);
    cardMotionTimerRef.current = null;
  }

  function commitPendingBeat() {
    const pending = pendingBeatRef.current;
    if (!pending) return;
    pendingBeatRef.current = null;
    clearCardMotionTimer();
    setStackMotion(pending.motion);
    setBeatId(pending.id);
    setError(null);
    setInvalidFieldLabels([]);
    setCardPhase(pending.motion === "back" ? "from-back" : "enter-pop");
  }

  useEffect(() => {
    return () => clearCardMotionTimer();
  }, []);

  useEffect(() => {
    if (cardPhase !== "enter-pop" && cardPhase !== "from-back") return;
    const timeoutId = window.setTimeout(() => setCardPhase("idle"), 500);
    return () => window.clearTimeout(timeoutId);
  }, [cardPhase]);

  function blurInterviewField() {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    if (!pageRef.current?.contains(active)) return;
    if (!isInterviewEditableField(active)) return;
    active.blur();
  }

  function goToBeat(
    nextId: SpecialistInterviewBeatId,
    motion: "forward" | "back" = "forward"
  ) {
    if (pendingBeatRef.current) return;
    if (nextId === beatId) return;
    setError(null);
    setInvalidFieldLabels([]);
    if (motion === "forward" && !reducedMotion) {
      pendingBeatRef.current = { id: nextId, motion };
      setCardPhase("exit-left");
      cardMotionTimerRef.current = window.setTimeout(commitPendingBeat, 340);
      return;
    }
    setStackMotion(motion);
    setBeatId(nextId);
    setCardPhase(motion === "back" ? "from-back" : "idle");
  }

  function goToNextBeat() {
    const next = beats[beatIndex + 1];
    if (!next) return;
    goToBeat(next.id, "forward");
  }

  function handleExit() {
    if (accountAlreadyCreated) {
      router.push("/");
      return;
    }
    onBackToRole();
  }

  function handleBack() {
    if (submitting || cardBusy) return;
    if (beatIndex <= 0) {
      handleExit();
      return;
    }
    const previous = beats[beatIndex - 1];
    if (previous) goToBeat(previous.id, "back");
  }

  function handleSkip() {
    if (submitting || cardBusy || !beat) return;
    if (isSpecialistInterviewBeatRequired(beat, state, interviewContext)) return;
    goToNextBeat();
  }

  async function verifyEmailBeforeContinue(): Promise<boolean> {
    const trimmedEmail = state.email.trim().toLowerCase();
    const firstName = state.fullName.trim().split(/\s+/)[0] ?? "";

    if (
      verifiedEmail &&
      verifiedEmail === trimmedEmail &&
      getAuthSessionSnapshot()?.email?.toLowerCase() === trimmedEmail
    ) {
      return true;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (!isMarketplaceSupabaseActive()) {
        /* Local/dev without Supabase — allow continue after password checks. */
        setVerifiedEmail(trimmedEmail);
        setAwaitingEmailConfirm(null);
        return true;
      }

      const result = await sendSpecialistEmailVerificationCode({
        email: trimmedEmail,
        password: state.password,
        firstName,
      });

      if (!result.ok) {
        setError(result.message);
        return false;
      }

      if (result.alreadyVerified) {
        const signInResult = await signInWithPassword(
          "specialist",
          trimmedEmail,
          state.password
        );
        if (signInResult.ok === false) {
          setError(signInResult.message);
          return false;
        }
        if (signInResult.ok === "confirm_email") {
          setAwaitingEmailConfirm(trimmedEmail);
          setEmailOtpCode("");
          showToast({
            type: "info",
            message: `Enter the code we emailed to ${trimmedEmail}.`,
          });
          return false;
        }
        setVerifiedEmail(trimmedEmail);
        setAwaitingEmailConfirm(null);
        setEmailOtpCode("");
        void persistVerifiedOnboardingProgress(
          state,
          3,
          firstBeatIdForSection(3, interviewContext)
        );
        return true;
      }

      persistSpecialistOnboardingDraft(state, {
        wizardStep: step,
        wizardBeatId: currentBeatId,
      });
      setAwaitingEmailConfirm(trimmedEmail);
      setEmailOtpCode("");
      showToast({
        type: "info",
        message: `We sent a 6-digit code to ${trimmedEmail}. Paste it below to continue.`,
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContinue() {
    if (submitting || cardBusy || !beat) return;

    if (beat.id !== "preview") {
      const beatError = getSpecialistInterviewBeatError(
        beat,
        state,
        interviewContext,
        confirmPassword
      );
      if (beat.id === "password" && beatError) {
        flagPasswordFieldsError(beatError);
        return;
      }
      if (beatError) {
        setPasswordFieldsError(false);
        setError(beatError);
        if (beat.id === "service-type" || beat.id === "location") {
          setInvalidFieldLabels(
            beat.id === "service-type" ? ["Service type"] : ["Primary ZIP code"]
          );
        }
        return;
      }
      setPasswordFieldsError(false);
      setInvalidFieldLabels([]);
    }

    if (isLastAccountInterviewBeat(beat.id, interviewContext)) {
      if (accountAlreadyCreated) {
        setVerifiedEmail(state.email.trim().toLowerCase());
        goToNextBeat();
        return;
      }
      const verified = await verifyEmailBeforeContinue();
      if (!verified) return;
      goToBeat(firstBeatIdForSection(3, interviewContext));
      return;
    }

    if (beat.id === "preview") {
      void handleSubmitApplication();
      return;
    }

    goToNextBeat();
  }

  async function handleVerifyEmailCode() {
    if (!awaitingEmailConfirm) return;
    const code = emailOtpCode.replace(/\s+/g, "").trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const verified = await verifySpecialistEmailVerificationCode({
        email: awaitingEmailConfirm,
        password: state.password,
        code,
      });
      if (!verified.ok) {
        setError(verified.message);
        return;
      }

      const signInResult = await signInWithPassword(
        "specialist",
        awaitingEmailConfirm,
        state.password
      );
      if (signInResult.ok === false) {
        setError(signInResult.message);
        return;
      }
      if (signInResult.ok === "confirm_email") {
        setError(
          "Email still isn’t verified. Check the code and try again, or resend a new one."
        );
        return;
      }

      setVerifiedEmail(awaitingEmailConfirm.toLowerCase());
      setAwaitingEmailConfirm(null);
      setEmailOtpCode("");
      goToBeat(firstBeatIdForSection(3, interviewContext));
      void persistVerifiedOnboardingProgress(
        state,
        3,
        firstBeatIdForSection(3, interviewContext)
      );
      showToast({
        type: "success",
        message: "Email verified — continue your application.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendConfirmEmail() {
    if (!awaitingEmailConfirm || resendingConfirm) return;
    setResendingConfirm(true);
    setError(null);
    try {
      const firstName = state.fullName.trim().split(/\s+/)[0] ?? "";
      const result = await sendSpecialistEmailVerificationCode({
        email: awaitingEmailConfirm,
        password: state.password,
        firstName,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.alreadyVerified) {
        const signInResult = await signInWithPassword(
          "specialist",
          awaitingEmailConfirm,
          state.password
        );
        if (signInResult.ok === true) {
          setVerifiedEmail(awaitingEmailConfirm.toLowerCase());
          setAwaitingEmailConfirm(null);
          setEmailOtpCode("");
          goToBeat(firstBeatIdForSection(3, interviewContext));
          void persistVerifiedOnboardingProgress(
            state,
            3,
            firstBeatIdForSection(3, interviewContext)
          );
          showToast({
            type: "success",
            message: "Email already verified — continue your application.",
          });
          return;
        }
      }
      showToast({
        type: "info",
        message: `New code sent to ${awaitingEmailConfirm}.`,
      });
    } finally {
      setResendingConfirm(false);
    }
  }

  async function handleSubmitApplication() {
    if (submitting) return;

    const authGaps = getSpecialistOnboardingAuthGaps(state, missingFieldOptions);
    if (
      authGaps.length > 0 ||
      (!accountAlreadyCreated && state.password !== confirmPassword)
    ) {
      goToBeat(
        !accountAlreadyCreated &&
          (state.password !== confirmPassword ||
            authGaps.some((g) => g.label.startsWith("Password")))
          ? "password"
          : "email"
      );
      if (
        !accountAlreadyCreated &&
        state.password !== confirmPassword &&
        state.password.trim().length >= 8
      ) {
        flagPasswordFieldsError("Passwords do not match.");
      } else if (authGaps.some((g) => g.label.startsWith("Password"))) {
        flagPasswordFieldsError(
          "Create a password (8+ characters) so you can sign in while pending."
        );
      } else {
        setPasswordFieldsError(false);
        setError("Enter a valid email and password so you can sign in.");
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const trimmedEmail = state.email.trim().toLowerCase();
      if (
        !verifiedEmail ||
        verifiedEmail !== trimmedEmail ||
        getAuthSessionSnapshot()?.email?.toLowerCase() !== trimmedEmail
      ) {
        setSubmitting(false);
        goToBeat("email");
        setError("Verify your email with the code we sent before submitting.");
        const gated = await verifyEmailBeforeContinue();
        if (!gated) return;
        setSubmitting(true);
      }

      const existing = getAuthSessionSnapshot();
      let userId = existing?.userId ?? "";

      const alreadyAuthed =
        Boolean(existing) &&
        existing!.role === "specialist" &&
        existing!.email.trim().toLowerCase() === trimmedEmail;

      if (!alreadyAuthed) {
        const signInResult = await signInWithPassword(
          "specialist",
          trimmedEmail,
          state.password
        );
        if (signInResult.ok === false) {
          setError(signInResult.message);
          return;
        }
        if (signInResult.ok === "confirm_email") {
          setAwaitingEmailConfirm(trimmedEmail);
          setEmailOtpCode("");
          setError("Verify your email with the code we sent, then submit again.");
          return;
        }
        userId = signInResult.session.userId;
      }

      if (isMarketplaceSupabaseActive()) {
        const supabase = getMarketplaceAuthClient();
        if (supabase && userId) {
          const profileResult = await saveSpecialistSignupProfile(
            supabase,
            userId,
            state
          );
          if (!profileResult.ok) {
            setError(profileResult.message);
            return;
          }
        }
      }

      const submitResult = await submitSpecialistApplication(state, { userId });

      showToast({
        type: "success",
        message: submitResult.emailSent
          ? "Application submitted — check your email for a welcome note."
          : "Application submitted — you're under review.",
      });

      await goToPendingApplicationPortal();
    } catch (err) {
      const message =
        err instanceof ApplicationSubmitError
          ? err.message
          : err instanceof Error && err.message.trim()
            ? err.message
            : "Something went wrong. Please try again.";

      if (/already approved/i.test(message)) {
        showToast({ type: "info", message });
        router.replace(SPECIALIST_DASHBOARD_PATH);
        return;
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function continueLabel(): string {
    if (submitting) {
      if (beat?.id === "preview") return "Submitting…";
      if (
        beat &&
        isLastAccountInterviewBeat(beat.id, interviewContext) &&
        !accountAlreadyCreated
      ) {
        return "Verifying email…";
      }
      return "Continue";
    }
    if (beat?.id === "preview") return "Submit Application";
    if (
      beat &&
      isLastAccountInterviewBeat(beat.id, interviewContext) &&
      !accountAlreadyCreated
    ) {
      return "Verify email & continue";
    }
    return "Continue";
  }

  const beatRequired = beat
    ? isSpecialistInterviewBeatRequired(beat, state, interviewContext)
    : true;
  const verifyingEmail =
    submitting &&
    Boolean(beat) &&
    beat.id !== "preview" &&
    isLastAccountInterviewBeat(beat.id, interviewContext) &&
    !accountAlreadyCreated;

  return (
    <>
      <div
        ref={pageRef}
        className={cn(
          "login-page login-page--wizard login-page--specialist-onboarding",
          keyboardOpen && "login-page--interview-keyboard"
        )}
        data-login-role="specialist"
      >
        <div className="login-page__canvas" aria-hidden>
          <div className="wizard-aurora-pool wizard-aurora-pool--primary" />
          <div className="wizard-aurora-pool wizard-aurora-pool--secondary" />
          <div className="atmosphere-mesh wizard-atmosphere-mesh">
            <div className="atmosphere-blob atmosphere-blob--indigo" />
            <div className="atmosphere-blob atmosphere-blob--blue" />
            <div className="atmosphere-blob atmosphere-blob--violet" />
            <div className="atmosphere-blob atmosphere-blob--magenta" />
            <div className="atmosphere-blob atmosphere-blob--pink" />
            <div className="atmosphere-blob atmosphere-blob--core" />
          </div>
          <div className="login-page__card-glow wizard-card-glow" />
          <div className="atmosphere-vignette atmosphere-vignette--soft wizard-vignette" />
          <div className="atmosphere-grain" />
        </div>

        <div className="login-page__shell interview-shell">
          <div className="interview-stage">
          <div className="interview-intro">
            <h1 className="interview-intro__title">
              {accountAlreadyCreated
                ? "Let’s finish your specialist account"
                : "Let’s create your specialist account"}
            </h1>
            <p className="interview-intro__sub">
              {accountAlreadyCreated
                ? "Saved on this device — pick up where you left off."
                : "Just a few quick questions to get started."}
            </p>
          </div>

          <form
            key={currentBeatId}
            className={cn(
              "login-card wizard-card interview-card",
              currentBeatId === "preview" && "interview-card--preview",
              cardPhase === "exit-left" && "interview-card--exit-left",
              cardPhase === "enter-pop" && "interview-card--enter-pop",
              cardPhase === "from-back" && "interview-card--from-back"
            )}
            noValidate
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget) return;
              if (cardPhase === "exit-left") {
                commitPendingBeat();
                return;
              }
              if (cardPhase === "enter-pop" || cardPhase === "from-back") {
                setCardPhase("idle");
              }
            }}
            onSubmit={(event) => {
              event.preventDefault();
              void handleContinue();
            }}
          >
            <div className="interview-card__chrome">
              <div className="interview-card__meta">
                <span className="interview-card__icon-btn interview-card__icon-btn--spacer" />
                <p className="interview-card__count">
                  {progressPercent}% COMPLETE
                </p>
                <span className="interview-card__icon-btn interview-card__icon-btn--spacer" />
              </div>
              <div
                className="interview-progress"
                role="img"
                aria-label={`Section ${step} of ${SPECIALIST_ONBOARDING_TOTAL_STEPS}`}
              >
                {Array.from({ length: SPECIALIST_ONBOARDING_TOTAL_STEPS }, (_, index) => {
                  const section = index + 1;
                  return (
                    <span
                      key={section}
                      className={
                        section < step
                          ? "interview-progress__seg interview-progress__seg--done"
                          : section === step
                            ? "interview-progress__seg interview-progress__seg--current"
                            : "interview-progress__seg"
                      }
                    />
                  );
                })}
              </div>
            </div>

            {beat ? (
              <>
                <h2 className="interview-card__title">{beat.title}</h2>
                <p className="interview-card__subtitle">{beat.subtitle}</p>
              </>
            ) : null}

            <div className="interview-card__field">
              <SpecialistOnboardingSteps
                beatId={currentBeatId}
                state={state}
                onPatch={(partial) => {
                  if (partial.password !== undefined) {
                    clearPasswordFieldsError();
                  }
                  patchState(partial);
                }}
                onEditBeat={(nextBeat) => {
                  const nextIndex = beats.findIndex((item) => item.id === nextBeat);
                  goToBeat(nextBeat, nextIndex < beatIndex ? "back" : "forward");
                }}
                profilePhotoCrop={profilePhotoCrop}
                confirmPassword={confirmPassword}
                passwordFieldsError={passwordFieldsError}
                shakePasswordFields={shakePasswordFields}
                hidePasswordFields={accountAlreadyCreated}
                emailLocked={accountAlreadyCreated}
                onPasswordShakeEnd={() => setShakePasswordFields(false)}
                invalidFieldLabels={invalidFieldLabels}
                onConfirmPasswordChange={(value) => {
                  setConfirmPassword(value);
                  clearPasswordFieldsError();
                }}
              />
            </div>

            {error ? (
              <p
                className="login-card__message login-card__message--error login-card__message--error-visible"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div className="interview-card__footer">
              <div className="interview-card__actions">
                <FastActivateButton
                  type="button"
                  className="interview-back smoac-control"
                  onActivate={handleBack}
                  disabled={submitting}
                  aria-label={
                    beatIndex <= 0
                      ? "Back to account type"
                      : "Back"
                  }
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M15 5 8 12l7 7"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </FastActivateButton>
                <FastActivateButton
                  type="button"
                  className="interview-continue smoac-control"
                  disabled={submitting}
                  onPointerDown={blurInterviewField}
                  onActivate={() => void handleContinue()}
                >
                  <span>{continueLabel()}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </FastActivateButton>
              </div>
              {accountAlreadyCreated ? null : (
                <p className="interview-signin">
                  <span>Already have an account?</span>
                  <Link href={LOGIN_PATH}>Sign in</Link>
                </p>
              )}
              {!beatRequired ? (
                <button
                  type="button"
                  className="interview-skip"
                  onClick={handleSkip}
                  disabled={submitting}
                >
                  Skip
                </button>
              ) : null}
              {accountAlreadyCreated ? null : (
                <LegalAgreementNotice className="interview-legal" />
              )}
            </div>
          </form>

          {upcomingBeats.length > 0 ? (
            <ol
              key={`${currentBeatId}-trail`}
              className={cn(
                "interview-trail",
                stackMotion === "back"
                  ? "interview-trail--from-back"
                  : "interview-trail--from-ahead"
              )}
            >
              {upcomingBeats.map((item, index) => (
                <li
                  key={item.id}
                  className={`interview-trail__item interview-trail__item--${index + 1}`}
                >
                  <span className="interview-trail__icon">
                    <SpecialistInterviewTrailIcon name={item.trailIcon} />
                  </span>
                  <span className="interview-trail__copy">
                    <span className="interview-trail__title">{item.trailTitle}</span>
                    <span className="interview-trail__hint">{item.trailHint}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}

          <p className="interview-footnote">You can always edit this later.</p>
          </div>
        </div>

        {submitting
          ? createPortal(
              <div
                className="wizard-submitting-overlay"
                role="status"
                aria-live="polite"
                aria-busy="true"
                aria-label={
                  verifyingEmail
                    ? "Verifying email"
                    : "Submitting profile to SMOAC admin"
                }
              >
                <div className="wizard-submitting-overlay__panel">
                  <SmoacSavingMark
                    label={
                      verifyingEmail
                        ? "Verifying your email"
                        : "Submitting profile to SMOAC admin"
                    }
                  />
                </div>
              </div>,
              document.body
            )
          : null}
        {awaitingEmailConfirm
          ? createPortal(
              <div
                className="wizard-incomplete-modal wizard-incomplete-modal--email-otp"
                role="dialog"
                aria-modal="true"
                aria-labelledby="wizard-confirm-email-title"
              >
                <div className="wizard-incomplete-modal__backdrop" aria-hidden />
                <div className="wizard-email-otp-panel">
                  <div className="wizard-email-otp-panel__glow" aria-hidden />
                  <div className="wizard-email-otp-panel__sheen" aria-hidden />
                  <header className="wizard-email-otp-panel__header">
                    <h2
                      id="wizard-confirm-email-title"
                      className="wizard-email-otp-panel__title"
                    >
                      Check your email
                    </h2>
                    <p className="wizard-email-otp-panel__lead">
                      Enter the 6-digit code we sent to{" "}
                      <strong>{awaitingEmailConfirm}</strong>.
                    </p>
                  </header>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    name="specialist-email-otp"
                    className="wizard-email-otp-panel__input"
                    aria-label="6-digit verification code"
                    value={emailOtpCode}
                    onChange={(e) => {
                      setEmailOtpCode(
                        e.target.value.replace(/[^\d]/g, "").slice(0, 6)
                      );
                      setError(null);
                    }}
                    placeholder="000000"
                    maxLength={6}
                    disabled={submitting}
                    autoFocus
                  />
                  {error ? (
                    <p
                      className="wizard-email-otp-panel__error"
                      role="alert"
                    >
                      {error}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="login-submit wizard-email-otp-panel__verify"
                    onClick={() => void handleVerifyEmailCode()}
                    disabled={
                      submitting || emailOtpCode.replace(/\s+/g, "").length !== 6
                    }
                  >
                    {submitting ? "Verifying…" : "Verify"}
                  </button>
                  <p className="wizard-email-otp-panel__links">
                    <button
                      type="button"
                      onClick={() => void handleResendConfirmEmail()}
                      disabled={resendingConfirm || submitting}
                    >
                      {resendingConfirm ? "Sending…" : "Resend code"}
                    </button>
                    <span aria-hidden>·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAwaitingEmailConfirm(null);
                        setEmailOtpCode("");
                        goToBeat("email");
                        setError(null);
                      }}
                      disabled={submitting}
                    >
                      Change email
                    </button>
                  </p>
                </div>
              </div>,
              document.body
            )
          : null}
      </div>

      {profilePhotoCrop.cropModal}
    </>
  );
}
