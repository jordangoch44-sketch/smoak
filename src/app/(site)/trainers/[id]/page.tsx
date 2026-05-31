import { notFound } from "next/navigation";
import { getTrainerById, trainers } from "@/data/trainers";
import { TrainerProfilePageClient } from "@/components/profile/TrainerProfilePageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return trainers.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const trainer = getTrainerById(id);
  if (!trainer) return { title: "Specialist Not Found" };
  return {
    title: trainer.name,
    description: trainer.bio,
  };
}

export default async function TrainerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const trainer = getTrainerById(id);

  return (
    <TrainerProfilePageClient
      trainerId={id}
      initialTrainer={trainer ?? null}
    />
  );
}
