import { absoluteUrl, getSiteUrl } from "@/lib/seo/site-url";
import type { Metadata } from "next";

const PATH = "/calorie-calculator";

export const CALORIE_CALCULATOR_SEO = {
  path: PATH,
  canonical: absoluteUrl(PATH),
  title: "Free Calorie Calculator — TDEE, Daily Calories & Weight Loss",
  description:
    "Free calorie calculator to estimate daily calories, TDEE, and BMR from your age, weight, height, and activity level. Compare maintain, mild, and aggressive weight-loss calorie targets, see a 12-week projection, then find personal trainers and nutritionists on SMOAC.",
  keywords: [
    "calorie calculator",
    "free calorie calculator",
    "TDEE calculator",
    "BMR calculator",
    "daily calorie intake",
    "calories to lose weight",
    "weight loss calorie calculator",
    "maintenance calories",
    "macro calorie estimate",
    "activity level calories",
    "personal trainer near me",
    "nutritionist near me",
    "SMOAC",
  ],
} as const;

export const CALORIE_CALCULATOR_FAQS: ReadonlyArray<{
  question: string;
  answer: string;
}> = [
  {
    question: "How does the SMOAC calorie calculator work?",
    answer:
      "It uses the Mifflin–St Jeor equation to estimate your basal metabolic rate (BMR), then multiplies by your activity level to estimate TDEE (maintenance calories). From there it shows daily calorie targets for maintaining weight or losing about 0.5, 1, or 2 pounds per week.",
  },
  {
    question: "What is TDEE?",
    answer:
      "TDEE means total daily energy expenditure — roughly how many calories you burn in a day including exercise and daily activity. Eating near your TDEE helps maintain weight; eating below it supports weight loss when paired with a sustainable plan.",
  },
  {
    question: "Is this calorie calculator free?",
    answer:
      "Yes. The SMOAC calorie calculator is free to use. After you see your results, you can browse suggested personal trainers, nutritionists, and coaches on SMOAC if you want expert help staying on track.",
  },
  {
    question: "How accurate are these calorie estimates?",
    answer:
      "They are estimates for planning, not medical advice. Individual needs vary with genetics, hormones, muscle mass, and health conditions. Use the numbers as a starting point and work with a qualified trainer or nutritionist for a personalized plan.",
  },
  {
    question: "Can I find a trainer after using the calculator?",
    answer:
      "Yes. Results include trainers and specialists matched to your goal — including sponsored placements and organic suggestions near you — so you can move from calorie math into real coaching on SMOAC.",
  },
];

export function buildCalorieCalculatorMetadata(): Metadata {
  const { title, description, canonical, keywords } = CALORIE_CALCULATOR_SEO;
  return {
    title,
    description,
    keywords: [...keywords],
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      siteName: "SMOAC",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    category: "health",
  };
}

export function buildCalorieCalculatorJsonLd(): Record<string, unknown>[] {
  const origin = getSiteUrl();
  const { canonical, title, description } = CALORIE_CALCULATOR_SEO;

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "SMOAC Calorie Calculator",
      alternateName: [
        "Free Calorie Calculator",
        "TDEE Calculator",
        "Weight Loss Calorie Calculator",
      ],
      url: canonical,
      description,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      provider: {
        "@type": "Organization",
        name: "SMOAC",
        url: origin,
      },
      featureList: [
        "Daily calorie estimate from activity level",
        "TDEE and BMR estimate (Mifflin–St Jeor)",
        "Weight loss and weight gain calorie paces",
        "12-week weight projection chart",
        "Suggested trainers and nutritionists",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: CALORIE_CALCULATOR_FAQS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: origin,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Calorie Calculator",
          item: canonical,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      isPartOf: {
        "@type": "WebSite",
        name: "SMOAC",
        url: origin,
      },
      about: [
        { "@type": "Thing", name: "Calorie counting" },
        { "@type": "Thing", name: "Weight loss" },
        { "@type": "Thing", name: "Total daily energy expenditure" },
      ],
    },
  ];
}
