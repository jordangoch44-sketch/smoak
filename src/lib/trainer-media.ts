import type { ClientTransformationPhoto, TrainerMediaItem } from "@/types";

/** Demo gallery — replace with real coach photos & reels */
const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

const TRAINERS_WITH_TRANSFORMATIONS = new Set([
  "marcus-chen",
  "elena-vasquez",
  "david-okonkwo",
]);

/** Client before/after photos — empty array shows smoked-glass placeholder */
export function getTrainerTransformations(
  trainerId: string
): ClientTransformationPhoto[] {
  if (!TRAINERS_WITH_TRANSFORMATIONS.has(trainerId)) {
    return [];
  }

  return [1, 2, 3].map((n) => ({
    id: `${trainerId}-transform-${n}`,
    src: `https://picsum.photos/seed/smoac-transform-${n}-${trainerId}/960/720`,
    alt: `Client transformation ${n}`,
  }));
}

export function getTrainerGallery(trainerId: string): TrainerMediaItem[] {
  return [
    {
      id: `${trainerId}-g1`,
      type: "image",
      src: `https://picsum.photos/seed/smoac-gallery-1-${trainerId}/960/600`,
      alt: "Coaching session",
    },
    {
      id: `${trainerId}-g2`,
      type: "image",
      src: `https://picsum.photos/seed/smoac-gallery-2-${trainerId}/960/600`,
      alt: "Training environment",
    },
    {
      id: `${trainerId}-gv`,
      type: "video",
      src: SAMPLE_VIDEO,
      poster: `https://picsum.photos/seed/smoac-gallery-v-${trainerId}/960/600`,
      alt: "Session highlight reel",
    },
    {
      id: `${trainerId}-g3`,
      type: "image",
      src: `https://picsum.photos/seed/smoac-gallery-3-${trainerId}/960/600`,
      alt: "Client progress",
    },
    {
      id: `${trainerId}-g4`,
      type: "image",
      src: `https://picsum.photos/seed/smoac-gallery-4-${trainerId}/960/600`,
      alt: "Studio detail",
    },
    {
      id: `${trainerId}-g5`,
      type: "image",
      src: `https://picsum.photos/seed/smoac-gallery-5-${trainerId}/960/600`,
      alt: "Movement session",
    },
    {
      id: `${trainerId}-g6`,
      type: "image",
      src: `https://picsum.photos/seed/smoac-gallery-6-${trainerId}/960/600`,
      alt: "Recovery work",
    },
    {
      id: `${trainerId}-g7`,
      type: "image",
      src: `https://picsum.photos/seed/smoac-gallery-7-${trainerId}/960/600`,
      alt: "Outdoor training",
    },
  ];
}
