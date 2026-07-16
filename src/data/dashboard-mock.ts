import { getTrainerById } from "@/data/trainers";
import { getTrainerCityRanking } from "@/data/city-rankings";
import {
  DEMO_SPECIALIST_ID,
  DEMO_SPECIALIST_LEADS,
} from "@/constants/specialist-dashboard-mock";
import { getSpecialistSubscriptionForSession } from "@/lib/specialist-dashboard-subscription";
import type { AuthSession } from "@/types/auth";
import type { SpecialistDashboardData } from "@/types/specialist-dashboard";

export { DEMO_SPECIALIST_ID } from "@/constants/specialist-dashboard-mock";

export function getDemoSpecialistDashboardData(
  session?: AuthSession | null
): SpecialistDashboardData {
  const trainer = getTrainerById(DEMO_SPECIALIST_ID);
  const ranking = getTrainerCityRanking(DEMO_SPECIALIST_ID);

  return {
    trainer,
    ranking: ranking
      ? { rank: ranking.rank, listingTitle: ranking.listingTitle }
      : null,
    newLeads: DEMO_SPECIALIST_LEADS.slice(),
    subscription: getSpecialistSubscriptionForSession(session),
  };
}

export const CLIENT_COMPARE_PLACEHOLDER = {
  count: 2,
  label: "Compare up to 3 specialists side by side",
};

export const CLIENT_MESSAGES_PLACEHOLDER = [
  {
    id: "msg-1",
    specialist: "Dr. Elena Ramirez",
    preview: "Thanks for reaching out — I have openings Thursday…",
    time: "1h ago",
    unread: true,
  },
  {
    id: "msg-2",
    specialist: "Anthony Brooks",
    preview: "Happy to walk through your athletic goals on a quick call.",
    time: "Yesterday",
    unread: false,
  },
];
