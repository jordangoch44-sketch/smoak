export type ManageBillingPaymentMethod = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export type ManageBillingInvoice = {
  id: string;
  number: string | null;
  amountCents: number;
  status: string;
  createdAt: string;
  hostedInvoiceUrl: string | null;
};

export type ManageBillingSubscription = {
  id: string;
  kind: "plan" | "addon";
  product: string;
  label: string;
  status: string;
  monthlyCents: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type ManageBillingComplimentary = "trial" | "admin" | null;

export type ManageBillingPayload = {
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  displayPlan: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  complimentary: ManageBillingComplimentary;
  paymentMethod: ManageBillingPaymentMethod | null;
  membershipSubscriptionId: string | null;
  subscriptions: ManageBillingSubscription[];
  invoices: ManageBillingInvoice[];
  canUpdatePaymentMethod: boolean;
  canCancelMembership: boolean;
  canResumeMembership: boolean;
};
