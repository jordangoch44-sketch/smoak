/** Temporary portrait placeholders — vertical face crops (not landscape). */

export function getTrainerCardPlaceholder(trainerId: string): string {
  return `https://picsum.photos/seed/smoac-portrait-${trainerId}/480/600`;
}

export function getTrainerHeroPlaceholder(trainerId: string): string {
  return `https://picsum.photos/seed/smoac-cover-${trainerId}/1200/600`;
}
