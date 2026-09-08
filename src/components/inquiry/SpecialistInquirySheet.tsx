"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import Link from "next/link";
import { SmoacSavingOverlay } from "@/components/brand/SmoacSavingMark";
import { CloseIcon } from "@/components/ui/icons";
import {
  QuickClientAccountAuthActions,
  QuickClientAccountAuthError,
  QuickClientAccountSigninFields,
  QuickClientAccountSignupFields,
} from "@/components/auth/QuickClientAccountAuthUI";
import { useAuthSession } from "@/hooks/useAuthSession";
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
  getInquiryTopicsForProfession,
  type InquiryTopicId,
} from "@/lib/inquiry-options";
import {
  clearPendingInquiryDraft,
  readPendingInquiryDraft,
  validateInquiryDraft,
  writePendingInquiryDraft,
  type PendingInquiryDraft,
} from "@/lib/pending-inquiry-storage";
import { cn } from "@/lib/utils";

const DISMISS_OFFSET_PX = 110;
const DISMISS_VELOCITY = 650;
const KEYBOARD_INSET_PX = 80;

function isEditableField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  return target.isContentEditable;
}

function readKeyboardViewport(): { inset: number; top: number; height: number } {
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const top = viewport?.offsetTop ?? 0;
  const inset = Math.max(0, window.innerHeight - height - top);
  return {
    inset: inset > KEYBOARD_INSET_PX ? inset : 0,
    top,
    height,
  };
}

type SheetView = "compose" | "signup" | "signin" | "awaiting_email" | "success";

