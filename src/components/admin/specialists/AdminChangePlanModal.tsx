"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";
import { changeAdminSpecialistPlan } from "@/lib/admin-specialist-plan-change-client";
import { SPECIALIST_TIER_CATALOG } from "@/data/admin-specialist-billing-catalog";
import { formatTierPrice } from "@/lib/admin-specialist-billing-service";
import { membershipPlanLabel } from "@/lib/stripe/products";
import type { SpecialistMembershipPlan } from "@/lib/specialist-premium";
import type {
  AdminPlanChangeDuration,
  AdminPlanChangeMethod,
  AdminPlanChangeSuccess,
} from "@/types/admin-specialist-plan-change";

type Step = "plan" | "method" | "duration" | "done";

const PLANS: SpecialistMembershipPlan[] = ["free", "premium", "platinum"];

interface AdminChangePlanModalProps {
  open: boolean;
  specialistId: string;
  specialistName: string;
  specialistEmail: string;
  currentPlan: SpecialistMembershipPlan;
  onClose: () => void;
}

export function AdminChangePlanModal({
  open,
  specialistId,
  specialistName,
  specialistEmail,
  currentPlan,
  onClose,
}: AdminChangePlanModalProps) {
  const titleId = useId();
  const [step, setStep] = useState<Step>("plan");
  const [plan, setPlan] = useState<SpecialistMembershipPlan>(currentPlan);
  const [method, setMethod] = useState<AdminPlanChangeMethod | null>(null);
  const [durationKind, setDurationKind] = useState<"indefinite" | "days">(
    "indefinite"
  );
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminPlanChangeSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  useBlockingModalOpen(open);

  useEffect(() => {
    if (!open) return;
    setStep("plan");
    setPlan(currentPlan);
    setMethod(null);
    setDurationKind("indefinite");
    setDays("30");
    setBusy(false);
    setError(null);
    setResult(null);
    setCopied(false);
  }, [open, currentPlan, specialistId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  if (!open || typeof document === "undefined") return null;

  const planLabel = membershipPlanLabel(plan);
  const checkoutAllowed = plan !== "free";

  async function submit(nextMethod: AdminPlanChangeMethod) {
    setBusy(true);
    setError(null);

    let duration: AdminPlanChangeDuration | undefined;
    if (nextMethod === "admin_override") {
      if (durationKind === "days") {
        const parsed = Number(days);
        if (!Number.isFinite(parsed) || parsed < 1) {
          setBusy(false);
          setError("Enter how many days, or choose indefinitely.");
          return;
        }
        duration = { kind: "days", days: Math.floor(parsed) };
      } else {
        duration = { kind: "indefinite" };
      }
    }

    const response = await changeAdminSpecialistPlan({
      specialistId,
      plan,
      method: nextMethod,
      duration,
    });

    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setResult(response);
    setStep("done");
  }

  async function copyCheckoutUrl() {
    const url = result?.checkoutUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the link. Select it from the field below.");
    }
  }

  const modal = (
    <div
      className="admin-change-plan"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="admin-change-plan__backdrop"
        aria-label="Close change plan"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div className="admin-change-plan__panel">
        <header className="admin-change-plan__header">
          <div>
            <p className="admin-change-plan__eyebrow">Membership</p>
            <h3 id={titleId} className="admin-change-plan__title">
              {step === "done" ? "Plan updated" : "Change plan"}
            </h3>
            <p className="admin-change-plan__sub">
              {specialistName}
              {specialistEmail ? ` · ${specialistEmail}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="admin-change-plan__close"
            onClick={() => {
              if (!busy) onClose();
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="admin-change-plan__body">
          {step === "plan" ? (
            <>
              <p className="admin-change-plan__prompt">
                Which plan should this account move to?
              </p>
              <p className="admin-change-plan__current">
                Current plan · {membershipPlanLabel(currentPlan)}
              </p>
              <div className="admin-change-plan__options">
                {PLANS.map((id) => {
                  const meta = SPECIALIST_TIER_CATALOG[id];
                  const selected = plan === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={
                        selected
                          ? "admin-change-plan__option admin-change-plan__option--selected"
                          : "admin-change-plan__option"
                      }
                      onClick={() => setPlan(id)}
                    >
                      <span className="admin-change-plan__option-label">
                        {meta.label}
                      </span>
                      <span className="admin-change-plan__option-price">
                        {formatTierPrice(meta.monthlyCents)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === "method" ? (
            <>
              <p className="admin-change-plan__prompt">
                Apply {planLabel} how?
              </p>
              <div className="admin-change-plan__options">
                {checkoutAllowed ? (
                  <button
                    type="button"
                    className={
                      method === "checkout_link"
                        ? "admin-change-plan__option admin-change-plan__option--selected"
                        : "admin-change-plan__option"
                    }
                    onClick={() => setMethod("checkout_link")}
                  >
                    <span className="admin-change-plan__option-label">
                      Send checkout link
                    </span>
                    <span className="admin-change-plan__option-price">
                      Emails a Stripe link. Plan changes when they pay.
                    </span>
                  </button>
                ) : (
                  <p className="admin-change-plan__note">
                    Free does not use checkout. Use admin override to move this
                    account off a paid plan.
                  </p>
                )}
                <button
                  type="button"
                  className={
                    method === "admin_override"
                      ? "admin-change-plan__option admin-change-plan__option--selected"
                      : "admin-change-plan__option"
                  }
                  onClick={() => setMethod("admin_override")}
                >
                  <span className="admin-change-plan__option-label">
                    Admin override
                  </span>
                  <span className="admin-change-plan__option-price">
                    Apply immediately without charging.
                  </span>
                </button>
              </div>
            </>
          ) : null}

          {step === "duration" ? (
            <>
              <p className="admin-change-plan__prompt">
                How long should {planLabel} last?
              </p>
              <div className="admin-change-plan__options">
                <button
                  type="button"
                  className={
                    durationKind === "indefinite"
                      ? "admin-change-plan__option admin-change-plan__option--selected"
                      : "admin-change-plan__option"
                  }
                  onClick={() => setDurationKind("indefinite")}
                >
                  <span className="admin-change-plan__option-label">
                    Indefinitely
                  </span>
                  <span className="admin-change-plan__option-price">
                    Stays on {planLabel} until you change it again.
                  </span>
                </button>
                <button
                  type="button"
                  className={
                    durationKind === "days"
                      ? "admin-change-plan__option admin-change-plan__option--selected"
                      : "admin-change-plan__option"
                  }
                  onClick={() => setDurationKind("days")}
                >
                  <span className="admin-change-plan__option-label">
                    Number of days
                  </span>
                  <span className="admin-change-plan__option-price">
                    Complimentary access for a set window.
                  </span>
                </button>
              </div>
              {durationKind === "days" ? (
                <label className="admin-field-label">
                  Days
                  <input
                    className="admin-field"
                    type="number"
                    min={1}
                    max={3650}
                    inputMode="numeric"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                  />
                </label>
              ) : null}
            </>
          ) : null}

          {step === "done" && result ? (
            <div className="admin-change-plan__done">
              <p className="admin-change-plan__prompt">{result.message}</p>
              {result.checkoutUrl ? (
                <>
                  <label className="admin-field-label">
                    Checkout link
                    <input
                      className="admin-field"
                      readOnly
                      value={result.checkoutUrl}
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary smoac-control"
                    onClick={() => void copyCheckoutUrl()}
                  >
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="admin-change-plan__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="admin-change-plan__footer">
          {step === "plan" ? (
            <>
              <button
                type="button"
                className="admin-btn smoac-control"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary smoac-control"
                onClick={() => {
                  setError(null);
                  setMethod(plan === "free" ? "admin_override" : null);
                  setStep("method");
                }}
              >
                Continue
              </button>
            </>
          ) : null}

          {step === "method" ? (
            <>
              <button
                type="button"
                className="admin-btn smoac-control"
                onClick={() => {
                  setError(null);
                  setStep("plan");
                }}
                disabled={busy}
              >
                Back
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary smoac-control"
                disabled={busy || !method}
                onClick={() => {
                  if (!method) return;
                  setError(null);
                  if (method === "admin_override") {
                    setStep("duration");
                    return;
                  }
                  void submit("checkout_link");
                }}
              >
                {busy && method === "checkout_link"
                  ? "Sending…"
                  : method === "checkout_link"
                    ? "Send checkout link"
                    : "Continue"}
              </button>
            </>
          ) : null}

          {step === "duration" ? (
            <>
              <button
                type="button"
                className="admin-btn smoac-control"
                onClick={() => {
                  setError(null);
                  setStep("method");
                }}
                disabled={busy}
              >
                Back
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary smoac-control"
                disabled={busy}
                onClick={() => void submit("admin_override")}
              >
                {busy ? "Applying…" : `Apply ${planLabel}`}
              </button>
            </>
          ) : null}

          {step === "done" ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary smoac-control"
              onClick={onClose}
            >
              Done
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
