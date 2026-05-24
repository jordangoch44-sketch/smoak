export function getTrainerProfileUrl(trainerId: string): string {
  if (typeof window === "undefined") {
    return `/trainers/${trainerId}`;
  }
  return `${window.location.origin}/trainers/${trainerId}`;
}

export async function shareTrainerProfile(options: {
  trainerId: string;
  trainerName: string;
  title?: string;
}): Promise<"shared" | "copied"> {
  const url = getTrainerProfileUrl(options.trainerId);
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
  trainerId: string
): Promise<void> {
  const url = getTrainerProfileUrl(trainerId);
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
