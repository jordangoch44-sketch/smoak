import {
  Hero,
  Top50InYourCity,
  FeaturedTrainers,
  Categories,
  HowItWorks,
  Trust,
  CTA,
} from "@/components/home";
import { LocationPersonalizationGate } from "@/components/home/LocationPersonalizationGate";

export default function HomePage() {
  return (
    <div className="home-page">
      <LocationPersonalizationGate />
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
