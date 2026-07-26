/** Admin dashboard section registry — shared by nav + permissions */
export const ADMIN_SECTIONS = [
  { id: "overview", label: "Snapshot" },
  { id: "applications", label: "Applications" },
  { id: "specialists", label: "Specialists" },
  { id: "clients", label: "Clients" },
  { id: "revenue", label: "Revenue" },
  { id: "team", label: "Admin users" },
  { id: "settings", label: "Settings" },
] as const;

export type AdminSectionId = (typeof ADMIN_SECTIONS)[number]["id"];
