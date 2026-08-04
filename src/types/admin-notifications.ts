import type { AdminSectionId } from "@/lib/admin-sections";

/** Sections that support attention badges on the admin nav */
export type AdminNotifiableSectionId = Extract<
  AdminSectionId,
  "applications" | "specialists" | "clients" | "revenue"
>;

export type AdminSectionBadgeCounts = Record<AdminNotifiableSectionId, number>;
