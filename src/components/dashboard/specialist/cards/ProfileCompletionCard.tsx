import type { Trainer } from "@/types";
import type { ProfileCompletionChecklistItem } from "@/types/specialist-dashboard";
import { formatProviderLocation } from "@/lib/provider-location";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import {
  DashboardButton,
  DashboardMetricCard,
  DashboardSection,
} from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

interface ProfileCompletionCardProps {
  profileCompletion: number;
  trainer: Trainer | undefined;
  checklist: ProfileCompletionChecklistItem[];
}

export function ProfileCompletionCard({
  profileCompletion,
  trainer,
  checklist,
}: ProfileCompletionCardProps) {
  const profession = trainer
    ? resolveTrainerProfessionCategory(trainer)
    : "";
  return (
    <DashboardSection
      title="Profile completion"
      description="Finish your in-depth profile to improve discovery — pricing, availability, media, and more."
      span="full"
    >
      <div className="dashboard-profile-completion">
        <DashboardMetricCard
          label="Profile strength"
          value={`${profileCompletion}%`}
          detail={
            trainer
              ? `${profession || "Category needed"} · ${formatProviderLocation(trainer)}`
              : undefined
          }
          progress={profileCompletion}
        />
        <aside className="dashboard-profile-completion__aside">
          <ProfileChecklist items={checklist} />
          <DashboardButton inline href="/specialist-dashboard/edit-profile">
            Edit Profile
          </DashboardButton>
        </aside>
      </div>
    </DashboardSection>
  );
}

function ProfileChecklist({ items }: { items: ProfileCompletionChecklistItem[] }) {
  return (
    <ul className="dashboard-checklist">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            "dashboard-checklist__item",
            item.done && "dashboard-checklist__item--done"
          )}
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
}
