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

  await copyTextToClipboard(url);
  return "copied";
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof document === "undefined") {
    throw new Error("Clipboard is unavailable on this device.");
  }

  const secureClipboard =
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function";

  if (secureClipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* iOS / permission failures fall through to execCommand. */
    }
  }

  copyTextWithExecCommand(text);
}

function copyTextWithExecCommand(text: string): void {
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.setAttribute("aria-hidden", "true");
  input.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;outline:none;box-shadow:none;background:transparent;opacity:0.01;font-size:16px;";
  document.body.appendChild(input);
  input.focus();
  input.select();
  input.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    input.remove();
  }

  if (!copied) {
    throw new Error("Clipboard is unavailable on this device.");
  }
}

export async function copyTrainerProfileLink(
  trainer: string | TrainerPublicIdentity
): Promise<void> {
  await copyTextToClipboard(getTrainerProfileUrl(trainer));
}

export function scrollToProfileConsultation(): void {
  const target = document.getElementById("profile-consultation");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export { publicTrainerSlug, trainerProfilePath };
