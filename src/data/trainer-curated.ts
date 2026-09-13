/** Trust-building profile highlights per trainer */

export interface TrainerCuratedProfile {
  /** “Are we the right fit?” paragraph (one item) or legacy client-type pills */
  bestFor: string[];
  coachingStyle: string[];
  whyClientsChoose: string[];
  resultsSnapshot: string[];
  sessionExperience: string[];
}

export const trainerCuratedById: Record<string, TrainerCuratedProfile> = {
  "marcus-chen": {
    resultsSnapshot: [
      "40+ Client Results",
      "8 Years Coaching",
      "Former Collegiate Athlete",
    ],
    sessionExperience: [
      "Progress Tracking",
      "Form Analysis",
      "Structured Workouts",
      "Accountability",
      "Nutrition Guidance",
      "Direct Messaging",
    ],
    bestFor: [
      "My ideal client is a busy professional or former athlete who wants structured strength work, HYROX prep, or a clear path back to feeling athletic.",
    ],
    coachingStyle: [
      "Science-Based",
      "High Accountability",
      "Athletic Performance",
      "Results-Focused",
    ],
    whyClientsChoose: [
      "Detailed programming",
      "Fast communication",
      "Customized plans",
      "Accountability",
      "Results-focused",
      "Technical coaching",
    ],
  },
  "elena-vasquez": {
    resultsSnapshot: [
      "200+ Clients Coached",
      "10 Years Experience",
      "RYT-500 Certified",
    ],
    sessionExperience: [
      "Progress Tracking",
      "Form Analysis",
      "Nutrition Guidance",
      "Accountability",
      "Structured Workouts",
      "Direct Messaging",
    ],
    bestFor: [
      "I work best with clients who are women 40+, desk workers, or anyone rebuilding flexibility and wanting a calmer mind-body practice.",
    ],
    coachingStyle: [
      "Supportive Coaching",
      "Beginner Friendly",
      "Science-Based",
    ],
    whyClientsChoose: [
      "Personalized attention",
      "Calm environment",
      "Holistic approach",
      "Fast communication",
      "Customized plans",
      "Mind-body balance",
    ],
  },
  "david-okonkwo": {
    resultsSnapshot: [
      "30+ Fight Camp Prep",
      "9 Years Coaching",
      "Pro Boxing Background",
    ],
    sessionExperience: [
      "Progress Tracking",
      "Form Analysis",
      "Structured Workouts",
      "Accountability",
      "Direct Messaging",
      "Nutrition Guidance",
    ],
    bestFor: [
      "We will be a great fit if you want high-intensity sessions, HYROX or combat-sport energy, and a coach who will push you hard.",
    ],
    coachingStyle: [
      "Tough Love",
      "Athletic Performance",
      "High Accountability",
      "Results-Focused",
    ],
    whyClientsChoose: [
      "Intense sessions",
      "Technical coaching",
      "Motivation",
      "Results-focused",
      "Accountability",
      "Fast communication",
    ],
  },
  "sophia-laurent": {
    resultsSnapshot: [
      "150+ Wellness Plans",
      "11 Years Experience",
      "Registered Dietitian",
    ],
    sessionExperience: [
      "Nutrition Guidance",
      "Progress Tracking",
      "Accountability",
      "Structured Workouts",
      "Form Analysis",
      "Direct Messaging",
    ],
    bestFor: [
      "My ideal client is a wellness-focused professional — especially women 40+ — who wants nutrition, recovery, and a plan that fits a full life.",
    ],
    coachingStyle: [
      "Science-Based",
      "Supportive Coaching",
      "Beginner Friendly",
    ],
    whyClientsChoose: [
      "Customized plans",
      "Holistic approach",
      "Detailed programming",
      "Accountability",
      "Fast communication",
      "Lifestyle integration",
    ],
  },
  "james-morrison": {
    resultsSnapshot: [
      "50+ Marathon Finishes",
      "7 Years Coaching",
      "Sub-3 Marathon PR",
    ],
    sessionExperience: [
      "Progress Tracking",
      "Structured Workouts",
      "Form Analysis",
      "Accountability",
      "Direct Messaging",
      "Nutrition Guidance",
    ],
    bestFor: [
      "I work best with clients who are building toward a race — first-time runners, marathon trainees, and busy people who want endurance without burnout.",
    ],
    coachingStyle: [
      "Science-Based",
      "Beginner Friendly",
      "Athletic Performance",
    ],
    whyClientsChoose: [
      "Detailed programming",
      "Results-focused",
      "Customized plans",
      "Fast communication",
      "Accountability",
      "Race-day prep",
    ],
  },
  "amara-johnson": {
    resultsSnapshot: [
      "35+ Strength PRs",
      "6 Years Coaching",
      "Competition Background",
    ],
    sessionExperience: [
      "Form Analysis",
      "Progress Tracking",
      "Structured Workouts",
      "Accountability",
      "Nutrition Guidance",
      "Direct Messaging",
    ],
    bestFor: [
      "We will be a great fit if you want to get strong — women 40+, first-time lifters, and athletes chasing power or HYROX.",
    ],
    coachingStyle: [
      "Supportive Coaching",
      "Science-Based",
      "High Accountability",
      "Athletic Performance",
    ],
    whyClientsChoose: [
      "Form-focused coaching",
      "Customized plans",
      "Accountability",
      "Results-focused",
      "Detailed programming",
      "Empowering approach",
    ],
  },
  "kai-nakamura": {
    resultsSnapshot: [
      "100+ Mobility Restores",
      "5 Years Coaching",
      "Pain-Free Movement Focus",
    ],
    sessionExperience: [
      "Form Analysis",
      "Progress Tracking",
      "Accountability",
      "Structured Workouts",
      "Direct Messaging",
      "Nutrition Guidance",
    ],
    bestFor: [
      "My ideal client is dealing with chronic pain, a stiff desk-job body, or a long recovery and wants mobility work that actually feels safe.",
    ],
    coachingStyle: [
      "Supportive Coaching",
      "Beginner Friendly",
      "Science-Based",
    ],
    whyClientsChoose: [
      "Pain relief focus",
      "Personalized attention",
      "Holistic approach",
      "Calm sessions",
      "Customized plans",
      "Sustainable habits",
    ],
  },
  "isabella-romano": {
    resultsSnapshot: [
      "90+ Posture Results",
      "9 Years Pilates",
      "STOTT Certified",
    ],
    sessionExperience: [
      "Form Analysis",
      "Progress Tracking",
      "Structured Workouts",
      "Accountability",
      "Direct Messaging",
      "Nutrition Guidance",
    ],
    bestFor: [
      "I work best with clients who want better posture and a stronger core — Pilates beginners, desk workers, and women 40+ starting fresh.",
    ],
    coachingStyle: [
      "Supportive Coaching",
      "Beginner Friendly",
      "Science-Based",
    ],
    whyClientsChoose: [
      "Precision coaching",
      "Customized plans",
      "Postural expertise",
      "Personalized attention",
      "Results-focused",
      "Elegant progression",
    ],
  },
  "elena-ramirez": {
    resultsSnapshot: [
      "84 Verified Reviews",
      "Return-to-Sport Focus",
      "DPT + CSCS",
    ],
    sessionExperience: [
      "Movement Assessment",
      "Progress Tracking",
      "Rehab Protocols",
      "Direct Messaging",
      "Form Analysis",
      "Structured Workouts",
    ],
    bestFor: [
      "We will be a great fit if you are coming back from injury, limited mobility, or desk-job pain and need a clear rehab-minded plan.",
    ],
    coachingStyle: ["Science-Based", "Supportive Coaching", "Results-Focused"],
    whyClientsChoose: [
      "Clinical expertise",
      "Clear rehab plans",
      "Pain-first approach",
      "Fast communication",
      "Customized plans",
      "Trusted referrals",
    ],
  },
  "marcus-lee": {
    resultsSnapshot: [
      "112 Client Reviews",
      "Posture Specialists",
      "Athletic Recovery",
    ],
    sessionExperience: [
      "Movement Assessment",
      "Progress Tracking",
      "Structured Workouts",
      "Direct Messaging",
      "Accountability",
      "Form Analysis",
    ],
    bestFor: [
      "My ideal client is dealing with back pain, desk stiffness, or weekend-athlete aches and wants gentle, posture-first care.",
    ],
    coachingStyle: ["Science-Based", "Supportive Coaching"],
    whyClientsChoose: [
      "Gentle adjustments",
      "Holistic approach",
      "Fast communication",
      "Pain relief focus",
      "Customized plans",
      "Trusted expertise",
    ],
  },
  "sophia-bennett": {
    resultsSnapshot: [
      "67 Nutrition Clients",
      "Sustainable Fat Loss",
      "Performance Fueling",
    ],
    sessionExperience: [
      "Meal Planning",
      "Progress Tracking",
      "Nutrition Guidance",
      "Direct Messaging",
      "Accountability",
      "Structured Check-ins",
    ],
    bestFor: [
      "I work best with clients who want fat loss, better fueling, or simple meal prep — busy professionals and athletes included.",
    ],
    coachingStyle: ["Supportive Coaching", "Science-Based", "Beginner Friendly"],
    whyClientsChoose: [
      "Practical meal plans",
      "No fad diets",
      "Customized plans",
      "Fast communication",
      "Sustainable habits",
      "Results-focused",
    ],
  },
  "jordan-kim": {
    resultsSnapshot: [
      "51 Recovery Clients",
      "Mobility Focus",
      "Soft Tissue Expertise",
    ],
    sessionExperience: [
      "Stretch Therapy",
      "Progress Tracking",
      "Mobility Work",
      "Direct Messaging",
      "Form Analysis",
      "Structured Sessions",
    ],
    bestFor: [
      "We will be a great fit if you are overtrained, tight, or stuck between training blocks and need hands-on recovery — not another hard session.",
    ],
    coachingStyle: ["Supportive Coaching", "Beginner Friendly"],
    whyClientsChoose: [
      "Hands-on recovery",
      "Calm sessions",
      "Pain relief focus",
      "Personalized attention",
      "Holistic approach",
      "Flexible scheduling",
    ],
  },
  "anthony-brooks": {
    resultsSnapshot: [
      "93 Performance Clients",
      "5.0 Average Rating",
      "Speed & Power Gains",
    ],
    sessionExperience: [
      "Progress Tracking",
      "Form Analysis",
      "Structured Workouts",
      "Accountability",
      "Direct Messaging",
      "Performance Testing",
    ],
    bestFor: [
      "My ideal client is a field-sport or HYROX athlete who wants speed, strength, and programming that holds up in competition.",
    ],
    coachingStyle: [
      "Athletic Performance",
      "High Accountability",
      "Results-Focused",
      "Science-Based",
    ],
    whyClientsChoose: [
      "Elite programming",
      "Technical coaching",
      "Accountability",
      "Customized plans",
      "Results-focused",
      "Fast communication",
    ],
  },
};
