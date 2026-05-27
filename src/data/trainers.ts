import type { Trainer } from "@/types";
import {
  getTrainerCardPlaceholder,
  getTrainerHeroPlaceholder,
} from "@/lib/trainer-placeholders";
import { trainerCuratedById } from "@/data/trainer-curated";
import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";
import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";
/** Demo review breakdowns — see `@/constants/trainer-reputation-demo` */
import { TRAINER_DEMO_REVIEW_SOURCES } from "@/constants/trainer-reputation-demo";
import { buildTrainerGalleryImages } from "@/lib/trainer-gallery";
import { computeTrainerReviewCount } from "@/lib/trainer-reviews";
import {
  getTrainerGallery,
  getTrainerTransformations,
} from "@/lib/trainer-media";

type TrainerRecord = Omit<
  Trainer,
  | "bestFor"
  | "coachingStyle"
  | "whyClientsChoose"
  | "resultsSnapshot"
  | "sessionExperience"
  | "gallery"
  | "clientTransformations"
  | "galleryImages"
  | "reviewSources"
>;

/** Seed location fields — onboarding will set city, neighborhood, serviceArea */
function loc(
  city: string,
  neighborhood: string,
  serviceArea: string[] = []
): Pick<TrainerRecord, "city" | "neighborhood" | "serviceArea" | "location"> {
  return {
    city,
    neighborhood,
    serviceArea,
    location: neighborhood ? `${neighborhood}, ${city}` : city,
  };
}

