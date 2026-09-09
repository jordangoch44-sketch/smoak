import {
  publicTrainerSlug,
  trainerProfilePath,
  type TrainerPublicIdentity,
} from "@/lib/trainer-profile-path";

export function getTrainerProfileUrl(
  trainer: string | TrainerPublicIdentity
): string {
  const path =
    typeof trainer === "string"
      ? `/trainers/${encodeURIComponent(trainer)}`
      : trainerProfilePath(trainer);
  if (typeof window === "undefined") {
    return path;
  }
  return `${window.location.origin}${path}`;
}

export async function shareTrainerProfile(options: {
  trainerId: string;
  trainerName: string;
  title?: string;
  slug?: string | null;
}): Promise<"shared" | "copied"> {
  const url = getTrainerProfileUrl({
    id: options.trainerId,
    slug: options.slug,
  });
  const title = options.title ?? `${options.trainerName} on SMOAC`;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title,
        text: `Check out ${options.trainerName} on SMOAC`,
        url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return "copied";
  }

  throw new Error("Share is unavailable on this device.");
}

export async function copyTrainerProfileLink(
  trainer: string | TrainerPublicIdentity
): Promise<void> {
  const url = getTrainerProfileUrl(trainer);
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }
  throw new Error("Clipboard is unavailable on this device.");
}

export function scrollToProfileConsultation(): void {
  const target = document.getElementById("profile-consultation");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export { publicTrainerSlug, trainerProfilePath };
