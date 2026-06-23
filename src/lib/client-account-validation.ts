import { isValidEmail } from "@/lib/validation/email";
import type { CreateAccountWizardState } from "@/types/create-account";

export interface OnboardingMissingField {
  step: number;
  label: string;
}

function missingForStep(
  step: number,
  state: CreateAccountWizardState
): string[] {
  const missing: string[] = [];

  switch (step) {
    case 1:
      if (!state.accountType) missing.push("Account type");
      break;
    case 2:
      if (!state.firstName.trim()) missing.push("First name");
      if (!state.lastName.trim()) missing.push("Last name");
      if (!isValidEmail(state.email)) missing.push("Valid email");
      if (state.password.trim().length < 6) {
        missing.push("Password (6+ characters)");
      }
      break;
    case 3:
      if (state.clientGoals.length === 0) {
        missing.push("Fitness / health goals");
      }
      break;
    case 4:
      if (!state.clientCity.trim()) missing.push("Preferred city");
      if (!/^\d{5}$/.test(state.clientZipCode.trim())) {
        missing.push("Valid ZIP code");
      }
      if (!state.clientBudget) missing.push("Budget range");
      if (!state.clientTrainingStyle) missing.push("Preferred training style");
      break;
    default:
      break;
  }

  return missing;
}

/** Required fields missing on a single client wizard step */
export function getClientAccountMissingFieldsForStep(
  step: number,
  state: CreateAccountWizardState
): OnboardingMissingField[] {
  return missingForStep(step, state).map((label) => ({ step, label }));
}

/** Recommended fields missing before final client account submit */
export function getClientAccountMissingFields(
  state: CreateAccountWizardState
): OnboardingMissingField[] {
  const results: OnboardingMissingField[] = [];

  for (let step = 1; step <= 4; step += 1) {
    for (const label of missingForStep(step, state)) {
      results.push({ step, label });
    }
  }

  return results;
}
