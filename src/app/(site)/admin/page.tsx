import { redirect } from "next/navigation";
import { INTERNAL_DASHBOARD_PATH } from "@/lib/internal-routes";

/** Legacy URL — company portal moved off public routes */
export default function AdminLegacyRedirectPage() {
  redirect(INTERNAL_DASHBOARD_PATH);
}
