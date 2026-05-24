/** Temporary portrait placeholders — swap for real trainer photos later */

export function getTrainerCardPlaceholder(trainerId: string): string {
  return `https://picsum.photos/seed/smoac-card-${trainerId}/400/500`;
}

export function getTrainerHeroPlaceholder(trainerId: string): string {
  return `https://picsum.photos/seed/smoac-hero-${trainerId}/1200/600`;
}
