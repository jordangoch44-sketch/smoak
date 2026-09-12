/**
 * Informational + legal page copy for the public site.
 * Product-accurate MVP language. Not counsel-approved.
 * Inventory for review: docs/PRIVACY_DATA_INVENTORY.md
 * TODO: Have legal counsel review before a broader public launch.
 */

import type { LegalSection } from "@/components/legal/LegalDocumentPage";
import { SUPPORT_EMAIL } from "@/lib/site-contact";

export const LEGAL_EFFECTIVE_DATE = "September 10, 2026";

export const LEGAL_COUNSEL_NOTICE =
  "This page describes how SMOAC works today. It has not been reviewed by legal counsel. We will replace this copy before a broader public launch.";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "Overview",
    paragraphs: [
      "SMOAC (“we,” “us”) operates a wellness marketplace that helps clients discover independent specialists and send inquiries. This Privacy Policy explains what information we collect, how we use it, and the choices you have.",
      "This notice is written to match the current product. We will update it as features, vendors, and legal review change.",
    ],
  },
  {
    title: "Information we collect",
    paragraphs: ["Depending on how you use SMOAC, we may collect:"],
    bullets: [
      "Account details such as name, email address, password, phone number (specialists), and role (client or specialist).",
      "Profile and application information you submit (specialties, bio, location, service area, pricing preferences, and similar listing details).",
      "Photos, videos, and related media you upload for a specialist profile or application, including crop data and video thumbnails.",
      "Inquiry content you send to specialists, including selected topics and your message.",
      "Saved specialists, client profile preferences (such as goals, budget, and search radius), and location you choose to share (ZIP, city, and optional device coordinates).",
      "Payment and billing details when a specialist buys membership or a Boost. Card data is handled by Stripe; SMOAC stores customer and subscription identifiers, plan status, and invoice history needed to run billing.",
      "Device and usage data typical of web apps (browser type, pages viewed, referrer, and campaign tags).",
      "A random visitor identifier stored on your device for first-party traffic analytics. It is not your name or email.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: ["We use information to:"],
    bullets: [
      "Create and manage your account and dashboards.",
      "Show specialist listings and deliver client inquiries.",
      "Notify you by email (for example new messages, application status, password reset, and plan notices).",
      "Process specialist membership and Boost payments.",
      "Show maps, address search, and (when you connect them) public review sources.",
      "Measure product usage, prevent abuse, and support customers.",
      "Comply with law and enforce our Terms of Service.",
    ],
  },
  {
    title: "Sharing",
    paragraphs: [
      "When you inquire about a specialist, we share relevant inquiry details—including your name and email—with that specialist so they can reply in SMOAC. We also email both of you when a new message arrives.",
      "Specialist listings you publish (name, photo, bio, location area, media, and similar profile content) are visible to people using the marketplace.",
      "We use service providers to run SMOAC. The main ones today are Supabase (accounts, database, and file storage), Resend (email), Stripe (payments), Google (address lookup and optional review connect), and map providers (Apple Maps or OpenFreeMap). They process information only as needed to provide those services.",
      "We do not sell your personal information.",
    ],
  },
  {
    title: "Location",
    paragraphs: [
      "You can set a ZIP or place to personalize Explore. If you allow location access, we may store coordinates on your device and, when you are signed in as a client, on your profile. You can clear location in the product. Specialists provide a service area as part of their listing.",
    ],
  },
  {
    title: "Payments",
    paragraphs: [
      "Client browsing and inquiries do not require a card. Session fees, if any, are arranged between you and the specialist outside SMOAC.",
      "Specialists who buy Pro, PRO+, or a Boost pay through Stripe. Stripe receives the payment details needed to charge you. SMOAC receives confirmation, customer IDs, and subscription or campaign status so we can unlock the matching features.",
    ],
  },
  {
    title: "Your choices",
    paragraphs: [
      "You may update profile information in your account. You can unsubscribe from marketing email using the link in those messages. Transactional email (such as inquiry notices and security mail) is needed to run the product.",
      `To request a copy of your information or deletion of your account, email ${SUPPORT_EMAIL} from the address on the account and put “Account deletion” in the subject line. We will confirm by email. Public listings, billing records we must keep, and messages already delivered to another person may not disappear immediately or in full.`,
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
      "By creating an account or using SMOAC you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the marketplace.",
      "SMOAC connects clients with independent wellness specialists. SMOAC is a platform—not the provider of training, coaching, medical, or therapy services.",
    ],
  },
  {
    title: "Eligibility",
    paragraphs: [
      "You must be at least 18 years old to create an account or use SMOAC. Do not use the product on behalf of someone who cannot legally agree to these Terms.",
    ],
  },
  {
    title: "Accounts",
    paragraphs: [
      "You are responsible for accurate account information and for activity under your login. Keep your password confidential. Specialists are responsible for the accuracy of their listings and for responding to inquiries professionally.",
    ],
  },
  {
    title: "Inquiries and communications",
    paragraphs: [
      "Client inquiries are delivered in the SMOAC portal, with email notifications when a new message arrives. Reply in SMOAC to keep the conversation in one thread. You agree not to misuse inquiry tools (spam, harassment, or unlawful content).",
    ],
  },
  {
    title: "Marketplace role",
    paragraphs: [
      "Any engagement between a client and a specialist is solely between those parties. SMOAC does not guarantee availability, outcomes, credentials, or response times. Verify specialists independently as needed for your situation.",
      "Specialists listed on SMOAC are independent providers. They are not employees, agents, or representatives of SMOAC.",
    ],
  },
  {
    title: "Listings and media",
    paragraphs: [
      "If you upload photos, videos, or other content, you confirm you have the right to use it. You grant SMOAC a license to host, display, crop, and promote that content on the marketplace (including listings, Boost placements, and related emails) for as long as your listing is active.",
      "Profile videos are a paid membership feature with a short length limit. Do not upload content that is illegal, infringing, or sexually explicit involving minors.",
    ],
  },
  {
    title: "Payments",
    paragraphs: [
      "Browsing and sending inquiries is free for clients. Session rates and packages are set by each specialist. SMOAC does not process those session payments today.",
      "Specialists may purchase SMOAC Pro, SMOAC PRO+, or Boost campaigns. Those charges are billed through Stripe. Membership renews until you cancel. Boost campaigns are prepaid for the days and daily budget you choose. PRO+ includes a Boost discount described in the product at checkout.",
      "Approved specialists may receive a complimentary Pro trial. When the trial ends, the account returns to Free unless you subscribe. Prices shown in the product at checkout control if they differ from marketing copy.",
      "For billing issues, email support. Refunds, if any, are handled case by case until a formal refund policy is published after legal review.",
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
    title: "Account closure",
    paragraphs: [
      "You may request deletion as described in the Privacy Policy. We may limit access, remove content, or disable accounts when we believe these Terms, our Community Guidelines, or the law have been violated.",
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
      "Browse and save specialists, send an inquiry from a profile, and continue the conversation in SMOAC. Specialists manage their presence and leads from a dedicated portal.",
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
      "For account access, inquiry issues, specialist listing questions, billing questions, or privacy requests, reach out and include the email on your SMOAC account so we can assist faster.",
    ],
  },
  {
    title: "Common topics",
    paragraphs: [],
    bullets: [
      "Client inquiries: specialists receive portal notifications and email when configured.",
      "Specialist profiles: edits sync to the public marketplace after approval.",
      "Saves: signed-in clients keep specialists in their saved list across devices when connected.",
      "Plans and Boosts: specialists manage membership and placement from the specialist dashboard.",
    ],
  },
  {
    title: "Delete your account",
    paragraphs: [
      `Email ${SUPPORT_EMAIL} from the address on your account with the subject “Account deletion.” Include whether you are a client or a specialist. We will confirm before removing the account.`,
      "You can also start that email from Account in the client profile editor, or from billing settings on the specialist dashboard.",
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
      "Use Explore to browse listings, filter by what you need, save favorites, and open a profile to learn more. From a profile you can send an inquiry to continue in SMOAC.",
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
      "Browsing and inquiries are free for clients. Session rates and scheduling are typically handled between you and the specialist after you connect. SMOAC does not process those session payments today.",
      "Specialists may subscribe to SMOAC Pro or PRO+, or run a Boost campaign, through Stripe. See Pricing for current membership amounts.",
    ],
  },
  {
    title: "How do I become a specialist?",
    paragraphs: [
      "Use Become a Specialist from the footer or create-account join flow to apply. Approved specialists can manage their public presence from the specialist portal.",
    ],
  },
  {
    title: "How do I delete my account?",
    paragraphs: [
      `Email ${SUPPORT_EMAIL} from your account address with the subject “Account deletion,” or use the request link in your dashboard account settings.`,
    ],
  },
  {
    title: "Where can I get more help?",
    paragraphs: [`Visit Help Center or email ${SUPPORT_EMAIL}.`],
  },
];

export const PRICING_SECTIONS: LegalSection[] = [
  {
    title: "For clients",
    paragraphs: [
      "Browsing SMOAC, saving specialists, and sending inquiries is free. Session rates and packages are set by each independent professional and typically appear on their profile or in follow-up messages. SMOAC does not charge clients a booking fee today and does not process session payments.",
    ],
  },
  {
    title: "For specialists — membership",
    paragraphs: [
      "Approved specialists can list on the marketplace on the Free plan. New approved specialists may receive a complimentary 30-day Pro trial (no card required).",
      "SMOAC Pro is $9.99 per month. It unlocks specialist analytics and related Pro listing perks shown in the dashboard.",
      "SMOAC PRO+ is $19.99 per month. It includes Pro, plus short profile videos, client transformations, and 20% off Boost campaigns.",
      "Membership is billed through Stripe and renews until you cancel. When a trial ends without a paid plan, the account returns to Free.",
    ],
  },
  {
    title: "For specialists — Boosts",
    paragraphs: [
      "Boosts are optional paid placement campaigns. You choose duration (1–30 days) and a daily budget. The campaign total is charged up front through Stripe and can appear in Marketplace, Search, and Homepage placements for that window.",
      "PRO+ members receive 20% off Boost totals at checkout. Membership itself does not include Homepage Featured or Sponsored placement.",
    ],
  },
  {
    title: "Questions",
    paragraphs: [
      `The amount shown at Stripe checkout is the charge. If you need clarity about a plan or invoice, email ${SUPPORT_EMAIL}.`,
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
      "This Cookie Policy describes how SMOAC uses cookies and similar technologies—including browser storage—when you use the marketplace website.",
    ],
  },
  {
    title: "What we use",
    paragraphs: [
      "Depending on your browser and how you use SMOAC, we may use:",
    ],
    bullets: [
      "Essential cookies and storage needed to keep you signed in, remember preferences, and secure the product (including session cookies from our authentication provider).",
      "Location you choose to save (ZIP or coordinates) in browser storage and, if you are signed in, on your profile.",
      "A first-party visitor key in local storage plus page path, referrer, and campaign tags, used for product traffic analytics. This is not a third-party advertising cookie.",
      "Cookies or storage set by Stripe when you complete a payment, and by map providers when a map loads.",
    ],
  },
  {
    title: "Your choices",
    paragraphs: [
      "You can control cookies and site data through your browser settings. Blocking some storage may affect sign-in, saves, or location features.",
      "We do not currently show a separate cookie-consent banner. Counsel will decide whether one is required before a broader public launch.",
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
    paragraphs: [`Questions about cookies or privacy: ${SUPPORT_EMAIL}.`],
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
