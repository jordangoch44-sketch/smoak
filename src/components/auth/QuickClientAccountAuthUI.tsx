"use client";

import Link from "next/link";
import { LOGIN_PATH } from "@/lib/auth-routes";

export type QuickClientAccountAuthVariant = "login-gate" | "inquiry-sheet";

type AuthClasses = {
  form: string | null;
  label: string;
  input: string;
  helper: string;
  support: string;
  privacy: string;
  error: string;
  actions: string;
  primaryBtn: string;
  ghostBtn: string;
  linkBtn: string;
};

function authClasses(variant: QuickClientAccountAuthVariant): AuthClasses {
  if (variant === "login-gate") {
    return {
      form: "login-gate__form",
      label: "login-gate__label",
      input: "login-gate__input",
      helper: "login-gate__helper",
      support: "login-gate__body",
      privacy: "login-gate__helper",
      error: "login-gate__error",
      actions: "login-gate__actions",
      primaryBtn: "smoac-control login-gate__btn login-gate__btn--aurora",
      ghostBtn: "smoac-control login-gate__btn login-gate__btn--ghost",
      linkBtn: "login-gate__btn login-gate__btn--ghost",
    };
  }

  return {
    form: null,
    label: "inquiry-sheet__label",
    input: "inquiry-sheet__input",
    helper: "inquiry-sheet__helper",
    support: "inquiry-sheet__support",
    privacy: "inquiry-sheet__privacy",
    error: "inquiry-sheet__error",
    actions: "inquiry-sheet__footer",
    primaryBtn: "smoac-control inquiry-sheet__submit",
    ghostBtn: "smoac-control inquiry-sheet__text-btn",
    linkBtn: "inquiry-sheet__text-btn",
  };
}

export interface QuickClientAccountSignupFieldsProps {
  variant: QuickClientAccountAuthVariant;
  idPrefix: string;
  firstName: string;
  email: string;
  onFirstNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  /** Inquiry sheet — paragraph above fields */
  supportText?: string;
}

export function QuickClientAccountSignupFields({
  variant,
  idPrefix,
  firstName,
  email,
  onFirstNameChange,
  onEmailChange,
  supportText,
}: QuickClientAccountSignupFieldsProps) {
  const classes = authClasses(variant);

  const fields = (
    <>
      {variant === "inquiry-sheet" && supportText ? (
        <p className={classes.support}>{supportText}</p>
      ) : null}
      <label className={classes.label} htmlFor={`${idPrefix}-first-name`}>
        First name
      </label>
      <input
        id={`${idPrefix}-first-name`}
        className={classes.input}
        autoComplete="given-name"
        value={firstName}
        onChange={(event) => onFirstNameChange(event.target.value)}
      />
      <label className={classes.label} htmlFor={`${idPrefix}-email`}>
        Email
      </label>
      <input
        id={`${idPrefix}-email`}
        type="email"
        className={classes.input}
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
      />
      {variant === "login-gate" ? (
        <p className={classes.helper}>You can complete your profile anytime.</p>
      ) : (
        <p className={classes.privacy}>
          We share your email with the specialist so they can reply directly. You
          can complete your profile later.
        </p>
      )}
    </>
  );

  if (classes.form) {
    return <div className={classes.form}>{fields}</div>;
  }

  return fields;
}

export interface QuickClientAccountSigninFieldsProps {
  variant: QuickClientAccountAuthVariant;
  idPrefix: string;
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  /** Inquiry sheet — paragraph above fields */
  supportText?: string;
}

export function QuickClientAccountSigninFields({
  variant,
  idPrefix,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  supportText,
}: QuickClientAccountSigninFieldsProps) {
  const classes = authClasses(variant);

  const fields = (
    <>
      {variant === "inquiry-sheet" && supportText ? (
        <p className={classes.support}>{supportText}</p>
      ) : null}
      <label className={classes.label} htmlFor={`${idPrefix}-signin-email`}>
        Email
      </label>
      <input
        id={`${idPrefix}-signin-email`}
        type="email"
        className={classes.input}
        autoComplete="email"
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
      />
      <label className={classes.label} htmlFor={`${idPrefix}-signin-password`}>
        Password
      </label>
      <input
        id={`${idPrefix}-signin-password`}
        type="password"
        className={classes.input}
        autoComplete="current-password"
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
      />
    </>
  );

  if (classes.form) {
    return <div className={classes.form}>{fields}</div>;
  }

  return fields;
}

export function QuickClientAccountAuthError({
  variant,
  message,
}: {
  variant: QuickClientAccountAuthVariant;
  message: string | null;
}) {
  if (!message) return null;
  return (
    <p className={authClasses(variant).error} role="alert">
      {message}
    </p>
  );
}

export interface QuickClientAccountAuthActionsProps {
  variant: QuickClientAccountAuthVariant;
  view: "signup" | "signin";
  sending: boolean;
  signupCta: string;
  signInCta: string;
  onSignup: () => void;
  onSignIn: () => void;
  onSwitchToSignin: () => void;
  onSwitchToSignup: () => void;
  onOpenFullLogin?: (event?: React.MouseEvent) => void;
  /** Inquiry: "Already have an account? Sign in" vs modal: "Log in" */
  switchToSigninLabel?: string;
}

export function QuickClientAccountAuthActions({
  variant,
  view,
  sending,
  signupCta,
  signInCta,
  onSignup,
  onSignIn,
  onSwitchToSignin,
  onSwitchToSignup,
  onOpenFullLogin,
  switchToSigninLabel,
}: QuickClientAccountAuthActionsProps) {
  const classes = authClasses(variant);
  const signinSwitchLabel =
    switchToSigninLabel ??
    (variant === "inquiry-sheet"
      ? "Already have an account? Sign in"
      : "Already have an account? Log in");

  const buttons =
    view === "signup" ? (
      <>
        <button
          type="button"
          className={classes.primaryBtn}
          disabled={sending}
          onClick={onSignup}
        >
          {sending ? "Continuing…" : signupCta}
        </button>
        <button
          type="button"
          className={classes.ghostBtn}
          onClick={onSwitchToSignin}
        >
          {signinSwitchLabel}
        </button>
      </>
    ) : (
      <>
        <button
          type="button"
          className={classes.primaryBtn}
          disabled={sending}
          onClick={onSignIn}
        >
          {sending ? "Signing in…" : signInCta}
        </button>
        <button
          type="button"
          className={classes.ghostBtn}
          onClick={onSwitchToSignup}
        >
          Create a quick account instead
        </button>
        <Link
          href={LOGIN_PATH}
          className={classes.linkBtn}
          onClick={onOpenFullLogin}
        >
          Open full sign in
        </Link>
      </>
    );

  if (variant === "login-gate") {
    return <div className={classes.actions}>{buttons}</div>;
  }

  return buttons;
}
