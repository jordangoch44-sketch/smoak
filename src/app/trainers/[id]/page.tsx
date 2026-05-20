import { notFound } from "next/navigation";
import Link from "next/link";
import { getTrainerById, trainers } from "@/data/trainers";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { Bio } from "@/components/profile/Bio";
import { Certifications } from "@/components/profile/Certifications";
import { Reviews } from "@/components/profile/Reviews";
import { SocialLinks } from "@/components/profile/SocialLinks";
import { BookConsultation } from "@/components/profile/BookConsultation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return trainers.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const trainer = getTrainerById(id);
  if (!trainer) return { title: "Trainer Not Found" };
  return {
    title: trainer.name,
    description: trainer.bio,
  };
}

export default async function TrainerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const trainer = getTrainerById(id);

  if (!trainer) {
    notFound();
  }

  return (
    <>
      <ProfileHero trainer={trainer} />

      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-silver-400 transition-colors hover:text-white"
        >
          ← Back to Explore
        </Link>

        <div className="mt-10 grid gap-12 lg:grid-cols-3 lg:gap-16">
          <div className="space-y-12 lg:col-span-2">
            <Bio trainer={trainer} />
            <Certifications certifications={trainer.certifications} />
            <Reviews
              reviews={trainer.reviews}
              rating={trainer.rating}
              reviewCount={trainer.reviewCount}
            />
            <SocialLinks social={trainer.social} />
          </div>

          <div className="lg:col-span-1">
            <BookConsultation trainerName={trainer.name} />
          </div>
        </div>
      </div>
    </>
  );
}
