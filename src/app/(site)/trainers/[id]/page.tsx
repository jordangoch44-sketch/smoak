import { notFound } from "next/navigation";
import { TrainerProfilePageClient } from "@/components/profile/TrainerProfilePageClient";
import {
  loadPublicCatalogForServer,
  loadPublicTrainerByIdForServer,
} from "@/lib/profiles/fetch-approved-catalog-server";
import { trainers } from "@/data/trainers";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** New approvals must resolve without a rebuild. */
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateStaticParams() {
  const { trainers: catalog, mode } = await loadPublicCatalogForServer();
  if (mode === "live") {
    return catalog.map((t) => ({ id: t.id }));
  }
  return trainers.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const trainer = await loadPublicTrainerByIdForServer(id);
  if (!trainer) return { title: "Specialist Not Found" };
  return {
    title: trainer.name,
    description: trainer.bio,
  };
}

export default async function TrainerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const trainer = await loadPublicTrainerByIdForServer(id);
  if (!trainer) notFound();

  return (
    <TrainerProfilePageClient
      trainerId={id}
      initialTrainer={trainer}
    />
  );
}
