import { Hero } from "@/components/home/Hero";
import { FeaturedTrainers } from "@/components/home/FeaturedTrainers";
import { Categories } from "@/components/home/Categories";
import { Testimonials } from "@/components/home/Testimonials";
import { HowItWorks } from "@/components/home/HowItWorks";
import { CTA } from "@/components/home/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedTrainers />
      <Categories />
      <HowItWorks />
      <Testimonials />
      <CTA />
    </>
  );
}
