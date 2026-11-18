"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { SmoacSavingOverlay } from "@/components/brand/SmoacSavingMark";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { HeaderChromeLink } from "@/components/layout/HeaderChromeLink";
import { CheckIcon, CloseIcon, LockIcon } from "@/components/ui/icons";
import {
  QuickClientAccountAuthActions,
  QuickClientAccountAuthError,
  QuickClientAccountSigninFields,
  QuickClientAccountSignupFields,
} from "@/components/auth/QuickClientAccountAuthUI";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { CLIENT_DASHBOARD_PATH } from "@/lib/auth-routes";
import { buildLeaveReviewHref } from "@/lib/reviews/leave-review-href";
import {
  startInquiryQuickAccount,
  signInClientForInquiry,
} from "@/lib/auth/inquiry-auth";
import { setAuthSession } from "@/lib/auth-session-store";
import { trackInquiryEvent } from "@/lib/inquiry/inquiry-analytics";
import {
  draftToSubmitInput,
  submitSpecialistInquiry,
} from "@/lib/inquiry/inquiry-submit";
import {
  DEFAULT_INQUIRY_ACTION,
  INQUIRY_MESSAGE_MAX_LENGTH,
  getInquiryTopicOptions,
  type InquiryTopicId,
} from "@/lib/inquiry-options";
import {
  clearPendingInquiryDraft,
  readPendingInquiryDraft,
  validateInquiryDraft,
  writePendingInquiryDraft,
  type PendingInquiryDraft,
} from "@/lib/pending-inquiry-storage";
import { AGE_CONFIRMATION_ERROR } from "@/components/legal/LegalAgreementNotice";
import { cn } from "@/lib/utils";

const DISMISS_OFFSET_PX = 110;
const DISMISS_VELOCITY = 650;
const KEYBOARD_INSET_PX = 80;
/** Extra sheet color below the visual viewport so the page cannot show above the keys. */
const KEYBOARD_BLEED_PX = 320;
/** Matches the iOS keyboard dismiss so the sheet lands with the keys. */
const KEYBOARD_RETURN_S = 0.34;

function topicDisplayLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return label;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function isEditableField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  return target.isContentEditable;
}

function readKeyboardViewport(restingLayout: number): {
  inset: number;
  top: number;
  height: number;
} {
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const top = viewport?.offsetTop ?? 0;
  const layout = window.innerHeight;
  const inset = Math.max(0, layout - height - top);
  const resting = Math.max(restingLayout, layout);
  /* Layout viewport already ends at the keyboard (interactive-widget).
     A shorter fixed sheet leaves the profile visible above the keys. */
  if (resting - layout > KEYBOARD_INSET_PX && inset <= KEYBOARD_INSET_PX) {
    return { inset: 0, top: 0, height: layout };
  }
  return {
    inset: inset > KEYBOARD_INSET_PX ? inset : 0,
    top,
    height,
  };
}

/** Drop a stuck document scroll. Do not fight the keyboard pan (offsetTop > 0) — that leaves a gap above the keys. */
function pinInquiryPageScroll(): void {
  const offset = window.visualViewport?.offsetTop ?? 0;
  if (offset > 1 || window.scrollY <= 1) return;
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  } catch {
    window.scrollTo(0, 0);
  }
}

type SheetView = "compose" | "signup" | "signin" | "awaiting_email" | "success";

interface SpecialistInquirySheetProps {
  open: boolean;
  onClose: () => void;
  specialistId: string;
  specialistName: string;
  specialistProfession?: string;
  profilePath: string;
  offersFreeFirstSession?: boolean;
  /** When opening from the profile claim CTA, pre-check this topic if allowed. */
  preselectTopicId?: string;
}

