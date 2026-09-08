import type { SpecialistMembershipPlan } from "@/lib/specialist-premium";

export type AdminPlanChangeMethod = "checkout_link" | "admin_override";

export type AdminPlanChangeDuration =
  | { kind: "indefinite" }
  | { kind: "days"; days: number };

export interface AdminPlanChangeRequest {
  specialistId: string;
  plan: SpecialistMembershipPlan;
  method: AdminPlanChangeMethod;
  /** Required when method is admin_override. */
  duration?: AdminPlanChangeDuration;
}

export interface AdminPlanChangeSuccess {
  ok: true;
  method: AdminPlanChangeMethod;
  plan: SpecialistMembershipPlan;
  planLabel: string;
  message: string;
  checkoutUrl?: string;
  emailed?: boolean;
  emailMode?: "resend" | "console";
  overrideEndsAt?: string | null;
}

export interface AdminPlanChangeFailure {
  ok: false;
  message: string;
}

export type AdminPlanChangeResult =
  | AdminPlanChangeSuccess
  | AdminPlanChangeFailure;
