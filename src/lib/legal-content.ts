/**
 * Informational + legal page copy for the public site.
 * TODO: Have legal counsel review before public launch.
 */

import type { LegalSection } from "@/components/legal/LegalDocumentPage";
import { SUPPORT_EMAIL } from "@/lib/site-contact";

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
    paragraphs: ["Depending on how you use SMOAC, we may collect:"],
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
      `Questions about privacy: email ${SUPPORT_EMAIL}, or use Contact Us / Help Center from the site footer.`,
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
      "Connecting people with trusted fitness specialists is at the heart of everything we build.",
    ],
  },
  {
    title: "How it works",
    paragraphs: [
      "Browse and save specialists, send an inquiry from a profile, and continue the conversation by email. Specialists manage their presence and leads from a dedicated portal.",
    ],
  },
  {
    title: "Independent professionals",
    paragraphs: [
      "Specialists listed on SMOAC are independent providers. They are not employees, agents, or representatives of SMOAC. Marketplace listings help you discover professionals—you remain responsible for choosing who to work with.",
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
      `Email support: ${SUPPORT_EMAIL} (monitored for early MVP users).`,
      "If you need to report abuse or an urgent safety concern, include “Urgent” in the subject line, or use Report a Concern in the footer.",
    ],
  },
];

export const CONTACT_SECTIONS: LegalSection[] = [
  {
    title: "Reach the SMOAC team",
    paragraphs: [
      "Whether you need account help, have a partnership question, or want to share product feedback, we read every message.",
      `Email us at ${SUPPORT_EMAIL}. Include your account email when relevant so we can respond faster.`,
    ],
  },
  {
    title: "What to include",
    paragraphs: ["Helpful details:"],
    bullets: [
      "A clear subject line (for example: “Account access” or “Inquiry question”).",
      "Whether you are a client or a specialist.",
      "Any relevant links, screenshots, or error messages.",
    ],
  },
  {
    title: "Safety and abuse",
    paragraphs: [
      "To report a safety or abuse concern, use Report a Concern so we can prioritize it, or email with “Urgent” in the subject line.",
    ],
  },
];

export const FAQ_SECTIONS: LegalSection[] = [
  {
    title: "What is SMOAC?",
    paragraphs: [
      "SMOAC is a marketplace that helps clients discover independent fitness and wellness specialists—such as trainers, coaches, nutritionists, therapists, and wellness professionals—and send inquiries.",
    ],
  },
  {
    title: "How do I find a specialist?",
    paragraphs: [
      "Use Explore to browse listings, filter by what you need, save favorites, and open a profile to learn more. From a profile you can send an inquiry to continue by email.",
    ],
  },
  {
    title: "Is SMOAC the employer of specialists?",
    paragraphs: [
      "No. Specialists listed on SMOAC are independent providers and are not employees, agents, or representatives of SMOAC.",
    ],
  },
  {
    title: "How do payments and booking work?",
    paragraphs: [
      "Today, SMOAC focuses on discovery and inquiry. Scheduling and payment arrangements are typically handled directly between you and the specialist after you connect.",
    ],
  },
  {
    title: "How do I become a specialist?",
    paragraphs: [
      "Use Become a Specialist from the footer or create-account join flow to apply. Approved specialists can manage their public presence from the specialist portal.",
    ],
  },
  {
    title: "Where can I get more help?",
    paragraphs: [
      `Visit Help Center or email ${SUPPORT_EMAIL}.`,
    ],
  },
];

export const PRICING_SECTIONS: LegalSection[] = [
  {
    title: "For clients",
    paragraphs: [
      "Browsing SMOAC and exploring specialist profiles is free. When you inquire, the specialist responds directly—session rates and packages are set by each independent professional and typically appear on their profile or in follow-up email.",
    ],
  },
  {
    title: "For specialists",
    paragraphs: [
      "SMOAC is in early access. Listing and inquiry tools for approved specialists are available as part of the marketplace MVP. Paid placement, promotions, or subscription plans may be introduced later and will be described clearly before any charges apply.",
    ],
  },
  {
    title: "Questions",
    paragraphs: [
      `If you need clarity about plans or invoices, email ${SUPPORT_EMAIL}.`,
    ],
  },
];

