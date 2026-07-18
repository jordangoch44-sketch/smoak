import type { LegalSection } from "@/components/legal/LegalDocumentPage";

export const LEGAL_EFFECTIVE_DATE = "July 16, 2026";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "Overview",
    paragraphs: [
      "SMOAC (“we,” “us”) operates a luxury wellness marketplace that helps clients discover specialists and send inquiries. This Privacy Policy explains what information we collect, how we use it, and the choices you have.",
      "This MVP notice is written for early users. We will update it as product features and infrastructure expand.",
    ],
  },
  {
    title: "Information we collect",
    paragraphs: [
      "Depending on how you use SMOAC, we may collect:",
    ],
    bullets: [
      "Account details such as name, email address, and role (client or specialist).",
      "Profile and application information you submit (specialties, bio, location, media, pricing preferences).",
      "Inquiry content you send to specialists, including selected topics and your message.",
      "Saved specialists and basic product analytics needed to operate the marketplace.",
      "Device and usage data typical of web apps (such as browser type and pages viewed).",
    ],
  },
  {
    title: "How we use information",
    paragraphs: ["We use information to:"],
    bullets: [
      "Create and manage your account and dashboards.",
      "Show specialist listings and deliver client inquiries.",
      "Notify specialists of new inquiries by email and in their portal.",
      "Improve reliability, prevent abuse, and support customers.",
      "Comply with law and enforce our Terms of Service.",
    ],
  },
  {
    title: "Sharing",
    paragraphs: [
      "When you inquire about a specialist, we share relevant inquiry details (including your contact email) with that specialist so they can reply by email.",
      "We use service providers (for example authentication, database, and email delivery) to run SMOAC. We do not sell your personal information.",
    ],
  },
  {
    title: "Your choices",
    paragraphs: [
      "You may update profile information in your account, request access or deletion by contacting support, and stop using the product at any time. Email notifications follow your provider’s unsubscribe and spam controls where applicable.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "Questions about privacy: use Help & Support in the app menu, or email support through the contact options listed on the Help page.",
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "Agreement",
    paragraphs: [
      "By using SMOAC you agree to these Terms of Service. If you do not agree, do not use the marketplace.",
      "SMOAC connects clients with independent wellness specialists. SMOAC is a platform—not the provider of training, coaching, medical, or therapy services.",
    ],
  },
  {
    title: "Accounts",
    paragraphs: [
      "You are responsible for accurate account information and for activity under your login. Specialists are responsible for the accuracy of their listings and for responding to inquiries professionally.",
    ],
  },
  {
    title: "Inquiries and communications",
    paragraphs: [
      "Client inquiries may be delivered to specialists through the SMOAC portal and by email. Specialists typically reply by email outside SMOAC messaging. You agree not to misuse inquiry tools (spam, harassment, or unlawful content).",
    ],
  },
  {
    title: "Marketplace role",
    paragraphs: [
      "Any engagement between a client and a specialist is solely between those parties. SMOAC does not guarantee availability, outcomes, credentials, or response times. Verify specialists independently as needed for your situation.",
    ],
  },
  {
    title: "Acceptable use",
    paragraphs: ["You agree not to:"],
    bullets: [
      "Violate laws or third-party rights.",
      "Scrape, reverse engineer, or disrupt the service.",
      "Post false, misleading, or infringing profile content.",
      "Attempt unauthorized access to accounts or systems.",
    ],
  },
  {
    title: "Disclaimers",
    paragraphs: [
      "SMOAC is provided “as is” during this early release. To the fullest extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement. Wellness content on SMOAC is not medical advice.",
    ],
  },
  {
    title: "Limitation of liability",
    paragraphs: [
      "To the fullest extent permitted by law, SMOAC and its operators are not liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, arising from your use of the marketplace or interactions with specialists.",
    ],
  },
  {
    title: "Changes",
    paragraphs: [
      "We may update these Terms as the product evolves. Continued use after changes means you accept the updated Terms. The effective date above will change when we publish revisions.",
    ],
  },
];

export const ABOUT_SECTIONS: LegalSection[] = [
  {
    title: "Our mission",
    paragraphs: [
      "SMOAC is a curated marketplace for health, fitness, and wellness specialists—built to help clients find exceptional professionals with clarity and trust.",
    ],
  },
  {
    title: "How it works",
    paragraphs: [
      "Browse and save specialists, send an inquiry from a profile, and continue the conversation by email. Specialists manage their presence and leads from a dedicated portal.",
    ],
  },
  {
    title: "Early access",
    paragraphs: [
      "You are using an early MVP. Features, listings, and policies will grow with the product. Thank you for helping us shape SMOAC.",
    ],
  },
];

export const SUPPORT_SECTIONS: LegalSection[] = [
  {
    title: "How we can help",
    paragraphs: [
      "For account access, inquiry issues, specialist listing questions, or privacy requests, reach out and include the email on your SMOAC account so we can assist faster.",
    ],
  },
  {
    title: "Common topics",
    paragraphs: [],
    bullets: [
      "Client inquiries: specialists receive portal notifications and email when configured.",
      "Specialist profiles: edits sync to the public marketplace after approval.",
      "Saves: signed-in clients keep specialists in their saved list across devices when connected.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "Email support: support@smoac.com (monitored for early MVP users).",
      "If you need to report abuse or an urgent safety concern, include “Urgent” in the subject line.",
    ],
  },
];
