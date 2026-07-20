import {
  Hero,
  LocationPersonalizationGate,
  SponsoredSpecialists,
  Top50InYourCity,
  Categories,
  NewSpecialists,
} from "@/components/home";

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
