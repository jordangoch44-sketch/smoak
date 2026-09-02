import type { AdminRoleType } from "@/types/admin-permissions";
import type { PublicAuthRole } from "@/types/auth-roles";

export type AuthRole = PublicAuthRole | "admin";

export interface AuthSession {
  /** Supabase Auth user id */
  userId: string;
  role: AuthRole;
  email: string;
  signedInAt: string;
  /** From profiles.first_name — used for dashboard greeting */
  firstName?: string;
  /** From profiles.client_zip_code */
  clientZipCode?: string;
  /** From profiles.client_city — header city label fallback */
  clientCity?: string;
  /**
   * From profiles.avatar_url (or specialist onboarding media fallback).
   * Used by mobile bottom-nav Profile tab.
   */
  avatarUrl?: string;
  /** From profiles.profile_completion_status */
  profileCompletionStatus?: "incomplete" | "complete" | string;
  /** From profiles.password_setup_status */
  passwordSetupStatus?: "pending" | "complete" | "skipped" | string;
  displayName?: string;
  isPremium?: boolean;
  /** Specialist billing plan — `platinum` is Pro Plus */
  membershipPlan?: "free" | "premium" | "platinum";
  /** True when Stripe Pro subscription is active (paying) */
  premiumIsPaid?: boolean;
  /** True after the one-time complimentary Pro trial has been started (even if ended) */
  premiumTrialUsed?: boolean;
  /** ISO — complimentary Pro trial end (specialists) */
  premiumTrialEndsAt?: string;
  /** True while within signup free Pro window */
  premiumTrialActive?: boolean;
  /** Days left in complimentary trial */
  premiumTrialDaysRemaining?: number;
  /** Trial ended this session — show continue-Pro prompt once */
  premiumTrialJustEnded?: boolean;
  adminRole?: AdminRoleType;
}
