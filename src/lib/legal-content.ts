/**
 * Informational + legal page copy for the public site.
 * Written to match the product. A later legal review can revise it.
 * Inventory: docs/PRIVACY_DATA_INVENTORY.md
 */

import type { LegalSection } from "@/components/legal/LegalDocumentPage";
import { SUPPORT_EMAIL } from "@/lib/site-contact";

export const LEGAL_EFFECTIVE_DATE = "October 22, 2026";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "Overview",
    paragraphs: [
      "SMOAC (“we,” “us”) operates a wellness marketplace where clients discover independent specialists, send inquiries, and keep a workout journal. A specialist you connect with can send workouts onto your calendar. This Privacy Policy explains what information we collect, how we use it, and the choices you have.",
      "SMOAC is based in San Diego, California. We update this policy when our practices change and change the effective date when we do.",
    ],
  },
  {
    title: "Information we collect",
    paragraphs: ["Depending on how you use SMOAC, we may collect:"],
    bullets: [
      "Account details such as name, email address, password, phone number (specialists), and role (client or specialist).",
      "Profile and application information you submit (specialties, bio, location, service area, pricing preferences, and similar listing details).",
      "Photos you add to a client profile, and photos, videos, and related media you upload for a specialist profile or application, including crop data and video thumbnails.",
      "Inquiry content you send to specialists, including selected topics and your message.",
      "Your workout journal when you are signed in: exercises, sets, weights, reps, cardio, rest days, weekly goals, and body weight you choose to record. The journal is stored with your account.",
      "Coaching details when you connect with a specialist: the connection itself, workouts that specialist sends, and what you log on those workouts.",
      "Saved specialists, client profile preferences (such as goals, budget, and search radius), and location you choose to share (ZIP, city, and optional device coordinates).",
      "Payment and billing details when a specialist buys membership or a Boost. Card data is handled by Stripe; SMOAC stores customer and subscription identifiers, plan status, and invoice history needed to run billing.",
      "On the iPhone app, a push token for that device so we can deliver alerts about inquiries and coaching. You can turn notifications off in iOS Settings.",
      "Device and usage data typical of web apps (browser type, pages viewed, referrer, and campaign tags).",
      "A random visitor identifier stored on your device for first-party traffic analytics. It is not your name or email.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: ["We use information to:"],
    bullets: [
      "Create and manage your account and dashboards.",
      "Keep your workout journal and show it when you are signed in.",
      "Show specialist listings, deliver client inquiries, and let a connected specialist send workouts to your calendar.",
      "Notify you by email about messages, coaching, application status, password reset, plan notices, and optional workout streak notes. On the iPhone app, a push can also alert you about an inquiry message, a coaching invite, or a workout a specialist sends.",
      "Process specialist membership and Boost payments.",
      "Show maps, address search, and (when you connect them) public review sources.",
      "Measure product usage, prevent abuse, and support customers.",
      "Comply with law and enforce our Terms of Service.",
    ],
  },
  {
    title: "Sharing",
    paragraphs: [
      "When you inquire about a specialist, we share relevant inquiry details—including your name and email—with that specialist so they can reply in SMOAC. We also email both of you when a new message arrives, and we can send a push on the iPhone app.",
      "When you accept a coaching connection, that specialist can send workouts to your calendar. They can see those workouts: whether each one was sent, started, or finished, and the weights and reps you log on them. They do not see the rest of your journal, days you built alone, or your body weight.",
      "Specialist listings you publish (name, photo, bio, location area, media, and similar profile content) are visible to people using the marketplace.",
      "We use service providers to run SMOAC. They process information only to provide their service:",
    ],
    bullets: [
      "Supabase stores accounts, the database, and uploaded files.",
      "Resend sends email.",
      "Stripe charges specialist membership and Boosts. Card numbers stay with Stripe.",
      "Google provides address lookup and the optional Google review connection.",
      "Apple and OpenFreeMap provide maps. Apple also delivers iPhone push notifications. Apple Health samples stay on the phone and are not sent to these providers.",
      "OpenAI is used only inside SMOAC’s private admin tool, and only when that tool is turned on. It receives aggregate operating totals, such as visitor counts and revenue totals, and the question an admin types. Normal use of SMOAC does not send your workout journal or inquiry messages to OpenAI.",
    ],
  },
  {
    title: "Sale of information",
    paragraphs: [
      "We do not sell personal information. We do not share it for cross-context behavioral advertising.",
    ],
  },
  {
    title: "How long we keep it",
    paragraphs: [
      "We keep account information while the account is open. After you delete the account, we delete or de-identify the login and the journal tied to it. We may keep billing records, security logs, and messages already delivered to another person for as long as we need them for payment disputes, fraud prevention, or legal obligations.",
    ],
  },
  {
    title: "Location",
    paragraphs: [
      "You can set a ZIP or place to personalize Explore. If you allow location access, we may store coordinates on your device and, when you are signed in as a client, on your profile. You can clear location in the product. Specialists provide a service area as part of their listing.",
    ],
  },
  {
    title: "Workout journal",
    paragraphs: [
      "Signed-in clients can log workouts on their own. The journal follows the account, so it is available when you sign in on another device. You can use it with or without a specialist.",
      "Body weight you enter is stored with that journal. It is visible to you. A specialist does not receive it.",
      "Optional streak emails use your workout activity and time zone. Turn them off in Edit Profile, or use the unsubscribe link in one of those emails.",
    ],
  },
  {
    title: "Apple Health",
    paragraphs: [
      "On the SMOAC iPhone app, you can choose to connect Apple Health. If you do, the app reads completed workouts and the active calories Apple recorded for those workouts, and shows them on your training calendar.",
      "That information stays on your iPhone. SMOAC does not upload it to your account, share it with specialists, or use it for advertising. The workout journal still works if you never connect Apple Health.",
      "You can turn this off in the Health app under Sharing → Apps → SMOAC. The SMOAC website cannot read Apple Health.",
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
      "You may update profile information in your account. You can unsubscribe from marketing email using the link in those messages, and you can turn off workout streak emails in Edit Profile. Transactional email (such as inquiry notices and security mail) is needed to run the product. iPhone alerts can be turned off in iOS Settings.",
      "You can delete your account in the product. Clients: open Edit Profile, then Account, then Delete account. Specialists: open billing settings, then Delete account. Cancel an active specialist plan in billing first. Deletion removes the login. A specialist listing comes down with it. The workout journal, saves, and inquiries tied to that login are removed with the account.",
      `If you cannot sign in, email ${SUPPORT_EMAIL} from the address on the account and put “Account deletion” in the subject line. The same address can request a copy of your information. Public listings already cached, billing records we must keep, and messages already delivered to another person may not disappear immediately or in full.`,
    ],
  },
  {
    title: "California privacy rights",
    paragraphs: [
      "If you live in California, you can ask what personal information we have about you, ask for a copy, ask us to correct it, and ask us to delete it. You can delete the account yourself in the product. Body weight can be removed from the journal, and location can be cleared in the product.",
      "We use body weight and precise location only to run the journal and the marketplace. We do not use them to infer characteristics for advertising.",
      "We will not deny you the product because you exercise these rights, except where the product cannot function without the information. We cannot keep you signed in without an account.",
      `Email ${SUPPORT_EMAIL} from the address on the account to make a request, or to have an authorized agent make one. We will verify the request with that email. An agent needs written permission from you.`,
      "We do not knowingly collect personal information from anyone under 18. If you believe someone under 18 has an account, email us and we will delete it.",
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
      "You must be at least 18 years old to create an account or use SMOAC. Creating an account asks you to confirm that. Do not use the product on behalf of someone who cannot legally agree to these Terms.",
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
      "Client inquiries are delivered in the SMOAC portal, with email when a new message arrives and a push on the iPhone app when notifications are allowed. Reply in SMOAC to keep the conversation in one thread. You agree not to misuse inquiry tools (spam, harassment, or unlawful content).",
    ],
  },
  {
    title: "Workout journal and coaching",
    paragraphs: [
      "A client may keep a workout journal with or without a specialist. The journal belongs to the client’s account. It is a training log, not medical advice, and SMOAC does not provide the training.",
      "If you accept a specialist’s coaching invite, that specialist may place workouts on your calendar. They can see whether each workout they sent was started or finished, and the weights and reps logged on those exercises. They cannot see the rest of your journal or your body weight, and they cannot edit a workout you have already started.",
      "You can decline a coaching invite. You agree not to use coaching or the journal to harass someone or to share another person’s private training information.",
    ],
  },
  {
    title: "Marketplace role",
    paragraphs: [
      "Any engagement between a client and a specialist is solely between those parties. SMOAC does not guarantee availability, outcomes, credentials, safety, or response times. We do not perform background checks. Verify specialists independently as needed for your situation.",
      "Specialists listed on SMOAC are independent contractors. They are not employees, agents, or representatives of SMOAC. SMOAC does not supervise their sessions and is not a party to any agreement you make with them.",
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
      "Canceling Pro or PRO+ stops the next renewal. The plan stays active through the period already paid. Boosts are charged up front. If that charge is refunded, the campaign time it bought comes off. Any other refund request goes to support.",
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
      "SMOAC is provided “as is” and “as available.” To the fullest extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.",
      "SMOAC is not a medical, therapy, or training provider. Listings, messages, and the workout journal are not medical advice, diagnosis, or a prescription for exercise. You are responsible for deciding whether an activity is safe for you.",
    ],
  },
  {
    title: "Limitation of liability",
    paragraphs: [
      "To the fullest extent permitted by law, SMOAC and its operators are not liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, arising from your use of the marketplace, the workout journal, or interactions with specialists.",
      "To the fullest extent permitted by law, SMOAC’s total liability for any claim relating to the service is limited to the greater of the amount you paid SMOAC in the 12 months before the claim, or one hundred U.S. dollars. This limit does not apply to liability that cannot be limited, including fraud or willful misconduct.",
    ],
  },
  {
    title: "Your responsibility for content",
    paragraphs: [
      "You are responsible for the information you submit, including listings, messages, reviews, and workout content. To the extent allowed by law, you will cover SMOAC against claims and reasonable legal costs arising from that content, from a session you arrange through the marketplace, or from your breach of these Terms.",
    ],
  },
  {
    title: "Governing law",
    paragraphs: [
      "These Terms are governed by the laws of the State of California, without regard to conflict-of-law rules. Disputes will be brought in the state or federal courts in San Diego County, California, unless a law where you live requires a different venue.",
    ],
  },
  {
    title: "Account closure",
    paragraphs: [
      "You may delete your account in the product, as described in the Privacy Policy. Clients use Edit Profile → Account. Specialists use billing settings and should cancel an active plan first. Email support if you cannot sign in. We may limit access, remove content, or disable accounts when we believe these Terms, our Community Guidelines, or the law have been violated.",
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
      "Clients can also keep a workout journal on their account. A specialist they connect with can send a workout onto a day. The client still owns the log.",
    ],
  },
  {
    title: "Independent professionals",
    paragraphs: [
      "Specialists listed on SMOAC are independent providers. They are not employees, agents, or representatives of SMOAC. Marketplace listings help you discover professionals—you remain responsible for choosing who to work with.",
    ],
  },
  {
    title: "Your training log",
    paragraphs: [
      "The journal works on its own. Apple Health on the iPhone app can show completed workouts from Apple on your calendar, and that Health data stays on the phone. A connected specialist sees only the workouts they send.",
    ],
  },
];

