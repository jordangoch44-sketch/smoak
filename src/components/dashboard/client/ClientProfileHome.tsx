"use client";

import type { ReactNode } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  ChartIcon,
  ChevronRightIcon,
  DumbbellIcon,
  HeartIcon,
  LocationMarkIcon,
  LogOutIcon,
  MessageBubbleIcon,
  PencilIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { CLIENT_SESSION_FORMAT_OPTIONS } from "@/constants/client-profile-options";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import type { ClientProfileEditorFocus } from "./ClientProfileEditModal";
import { ClientWeekOverview } from "./workouts/ClientWeekOverview";

interface ClientProfileHomeProps {
  userId: string;
  displayName: string;
  avatarUrl: string;
  initials: string;
  postalCode: string;
  city: string;
  goals: string[];
  specialties: string[];
  sessionFormat: string;
  unreadCount: number;
  savedCount: number;
  notices?: ReactNode;
  onEditProfile: (focus?: ClientProfileEditorFocus | null) => void;
  onOpenMessages: () => void;
  onOpenSaved: () => void;
  onSignOut: () => void;
}

function sessionFormatLabel(value: string): string {
  const match = CLIENT_SESSION_FORMAT_OPTIONS.find((option) => option.value === value);
  return match?.value ? match.label : "";
}

function cadence(workoutDays: number, cardioDays: number): string {
  const workouts = `${workoutDays} workout${workoutDays === 1 ? "" : "s"}/week`;
  if (cardioDays <= 0) return workouts;
  return `${workouts} · ${cardioDays} cardio ${cardioDays === 1 ? "day" : "days"}`;
}

export function ClientProfileHome({
  userId,
  displayName,
  avatarUrl,
  initials,
  postalCode,
  city,
  goals,
  specialties,
  sessionFormat,
  unreadCount,
  savedCount,
  notices,
  onEditProfile,
  onOpenMessages,
  onOpenSaved,
  onSignOut,
}: ClientProfileHomeProps) {
  const { log } = useClientWorkouts(userId);
  const style = specialties[0]?.trim() ?? "";
  const format = sessionFormatLabel(sessionFormat);
  const place = postalCode.trim() || city.trim();
  const frequency = `${log.goalDaysPerWeek}× per week`;
  const goalLine = cadence(log.goalDaysPerWeek, log.cardioGoalDaysPerWeek);
  const name = displayName.trim();

  return (
    <div className="client-profile-home">
      <header className="client-profile-home__hero">
        <FastActivateButton
          className="client-profile-home__avatar"
          aria-label={avatarUrl ? `${name || "Profile"}. Edit photo` : "Add a profile photo"}
          onActivate={() => onEditProfile("photo")}
        >
          <span className="client-profile-home__avatar-face">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- auth avatar URLs
              <img src={avatarUrl} alt="" />
            ) : (
              <span aria-hidden>{initials}</span>
            )}
          </span>
          {avatarUrl ? null : (
            <span className="client-profile-home__avatar-plus" aria-hidden>
              <PlusIcon className="h-3 w-3" />
            </span>
          )}
        </FastActivateButton>

        <div className="client-profile-home__identity">
          <div className="client-profile-home__name-row">
            {name ? (
              <h1 className="client-profile-home__name">{name}</h1>
            ) : (
              <FastActivateButton
                className="client-profile-home__name-add"
                onActivate={() => onEditProfile("basic")}
              >
                <PlusIcon className="h-4 w-4" />
                Add your name
              </FastActivateButton>
            )}
            <FastActivateButton
              className="client-profile-home__edit"
              onActivate={() => onEditProfile(null)}
            >
              <PencilIcon className="h-3.5 w-3.5" />
              Edit Profile
            </FastActivateButton>
          </div>
          <div className="client-profile-home__chips">
            <ProfileChip
              label={style}
              emptyLabel="Add training style"
              addLabel="Style"
              icon={<DumbbellIcon className="h-3.5 w-3.5" />}
              onAdd={() => onEditProfile("specialties")}
            />
            <ProfileChip
              label={format}
              emptyLabel="Add format"
              addLabel="Format"
              icon={<ChartIcon className="h-3.5 w-3.5" />}
              onAdd={() => onEditProfile("format")}
            />
            <ProfileChip
              label={place}
              emptyLabel="Add location"
              addLabel="Location"
              icon={<LocationMarkIcon className="h-3.5 w-3.5" />}
              onAdd={() => onEditProfile("location")}
            />
          </div>
        </div>
      </header>

      {notices}

      <ClientWeekOverview userId={userId} />

      <section className="client-profile-home__card" aria-labelledby="client-profile-goals">
        <div className="client-profile-home__card-top">
          <h2 id="client-profile-goals" className="client-profile-home__eyebrow">
            My goals
          </h2>
          <FastActivateButton className="client-profile-home__card-edit" onActivate={() => onEditProfile("goals")}>
            Edit
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </FastActivateButton>
        </div>
        <div className="client-profile-home__goal">
          <span className="client-profile-home__goal-mark" aria-hidden>
            <TargetMark />
          </span>
          <div className="client-profile-home__goal-copy">
            {goals.length > 0 ? (
              <p className="client-profile-home__goal-title">{goals[0]}</p>
            ) : (
              <FastActivateButton
                className="client-profile-home__add"
                onActivate={() => onEditProfile("goals")}
              >
                <PlusIcon className="h-4 w-4" />
                Add a goal
              </FastActivateButton>
            )}
            {goals.length > 1 ? (
              <p className="client-profile-home__goal-more">{goals.slice(1).join(" · ")}</p>
            ) : null}
            <p className="client-profile-home__goal-meta">{goalLine}</p>
          </div>
        </div>
      </section>

      <section className="client-profile-home__card" aria-labelledby="client-profile-about">
        <div className="client-profile-home__card-top">
          <h2 id="client-profile-about" className="client-profile-home__eyebrow">
            About me
          </h2>
          <FastActivateButton className="client-profile-home__card-edit" onActivate={() => onEditProfile(null)}>
            Edit
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </FastActivateButton>
        </div>
        <div className="client-profile-home__facts">
          <Fact label="Training" value={style} onOpen={() => onEditProfile("specialties")} />
          <Fact label="Format" value={format} onOpen={() => onEditProfile("format")} />
          <Fact label="Frequency" value={frequency} onOpen={() => onEditProfile("frequency")} />
          <Fact label="Location" value={place} onOpen={() => onEditProfile("location")} />
        </div>
      </section>

      <section className="client-profile-home__card client-profile-home__card--account" aria-labelledby="client-profile-account">
        <h2 id="client-profile-account" className="client-profile-home__eyebrow">
          Account
        </h2>
        <div className="client-profile-home__rows">
          <AccountRow
            icon={<MessageBubbleIcon className="h-5 w-5" />}
            title="Messages"
            count={unreadCount}
            onActivate={onOpenMessages}
          />
          <AccountRow
            icon={<HeartIcon className="h-5 w-5" filled={savedCount > 0} />}
            title="Saved Specialists"
            count={savedCount}
            onActivate={onOpenSaved}
          />
          <AccountRow
            icon={<GearMark />}
            title="Preferences"
            onActivate={() => onEditProfile("preferences")}
          />
        </div>
      </section>

      <FastActivateButton className="client-profile-home__signout" onActivate={onSignOut}>
        <LogOutIcon className="h-4 w-4" />
        Sign out
      </FastActivateButton>
    </div>
  );
}

