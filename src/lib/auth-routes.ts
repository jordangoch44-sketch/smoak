import type { PublicAuthRole } from "@/types/auth-roles";
import { isInternalPath } from "@/lib/internal-routes";

export const CLIENT_DASHBOARD_PATH = "/client-dashboard";
export const WORKOUTS_PATH = "/workouts";
export const SPECIALIST_DASHBOARD_PATH = "/specialist-dashboard";
export const SPECIALIST_DASHBOARD_OVERVIEW_HREF = `${SPECIALIST_DASHBOARD_PATH}?tab=overview`;
export const SPECIALIST_DASHBOARD_PROFILE_TAB_HREF = `${SPECIALIST_DASHBOARD_PATH}?tab=profile`;
export const SPECIALIST_DASHBOARD_WELCOME_HREF = `${SPECIALIST_DASHBOARD_PROFILE_TAB_HREF}&welcome=1`;
export const SPECIALIST_DASHBOARD_EDIT_HREF = `${SPECIALIST_DASHBOARD_PATH}?tab=profile&view=edit`;
export const SPECIALIST_DASHBOARD_INQUIRIES_HREF = `${SPECIALIST_DASHBOARD_PATH}?tab=profile&view=inquiries`;
/** Old roster URL. The dashboard sends this to Inquiries. */
export const SPECIALIST_DASHBOARD_CLIENTS_HREF = `${SPECIALIST_DASHBOARD_PATH}?tab=clients`;
/** Kept so older finished-workout links still parse. They open Inquiries. */
export const SPECIALIST_FINISHED_WORKOUT_PARAM = "finishedWorkout";

export function specialistFinishedWorkoutHref(_workoutId: string): string {
  return SPECIALIST_DASHBOARD_INQUIRIES_HREF;
}
export const LOGIN_PATH = "/login";

export function getDashboardPathForRole(role: PublicAuthRole): string {
  return role === "client"
    ? CLIENT_DASHBOARD_PATH
    : SPECIALIST_DASHBOARD_PROFILE_TAB_HREF;
}

/** Marketplace account dashboards only — not company portal */
export function isDashboardPath(pathname: string): boolean {
  if (isInternalPath(pathname)) return false;
  return (
    pathname === CLIENT_DASHBOARD_PATH ||
    pathname === SPECIALIST_DASHBOARD_PATH ||
    pathname.startsWith(`${CLIENT_DASHBOARD_PATH}/`) ||
    pathname.startsWith(`${SPECIALIST_DASHBOARD_PATH}/`)
  );
}
