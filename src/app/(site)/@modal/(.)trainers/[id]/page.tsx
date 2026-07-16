import { getTrainerById } from "@/data/trainers";
import { TrainerProfilePageClient } from "@/components/profile/TrainerProfilePageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Soft navigation from Explore / Home / Saved, etc. keeps the previous page
 * mounted in `children` while this slot renders the profile sheet on top.
 */
export default async function InterceptedTrainerProfilePage({
  params,
}: PageProps) {
  const { id } = await params;
  const trainer = getTrainerById(id);

  return (
    <TrainerProfilePageClient
      trainerId={id}
      initialTrainer={trainer ?? null}
    />
  );
}
