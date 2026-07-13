import { sendClientApplicationConfirmationEmail } from "@/lib/email/confirmation-email-service";
import { saveClientApplicationAsync } from "@/lib/client-application-storage";
import { getAuthSessionSnapshot } from "@/lib/auth-session-store";
import { assertCanSubmitClientApplication } from "@/lib/specialist-application-validation";
import type {
  ClientApplication,
  ClientApplicationSubmitInput,
} from "@/types/client-application";

function slugifyId(email: string): string {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `client-${base || "user"}-${Date.now().toString(36)}`;
}

/** Persist client Join Now questionnaire for admin review (Supabase when configured). */
export async function submitClientApplication(
  input: ClientApplicationSubmitInput
): Promise<ClientApplication> {
  const trimmedEmail = input.email.trim();
  assertCanSubmitClientApplication(trimmedEmail);

  const now = new Date().toISOString();
  const fullName = [input.firstName, input.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  const session = getAuthSessionSnapshot();

  const application: ClientApplication = {
    id: slugifyId(trimmedEmail),
    status: "PENDING",
    email: trimmedEmail,
    fullName: fullName || trimmedEmail.split("@")[0] || "Client",
    phone: input.phone?.trim() ?? "",
    preferredCity: input.preferredCity.trim(),
    preferredNeighborhood: input.preferredNeighborhood.trim(),
    preferredZipCode: input.preferredZipCode?.trim() ?? "",
    fitnessGoals: [...input.fitnessGoals],
    preferredSpecialistCategories: [...input.preferredSpecialistCategories],
    budget: input.budget.trim(),
    submittedAt: now,
    updatedAt: now,
    userId: session?.userId ?? null,
  };

  const result = await saveClientApplicationAsync(application);
  if (!result.ok) {
    throw new Error(result.message);
  }

  void sendClientApplicationConfirmationEmail(application).then((emailResult) => {
    if (!emailResult.success) {
      console.warn(
        "[SMOAC EMAIL] Client confirmation email did not send successfully"
      );
    }
  });

  return application;
}
