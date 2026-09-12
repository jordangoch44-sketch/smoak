"use client";

import {
  DashboardButton,
  DashboardCollapsibleSection,
  DashboardMetricCard,
  DashboardSectionIcon,
} from "@/components/dashboard/shared";
import { formatProviderLocation } from "@/lib/provider-location";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { SPECIALIST_DASHBOARD_EDIT_HREF } from "@/lib/auth-routes";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { AlertTriangleIcon, CheckIcon } from "@/components/ui/icons";
import type { ProfileCompletionChecklistItem } from "@/types/specialist-dashboard";
import type { Trainer } from "@/types";
import { cn } from "@/lib/utils";

interface ProfileCompletionCardProps {
  profileCompletion: number;
  trainer: Trainer | undefined;
  checklist: ProfileCompletionChecklistItem[];
  defaultOpen?: boolean;
  onEditProfile?: (sectionId?: string) => void;
}

export function ProfileCompletionCard({
  profileCompletion,
  trainer,
  checklist,
  defaultOpen = false,
  onEditProfile,
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
          <ProfileChecklist
            items={checklist}
            onSelectItem={onEditProfile}
          />
          {onEditProfile ? (
            <DashboardButton
              inline
              onClick={() => onEditProfile()}
            >
              Edit Profile
            </DashboardButton>
          ) : (
            <DashboardButton
              inline
              href={SPECIALIST_DASHBOARD_EDIT_HREF}
            >
              Edit Profile
            </DashboardButton>
          )}
        </aside>
      </div>
    </DashboardCollapsibleSection>
  );
}

function ProfileChecklist({
  items,
  onSelectItem,
}: {
  items: ProfileCompletionChecklistItem[];
  onSelectItem?: (sectionId?: string) => void;
}) {
  return (
    <ul className="dashboard-checklist">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            "dashboard-checklist__item",
            item.done && "dashboard-checklist__item--done",
            !item.done && onSelectItem && "dashboard-checklist__item--actionable"
          )}
        >
          {!item.done && onSelectItem ? (
            <FastActivateButton
              className="dashboard-checklist__btn"
              onActivate={() => onSelectItem(item.id)}
              title={`Jump to ${item.label}`}
            >
              <span className="dashboard-checklist__btn-left">
                <AlertTriangleIcon className="dashboard-checklist__warning-icon" />
                <span className="dashboard-checklist__label">{item.label}</span>
              </span>
              <span className="dashboard-checklist__arrow" aria-hidden>
                →
              </span>
            </FastActivateButton>
          ) : item.done ? (
            <span className="dashboard-checklist__done-row">
              <CheckIcon className="dashboard-checklist__check-icon" />
              <span className="dashboard-checklist__label">{item.label}</span>
            </span>
          ) : (
            <span className="dashboard-checklist__label">{item.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