function emptyDraft(
  specialistId: string,
  specialistName: string,
  profilePath: string
): PendingInquiryDraft {
  const existing = readPendingInquiryDraft();
  if (existing && existing.specialistId === specialistId) {
    return {
      ...existing,
      inquiryAction: DEFAULT_INQUIRY_ACTION,
      specialistName,
      profilePath,
    };
  }
  return {
    specialistId,
    specialistName,
    inquiryAction: DEFAULT_INQUIRY_ACTION,
    inquiryTopics: [],
    message: "",
    profilePath,
    startedAt: new Date().toISOString(),
  };
}

function draftWithAllowedTopics(
  draft: PendingInquiryDraft,
  allowedIds: Set<string>,
  preselectTopicId?: string
): PendingInquiryDraft {
  const inquiryTopics = draft.inquiryTopics.filter((id) => allowedIds.has(id));
  if (
    preselectTopicId &&
    allowedIds.has(preselectTopicId) &&
    !inquiryTopics.includes(preselectTopicId)
  ) {
    inquiryTopics.unshift(preselectTopicId);
  }
  return { ...draft, inquiryTopics };
}

export function SpecialistInquirySheet({
  open,
  onClose,
  specialistId,
  specialistName,
  specialistProfession = "",
  profilePath,
  offersFreeFirstSession = false,
  preselectTopicId,
}: SpecialistInquirySheetProps) {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const { session, isSignedIn, refreshSession } = useAuthSession();
  const topicOptions = getInquiryTopicOptions(specialistProfession, {
    offersFreeFirstSession,
  });

  const [view, setView] = useState<SheetView>("compose");
  const [draft, setDraft] = useState<PendingInquiryDraft>(() =>
    emptyDraft(specialistId, specialistName, profilePath)
  );
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const backdropDismiss = useOwnPointerDismiss(() => {
    if (!sending) onClose();
  });
  const [emailMode, setEmailMode] = useState<"resend" | "console" | null>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [ofAge, setOfAge] = useState(false);
  const [password, setPassword] = useState("");
  const [syncedOpenKey, setSyncedOpenKey] = useState("");
  const submittingRef = useRef(false);
  const [keyboardViewport, setKeyboardViewport] = useState({
    inset: 0,
    top: 0,
    height: 0,
    cover: 0,
  });
  const keyboardFrameRef = useRef(keyboardViewport);
  keyboardFrameRef.current = keyboardViewport;
  const restingLayoutRef = useRef(0);
  /** Where the sheet was when the keyboard started closing, and where it rests. */
  const returnFromRef = useRef<{ top: number; height: number } | null>(null);
  const returnToRef = useRef<{ top: number; height: number } | null>(null);
  const returnPhaseRef = useRef<"idle" | "measure" | "hold" | "slide">("idle");
  const [returnShift, setReturnShift] = useState<{
    y: number;
    height: number;
    stage: "hold" | "arm" | "slide";
  } | null>(null);
  const returnPlayingRef = useRef(false);

  const openKey = open
    ? `${specialistId}:${profilePath}:${preselectTopicId ?? ""}`
    : "";

  if (open && syncedOpenKey !== openKey) {
    setSyncedOpenKey(openKey);
    const next = draftWithAllowedTopics(
      emptyDraft(specialistId, specialistName, profilePath),
      new Set(topicOptions.map((topic) => topic.id)),
      preselectTopicId
    );
    setDraft(next);
    setView("compose");
    setError(null);
    setSending(false);
    trackInquiryEvent("specialist_inquiry_opened", { specialistId });
  } else if (!open && syncedOpenKey) {
    setSyncedOpenKey("");
  }

  const persistDraft = useCallback((next: PendingInquiryDraft) => {
    writePendingInquiryDraft(next);
    setDraft(next);
  }, []);

  /* Persist outside render — localStorage can throw (quota / private mode). */
  useEffect(() => {
    if (!open || !syncedOpenKey) return;
    writePendingInquiryDraft(draft);
  }, [open, syncedOpenKey, draft]);

  useEffect(() => {
    document.body.classList.toggle("inquiry-sheet-open", open);
    document.documentElement.classList.toggle("inquiry-sheet-open", open);
    return () => {
      document.body.classList.remove("inquiry-sheet-open");
      document.documentElement.classList.remove("inquiry-sheet-open");
    };
  }, [open]);

  /*
   * Do not pushState / history.back() while this overlay is open. The
   * specialist profile intercept already owns that history entry; a dummy
   * back() closes the profile and can land on Home / Explore instead of
   * the specialist the user was messaging.
   */
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function syncKeyboardViewport() {
      pinInquiryPageScroll();
      const layout = window.innerHeight;
      if (restingLayoutRef.current === 0) restingLayoutRef.current = layout;
      const frame = readKeyboardViewport(restingLayoutRef.current);
      if (frame.inset === 0) {
        restingLayoutRef.current = Math.max(restingLayoutRef.current, layout);
      }
      const phase = returnPhaseRef.current;

      if (frame.inset > 0) {
        if (phase !== "idle") {
          returnPhaseRef.current = "idle";
          returnPlayingRef.current = false;
          returnFromRef.current = null;
          returnToRef.current = null;
          setReturnShift(null);
        }
        setKeyboardViewport((current) => {
          if (
            current.inset === frame.inset &&
            current.top === frame.top &&
            current.height === frame.height
          ) {
            return current;
          }
          return { ...frame, cover: current.cover };
        });
        return;
      }

      if (phase === "measure" || phase === "hold" || phase === "slide") return;

      const current = keyboardFrameRef.current;
      if (current.inset > 0) {
        const rect = sheetRef.current?.getBoundingClientRect();
        returnFromRef.current = rect
          ? { top: rect.top, height: rect.height }
          : null;
        returnPhaseRef.current = returnFromRef.current ? "measure" : "idle";
        setKeyboardViewport({ inset: 0, top: 0, height: 0, cover: 0 });
        return;
      }
    }

    let keyboardPaintTimer = 0;
    function paintInquiryKeyboard() {
      document.documentElement.classList.add("inquiry-keyboard-open");
      document.body.classList.add("inquiry-keyboard-open");
    }
    function clearInquiryKeyboard() {
      document.documentElement.classList.remove("inquiry-keyboard-open");
      document.body.classList.remove("inquiry-keyboard-open");
    }
    function onFocusIn(event: FocusEvent) {
      if (!isEditableField(event.target)) return;
      if (!rootRef.current?.contains(event.target)) return;
      window.clearTimeout(keyboardPaintTimer);
      paintInquiryKeyboard();
      const field = event.target;
      const scroller = field.closest(".inquiry-sheet__body");
      window.setTimeout(() => {
        pinInquiryPageScroll();
        if (!(scroller instanceof HTMLElement)) return;
        const fieldRect = field.getBoundingClientRect();
        const scrollerRect = scroller.getBoundingClientRect();
        const overflow = fieldRect.bottom - (scrollerRect.bottom - 12);
        if (overflow > 0) scroller.scrollTop += overflow;
      }, 280);
    }
    function onFocusOut(event: FocusEvent) {
      if (!isEditableField(event.target)) return;
      if (!rootRef.current?.contains(event.target)) return;
      window.clearTimeout(keyboardPaintTimer);
      keyboardPaintTimer = window.setTimeout(() => {
        const active = document.activeElement;
        if (
          active instanceof HTMLElement &&
          rootRef.current?.contains(active) &&
          isEditableField(active)
        ) {
          return;
        }
        clearInquiryKeyboard();
      }, 480);
    }

    syncKeyboardViewport();
    window.visualViewport?.addEventListener("resize", syncKeyboardViewport);
    window.visualViewport?.addEventListener("scroll", syncKeyboardViewport);
    window.addEventListener("resize", syncKeyboardViewport);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      window.clearTimeout(keyboardPaintTimer);
      clearInquiryKeyboard();
      window.visualViewport?.removeEventListener("resize", syncKeyboardViewport);
      window.visualViewport?.removeEventListener("scroll", syncKeyboardViewport);
      window.removeEventListener("resize", syncKeyboardViewport);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    restingLayoutRef.current = 0;
    returnPhaseRef.current = "idle";
    returnPlayingRef.current = false;
    returnFromRef.current = null;
    returnToRef.current = null;
    setReturnShift(null);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || returnPhaseRef.current !== "measure") return;
    const from = returnFromRef.current;
    const sheet = sheetRef.current;
    const root = rootRef.current;
    if (!from || !sheet || !root || reduceMotion) {
      returnPhaseRef.current = "idle";
      returnFromRef.current = null;
      return;
    }
    const to = sheet.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    /* Desktop keeps the sheet centered. Only the phone sheet rides the keyboard. */
    if (rootRect.bottom - to.bottom > 2) {
      returnPhaseRef.current = "idle";
      returnFromRef.current = null;
      return;
    }
    const y = from.top - (rootRect.bottom - from.height);
    if (Math.abs(y) < 0.5 && Math.abs(from.height - to.height) < 0.5) {
      returnPhaseRef.current = "idle";
      returnFromRef.current = null;
      return;
    }
    returnToRef.current = { top: to.top, height: to.height };
    returnPhaseRef.current = "hold";
    setReturnShift({ y, height: from.height, stage: "hold" });
  }, [open, keyboardViewport, reduceMotion]);

  useEffect(() => {
    if (!returnShift || returnShift.stage !== "hold" || returnPlayingRef.current) {
      return;
    }
    const to = returnToRef.current;
    if (!to) return;
    returnPlayingRef.current = true;
    window.setTimeout(() => {
      setReturnShift((current) =>
        current && current.stage === "hold" ? { ...current, stage: "arm" } : current
      );
    }, 20);
    window.setTimeout(() => {
      if (returnPhaseRef.current === "idle") return;
      returnPhaseRef.current = "slide";
      setReturnShift({ y: 0, height: to.height, stage: "slide" });
    }, 48);
  }, [returnShift]);

  useEffect(() => {
    if (!returnShift || returnShift.stage !== "slide") return;
    const timer = window.setTimeout(() => {
      if (returnPhaseRef.current !== "slide") return;
      returnPhaseRef.current = "idle";
      returnPlayingRef.current = false;
      returnFromRef.current = null;
      returnToRef.current = null;
      setReturnShift(null);
    }, KEYBOARD_RETURN_S * 1000 + 50);
    return () => window.clearTimeout(timer);
  }, [returnShift]);

  useLayoutEffect(() => {
    if (!open || keyboardViewport.inset <= 0) return;
    const sheet = sheetRef.current;
    const viewport = window.visualViewport;
    if (!sheet || !viewport) return;
    /* visualViewport and getBoundingClientRect share the same origin. */
    const gap = viewport.height - sheet.getBoundingClientRect().bottom;
    if (gap <= 1) return;
    const cover = Math.min(320, keyboardViewport.cover + Math.ceil(gap));
    setKeyboardViewport((current) =>
      current.cover === cover ? current : { ...current, cover }
    );
  }, [open, keyboardViewport]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (submittingRef.current) return;
      if (
        info.offset.y > DISMISS_OFFSET_PX ||
        info.velocity.y > DISMISS_VELOCITY
      ) {
        onCloseRef.current();
      }
    },
    []
  );

  const sendInquiry = useCallback(async () => {
    if (submittingRef.current) return;
    const validation = validateInquiryDraft(draft);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    if (!session || session.role !== "client") {
      setView("signup");
      trackInquiryEvent("quick_signup_opened", { specialistId });
      return;
    }

    submittingRef.current = true;
    setSending(true);
    setError(null);
    trackInquiryEvent("inquiry_send_clicked", { specialistId });

    const result = await submitSpecialistInquiry(
      draftToSubmitInput(draft, {
        userId: session.userId,
        firstName: session.firstName?.trim() || firstName || "Client",
        email: session.email,
        avatarUrl: session.avatarUrl,
      })
    );

    setSending(false);
    submittingRef.current = false;

    if (!result.ok) {
      setError(result.message);
      return;
    }

    clearPendingInquiryDraft();
    setEmailMode(result.emailMode ?? null);
    setView("success");
  }, [draft, session, specialistId, firstName]);

  const handleSendClick = () => {
    void sendInquiry();
  };

  const handleQuickSignup = async () => {
    if (submittingRef.current) return;
    if (!ofAge) {
      setError(AGE_CONFIRMATION_ERROR);
      return;
    }
    const validation = validateInquiryDraft(draft);
    if (!validation.ok) {
      setError(validation.message);
      setView("compose");
      return;
    }

    submittingRef.current = true;
    setSending(true);
    setError(null);
    writePendingInquiryDraft(draft);

    const result = await startInquiryQuickAccount({
      firstName,
      email,
      returnPath: profilePath,
    });

    if (result.ok === "email_sent") {
      setSending(false);
      submittingRef.current = false;
      setView("awaiting_email");
      return;
    }

    if (!result.ok) {
      setSending(false);
      submittingRef.current = false;
      setError(result.message);
      if (result.code === "existing_account") {
        setView("signin");
      }
      return;
    }

    setAuthSession(result.session);
    trackInquiryEvent("quick_signup_completed", { specialistId });

    const sendResult = await submitSpecialistInquiry(
      draftToSubmitInput(draft, {
        userId: result.session.userId,
        firstName: firstName.trim() || result.session.firstName || "Client",
        email: result.session.email,
        avatarUrl: result.session.avatarUrl,
      })
    );

    setSending(false);
    submittingRef.current = false;

    if (!sendResult.ok) {
      setError(sendResult.message);
      return;
    }

    clearPendingInquiryDraft();
    await refreshSession();
    setEmailMode(sendResult.emailMode ?? null);
    setView("success");
  };

  const handleSignIn = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSending(true);
    setError(null);
    writePendingInquiryDraft(draft);

    const result = await signInClientForInquiry(email, password);
    if (result.ok !== true) {
      setSending(false);
      submittingRef.current = false;
      setError(
        result.ok === "confirm_email"
          ? "Check your email to confirm your account, then return here."
          : result.message
      );
      return;
    }

    setAuthSession(result.session);
    const sendResult = await submitSpecialistInquiry(
      draftToSubmitInput(draft, {
        userId: result.session.userId,
        firstName: result.session.firstName?.trim() || "Client",
        email: result.session.email,
        avatarUrl: result.session.avatarUrl,
      })
    );

    setSending(false);
    submittingRef.current = false;

    if (!sendResult.ok) {
      setError(sendResult.message);
      return;
    }

    clearPendingInquiryDraft();
    await refreshSession();
    setEmailMode(sendResult.emailMode ?? null);
    setView("success");
  };

  const toggleTopic = (topicId: InquiryTopicId) => {
    const has = draft.inquiryTopics.includes(topicId);
    const inquiryTopics = has
      ? draft.inquiryTopics.filter((id) => id !== topicId)
      : [...draft.inquiryTopics, topicId];
    persistDraft({ ...draft, inquiryTopics });
    trackInquiryEvent("inquiry_topic_selected", { topicId });
  };

  if (typeof document === "undefined") return null;

  const sheetTransition = reduceMotion
    ? { duration: 0.16, ease: "easeOut" as const }
    : { type: "spring" as const, damping: 34, stiffness: 420, mass: 0.82 };

  const backdropTransition = reduceMotion
    ? { duration: 0.14 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

  const messageLen = draft.message.length;
  const keyboardOpen = keyboardViewport.inset > 0;
  const keyboardReturning = returnShift != null;

  return createPortal(
    <>
    <div className="inquiry-keyboard-scrim" aria-hidden />
    <AnimatePresence>
      {open ? (
        <div
          ref={rootRef}
          className={cn(
            "inquiry-sheet-root",
            keyboardOpen && "inquiry-sheet-root--keyboard"
          )}
          role="presentation"
          style={
            keyboardOpen
              ? ({
                  top: keyboardViewport.top,
                  height:
                    keyboardViewport.height +
                    keyboardViewport.cover +
                    KEYBOARD_BLEED_PX,
                  bottom: "auto",
                  "--inquiry-keyboard-pane": `${Math.round(keyboardViewport.height + keyboardViewport.cover)}px`,
                } as CSSProperties)
              : undefined
          }
        >
          {keyboardOpen || keyboardReturning ? (
            <div
              className={cn(
                "inquiry-sheet__keyboard-fill",
                !keyboardOpen && "inquiry-sheet__keyboard-fill--return"
              )}
              aria-hidden
            />
          ) : null}

          <motion.button
            type="button"
            aria-label="Close inquiry"
            className="smoac-control inquiry-sheet__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            onPointerDown={backdropDismiss.onPointerDown}
            onPointerUp={backdropDismiss.onPointerUp}
            onClick={backdropDismiss.onClick}
          />

          <motion.div
            ref={sheetRef}
            className={cn(
              "inquiry-sheet",
              keyboardOpen && "inquiry-sheet--keyboard",
              keyboardReturning && "inquiry-sheet--returning",
              keyboardReturning &&
                returnShift.stage !== "slide" &&
                "inquiry-sheet--returning-hold"
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: "100%" }}
            animate={keyboardReturning ? { y: returnShift.y } : { y: 0 }}
            exit={{ y: "100%" }}
            transition={
              keyboardReturning
                ? returnShift.stage === "slide" && !reduceMotion
                  ? { duration: KEYBOARD_RETURN_S, ease: [0.32, 0.72, 0, 1] }
                  : { duration: 0 }
                : sheetTransition
            }
            style={
              keyboardReturning
                ? { height: returnShift.height }
                : keyboardOpen
                  ? undefined
                  : { height: "auto" }
            }
            drag={keyboardReturning ? false : "y"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.55 }}
            onDragEnd={handleDragEnd}
          >
            <div className="inquiry-sheet__chrome">
              <button
                type="button"
                className="inquiry-sheet__handle-hit"
                aria-label="Drag to close"
                onPointerDown={(event) => {
                  if (sending) return;
                  dragControls.start(event);
                }}
              >
                <span className="inquiry-sheet__handle" aria-hidden />
              </button>
              <div className="inquiry-sheet__header">
                <div className="inquiry-sheet__heading">
                  {view === "compose" ? (
                    <>
                      <p className="inquiry-sheet__eyebrow">New inquiry</p>
                      <h2 id={titleId} className="inquiry-sheet__title">
                        {specialistName}
                      </h2>
                      <p className="inquiry-sheet__subtitle">
                        Send a private message to this specialist.
                      </p>
                    </>
                  ) : (
                    <h2 id={titleId} className="inquiry-sheet__title">
                      {view === "success"
                        ? "You're all set"
                        : view === "awaiting_email"
                          ? "Check your email"
                          : view === "signup"
                            ? "One quick step"
                            : "Sign in to send"}
                    </h2>
                  )}
                </div>
                <FastActivateButton
                  onActivate={onClose}
                  className="smoac-control inquiry-sheet__close"
                  aria-label="Close"
                  disabled={sending}
                  data-sheet-initial-focus
                >
                  <CloseIcon className="h-4 w-4" />
                </FastActivateButton>
              </div>
            </div>

            <div className="inquiry-sheet__body">
              {view === "compose" ? (
                <>
                  <div className="inquiry-sheet__section">
                    <p className="inquiry-sheet__section-title">
                      What are you interested in?
                    </p>
                    <p className="inquiry-sheet__section-hint">
                      Select all that apply.
                    </p>
                    <div className="inquiry-sheet__topics">
                      {topicOptions.map((topic) => {
                        const selected = draft.inquiryTopics.includes(topic.id);
                        return (
                          <FastActivateButton
                            key={topic.id}
                            aria-pressed={selected}
                            className={cn(
                              "smoac-control inquiry-sheet__topic",
                              selected && "inquiry-sheet__topic--selected"
                            )}
                            onActivate={() => toggleTopic(topic.id)}
                          >
                            {selected ? (
                              <CheckIcon className="inquiry-sheet__topic-check" />
                            ) : null}
                            {topicDisplayLabel(topic.label)}
                          </FastActivateButton>
                        );
                      })}
                    </div>
                  </div>

                  <div className="inquiry-sheet__section">
                    <label
                      className="inquiry-sheet__section-title"
                      htmlFor="inquiry-message"
                    >
                      Your message
                    </label>
                    <div className="inquiry-sheet__field">
                      <textarea
                        id="inquiry-message"
                        className="inquiry-sheet__textarea"
                        rows={4}
                        maxLength={INQUIRY_MESSAGE_MAX_LENGTH}
                        placeholder="Hi! I’d love to learn more about your training options..."
                        value={draft.message}
                        onChange={(event) =>
                          persistDraft({
                            ...draft,
                            message: event.target.value.slice(
                              0,
                              INQUIRY_MESSAGE_MAX_LENGTH
                            ),
                          })
                        }
                      />
                      <p className="inquiry-sheet__count">
                        {messageLen}/{INQUIRY_MESSAGE_MAX_LENGTH}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}

              {view === "signup" ? (
                <QuickClientAccountSignupFields
                  variant="inquiry-sheet"
                  idPrefix="inquiry"
                  firstName={firstName}
                  email={email}
                  onFirstNameChange={setFirstName}
                  onEmailChange={setEmail}
                  ofAge={ofAge}
                  onOfAgeChange={setOfAge}
                  supportText={`Your message is ready. Enter your name and email so we can send it to ${specialistName}.`}
                />
              ) : null}

              {view === "signin" ? (
                <QuickClientAccountSigninFields
                  variant="inquiry-sheet"
                  idPrefix="inquiry"
                  email={email}
                  password={password}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  supportText={`Sign in and we’ll send your saved message to ${specialistName}.`}
                />
              ) : null}

              {view === "awaiting_email" ? (
                <div className="inquiry-sheet__state">
                  <p className="inquiry-sheet__support">
                    You’re almost done. Open the sign-in email we just sent — your
                    message stays saved and sends automatically.
                  </p>
                  <ol className="inquiry-sheet__steps">
                    <li className="inquiry-sheet__step">
                      <span className="inquiry-sheet__step-num" aria-hidden>
                        1
                      </span>
                      <p className="inquiry-sheet__step-copy">
                        Open the email
                        {email.trim() ? (
                          <>
                            {" "}
                            sent to{" "}
                            <span className="inquiry-sheet__email-chip">
                              {email.trim()}
                            </span>
                          </>
                        ) : (
                          " we sent you"
                        )}
                        .
                      </p>
                    </li>
                    <li className="inquiry-sheet__step">
                      <span className="inquiry-sheet__step-num" aria-hidden>
                        2
                      </span>
                      <p className="inquiry-sheet__step-copy">
                        Tap the <strong>secure sign-in link</strong>.
                      </p>
                    </li>
                    <li className="inquiry-sheet__step">
                      <span className="inquiry-sheet__step-num" aria-hidden>
                        3
                      </span>
                      <p className="inquiry-sheet__step-copy">
                        We’ll send your message to{" "}
                        <strong>{specialistName}</strong> automatically.
                      </p>
                    </li>
                  </ol>
                  <p className="inquiry-sheet__helper">
                    Don’t see it? Check spam or promotions. You can close this and
                    come back anytime — your draft is saved.
                  </p>
                </div>
              ) : null}

              {view === "success" ? (
                <div className="inquiry-sheet__state">
                  <p className="inquiry-sheet__success">
                    Sent to {specialistName}. They’ll reply in your Messages.
                  </p>
                  <p className="inquiry-sheet__support">
                    {emailMode === "resend"
                      ? "We’ll email you when they respond."
                      : "Your inquiry is saved in your SMOAC account."}
                  </p>
                  <HeaderChromeLink
                    href={`${CLIENT_DASHBOARD_PATH}?tab=messages`}
                    className="smoac-control inquiry-sheet__submit"
                    onActivate={onClose}
                  >
                    View messages
                  </HeaderChromeLink>
                  <FastActivateButton
                    className="smoac-control inquiry-sheet__text-btn"
                    onActivate={onClose}
                  >
                    Done
                  </FastActivateButton>
                  <p className="inquiry-sheet__helper inquiry-sheet__helper--tight">
                    After you connect, you’re welcome to leave a review.
                  </p>
                  <HeaderChromeLink
                    href={buildLeaveReviewHref(specialistId)}
                    className="smoac-control inquiry-sheet__secondary-link"
                    onActivate={onClose}
                  >
                    Leave a review later
                  </HeaderChromeLink>
                </div>
              ) : null}

              <QuickClientAccountAuthError variant="inquiry-sheet" message={error} />
            </div>

            {view !== "success" ? (
              <div className="inquiry-sheet__footer">
                {view === "compose" ? (
                  <>
                    <FastActivateButton
                      className="smoac-control inquiry-sheet__submit"
                      disabled={sending}
                      onActivate={handleSendClick}
                    >
                      {sending ? "Sending…" : "Send Inquiry"}
                      {sending ? null : (
                        <span className="inquiry-sheet__submit-arrow" aria-hidden>
                          →
                        </span>
                      )}
                    </FastActivateButton>
                    <p className="inquiry-sheet__privacy">
                      <LockIcon className="inquiry-sheet__privacy-icon" />
                      Your message goes directly to the specialist.
                    </p>
                    {!isSignedIn ? (
                      <p className="inquiry-sheet__helper">
                        Next you’ll add your name and email — then we send it.
                      </p>
                    ) : null}
                  </>
                ) : null}

                {view === "awaiting_email" ? (
                  <>
                    <FastActivateButton
                      className="smoac-control inquiry-sheet__submit"
                      onActivate={onClose}
                    >
                      Got it — I’ll check my email
                    </FastActivateButton>
                    <p className="inquiry-sheet__helper">
                      After you tap the link, come back to SMOAC and your message
                      sends on its own.
                    </p>
                  </>
                ) : null}

                {view === "signup" || view === "signin" ? (
                  <QuickClientAccountAuthActions
                    variant="inquiry-sheet"
                    view={view}
                    sending={sending}
                    signupCta="Continue & Send"
                    signInCta="Sign in & Send"
                    signupDisabled={!ofAge}
                    onSignup={() => void handleQuickSignup()}
                    onSignIn={() => void handleSignIn()}
                    onSwitchToSignin={() => {
                      trackInquiryEvent("existing_user_signin_selected");
                      setView("signin");
                      setError(null);
                    }}
                    onSwitchToSignup={() => {
                      setView("signup");
                      setError(null);
                    }}
                    onOpenFullLogin={onClose}
                  />
                ) : null}
              </div>
            ) : null}

            {sending ? (
              <SmoacSavingOverlay
                label={
                  view === "signup"
                    ? "Creating your account"
                    : view === "signin"
                      ? "Signing in"
                      : "Sending your message"
                }
              />
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
    </>,
    document.body
  );
}
