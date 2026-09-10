"use client";

import {
  SPECIALIST_TRAINING_OPTIONS,
  toggleTrainingOption,
  type SpecialistTrainingOptionId,
} from "@/types/specialist-training-options";
import { cn } from "@/lib/utils";

interface SpecialistTrainingOptionsFieldsProps {
  value: readonly SpecialistTrainingOptionId[];
  onChange: (next: SpecialistTrainingOptionId[]) => void;
  required?: boolean;
  hideLabel?: boolean;
}

export function SpecialistTrainingOptionsFields({
  value,
  onChange,
  required = true,
  hideLabel = false,
}: SpecialistTrainingOptionsFieldsProps) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <fieldset className="login-field">
      {hideLabel ? (
        <legend className="sr-only">Training options</legend>
      ) : (
        <legend className="login-field__label">
          Training options
          {required ? (
            <span className="login-field__label-required" aria-hidden="true">
              *
            </span>
          ) : null}
        </legend>
      )}
      <div
        className="wizard-pill-grid wizard-pill-grid--wide dashboard-edit-chip-grid"
        role="group"
        aria-label="Training options"
        aria-required={required}
      >
        {SPECIALIST_TRAINING_OPTIONS.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(toggleTrainingOption(selected, option.id))}
              className={cn(
                "smoac-control wizard-pill wizard-pill--touch dashboard-edit-chip",
                active && "wizard-pill--active dashboard-edit-chip--active"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
