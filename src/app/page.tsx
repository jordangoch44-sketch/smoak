import {
  Hero,
  Top50InYourCity,
  FeaturedTrainers,
  Categories,
  HowItWorks,
  Trust,
  CTA,
} from "@/components/home";

export default function HomePage() {
  return (
    <div className="home-page">
      <Hero />
      <Top50InYourCity />
      <FeaturedTrainers />
      <Categories />
      <HowItWorks />
      <Trust />
      <CTA />
    </div>
  );
}