export const SAFETY_SECTIONS: LegalSection[] = [
  {
    title: "Our role",
    paragraphs: [
      "SMOAC is a marketplace that helps people discover independent specialists. We work to keep the product reliable and to address reports of abuse, but we are not a party to sessions or advice between clients and specialists.",
    ],
  },
  {
    title: "What we expect",
    paragraphs: [
      "Everyone using SMOAC should communicate respectfully, provide accurate listing information, and follow applicable laws. Harassment, scams, and harmful content are not allowed.",
    ],
  },
  {
    title: "Your responsibilities",
    paragraphs: [
      "Choose specialists carefully for your needs. Verify credentials and suitability independently when that matters for your situation. SMOAC does not provide medical advice and does not claim to perform background checks or guarantee outcomes.",
    ],
  },
  {
    title: "Report a concern",
    paragraphs: [
      "If something feels unsafe or violates our Community Guidelines, use Report a Concern or contact support promptly.",
    ],
  },
];

export const COMMUNITY_GUIDELINES_SECTIONS: LegalSection[] = [
  {
    title: "Be respectful",
    paragraphs: [
      "Treat clients, specialists, and SMOAC staff with courtesy. Do not harass, threaten, or discriminate.",
    ],
  },
  {
    title: "Be accurate",
    paragraphs: [
      "Specialists should keep profiles truthful—including specialties, experience, and availability. Clients should not misuse inquiry tools with spam or misleading messages.",
    ],
  },
  {
    title: "Keep it lawful",
    paragraphs: [
      "Do not use SMOAC for illegal activity, fraud, or to share another person’s private information without permission.",
    ],
  },
  {
    title: "Enforcement",
    paragraphs: [
      "We may limit access, remove content, or disable accounts when we believe these guidelines or our Terms have been violated. Serious or urgent issues should be reported through Report a Concern.",
    ],
  },
];

export const REPORT_SECTIONS: LegalSection[] = [
  {
    title: "How to report",
    paragraphs: [
      `Email ${SUPPORT_EMAIL} with a clear subject so we can prioritize your message. For urgent safety issues, put “Urgent” at the start of the subject line.`,
    ],
  },
  {
    title: "What to include",
    paragraphs: ["Please share:"],
    bullets: [
      "What happened and when.",
      "Links to relevant profiles or pages, if available.",
      "Your account email and role (client or specialist), if you have one.",
      "Any screenshots that help us understand the issue.",
    ],
  },
  {
    title: "What happens next",
    paragraphs: [
      "We review reports as quickly as we can during early operations. We may request more detail. We cannot always share confidential actions taken against another account.",
    ],
  },
];

export const COOKIE_SECTIONS: LegalSection[] = [
  {
    title: "Overview",
    paragraphs: [
      "This Cookie Policy describes how SMOAC uses cookies and similar technologies when you use the marketplace website.",
    ],
  },
  {
    title: "What we use",
    paragraphs: [
      "Depending on your browser and how you use SMOAC, we may use:",
    ],
    bullets: [
      "Essential cookies and storage needed to keep you signed in, remember preferences, and secure the product.",
      "Analytics or performance technologies that help us understand product usage so we can improve reliability.",
    ],
  },
  {
    title: "Your choices",
    paragraphs: [
      "You can control cookies through your browser settings. Blocking some cookies may affect sign-in or other core features.",
    ],
  },
  {
    title: "Updates",
    paragraphs: [
      "We may update this policy as our product evolves. The effective date above will change when we publish revisions.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      `Questions about cookies or privacy: ${SUPPORT_EMAIL}.`,
    ],
  },
];

export const ACCESSIBILITY_SECTIONS: LegalSection[] = [
  {
    title: "Our commitment",
    paragraphs: [
      "SMOAC aims to make discovering wellness specialists usable for as many people as possible. We design with clarity, keyboard access, and readable contrast in mind, and we continue to improve.",
    ],
  },
  {
    title: "What you can expect",
    paragraphs: [
      "We work toward practices aligned with common web accessibility guidance, including meaningful labels, focus states, and responsive layouts. Some areas of an early MVP may still need refinement.",
    ],
  },
  {
    title: "Feedback",
    paragraphs: [
      `If you encounter an accessibility barrier, email ${SUPPORT_EMAIL} with the page URL and a short description of the issue. Your feedback helps us prioritize fixes.`,
    ],
  },
];
