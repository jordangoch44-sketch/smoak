"use client";

import { useMemo, useState } from "react";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  loadStripe,
  type StripeElementsOptions,
  type StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import { DashboardButton } from "@/components/dashboard/shared/DashboardButton";

const publishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";

const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const ELEMENTS_OPTIONS: StripeElementsOptions["appearance"] = {
  theme: "night",
  variables: {
    colorPrimary: "#c4b5fd",
    colorBackground: "#0c0c10",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.55)",
    colorDanger: "#fca5a5",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "12px",
    spacingUnit: "4px",
  },
};

const EXPRESS_OPTIONS = {
  buttonHeight: 44,
  buttonType: {
    applePay: "subscribe" as const,
    googlePay: "subscribe" as const,
  },
  layout: {
    maxColumns: 2,
    maxRows: 2,
    overflow: "auto" as const,
  },
  paymentMethods: {
    applePay: "auto" as const,
    googlePay: "auto" as const,
    link: "auto" as const,
    paypal: "never" as const,
    amazonPay: "never" as const,
    klarna: "never" as const,
  },
  business: { name: "SMOAC" },
};

function billingReturnUrl(): string {
  return `${window.location.origin}/specialist-dashboard?billing=success`;
}

interface StripeEmbeddedPayFormProps {
  productLabel: string;
  priceLabel: string;
  onPaid: () => void;
  onError: (message: string) => void;
}

function StripeEmbeddedPayForm({
  productLabel,
  priceLabel,
  onPaid,
  onError,
}: StripeEmbeddedPayFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [walletState, setWalletState] = useState<"pending" | "ready" | "empty">(
    "pending"
  );

  async function confirm(event?: StripeExpressCheckoutElementConfirmEvent) {
    if (!stripe || !elements) return;
    setBusy(true);
    onError("");
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: billingReturnUrl(),
        },
      });
      if (result.error) {
        event?.paymentFailed({
          reason: "fail",
          message: result.error.message,
        });
        onError(result.error.message ?? "Payment failed. Try again.");
        return;
      }
      onPaid();
    } catch {
      event?.paymentFailed({ reason: "fail" });
      onError("Payment could not be completed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stripe-pay">
      <div
        className={
          walletState === "empty"
            ? "stripe-pay__express stripe-pay__express--idle"
            : "stripe-pay__express"
        }
      >
        <ExpressCheckoutElement
          options={EXPRESS_OPTIONS}
          onReady={(event) => {
            const methods = event.availablePaymentMethods;
            setWalletState(
              methods && (methods.applePay || methods.googlePay || methods.link)
                ? "ready"
                : "empty"
            );
          }}
          onConfirm={(event) => void confirm(event)}
          onCancel={() => setBusy(false)}
        />
      </div>
      {walletState === "ready" ? (
        <p className="stripe-pay__divider">
          <span>Or pay with card</span>
        </p>
      ) : null}
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: {
            applePay: "never",
            googlePay: "never",
          },
        }}
      />
      <DashboardButton
        className="stripe-pay__submit"
        onClick={() => void confirm()}
        disabled={!stripe || !elements || busy}
      >
        {busy ? "Processing…" : `Subscribe · ${priceLabel}`}
      </DashboardButton>
      <p className="stripe-pay__secure">
        Apple Pay, Google Pay, Link, or card · Stripe · {productLabel}
      </p>
    </div>
  );
}

interface StripeEmbeddedCheckoutProps {
  clientSecret: string;
  productLabel: string;
  priceLabel: string;
  onPaid: () => void;
  onError: (message: string) => void;
}

export function StripeEmbeddedCheckout({
  clientSecret,
  productLabel,
  priceLabel,
  onPaid,
  onError,
}: StripeEmbeddedCheckoutProps) {
  const options = useMemo<StripeElementsOptions>(
    () => ({
      clientSecret,
      appearance: ELEMENTS_OPTIONS,
    }),
    [clientSecret]
  );

  if (!stripePromise) {
    return (
      <p className="dashboard-modal__error" role="alert">
        Stripe publishable key is not configured.
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripeEmbeddedPayForm
        productLabel={productLabel}
        priceLabel={priceLabel}
        onPaid={onPaid}
        onError={onError}
      />
    </Elements>
  );
}
