/** Inquiry actions + profession-aware topic options for specialist profile composer */

export const INQUIRY_ACTIONS = [
  { id: "ask_question", label: "Ask a Question" },
  { id: "book_call", label: "Book a Call" },
  { id: "book_consultation", label: "Book a Consultation" },
  { id: "get_rates", label: "Get Rates" },
] as const;

export type InquiryActionId = (typeof INQUIRY_ACTIONS)[number]["id"];

export interface InquiryTopicOption {
  id: string;
  label: string;
}

/** Generic topics when profession has no dedicated set */
export const INQUIRY_TOPICS_DEFAULT: readonly InquiryTopicOption[] = [
  { id: "services", label: "Services" },
  { id: "pricing", label: "Pricing" },
  { id: "availability", label: "Availability" },
  { id: "online_options", label: "Online Options" },
  { id: "in_person_options", label: "In-Person Options" },
  { id: "other", label: "Other" },
] as const;

const INQUIRY_TOPICS_BY_PROFESSION: Record<
  string,
  readonly InquiryTopicOption[]
> = {
  "Personal Trainer": [
    { id: "training_programs", label: "Training Programs" },
    { id: "pricing", label: "Pricing" },
    { id: "availability", label: "Availability" },
    { id: "nutrition_coaching", label: "Nutrition Coaching" },
    { id: "online_coaching", label: "Online Coaching" },
    { id: "other", label: "Other" },
  ],
  "Physical Therapist": [
    { id: "injury_assessment", label: "Injury Assessment" },
    { id: "rehab_plan", label: "Rehab Plan" },
    { id: "pricing", label: "Pricing" },
    { id: "availability", label: "Availability" },
    { id: "insurance_payment", label: "Insurance / Payment" },
    { id: "return_to_sport", label: "Return to Sport" },
  ],
  Chiropractor: [
    { id: "adjustment_care", label: "Adjustment Care" },
    { id: "pain_relief", label: "Pain Relief" },
    { id: "pricing", label: "Pricing" },
    { id: "availability", label: "Availability" },
    { id: "ongoing_care", label: "Ongoing Care" },
    { id: "other", label: "Other" },
  ],
  Nutritionist: [
    { id: "meal_planning", label: "Meal Planning" },
    { id: "pricing", label: "Pricing" },
    { id: "availability", label: "Availability" },
    { id: "online_coaching", label: "Online Coaching" },
    { id: "sports_nutrition", label: "Sports Nutrition" },
    { id: "other", label: "Other" },
  ],
  "Massage Therapist": [
    { id: "massage_styles", label: "Massage Styles" },
    { id: "pricing", label: "Pricing" },
    { id: "availability", label: "Availability" },
    { id: "recovery_focus", label: "Recovery Focus" },
    { id: "in_person_options", label: "In-Person Options" },
    { id: "other", label: "Other" },
  ],
  "Recovery Specialist": [
    { id: "recovery_protocols", label: "Recovery Protocols" },
    { id: "pricing", label: "Pricing" },
    { id: "availability", label: "Availability" },
    { id: "injury_support", label: "Injury Support" },
    { id: "online_options", label: "Online Options" },
    { id: "other", label: "Other" },
  ],
  "Wellness Coach": [
    { id: "coaching_programs", label: "Coaching Programs" },
    { id: "pricing", label: "Pricing" },
    { id: "availability", label: "Availability" },
    { id: "habits_mindset", label: "Habits & Mindset" },
    { id: "online_options", label: "Online Options" },
    { id: "other", label: "Other" },
  ],
};

export type InquiryTopicId = string;

export const INQUIRY_MESSAGE_MAX_LENGTH = 500;

const ALL_TOPIC_LABELS = new Map<string, string>();
for (const topic of INQUIRY_TOPICS_DEFAULT) {
  ALL_TOPIC_LABELS.set(topic.id, topic.label);
}
for (const topics of Object.values(INQUIRY_TOPICS_BY_PROFESSION)) {
  for (const topic of topics) {
    ALL_TOPIC_LABELS.set(topic.id, topic.label);
  }
}
// Legacy ids from earlier drafts
ALL_TOPIC_LABELS.set("in_person_training", "In-Person Training");

export function getInquiryTopicsForProfession(
  profession: string
): InquiryTopicOption[] {
  const key = profession.trim();
  const topics = INQUIRY_TOPICS_BY_PROFESSION[key] ?? INQUIRY_TOPICS_DEFAULT;
  return [...topics];
}

export function isInquiryActionId(value: string): value is InquiryActionId {
  return INQUIRY_ACTIONS.some((action) => action.id === value);
}

export function isInquiryTopicId(value: string): value is InquiryTopicId {
  return ALL_TOPIC_LABELS.has(value);
}

export function labelForInquiryAction(id: InquiryActionId): string {
  return INQUIRY_ACTIONS.find((action) => action.id === id)?.label ?? id;
}

export function labelsForInquiryTopics(ids: readonly string[]): string[] {
  const labels: string[] = [];
  for (const id of ids) {
    const label = ALL_TOPIC_LABELS.get(id);
    if (label) labels.push(label);
  }
  return labels;
}
