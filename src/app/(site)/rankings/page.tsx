import { RankingsPageClient } from "@/components/rankings";

export const metadata = {
  title: "City Rankings",
  description:
    "The highest-rated health and wellness specialists near you — ranked by SMOAC.",
};

export default function RankingsPage() {
  return <RankingsPageClient />;
}
