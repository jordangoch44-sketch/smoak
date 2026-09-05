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
}

export function SpecialistTrainingOptionsFields({
  value,
  onChange,
  required = true,
}: SpecialistTrainingOptionsFieldsProps) {
  return (
    <fieldset className="login-field">
      <legend className="login-field__label">
        Training options
        {required ? (
          <span className="login-field__label-required" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      <p className="wizard-field-hint">
        Select every format you offer. One-on-one is selected to start.
      </p>
      <div
        className="wizard-pill-grid wizard-pill-grid--wide"
        role="group"
        aria-label="Training options"
        aria-required={required}
      >
        {SPECIALIST_TRAINING_OPTIONS.map((option) => {
          const active = value.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(toggleTrainingOption(value, option.id))}
              className={cn(
                "wizard-pill wizard-pill--touch",
                active && "wizard-pill--active"
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
