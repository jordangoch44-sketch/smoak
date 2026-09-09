/** Storage object prefix for `/api/media/specialist-application` SAFE_PATH. */
export function specialistMediaPathId(specialistId: string): string {
  return (
    specialistId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 128) || "specialist"
  );
}
