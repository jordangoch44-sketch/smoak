/**
 * Code-built emails shown under Admin → Email → System emails.
 * Sample data only — used for preview and "Send test".
 */
import {
  SPECIALIST_APPROVAL_SUBJECT,
  renderSpecialistApprovalEmailHtml,
  renderSpecialistApprovalEmailText,
  specialistApprovalTrialLine,
} from "@/lib/email/specialist-approval-email";

export interface SystemEmailRendered {
  subject: string;
  html: string;
  text: string;
}

export interface SystemEmailDefinition {
  id: string;
  name: string;
  subject: string;
  trigger: string;
  render: () => SystemEmailRendered;
}

function approvalSample(isFounding: boolean): SystemEmailRendered {
  const input = {
    firstName: "Jordan",
    profileUrl: "/trainers/sample-specialist",
    editProfileUrl: "/specialist-dashboard/edit-profile",
    trialLine: specialistApprovalTrialLine(isFounding),
  };
  return {
    subject: SPECIALIST_APPROVAL_SUBJECT,
    html: renderSpecialistApprovalEmailHtml(input),
    text: renderSpecialistApprovalEmailText(input),
  };
}

export const SYSTEM_EMAILS: SystemEmailDefinition[] = [
  {
    id: "specialist-approved",
    name: "Specialist approved — finish your account",
    subject: SPECIALIST_APPROVAL_SUBJECT,
    trigger: "Every approved specialist",
    render: () => approvalSample(false),
  },
  {
    id: "specialist-approved-founding",
    name: "Specialist approved — Founding 100 version",
    subject: SPECIALIST_APPROVAL_SUBJECT,
    trigger: "Same email; trial line shows 60 days for Founding 100",
    render: () => approvalSample(true),
  },
];

export function findSystemEmail(id: string): SystemEmailDefinition | null {
  return SYSTEM_EMAILS.find((email) => email.id === id) ?? null;
}
