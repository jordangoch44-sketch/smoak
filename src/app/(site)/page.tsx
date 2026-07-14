import {
  Hero,
  SponsoredSpecialists,
  Top50InYourCity,
  Categories,
  NewSpecialists,
} from "@/components/home";
import { LocationPersonalizationGate } from "@/components/home/LocationPersonalizationGate";

export default function HomePage() {
  return (
    <div className="home-page home-page--discovery">
      <div className="home-page__sky" aria-hidden />
      <LocationPersonalizationGate />
      <Hero />
      <SponsoredSpecialists />
      <Top50InYourCity />
      <Categories />
      <NewSpecialists />
    </div>
  );
}
