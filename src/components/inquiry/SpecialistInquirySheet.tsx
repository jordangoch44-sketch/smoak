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
import { CloseIcon } from "@/components/ui/icons";
import {
  QuickClientAccountAuthActions,
  QuickClientAccountAuthError,
  QuickClientAccountSigninFields,
  QuickClientAccountSignupFields,
} from "@/components/auth/QuickClientAccountAuthUI";
import { useAuthSession } from "@/hooks/useAuthSession";
import { CLIENT_DASHBOARD_PATH } from "@/lib/auth-routes";
import {
  startInquiryQuickAccount,
  signInClientForInquiry,
} from "@/lib/auth/inquiry-auth";
import { setAuthSession } from "@/lib/auth-session-store";
import { trackInquiryEvent } from "@/lib/inquiry/inquiry-analytics";
import { recordSpecialistEngagement } from "@/lib/specialist-engagement-tracking";
import {
  draftToSubmitInput,
  submitSpecialistInquiry,
} from "@/lib/inquiry/inquiry-submit";
import {
  INQUIRY_ACTIONS,
  INQUIRY_MESSAGE_MAX_LENGTH,
  getInquiryTopicsForProfession,
  type InquiryActionId,
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

type SheetView = "compose" | "signup" | "signin" | "awaiting_email" | "success";

interface SpecialistInquirySheetProps {
  open: boolean;
  onClose: () => void;
  specialistId: string;
  specialistName: string;
  specialistProfession?: string;
  profilePath: string;
  /** Pre-select action when opening from Book Consultation */
  initialAction?: InquiryActionId;
}

function emptyDraft(
  specialistId: string,
  specialistName: string,
  profilePath: string,
  initialAction: InquiryActionId
): PendingInquiryDraft {
  const existing = readPendingInquiryDraft();
  if (existing && existing.specialistId === specialistId) {
    return {
      ...existing,
      inquiryAction: initialAction || existing.inquiryAction,
      specialistName,
      profilePath,
    };
  }
  return {
    specialistId,
    specialistName,
    inquiryAction: initialAction,
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
  initialAction = "ask_question",
}: SpecialistInquirySheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const historyPushedRef = useRef(false);
  const { session, isSignedIn, refreshSession } = useAuthSession();
  const topicOptions = getInquiryTopicsForProfession(specialistProfession);

  const [view, setView] = useState<SheetView>("compose");
  const [draft, setDraft] = useState<PendingInquiryDraft>(() =>
    emptyDraft(specialistId, specialistName, profilePath, initialAction)
  );
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [emailMode, setEmailMode] = useState<"resend" | "console" | null>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [syncedOpenKey, setSyncedOpenKey] = useState("");
  const submittingRef = useRef(false);

  const openKey = open
    ? `${specialistId}:${initialAction}:${profilePath}`
    : "";

  if (open && syncedOpenKey !== openKey) {
    setSyncedOpenKey(openKey);
    const next = emptyDraft(
      specialistId,
      specialistName,
      profilePath,
      initialAction
    );
    setDraft(next);
    writePendingInquiryDraft(next);
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

  useEffect(() => {
    document.body.classList.toggle("inquiry-sheet-open", open);
    document.documentElement.classList.toggle("inquiry-sheet-open", open);
    return () => {
      document.body.classList.remove("inquiry-sheet-open");
      document.documentElement.classList.remove("inquiry-sheet-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    window.history.pushState({ smoacInquirySheet: true }, "");
    historyPushedRef.current = true;

    function onPopState() {
      historyPushedRef.current = false;
      onClose();
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        window.history.back();
      }
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (
        info.offset.y > DISMISS_OFFSET_PX ||
        info.velocity.y > DISMISS_VELOCITY
      ) {
        onClose();
      }
    },
    [onClose]
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

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="inquiry-sheet-root" role="presentation">
          <motion.button
            type="button"
            aria-label="Close inquiry"
            className="smoac-control inquiry-sheet__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            onClick={onClose}
          />

          <motion.div
            ref={sheetRef}
            className="inquiry-sheet"
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
                onPointerDown={(event) => dragControls.start(event)}
              >
                <span className="inquiry-sheet__handle" aria-hidden />
              </button>
              <div className="inquiry-sheet__header">
                <h2 id={titleId} className="inquiry-sheet__title">
                  {view === "success"
                    ? "Message sent"
                    : view === "signup" || view === "signin" || view === "awaiting_email"
                      ? "Send your message"
                      : "How can we help you?"}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="smoac-control inquiry-sheet__close"
                  aria-label="Close"
                  data-sheet-initial-focus
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="inquiry-sheet__body">
              {view === "compose" ? (
                <>
                  <div className="inquiry-sheet__actions" role="tablist" aria-label="Inquiry type">
                    {INQUIRY_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        role="tab"
                        aria-selected={draft.inquiryAction === action.id}
                        className={cn(
                          "smoac-control inquiry-sheet__action",
                          draft.inquiryAction === action.id &&
                            "inquiry-sheet__action--selected"
                        )}
                        onClick={() => {
                          persistDraft({ ...draft, inquiryAction: action.id });
                          trackInquiryEvent("inquiry_action_selected", {
                            action: action.id,
                          });
                          if (
                            action.id === "book_call" ||
                            action.id === "book_consultation"
                          ) {
                            recordSpecialistEngagement({
                              event: "booking_click",
                              specialistId,
                              surface: "profile",
                              inquiryAction: action.id,
                              oncePerSession: true,
                            });
                          }
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <p className="inquiry-sheet__label">
                    What would you like to ask about?
                  </p>
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
                    Your Question
                  </label>
                  <textarea
                    id="inquiry-message"
                    className="inquiry-sheet__textarea"
                    rows={5}
                    maxLength={INQUIRY_MESSAGE_MAX_LENGTH}
                    placeholder="Tell the specialist what you’re looking for or what you’d like help with."
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
                  supportText="Enter your first name and email so the specialist can respond."
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
                  supportText={`Sign in to send your message to ${specialistName}.`}
                />
              ) : null}

              {view === "awaiting_email" ? (
                <div className="inquiry-sheet__state">
                  <p className="inquiry-sheet__support">
                    Check your email for a secure sign-in link. Your message draft is
                    saved — once you verify, we’ll send it to {specialistName}{" "}
                    automatically.
                  </p>
                </div>
              ) : null}

              {view === "success" ? (
                <div className="inquiry-sheet__state">
                  <p className="inquiry-sheet__success">
                    Inquiry sent to {specialistName}. They’ll follow up by email.
                  </p>
                  <p className="inquiry-sheet__helper">
                    {emailMode === "resend"
                      ? "A confirmation was emailed to you."
                      : "Your message is saved in SMOAC. Confirmation email sends when Resend is configured (RESEND_API_KEY)."}
                  </p>
                  <Link
                    href={CLIENT_DASHBOARD_PATH}
                    className="smoac-control inquiry-sheet__secondary-link"
                    onClick={onClose}
                  >
                    Open dashboard
                  </Link>
                </div>
              ) : null}

              <QuickClientAccountAuthError variant="inquiry-sheet" message={error} />
            </div>

            {view !== "success" && view !== "awaiting_email" ? (
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
                        You’ll create a quick account before your message is sent.
                      </p>
                    ) : null}
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
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