interface SpecialistInquirySheetProps {
  open: boolean;
  onClose: () => void;
  specialistId: string;
  specialistName: string;
  specialistProfession?: string;
  profilePath: string;
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

export function SpecialistInquirySheet({
  open,
  onClose,
  specialistId,
  specialistName,
  specialistProfession = "",
  profilePath,
}: SpecialistInquirySheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const { session, isSignedIn, refreshSession } = useAuthSession();
  const topicOptions = getInquiryTopicsForProfession(specialistProfession);

  const [view, setView] = useState<SheetView>("compose");
  const [draft, setDraft] = useState<PendingInquiryDraft>(() =>
    emptyDraft(specialistId, specialistName, profilePath)
  );
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [emailMode, setEmailMode] = useState<"resend" | "console" | null>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [syncedOpenKey, setSyncedOpenKey] = useState("");
  const submittingRef = useRef(false);
  const [keyboardViewport, setKeyboardViewport] = useState({
    inset: 0,
    top: 0,
    height: 0,
  });

  const openKey = open ? `${specialistId}:${profilePath}` : "";

  if (open && syncedOpenKey !== openKey) {
    setSyncedOpenKey(openKey);
    const next = emptyDraft(specialistId, specialistName, profilePath);
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
      setKeyboardViewport(readKeyboardViewport());
    }

    function onFocusIn(event: FocusEvent) {
      if (!isEditableField(event.target)) return;
      const field = event.target;
      window.setTimeout(() => {
        field.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 280);
    }

    syncKeyboardViewport();
    window.visualViewport?.addEventListener("resize", syncKeyboardViewport);
    window.visualViewport?.addEventListener("scroll", syncKeyboardViewport);
    window.addEventListener("resize", syncKeyboardViewport);
    document.addEventListener("focusin", onFocusIn);

    return () => {
      window.visualViewport?.removeEventListener("resize", syncKeyboardViewport);
      window.visualViewport?.removeEventListener("scroll", syncKeyboardViewport);
      window.removeEventListener("resize", syncKeyboardViewport);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

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

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "inquiry-sheet-root",
            keyboardOpen && "inquiry-sheet-root--keyboard"
          )}
          role="presentation"
          style={
            keyboardOpen
              ? {
                  top: keyboardViewport.top,
                  height: keyboardViewport.height,
                  bottom: "auto",
                }
              : undefined
          }
        >
          <motion.button
            type="button"
            aria-label="Close inquiry"
            className="smoac-control inquiry-sheet__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            onClick={() => {
              if (!sending) onClose();
            }}
          />

          <motion.div
            ref={sheetRef}
            className={cn(
              "inquiry-sheet",
              keyboardOpen && "inquiry-sheet--keyboard"
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={sheetTransition}
            drag="y"
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
                      <p className="inquiry-sheet__eyebrow">
                        Inquire for specialist
                      </p>
                      <h2 id={titleId} className="inquiry-sheet__title">
                        {specialistName}
                      </h2>
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
                <button
                  type="button"
                  onClick={onClose}
                  className="smoac-control inquiry-sheet__close"
                  aria-label="Close"
                  disabled={sending}
                  data-sheet-initial-focus
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="inquiry-sheet__body">
              {view === "compose" ? (
                <>
                  <p className="inquiry-sheet__label">How can we help?</p>
                  <div className="inquiry-sheet__topics">
                    {topicOptions.map((topic) => {
                      const selected = draft.inquiryTopics.includes(topic.id);
                      return (
                        <button
                          key={topic.id}
                          type="button"
                          aria-pressed={selected}
                          className={cn(
                            "smoac-control inquiry-sheet__topic",
                            selected && "inquiry-sheet__topic--selected"
                          )}
                          onClick={() => toggleTopic(topic.id)}
                        >
                          <span
                            className={cn(
                              "inquiry-sheet__check",
                              selected && "inquiry-sheet__check--on"
                            )}
                            aria-hidden
                          />
                          {topic.label}
                        </button>
                      );
                    })}
                  </div>

                  <label className="inquiry-sheet__label" htmlFor="inquiry-message">
                    Message
                  </label>
                  <textarea
                    id="inquiry-message"
                    className="inquiry-sheet__textarea"
                    rows={5}
                    maxLength={INQUIRY_MESSAGE_MAX_LENGTH}
                    placeholder="Tell them what you’re looking for."
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
                    Sent to {specialistName}. They’ll reply in your Inquiries.
                  </p>
                  <p className="inquiry-sheet__support">
                    {emailMode === "resend"
                      ? "We’ll email you when they respond."
                      : "Your inquiry is saved in your SMOAC account."}
                  </p>
                  <Link
                    href={`${CLIENT_DASHBOARD_PATH}?tab=messages`}
                    className="smoac-control inquiry-sheet__submit"
                    onClick={onClose}
                  >
                    View your inquiry
                  </Link>
                  <button
                    type="button"
                    className="smoac-control inquiry-sheet__text-btn"
                    onClick={onClose}
                  >
                    Done
                  </button>
                  <p className="inquiry-sheet__helper inquiry-sheet__helper--tight">
                    After you connect, you’re welcome to leave a review.
                  </p>
                  <Link
                    href={buildLeaveReviewHref(specialistId)}
                    className="smoac-control inquiry-sheet__secondary-link"
                    onClick={onClose}
                  >
                    Leave a review later
                  </Link>
                </div>
              ) : null}

              <QuickClientAccountAuthError variant="inquiry-sheet" message={error} />
            </div>

            {view !== "success" ? (
              <div className="inquiry-sheet__footer">
                {view === "compose" ? (
                  <>
                    <button
                      type="button"
                      className="smoac-control inquiry-sheet__submit"
                      disabled={sending}
                      onClick={handleSendClick}
                    >
                      {sending ? "Sending…" : "Send Message"}
                    </button>
                    {!isSignedIn ? (
                      <p className="inquiry-sheet__helper">
                        Next you’ll add your name and email — then we send it.
                      </p>
                    ) : null}
                  </>
                ) : null}

                {view === "awaiting_email" ? (
                  <>
                    <button
                      type="button"
                      className="smoac-control inquiry-sheet__submit"
                      onClick={onClose}
                    >
                      Got it — I’ll check my email
                    </button>
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
    </AnimatePresence>,
    document.body
  );
}
