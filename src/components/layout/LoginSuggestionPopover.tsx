"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { LOGIN_PATH } from "@/lib/auth-routes";
import {
  hasSeenLoginSuggestion,
  markLoginSuggestionSeen,
} from "@/lib/login-suggestion-storage";
import { cn } from "@/lib/utils";

const SHOW_DELAY_MS = 500;
const AUTO_DISMISS_MS = 4500;
const EXIT_MS = 320;

interface LoginSuggestionPopoverProps {
  isLoggedIn: boolean;
  isHomePage: boolean;
  profileMenuOpen?: boolean;
  navMenuOpen?: boolean;
  anchorRef?: React.RefObject<HTMLElement | null>;
  onLoginClick?: () => void;
}

export function LoginSuggestionPopover({
  isLoggedIn,
  isHomePage,
  profileMenuOpen = false,
  navMenuOpen = false,
  anchorRef,
  onLoginClick,
}: LoginSuggestionPopoverProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const scheduledRef = useRef(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    showTimerRef.current = null;
    dismissTimerRef.current = null;
    exitTimerRef.current = null;
  }, []);

  const runExit = useCallback(() => {
    setExiting(true);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, EXIT_MS);
  }, []);

  const dismiss = useCallback(
    (markSeen = true) => {
      clearTimers();
      if (markSeen) markLoginSuggestionSeen();
      scheduledRef.current = true;
      setVisible((wasVisible) => {
        if (wasVisible) runExit();
        return wasVisible;
      });
    },
    [clearTimers, runExit]
  );

  const offHome = !isHomePage;
  const suppressed = isLoggedIn || profileMenuOpen || navMenuOpen;

  const [prevOffHome, setPrevOffHome] = useState(offHome);
  if (offHome !== prevOffHome) {
    setPrevOffHome(offHome);
    if (offHome && (visible || exiting)) {
      setVisible(false);
      setExiting(false);
    }
  }

  const [prevSuppressed, setPrevSuppressed] = useState(suppressed);
  if (suppressed !== prevSuppressed) {
    setPrevSuppressed(suppressed);
    if (suppressed && (visible || exiting)) {
      markLoginSuggestionSeen();
      setVisible(false);
      setExiting(false);
    }
  }

  useLayoutEffect(() => {
    if (offHome || suppressed) {
      clearTimers();
      if (suppressed) scheduledRef.current = true;
    }
  }, [offHome, suppressed, clearTimers]);

  const canSchedule =
    isHomePage &&
    !isLoggedIn &&
    !profileMenuOpen &&
    !navMenuOpen &&
    !hasSeenLoginSuggestion();

  useEffect(() => {
    if (!canSchedule) {
      clearTimers();
      if (!isHomePage || isLoggedIn) {
        scheduledRef.current = false;
      }
      return;
    }

    const anchor = anchorRef?.current;
    if (anchor && anchor.offsetParent === null) return;

    if (scheduledRef.current) return;
    scheduledRef.current = true;

    showTimerRef.current = setTimeout(() => {
      if (hasSeenLoginSuggestion()) return;
      setVisible(true);
      dismissTimerRef.current = setTimeout(() => {
        markLoginSuggestionSeen();
        runExit();
      }, AUTO_DISMISS_MS);
    }, SHOW_DELAY_MS);

    return clearTimers;
  }, [canSchedule, isHomePage, isLoggedIn, anchorRef, clearTimers, runExit]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!visible && !exiting) return null;

  return (
    <div
      className={cn(
        "login-suggestion",
        visible && !exiting && "login-suggestion--visible",
        exiting && "login-suggestion--exiting"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="login-suggestion__caret" aria-hidden />
      <div className="login-suggestion__card">
        <button
          type="button"
          className="login-suggestion__close"
          aria-label="Dismiss login suggestion"
          onClick={() => dismiss(true)}
        >
          <CloseIcon className="login-suggestion__close-icon" />
        </button>
        <p className="login-suggestion__title">Login for the best experience</p>
        <p className="login-suggestion__text">
          Save trainers, compare specialists, and build your shortlist.
        </p>
        <Link
          href={LOGIN_PATH}
          className="login-suggestion__cta"
          onClick={() => {
            dismiss(true);
            onLoginClick?.();
          }}
        >
          Login / Create Account
        </Link>
      </div>
    </div>
  );
}
