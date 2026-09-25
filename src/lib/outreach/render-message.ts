import { unsubscribeUrlFor } from "@/lib/admin-email-unsubscribe";
import { renderAdminOutreachEmail } from "@/lib/admin-outreach";
import { applyOutreachVariables, outreachGreetingName } from "@/lib/outreach/variables";

export function renderProspectOutreachEmail(input: {
  subject: string;
  body: string;
  name: string;
  business: string;
  toEmail: string;
}): { subject: string; text: string; html: string } {
  const subject = applyOutreachVariables(input.subject, input);
  const body = applyOutreachVariables(input.body, input);
  return renderAdminOutreachEmail({
    subject,
    body,
    greetingName: outreachGreetingName(input.name),
    unsubscribeUrl: input.toEmail.includes("@")
      ? unsubscribeUrlFor(input.toEmail)
      : null,
  });
}
