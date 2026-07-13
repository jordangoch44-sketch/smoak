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
      <LocationPersonalizationGate />
      <Hero />
      <SponsoredSpecialists />
      <Top50InYourCity />
      <Categories />
      <NewSpecialists />
    </div>
  );
}