export const SUPPORT_SECTIONS: LegalSection[] = [
  {
    title: "How we can help",
    paragraphs: [
      "For account access, inquiries, the workout journal, coaching, specialist listings, billing, or privacy requests, reach out and include the email on your SMOAC account so we can assist faster.",
    ],
  },
  {
    title: "Common topics",
    paragraphs: [],
    bullets: [
      "Client inquiries: specialists receive the thread in SMOAC, an email, and an iPhone push when the app is allowed to notify.",
      "Workout journal: signed-in clients log workouts on their calendar. The log follows the account.",
      "Coaching: a specialist can invite a client and send a workout onto a day. They see that workout only — sent, started, or finished, plus the weights and reps on it. They do not see the rest of the log or body weight.",
      "Apple Health: on the iPhone app, connecting Health shows Apple’s completed workouts on your calendar. Those samples stay on the phone.",
      "Streak emails: turn them off under Edit Profile, or from the unsubscribe link in the email.",
      "Specialist profiles: edits sync to the public marketplace after approval.",
      "Saves: signed-in clients keep specialists in their saved list across devices when connected.",
      "Plans and Boosts: specialists manage membership and placement from the specialist dashboard.",
    ],
  },
  {
    title: "Delete your account",
    paragraphs: [
      "Clients: open your profile, choose Edit Profile, then Account, then Delete account. That removes the login, saved specialists, inquiries, and the workout journal on the account.",
      "Specialists: open billing settings and choose Delete account. Cancel an active plan there first. Deleting the account removes the login and takes the public listing down.",
      `If you cannot sign in, email ${SUPPORT_EMAIL} from the address on the account with the subject “Account deletion.” Include whether you are a client or a specialist.`,
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      `Email support: ${SUPPORT_EMAIL}.`,
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
      "SMOAC is a marketplace that helps clients discover independent fitness and wellness specialists—such as trainers, coaches, nutritionists, therapists, and wellness professionals—and send inquiries. Clients can also keep a workout journal, and a specialist they connect with can send workouts onto that calendar.",
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
    title: "Can I log workouts without a specialist?",
    paragraphs: [
      "Yes. The workout journal is yours. Open Workouts from your client profile and log a day on your own. Signing in keeps that log on your account.",
    ],
  },
  {
    title: "What does a connected specialist see?",
    paragraphs: [
      "Only the workouts they send you: whether each one was sent, started, or finished, and the weights and reps you log on those exercises. They do not see days you built yourself, the rest of your journal, or your body weight.",
    ],
  },
  {
    title: "Does the iPhone app read Apple Health?",
    paragraphs: [
      "Only if you choose to connect it. SMOAC then shows completed workouts and active calories from Apple on your training calendar. Those samples stay on your iPhone. The website cannot read Apple Health, and specialists do not see them.",
    ],
  },
  {
    title: "Will I get alerts on my iPhone?",
    paragraphs: [
      "If you allow notifications, the SMOAC app can alert you when an inquiry message arrives, when a specialist invites you or sends a workout, and when a client finishes a workout that specialist sent. Turn them off anytime in iOS Settings. Workout streak notes are email, and you can switch those off in Edit Profile.",
    ],
  },
  {
    title: "How do I delete my account?",
    paragraphs: [
      "Clients delete from Edit Profile → Account. Specialists delete from billing settings, after canceling an active plan. That removes the login.",
      `If you cannot sign in, email ${SUPPORT_EMAIL} from your account address with the subject “Account deletion.”`,
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
      "Approved specialists can list on the marketplace on the Free plan. New approved specialists may receive a complimentary Pro trial (no card required). The standard trial is 30 days. Founding 100 members, and a limited run of new signups, receive 90 days.",
      "SMOAC Pro is $19.99 per month. It unlocks specialist analytics and related Pro listing perks shown in the dashboard.",
      "SMOAC PRO+ is $29.99 per month. It includes Pro, plus up to 5 short profile videos, client results, and 20% off Boost campaigns.",
      "Membership is billed through Stripe and renews until you cancel. Canceling stops the next charge and leaves the plan active through the period already paid. When a trial ends without a paid plan, the account returns to Free.",
    ],
  },
  {
    title: "For specialists — Boosts",
    paragraphs: [
      "Boosts are optional paid placement campaigns. You choose duration (1–30 days) and a daily budget. The campaign total is charged up front through Stripe and can appear in Marketplace, Search, and Homepage placements for that window.",
      "PRO+ members receive 20% off Boost totals at checkout. Membership itself does not include Homepage Featured or Sponsored placement. If a Boost charge is refunded, the campaign time that charge bought comes off. Other refund requests go to support.",
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
      "If something feels unsafe or violates our Community Guidelines, use Report a Concern or email ${SUPPORT_EMAIL} promptly.",
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
      "We review reports as quickly as we can. We may request more detail. We cannot always share confidential actions taken against another account.",
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
      "SMOAC does not show a cookie-consent banner. The storage above is first-party. It is not an advertising cookie and it is not shared with an ad network.",
      "You can clear cookies and site data in your browser. Blocking some of it may affect sign-in, saves, or location.",
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
      "We work toward practices aligned with common web accessibility guidance, including meaningful labels, focus states, and responsive layouts.",
    ],
  },
  {
    title: "Feedback",
    paragraphs: [
      `If you encounter an accessibility barrier, email ${SUPPORT_EMAIL} with the page URL and a short description of the issue. Your feedback helps us prioritize fixes.`,
    ],
  },
];
