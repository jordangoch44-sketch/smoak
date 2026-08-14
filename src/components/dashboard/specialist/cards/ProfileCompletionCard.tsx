"use client";

import {
  DashboardButton,
  DashboardCollapsibleSection,
  DashboardMetricCard,
  DashboardSectionIcon,
} from "@/components/dashboard/shared";
import { formatProviderLocation } from "@/lib/provider-location";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import type { ProfileCompletionChecklistItem } from "@/types/specialist-dashboard";
import type { Trainer } from "@/types";
import { cn } from "@/lib/utils";

interface ProfileCompletionCardProps {
  profileCompletion: number;
  trainer: Trainer | undefined;
  checklist: ProfileCompletionChecklistItem[];
  defaultOpen?: boolean;
}

export function ProfileCompletionCard({
  profileCompletion,
  trainer,
  checklist,
  defaultOpen = false,
}: ProfileCompletionCardProps) {
  const profession = trainer
    ? resolveTrainerProfessionCategory(trainer)
    : "";
  const remaining = checklist.filter((item) => !item.done).length;

  return (
    <DashboardCollapsibleSection
      title="Profile completion"
      icon={<DashboardSectionIcon id="completion" />}
      description="Finish your in-depth profile to improve discovery — pricing, availability, media, and more."
      summary={
        remaining > 0
          ? `${profileCompletion}% · ${remaining} left`
          : `${profileCompletion}% complete`
      }
      defaultOpen={defaultOpen}
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
    </DashboardCollapsibleSection>
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