const trainerRecords: TrainerRecord[] = [
  {
    id: "marcus-chen",
    name: "Marcus Chen",
    profession: "Personal Trainer",
    title: "Elite performance & HYROX prep",
    ...loc("Los Angeles", "West Hollywood", ["West Hollywood", "Santa Monica"]),
    specialty: ["Strength Coaching", "HYROX", "Sports Performance"],
    gender: "male",
    pricePerSession: 185,
    rating: 4.9,
    reviewCount: 127,
    image: "",
    heroImage: "",
    bio: "Former collegiate athlete turned performance specialist. Marcus designs bespoke training protocols for executives and professional athletes seeking measurable results without compromise.",
    featured: true,
    certifications: [
      { name: "CSCS", issuer: "NSCA", year: 2018 },
      { name: "Precision Nutrition L1", issuer: "PN", year: 2020 },
    ],
    reviews: [
      { id: "r1", author: "James W.", rating: 5, text: "Transformed my approach to fitness entirely. Marcus is meticulous and inspiring.", date: "2025-03-12" },
      { id: "r2", author: "Sarah L.", rating: 5, text: "The best investment I've made in my health. Results speak for themselves.", date: "2025-01-28" },
    ],
    social: { instagram: "#", twitter: "#", linkedin: "#" },
  },
  {
    id: "elena-vasquez",
    name: "Elena Vasquez",
    profession: "Wellness Coach",
    title: "Mind-body integration & recovery",
    ...loc("New York", "", []),
    specialty: ["Mobility", "Recovery", "Yoga"],
    gender: "female",
    pricePerSession: 165,
    rating: 5.0,
    reviewCount: 203,
    image: "",
    heroImage: "",
    bio: "Elena bridges ancient movement philosophy with modern biomechanics. Her sessions cultivate strength, flexibility, and mental clarity for high-performing individuals.",
    featured: true,
    certifications: [
      { name: "RYT-500", issuer: "Yoga Alliance", year: 2016 },
      { name: "Pilates Comprehensive", issuer: "Balanced Body", year: 2019 },
    ],
    reviews: [
      { id: "r1", author: "Michelle K.", rating: 5, text: "Elena has an extraordinary ability to meet you exactly where you are.", date: "2025-04-02" },
    ],
    social: { instagram: "#", website: "#" },
  },
  {
    id: "david-okonkwo",
    name: "David Okonkwo",
    profession: "Personal Trainer",
    title: "Combat sports & conditioning",
    ...loc("Miami", "", []),
    specialty: ["Boxing", "Strength Coaching", "Sports Performance"],
    gender: "male",
    pricePerSession: 150,
    rating: 4.8,
    reviewCount: 89,
    image: "",
    heroImage: "",
    bio: "Professional boxing background with a focus on functional combat conditioning. David's sessions are intense, precise, and engineered for peak cardiovascular output.",
    featured: true,
    certifications: [
      { name: "USA Boxing Coach", issuer: "USA Boxing", year: 2015 },
      { name: "ACE CPT", issuer: "ACE", year: 2017 },
    ],
    reviews: [
      { id: "r1", author: "Tom R.", rating: 5, text: "Unmatched energy and technical knowledge. Every session pushes you further.", date: "2025-02-15" },
    ],
    social: { instagram: "#", twitter: "#" },
  },
  {
    id: "sophia-laurent",
    name: "Sophia Laurent",
    profession: "Nutritionist",
    title: "Holistic wellness & performance nutrition",
    ...loc("San Francisco", "", []),
    specialty: ["Nutrition Coaching", "Recovery", "Weight Loss", "Yoga"],
    gender: "female",
    pricePerSession: 195,
    rating: 4.9,
    reviewCount: 156,
    image: "",
    heroImage: "",
    bio: "Sophia integrates nutrition science, restorative movement, and lifestyle design into cohesive wellness programs for discerning clients.",
    featured: true,
    certifications: [
      { name: "RD", issuer: "Academy of Nutrition", year: 2014 },
      { name: "FMS Level 2", issuer: "FMS", year: 2021 },
    ],
    reviews: [
      { id: "r1", author: "Anna P.", rating: 5, text: "A truly holistic approach. Sophia changed how I think about wellness.", date: "2025-03-30" },
    ],
    social: { instagram: "#", linkedin: "#", website: "#" },
  },
  {
    id: "james-morrison",
    name: "James Morrison",
    profession: "Personal Trainer",
    title: "Endurance & marathon programming",
    ...loc("Chicago", "", []),
    specialty: ["Sports Performance", "Athletic Development"],
    gender: "male",
    pricePerSession: 120,
    rating: 4.7,
    reviewCount: 74,
    image: "",
    heroImage: "",
    bio: "Marathon specialist with sub-3 hour personal bests. James crafts periodized running programs from 5K to ultramarathon distances.",
    featured: false,
    certifications: [
      { name: "RRCA Level 2", issuer: "RRCA", year: 2019 },
    ],
    reviews: [
      { id: "r1", author: "Chris B.", rating: 5, text: "Qualified for Boston thanks to James. His programming is world-class.", date: "2025-01-10" },
    ],
    social: { instagram: "#", twitter: "#" },
  },
  {
    id: "amara-johnson",
    name: "Amara Johnson",
    profession: "Personal Trainer",
    title: "Powerlifting & strength for all levels",
    ...loc("Austin", "", []),
    specialty: ["Strength Coaching", "Women's Health", "Weight Loss"],
    gender: "female",
    pricePerSession: 140,
    rating: 4.9,
    reviewCount: 112,
    image: "",
    heroImage: "",
    bio: "Powerlifting champion coaching women and men to build exceptional strength with impeccable form and intelligent progression.",
    featured: false,
    certifications: [
      { name: "USAW Level 1", issuer: "USA Weightlifting", year: 2020 },
      { name: "CSCS", issuer: "NSCA", year: 2021 },
    ],
    reviews: [
      { id: "r1", author: "Rachel M.", rating: 5, text: "Amara is the real deal. Strong, knowledgeable, and incredibly supportive.", date: "2025-04-18" },
    ],
    social: { instagram: "#", linkedin: "#" },
  },
  {
    id: "kai-nakamura",
    name: "Kai Nakamura",
    profession: "Wellness Coach",
    title: "Movement quality & pain-free training",
    ...loc("Seattle", "", []),
    specialty: ["Mobility", "Recovery", "Corrective Exercise", "Yoga"],
    gender: "non-binary",
    pricePerSession: 130,
    rating: 4.8,
    reviewCount: 67,
    image: "",
    heroImage: "",
    bio: "Kai specializes in restoring movement quality and reducing chronic pain through evidence-based mobility protocols and breathwork.",
    featured: false,
    certifications: [
      { name: "FRCms", issuer: "FRC", year: 2022 },
    ],
    reviews: [
      { id: "r1", author: "Daniel H.", rating: 5, text: "Finally found relief from years of lower back issues. Kai is exceptional.", date: "2025-02-22" },
    ],
    social: { instagram: "#", website: "#" },
  },
  {
    id: "isabella-romano",
    name: "Isabella Romano",
    profession: "Personal Trainer",
    title: "Pilates & postural strength",
    ...loc("Los Angeles", "Santa Monica", ["Santa Monica", "Venice"]),
    specialty: ["Mobility", "Yoga", "Corrective Exercise"],
    gender: "female",
    pricePerSession: 175,
    rating: 5.0,
    reviewCount: 98,
    image: "",
    heroImage: "",
    bio: "Classically trained Pilates instructor with a sculptural approach to core strength and postural alignment for the modern body.",
    featured: false,
    certifications: [
      { name: "STOTT Pilates", issuer: "Merrithew", year: 2017 },
    ],
    reviews: [
      { id: "r1", author: "Lisa T.", rating: 5, text: "My posture and core have never been stronger. Isabella is a master.", date: "2025-03-05" },
    ],
    social: { instagram: "#", linkedin: "#" },
  },
  {
    id: "elena-ramirez",
    name: "Dr. Elena Ramirez",
    profession: "Physical Therapist",
    title: "Sports rehab & return-to-training",
    ...loc("San Diego", "Mission Valley", ["Mission Valley", "Sorrento Valley"]),
    specialty: ["Mobility", "Sports Performance", "Recovery", "Corrective Exercise"],
    gender: "female",
    pricePerSession: 150,
    rating: 4.9,
    reviewCount: 84,
    image: "",
    heroImage: "",
    bio: "Doctor of Physical Therapy focused on sports rehabilitation, mobility restoration, and safe return-to-training protocols for active adults and athletes.",
    featured: true,
    certifications: [
      { name: "DPT", issuer: "ACCREDITED PT PROGRAM", year: 2016 },
      { name: "CSCS", issuer: "NSCA", year: 2019 },
    ],
    reviews: [
      { id: "r1", author: "Mike T.", rating: 5, text: "Got me back to lifting pain-free after a shoulder injury.", date: "2025-03-08" },
    ],
    social: { instagram: "#", website: "#" },
  },
  {
    id: "marcus-lee",
    name: "Dr. Marcus Lee",
    profession: "Chiropractor",
    title: "Back pain, posture & athletic recovery",
    ...loc("San Diego", "La Jolla", ["La Jolla", "Del Mar", "Pacific Beach"]),
    specialty: ["Recovery", "Sports Performance", "Mobility", "Corrective Exercise"],
    gender: "male",
    pricePerSession: 120,
    rating: 4.8,
    reviewCount: 112,
    image: "",
    heroImage: "",
    bio: "Chiropractor helping athletes and professionals resolve back pain, improve posture, and recover faster with evidence-informed adjustments and mobility work.",
    featured: true,
    certifications: [
      { name: "DC", issuer: "PALMER COLLEGE", year: 2014 },
    ],
    reviews: [
      { id: "r1", author: "Jen S.", rating: 5, text: "Clear, calm, and effective — my chronic neck tension is finally manageable.", date: "2025-02-19" },
    ],
    social: { instagram: "#", website: "#" },
  },
  {
    id: "sophia-bennett",
    name: "Sophia Bennett",
    profession: "Nutritionist",
    title: "Fat loss & performance nutrition",
    ...loc("San Diego", "Encinitas", ["Encinitas", "Leucadia", "Cardiff"]),
    specialty: ["Nutrition Coaching", "Weight Loss", "Sports Performance"],
    gender: "female",
    pricePerSession: 95,
    rating: 4.9,
    reviewCount: 67,
    image: "",
    heroImage: "",
    bio: "Nutrition coach specializing in sustainable fat loss, performance fueling, and practical meal planning for busy professionals and athletes.",
    featured: true,
    certifications: [
      { name: "PN Level 2", issuer: "Precision Nutrition", year: 2020 },
    ],
    reviews: [
      { id: "r1", author: "Alex R.", rating: 5, text: "Finally a nutrition plan I can actually stick to.", date: "2025-04-01" },
    ],
    social: { instagram: "#", website: "#" },
  },
  {
    id: "jordan-kim",
    name: "Jordan Kim",
    profession: "Massage Therapist",
    title: "Stretch therapy, mobility & soft tissue",
    ...loc("San Diego", "Carlsbad", ["Carlsbad", "La Costa"]),
    specialty: ["Recovery", "Mobility"],
    gender: "male",
    pricePerSession: 110,
    rating: 4.7,
    reviewCount: 51,
    image: "",
    heroImage: "",
    bio: "Recovery specialist blending stretch therapy, mobility sessions, and soft-tissue work to help clients move better and recover between hard training blocks.",
    featured: false,
    certifications: [
      { name: "LMT", issuer: "STATE BOARD", year: 2018 },
      { name: "FRC", issuer: "FRC", year: 2021 },
    ],
    reviews: [
      { id: "r1", author: "Priya N.", rating: 5, text: "Every session leaves me feeling reset and ready to train again.", date: "2025-01-22" },
    ],
    social: { instagram: "#" },
  },
  {
    id: "anthony-brooks",
    name: "Anthony Brooks",
    profession: "Personal Trainer",
    title: "Speed, strength & athletic development",
    ...loc("San Diego", "North Park", ["North Park", "Hillcrest", "Mission Valley"]),
    specialty: ["Sports Performance", "Strength Coaching", "Athletic Development"],
    gender: "male",
    pricePerSession: 135,
    rating: 5.0,
    reviewCount: 93,
    image: "",
    heroImage: "",
    bio: "Sports performance coach developing speed, strength, and athleticism for high school, collegiate, and adult athletes with periodized, data-informed programming.",
    featured: true,
    certifications: [
      { name: "CSCS", issuer: "NSCA", year: 2017 },
      { name: "USAW Level 1", issuer: "USA Weightlifting", year: 2019 },
    ],
    reviews: [
      { id: "r1", author: "Devon C.", rating: 5, text: "Explosive gains in speed and confidence on the field.", date: "2025-03-14" },
    ],
    social: { instagram: "#", twitter: "#" },
  },
];

