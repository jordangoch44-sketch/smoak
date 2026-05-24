import type { Category } from "@/types";

export const categories: Category[] = [
  {
    id: "personal-training",
    name: "Personal Training",
    slug: "personal-training",
    description: "One-on-one coaching for strength, conditioning, and goals",
    icon: "◆",
    exploreHref: "/explore?profession=Personal+Trainer",
  },
  {
    id: "physical-therapy",
    name: "Physical Therapy",
    slug: "physical-therapy",
    description: "Rehab, mobility, and return-to-training support",
    icon: "◎",
    exploreHref: "/explore?profession=Physical+Therapist",
  },
  {
    id: "nutrition",
    name: "Nutrition Coaching",
    slug: "nutrition",
    description: "Fat loss, performance fueling, and meal planning",
    icon: "○",
    exploreHref: "/explore?specialty=Nutrition+Coaching",
  },
  {
    id: "recovery",
    name: "Recovery",
    slug: "recovery",
    description: "Mobility, soft tissue, and restorative care",
    icon: "▲",
    exploreHref: "/explore?specialty=Recovery",
  },
  {
    id: "sports-performance",
    name: "Sports Performance",
    slug: "sports-performance",
    description: "Speed, power, and athletic development",
    icon: "■",
    exploreHref: "/explore?specialty=Sports+Performance",
  },
  {
    id: "wellness",
    name: "Wellness",
    slug: "wellness",
    description: "Holistic health, stress, and lifestyle coaching",
    icon: "◇",
    exploreHref: "/explore?profession=Wellness+Coach",
  },
];
