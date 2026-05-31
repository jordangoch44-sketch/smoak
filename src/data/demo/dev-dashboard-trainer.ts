import { getTrainerById } from "@/data/trainers";
import {
  DEMO_SPECIALIST_ID,
  DEV_SPECIALIST_DASHBOARD_ID,
} from "@/constants/specialist-dashboard-mock";
import type { Trainer } from "@/types/trainer";

/** Dev-login dashboard seed — cloned from demo analytics trainer, isolated id for overrides. */
export function getDevDashboardTrainerSeed(): Trainer | undefined {
  const seed = getTrainerById(DEMO_SPECIALIST_ID);
  if (!seed) return undefined;
  return { ...seed, id: DEV_SPECIALIST_DASHBOARD_ID };
}
