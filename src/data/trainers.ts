import type { Trainer } from "@/types/trainer";

export const trainers: Trainer[] = [
  {
    id: "marcus-chen",
    name: "Marcus Chen",
    title: "Elite Performance Coach",
    location: "Los Angeles, CA",
    city: "Los Angeles",
    specialty: ["Strength", "HIIT"],
    gender: "male",
    pricePerSession: 185,
    rating: 4.9,
    reviewCount: 127,
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50c?w=400&h=500&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=600&fit=crop",
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
    title: "Mind-Body Integration Specialist",
    location: "New York, NY",
    city: "New York",
    specialty: ["Yoga", "Pilates", "Recovery"],
    gender: "female",
    pricePerSession: 165,
    rating: 5.0,
    reviewCount: 203,
    image: "https://images.unsplash.com/photo-1594381898414-849b608730b2?w=400&h=500&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&h=600&fit=crop",
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
    title: "Combat Sports & Conditioning",
    location: "Miami, FL",
    city: "Miami",
    specialty: ["Boxing", "HIIT", "Strength"],
    gender: "male",
    pricePerSession: 150,
    rating: 4.8,
    reviewCount: 89,
    image: "https://images.unsplash.com/photo-1583454110551-21f2d2b7e075?w=400&h=500&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=600&fit=crop",
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
    title: "Holistic Wellness Architect",
    location: "San Francisco, CA",
    city: "San Francisco",
    specialty: ["Nutrition", "Recovery", "Yoga"],
    gender: "female",
    pricePerSession: 195,
    rating: 4.9,
    reviewCount: 156,
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=500&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=600&fit=crop",
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
    title: "Endurance & Running Coach",
    location: "Chicago, IL",
    city: "Chicago",
    specialty: ["Running", "HIIT"],
    gender: "male",
    pricePerSession: 120,
    rating: 4.7,
    reviewCount: 74,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=500&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1476480862128-209bfaa8edc8?w=1200&h=600&fit=crop",
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
    title: "Strength & Power Specialist",
    location: "Austin, TX",
    city: "Austin",
    specialty: ["Strength", "HIIT"],
    gender: "female",
    pricePerSession: 140,
    rating: 4.9,
    reviewCount: 112,
    image: "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=500&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1518310383802-640c2b311f1e?w=1200&h=600&fit=crop",
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
    title: "Mobility & Recovery Expert",
    location: "Seattle, WA",
    city: "Seattle",
    specialty: ["Recovery", "Pilates", "Yoga"],
    gender: "non-binary",
    pricePerSession: 130,
    rating: 4.8,
    reviewCount: 67,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&h=600&fit=crop",
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
    title: "Pilates & Core Architect",
    location: "Los Angeles, CA",
    city: "Los Angeles",
    specialty: ["Pilates", "Yoga"],
    gender: "female",
    pricePerSession: 175,
    rating: 5.0,
    reviewCount: 98,
    image: "https://images.unsplash.com/photo-1518310383802-640c2b311f1e?w=400&h=500&fit=crop",
    heroImage: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&h=600&fit=crop",
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
];

export function getTrainerById(id: string): Trainer | undefined {
  return trainers.find((t) => t.id === id);
}

export function getFeaturedTrainers(): Trainer[] {
  return trainers.filter((t) => t.featured);
}

export const locations = [...new Set(trainers.map((t) => t.city))].sort();
export const specialties = [...new Set(trainers.flatMap((t) => t.specialty))].sort();
export const genders = ["male", "female", "non-binary"] as const;
export const priceRanges = [
  { label: "Any price", value: "" },
  { label: "Under $130", value: "130" },
  { label: "Under $150", value: "150" },
  { label: "Under $175", value: "175" },
  { label: "Under $200", value: "200" },
];
