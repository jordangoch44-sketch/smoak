"use client";

import { useRef } from "react";
import {
  applyRightFitStarter,
  matchRightFitStarter,
  RIGHT_FIT_OWN_ID,
  RIGHT_FIT_SECTION_TITLE,
  RIGHT_FIT_STARTERS,
  type RightFitStarterId,
} from "@/lib/specialist-right-fit";

interface SpecialistRightFitFieldsProps {
  value: string;
  onChange: (next: string) => void;
}

/** Starter prompts + paragraph for the “Are we the right fit?” profile section. */
export function SpecialistRightFitFields({
  value,
  onChange,
}: SpecialistRightFitFieldsProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = value.trim();
  const selectedId = trimmed ? matchRightFitStarter(value) : null;
  const placeholder =
    selectedId === "ideal-client"
      ? "a busy professional who wants a plan that fits real life."
      : selectedId === "work-best-with"
        ? "are ready to stay consistent and want clear guidance."
        : selectedId === "great-fit"
          ? "you want accountability, honest feedback, and a plan you can keep."
          : "Describe who you work best with and what a great match looks like.";

  function selectStarter(starterId: RightFitStarterId) {
    const next = applyRightFitStarter(value, starterId);
    onChange(next);
    window.requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      const cursor = next.length;
      node.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="specialist-right-fit-fields">
      <div className="login-field">
        <p className="login-field__label">Start with</p>
        <div
          className="dashboard-edit-chip-grid"
          role="radiogroup"
          aria-label="Starting line"
        >
          {RIGHT_FIT_STARTERS.map((starter) => {
            const active = selectedId === starter.id;
            return (
              <button
                key={starter.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={
                  active
                    ? "dashboard-edit-chip dashboard-edit-chip--active"
                    : "dashboard-edit-chip"
                }
                onClick={() => selectStarter(starter.id)}
              >
                {starter.label}
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={selectedId === RIGHT_FIT_OWN_ID}
            className={
              selectedId === RIGHT_FIT_OWN_ID
                ? "dashboard-edit-chip dashboard-edit-chip--active"
                : "dashboard-edit-chip"
            }
            onClick={() => selectStarter(RIGHT_FIT_OWN_ID)}
          >
            Write my own
          </button>
        </div>
        <p className="wizard-field-hint">
          Choose a starting line or write your own. Clients see this on your
          profile as “{RIGHT_FIT_SECTION_TITLE}”.
        </p>
      </div>
      <label className="login-field">
        <span className="login-field__label">{RIGHT_FIT_SECTION_TITLE}</span>
        <textarea
          ref={textareaRef}
          className="login-field__input dashboard-edit-textarea profile-edit-input"
          rows={5}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </label>
    </div>
  );
}
