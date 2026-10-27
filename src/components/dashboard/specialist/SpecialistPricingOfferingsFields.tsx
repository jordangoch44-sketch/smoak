"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  MAX_PRICING_OFFERINGS,
  PRICING_OFFERING_NAME_MAX,
  SPECIALIST_PRICING_OFFERING_OPTIONS,
  createPricingOffering,
  formatOfferingPrice,
  isFreeConsultOffering,
  isSpecialistPricingOfferingType,
  pricingIncludedFromLines,
  pricingIncludedLines,
  pricingOfferingDisplayName,
  pricingOfferingOption,
} from "@/lib/specialist-pricing";
import {
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  LayoutGridIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { SpecialistPricingOffering } from "@/types/specialist-pricing";

export function SpecialistPricingFields({
  priceMin,
  priceMax,
  onRangeChange,
  offerings,
  onOfferingsChange,
}: {
  priceMin: number;
  priceMax: number;
  onRangeChange: (min: number, max: number) => void;
  offerings: SpecialistPricingOffering[];
  onOfferingsChange: (next: SpecialistPricingOffering[]) => void;
}) {
  return (
    <div className="specialist-pricing-fields">
      <section
        className="specialist-pricing-card"
        aria-labelledby="specialist-pricing-general"
      >
        <header className="specialist-pricing-card__head">
          <div className="specialist-pricing-card__intro">
            <span className="specialist-pricing-card__step" aria-hidden>
              1
            </span>
            <h3
              id="specialist-pricing-general"
              className="specialist-pricing-card__title"
            >
              General pricing
            </h3>
          </div>
          <span className="specialist-pricing-badge">
            <EyeIcon className="specialist-pricing-badge__icon" />
            Shown on Marketplace
          </span>
        </header>
        <div className="specialist-pricing-range">
          <MoneyField
            label="From (USD)"
            value={priceMin}
            placeholder="85"
            onChange={(min) => {
              const max = priceMax || min;
              onRangeChange(min, max > 0 ? max : min);
            }}
          />
          <span className="specialist-pricing-range__dash" aria-hidden>
            –
          </span>
          <MoneyField
            label="To (USD)"
            value={priceMax || priceMin}
            placeholder="100"
            onChange={(max) => {
              const min = priceMin || max;
              onRangeChange(min, max);
            }}
          />
        </div>
      </section>

      <div
        className="specialist-pricing-packages"
        role="group"
        aria-labelledby="specialist-pricing-packages"
      >
        <header className="specialist-pricing-card__head">
          <div className="specialist-pricing-card__intro">
            <span className="specialist-pricing-card__step" aria-hidden>
              2
            </span>
            <h3
              id="specialist-pricing-packages"
              className="specialist-pricing-card__title"
            >
              Pricing & Packages
            </h3>
          </div>
          <span className="specialist-pricing-badge">
            <LayoutGridIcon className="specialist-pricing-badge__icon" />
            Shown on Details tab
          </span>
        </header>
        <SpecialistPricingOfferingsFields
          value={offerings}
          onChange={onOfferingsChange}
        />
      </div>
      <AddPricingOffering value={offerings} onChange={onOfferingsChange} />
    </div>
  );
}

export function SpecialistPricingOfferingsFields({
  value,
  onChange,
}: {
  value: SpecialistPricingOffering[];
  onChange: (next: SpecialistPricingOffering[]) => void;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());
  const knownIds = useRef(new Set(value.map((offering) => offering.id)));

  useEffect(() => {
    const fresh = value
      .map((offering) => offering.id)
      .filter((id) => !knownIds.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => knownIds.current.add(id));
    setOpenIds(new Set(fresh));
  }, [value]);

  function patchOffering(
    id: string,
    patch: Partial<SpecialistPricingOffering>
  ) {
    onChange(
      value.map((offering) =>
        offering.id === id ? { ...offering, ...patch } : offering
      )
    );
    setDoneIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function removeOffering(id: string) {
    onChange(value.filter((offering) => offering.id !== id));
    setDoneIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setOpenIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleOpen(id: string) {
    setOpenIds((prev) => (prev.has(id) ? new Set() : new Set([id])));
  }

  function finishOffering(id: string) {
    setDoneIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setOpenIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className="specialist-pricing-offerings">
      {value.map((offering) => {
        const option = pricingOfferingOption(offering.type);
        const isFree = isFreeConsultOffering(offering);
        const named = (offering.name ?? "").trim().length > 0;
        const open = openIds.has(offering.id);
        const done = doneIds.has(offering.id);
        const priceLabel = formatOfferingPrice(offering);
        const detailsId = `pricing-offering-${offering.id}`;
        return (
          <article
            key={offering.id}
            className={cn(
              "specialist-pricing-offering",
              !open && "specialist-pricing-offering--shut"
            )}
          >
            <div className="specialist-pricing-offering__top">
              <button
                type="button"
                className="smoac-control specialist-pricing-offering__toggle"
                aria-expanded={open}
                aria-controls={detailsId}
                onClick={() => toggleOpen(offering.id)}
              >
                <span className="specialist-pricing-offering__heading">
                  <span className="specialist-pricing-offering__type">
                    {pricingOfferingDisplayName(offering)}
                  </span>
                  {named ? (
                    <span className="specialist-pricing-offering__kind">
                      {option.label}
                    </span>
                  ) : null}
                  {!open && priceLabel ? (
                    <span className="specialist-pricing-offering__summary-price">
                      {priceLabel}
                    </span>
                  ) : null}
                </span>
                <ChevronDownIcon
                  className={cn(
                    "specialist-pricing-offering__chevron",
                    open && "specialist-pricing-offering__chevron--open"
                  )}
                />
              </button>
            </div>
            {open ? (
              <div id={detailsId} className="specialist-pricing-offering__body">

            <label className="login-field">
              <span className="login-field__label">Plan name</span>
              <input
                className="login-field__input profile-edit-input"
                value={offering.name ?? ""}
                maxLength={PRICING_OFFERING_NAME_MAX}
                onChange={(event) =>
                  patchOffering(offering.id, { name: event.target.value })
                }
                placeholder={option.nameHint}
              />
            </label>

            {isFree ? (
              <p className="specialist-pricing-offering__free">Free</p>
            ) : (
              <MoneyField
                label={`Price (USD)${option.priceHint ? ` ${option.priceHint}` : ""}`}
                value={offering.price}
                placeholder="90"
                onChange={(price) => patchOffering(offering.id, { price })}
              />
            )}

            <IncludedBulletField
              value={offering.included}
              onChange={(included) => patchOffering(offering.id, { included })}
            />

            <div className="login-field">
              <span className="login-field__label">
                Commitment length{" "}
                <span className="specialist-pricing-offering__optional">
                  optional
                </span>
              </span>
              <div className="specialist-pricing-commit">
                <input
                  className="login-field__input profile-edit-input"
                  value={offering.commitment}
                  onChange={(event) =>
                    patchOffering(offering.id, {
                      commitment: event.target.value,
                    })
                  }
                  placeholder={option.commitmentHint}
                  aria-label="Commitment length"
                />
                <button
                  type="button"
                  className="smoac-control specialist-pricing-offering__done specialist-pricing-offering__done--on"
                  aria-pressed={done}
                  aria-label="Done, minimize this plan"
                  onClick={() => finishOffering(offering.id)}
                >
                  <CheckIcon className="specialist-pricing-offering__done-icon" />
                </button>
              </div>
            </div>
            <button
              type="button"
              className="smoac-control specialist-pricing-offering__remove"
              onClick={() => removeOffering(offering.id)}
            >
              Remove
            </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function AddPricingOffering({
  value,
  onChange,
}: {
  value: SpecialistPricingOffering[];
  onChange: (next: SpecialistPricingOffering[]) => void;
}) {
  if (value.length >= MAX_PRICING_OFFERINGS) return null;

  return (
    <label className="specialist-pricing-add">
      <span className="specialist-pricing-add__plus" aria-hidden>
        <PlusIcon className="specialist-pricing-add__icon" />
      </span>
      <span className="specialist-pricing-add__label">
        {value.length === 0 ? "Add offering" : "Add another offering"}
      </span>
      <select
        className="smoac-control specialist-pricing-add__select"
        value=""
        aria-label={
          value.length === 0 ? "Add offering" : "Add another offering"
        }
        onChange={(event) => {
          const type = event.target.value;
          if (!isSpecialistPricingOfferingType(type)) return;
          onChange([...value, createPricingOffering(type)]);
        }}
      >
        <option value="">Select one</option>
        {SPECIALIST_PRICING_OFFERING_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function IncludedBulletField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const lines = pricingIncludedLines(value);
  const rows = [...lines, ""];
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingFocus = useRef<number | null>(null);

  useEffect(() => {
    if (pendingFocus.current == null) return;
    const index = pendingFocus.current;
    pendingFocus.current = null;
    refs.current[index]?.focus();
  }, [value]);

  function commit(nextLines: string[], focus: number | null) {
    pendingFocus.current = focus;
    onChange(pricingIncludedFromLines(nextLines));
  }

  function changeLine(index: number, text: string) {
    if (text.includes("\n")) {
      const chunk = text.replace(/\r\n/g, "\n").split("\n");
      const next = lines.slice();
      if (index >= next.length) next.push(...chunk);
      else next.splice(index, 1, ...chunk);
      commit(next, null);
      return;
    }
    if (index >= lines.length) {
      if (text === "") return;
      commit([...lines, text], null);
      return;
    }
    const next = lines.slice();
    next[index] = text;
    commit(next, null);
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (index >= lines.length) return;
      if (index === lines.length - 1) {
        refs.current[index + 1]?.focus();
        return;
      }
      const next = lines.slice();
      next.splice(index + 1, 0, "");
      commit(next, index + 1);
      return;
    }
    if (event.key !== "Backspace") return;
    const text = index >= lines.length ? "" : lines[index];
    if (text !== "" || index === 0) return;
    event.preventDefault();
    if (index >= lines.length) {
      refs.current[lines.length - 1]?.focus();
      return;
    }
    const next = lines.slice();
    next.splice(index, 1);
    commit(next, index - 1);
  }

  return (
    <div className="login-field">
      <span className="login-field__label">What’s included</span>
      <div className="specialist-pricing-bullets">
        {rows.map((line, index) => {
          const filled = line.length > 0;
          return (
            <label
              key={index}
              className="specialist-pricing-bullet"
            >
              <span
                className={cn(
                  "specialist-pricing-bullet__mark",
                  filled && "specialist-pricing-bullet__mark--filled"
                )}
                aria-hidden
              />
              <input
                ref={(node) => {
                  refs.current[index] = node;
                }}
                className="specialist-pricing-bullet__input"
                value={line}
                enterKeyHint={index === rows.length - 1 ? "done" : "next"}
                aria-label={
                  filled ? `Included point ${index + 1}` : "Next included point"
                }
                placeholder={
                  lines.length === 0 ? "Add what’s included" : undefined
                }
                onChange={(event) => changeLine(index, event.target.value)}
                onKeyDown={(event) => onKeyDown(index, event)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number;
  placeholder: string;
  onChange: (next: number) => void;
}) {
  return (
    <label className="login-field specialist-pricing-money">
      <span className="login-field__label">{label}</span>
      <span className="specialist-pricing-money__box">
        <span className="specialist-pricing-money__prefix" aria-hidden>
          $
        </span>
        <input
          className="login-field__input profile-edit-input specialist-pricing-money__input"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={value || ""}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          placeholder={placeholder}
        />
      </span>
    </label>
  );
}
