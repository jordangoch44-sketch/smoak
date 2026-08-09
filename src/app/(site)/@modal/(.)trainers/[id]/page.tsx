import { TrainerProfileInterceptClient } from "@/components/profile/TrainerProfileInterceptClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Soft navigation from Explore / Home / Saved keeps the previous page
 * mounted in `children` while this slot renders the profile sheet on top.
 *
 * Opens from the client catalog immediately — no server Supabase wait on tap.
 */
export default async function InterceptedTrainerProfilePage({
  params,
}: PageProps) {
  const { id } = await params;
  return <TrainerProfileInterceptClient trainerId={id} />;
}
