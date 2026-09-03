import type { Trainer } from "@/types/trainer";
import { trainingOptionsFromTrainer } from "@/lib/specialist-service-area";

export type ProfileSpecialtyIconId =
  | "flame"
  | "dumbbell"
  | "bolt"
  | "run"
  | "hex"
  | "apple"
  | "yoga"
  | "glove"
  | "medical"
  | "trophy";

export type TrainingOptionKind =
  | "home"
  | "gym"
  | "online"
  | "hybrid"
  | "in-person"
  | "outdoor"
  | "other";

export interface TrainingOptionCard {
  id: string;
  kind: TrainingOptionKind;
  title: string;
  description: string;
}

export function specialtyIconId(label: string): ProfileSpecialtyIconId {
  const value = label.trim().toLowerCase();
  if (/fat|weight loss|cut/.test(value)) return "flame";
  if (/muscle|hypertrophy|gain/.test(value)) return "dumbbell";
  if (/strength|powerlift|force/.test(value)) return "bolt";
  if (/hyrox/.test(value)) return "trophy";
  if (/athletic|sport|performance|run/.test(value)) return "run";
  if (/functional|mobility/.test(value)) return "hex";
  if (/nutrition|diet|meal/.test(value)) return "apple";
  if (/yoga|pilates|mind/.test(value)) return "yoga";
  if (/box|fight|mma|kick/.test(value)) return "glove";
  if (/recover|corrective|physio|rehab/.test(value)) return "medical";
  if (/senior|women|health/.test(value)) return "trophy";
  return "dumbbell";
}

function classifyTrainingOption(label: string): TrainingOptionKind {
  const value = label.trim().toLowerCase();
  if (/at home|in-home|in home/.test(value)) return "home";
  if (/online|virtual/.test(value)) return "online";
  if (/hybrid/.test(value)) return "hybrid";
  if (/outdoor|park|beach/.test(value)) return "outdoor";
  if (/^at |gym|studio|facility/.test(value)) return "gym";
  if (/in person|in-person/.test(value)) return "in-person";
  return "other";
}

function trainingCopy(
  kind: TrainingOptionKind,
  title: string
): { title: string; description: string } {
  switch (kind) {
    case "home":
      return {
        title: "In-home training",
        description: "They come to you with what you need for a focused session.",
      };
    case "gym":
      return {
        title: title.replace(/^At\s+/i, "") || "Private gym",
        description: "Train in a private facility with one-on-one attention.",
      };
    case "online":
      return {
        title: "Online coaching",
        description: "Custom programs, check-ins, and support from anywhere.",
      };
    case "hybrid":
      return {
        title: "Hybrid approach",
        description: "A blend of in-person sessions and online coaching.",
      };
    case "in-person":
      return {
        title: "In person",
        description: "Face-to-face sessions at a gym, studio, or agreed location.",
      };
    case "outdoor":
      return {
        title: title,
        description: "Train outside — parks, trails, or open space.",
      };
    default:
      return {
        title,
        description: "Available as part of their training offering.",
      };
  }
}

export function trainingOptionCardsFromTrainer(
  trainer: Trainer
): TrainingOptionCard[] {
  const labels = trainingOptionsFromTrainer(trainer);
  const cards: TrainingOptionCard[] = labels.map((label) => {
    const kind = classifyTrainingOption(label);
    const copy = trainingCopy(kind, label);
    return {
      id: label,
      kind,
      title: copy.title,
      description: copy.description,
    };
  });

  const kinds = new Set(cards.map((card) => card.kind));
  const hasInPerson = ["home", "gym", "in-person", "outdoor"].some((kind) =>
    kinds.has(kind as TrainingOptionKind)
  );
  if (hasInPerson && kinds.has("online") && !kinds.has("hybrid")) {
    const hybrid = trainingCopy("hybrid", "Hybrid");
    cards.push({
      id: "hybrid",
      kind: "hybrid",
      title: hybrid.title,
      description: hybrid.description,
    });
  }

  return cards;
}

export function credentialInitials(name: string, issuer: string): string {
  const source = issuer.trim() || name.trim();
  if (source.length > 0 && source.length <= 4) return source.toUpperCase();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 3).toUpperCase() || "C";
}

export function trainerTextureUrls(trainer: Trainer): string[] {
  const urls = [trainer.heroImage, ...(trainer.galleryImages ?? [])]
    .map((url) => (typeof url === "string" ? url.trim() : ""))
    .filter(Boolean);
  return [...new Set(urls)];
}
