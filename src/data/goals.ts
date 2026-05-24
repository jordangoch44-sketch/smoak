/** Homepage quick filters & browse-by-goal links → Explore */
export interface TrainingGoal {
  id: string;
  label: string;
  href: string;
}

function exploreHref(filters: { specialty?: string; profession?: string; q?: string }): string {
  const params = new URLSearchParams();
  if (filters.specialty) params.set("specialty", filters.specialty);
  if (filters.profession) params.set("profession", filters.profession);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  return `/explore${qs ? `?${qs}` : ""}`;
}

export const trainingGoals: TrainingGoal[] = [
  {
    id: "personal-training",
    label: "Personal Training",
    href: exploreHref({ profession: "Personal Trainer" }),
  },
  {
    id: "physical-therapy",
    label: "Physical Therapy",
    href: exploreHref({ profession: "Physical Therapist" }),
  },
  {
    id: "nutrition",
    label: "Nutrition",
    href: exploreHref({ specialty: "Nutrition Coaching" }),
  },
  { id: "recovery", label: "Recovery", href: exploreHref({ specialty: "Recovery" }) },
  { id: "weight-loss", label: "Weight Loss", href: exploreHref({ specialty: "Weight Loss" }) },
  { id: "hyrox", label: "HYROX", href: exploreHref({ specialty: "HYROX" }) },
  { id: "womens", label: "Women's Health", href: exploreHref({ specialty: "Women's Health" }) },
  { id: "senior", label: "Senior Fitness", href: exploreHref({ specialty: "Senior Fitness" }) },
];
