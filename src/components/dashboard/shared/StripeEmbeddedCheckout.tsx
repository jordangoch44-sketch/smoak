"use client";

import { useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
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

  async function handlePay() {
    if (!stripe || !elements) return;
    setBusy(true);
    onError("");
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/specialist-dashboard?billing=success`,
        },
      });
      if (result.error) {
        onError(result.error.message ?? "Payment failed. Try again.");
        return;
      }
      onPaid();
    } catch {
      onError("Payment could not be completed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stripe-pay">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      <DashboardButton
        className="stripe-pay__submit"
        onClick={() => void handlePay()}
        disabled={!stripe || !elements || busy}
      >
        {busy ? "Processing…" : `Subscribe · ${priceLabel}`}
      </DashboardButton>
      <p className="stripe-pay__secure">
        Secure card processing by Stripe · {productLabel}
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