function ProfileChip({
  label,
  emptyLabel,
  addLabel,
  icon,
  onAdd,
}: {
  label: string;
  emptyLabel: string;
  addLabel: string;
  icon: ReactNode;
  onAdd: () => void;
}) {
  if (!label) {
    return (
      <FastActivateButton
        className="client-profile-home__chip client-profile-home__chip--add"
        aria-label={emptyLabel}
        onActivate={onAdd}
      >
        <PlusIcon className="h-3.5 w-3.5" />
        <span>{addLabel}</span>
      </FastActivateButton>
    );
  }
  return (
    <FastActivateButton
      className="client-profile-home__chip"
      aria-label={`Edit ${label}`}
      onActivate={onAdd}
    >
      <span className="client-profile-home__chip-icon" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </FastActivateButton>
  );
}

function Fact({
  label,
  value,
  onOpen,
}: {
  label: string;
  value: string;
  onOpen: () => void;
}) {
  if (!value) {
    return (
      <FastActivateButton
        className="client-profile-home__fact client-profile-home__fact--add"
        aria-label={`Add ${label}`}
        onActivate={onOpen}
      >
        <PlusIcon className="h-4 w-4" />
        <span>{label}</span>
      </FastActivateButton>
    );
  }
  return (
    <FastActivateButton
      className="client-profile-home__fact"
      aria-label={`Edit ${label}`}
      onActivate={onOpen}
    >
      <span className="client-profile-home__fact-label">{label}</span>
      <span className="client-profile-home__fact-value">{value}</span>
    </FastActivateButton>
  );
}

function AccountRow({
  icon,
  title,
  count = 0,
  onActivate,
}: {
  icon: ReactNode;
  title: string;
  count?: number;
  onActivate: () => void;
}) {
  return (
    <FastActivateButton className="client-profile-home__row" onActivate={onActivate}>
      <span className="client-profile-home__row-icon" aria-hidden>
        {icon}
      </span>
      <span className="client-profile-home__row-title">{title}</span>
      {count > 0 ? (
        <span className="client-profile-home__badge">{count > 9 ? "9+" : count}</span>
      ) : null}
      <ChevronRightIcon className="client-profile-home__row-chevron h-4 w-4" />
    </FastActivateButton>
  );
}

function TargetMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}

function GearMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M18 6l-1.6 1.6M7.6 16.4L6 18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