/** Apply photos and curated profile highlights per trainer */
export const trainers: Trainer[] = trainerRecords.map((trainer) => {
  const curated = trainerCuratedById[trainer.id];
  if (!curated) {
    throw new Error(`Missing curated profile for trainer: ${trainer.id}`);
  }
  const heroImage = getTrainerHeroPlaceholder(trainer.id);
  const gallery = getTrainerGallery(trainer.id);
  const reviewSources = TRAINER_DEMO_REVIEW_SOURCES[trainer.id];
  const galleryImages = buildTrainerGalleryImages(gallery, heroImage);
  const enriched = {
    ...trainer,
    ...curated,
    image: getTrainerCardPlaceholder(trainer.id),
    heroImage,
    gallery,
    galleryImages,
    reviewSources,
    clientTransformations: getTrainerTransformations(trainer.id),
  };

  return {
    ...enriched,
    reviewCount: computeTrainerReviewCount(enriched),
  };
});

export function getTrainerById(id: string): Trainer | undefined {
  return trainers.find((t) => t.id === id);
}

export function getFeaturedTrainers(): Trainer[] {
  return trainers.filter((t) => t.featured);
}

/** Main profession filter options (canonical categories only) */
export const professions = [...MAIN_PROFESSION_CATEGORIES];

export const specialties = [
  ...new Set([
    ...marketplaceSpecialtyOptions,
    ...trainers.flatMap((t) => t.specialty),
  ]),
].sort();
export const genders = ["male", "female", "non-binary"] as const;
export const priceRanges = [
  { label: "Any price", value: "" },
  { label: "Under $130", value: "130" },
  { label: "Under $150", value: "150" },
  { label: "Under $175", value: "175" },
  { label: "Under $200", value: "200" },
];
