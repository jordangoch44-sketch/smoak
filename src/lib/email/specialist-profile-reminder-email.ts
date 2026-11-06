import { buildLoginHref } from "@/lib/auth-return";
import { sendOutboundEmail } from "@/lib/email/email-transport";
import {
  emailAbsoluteUrl,
  renderEmailParagraphs,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import type { ProfileReminderKind } from "@/lib/specialist-profile-strength";

export interface ProfileReminderEmailInput {
  to: string;
  firstName: string;
  kind: ProfileReminderKind;
  message: string;
  action: string;
  path: string;
}

function subjectFor(kind: ProfileReminderKind): string {
  return kind === "incomplete_week"
    ? "Your SMOAC profile still has a few gaps"
    : "Your SMOAC profile is waiting";
}

export async function sendSpecialistProfileReminderEmail(
  input: ProfileReminderEmailInput
): Promise<boolean> {
  const first = input.firstName.trim() || "there";
  const href = emailAbsoluteUrl(
    buildLoginHref({ role: "specialist", next: input.path })
  );
  const intro =
    input.kind === "incomplete_week"
      ? "It’s been about a week since you applied. A more complete profile is what clients compare."
      : "Your application is in. The profile you build now is what clients will see after approval.";

  const text = `Hi ${first},

${intro}

${input.message}

Open your dashboard: ${href}

— SMOAC`;

  const html = wrapTransactionalEmailHtml({
    preheader: input.message,
    eyebrow: "Profile",
    title: subjectFor(input.kind),
    bodyHtml: renderEmailParagraphs([`Hi ${first},`, intro, input.message]),
    cta: { label: input.action, href },
    footerNote: "We’ll stop these notes once your profile is in excellent shape.",
  });

  const result = await sendOutboundEmail({
    to: input.to,
    subject: subjectFor(input.kind),
    text,
    html,
    kind: `specialist_${input.kind}`,
  });
  return result.success;
}
