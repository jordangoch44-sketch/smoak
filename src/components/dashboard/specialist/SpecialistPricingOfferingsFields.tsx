"use client";

import {
  MAX_PRICING_OFFERINGS,
  SPECIALIST_PRICING_OFFERING_OPTIONS,
  createPricingOffering,
  isFreeConsultOffering,
  isSpecialistPricingOfferingType,
  pricingOfferingOption,
} from "@/lib/specialist-pricing";
import {
  formatSessionPriceAmount,
  hasSessionPrice,
} from "@/lib/session-price";
import { EyeIcon, InfoIcon, LayoutGridIcon } from "@/components/ui/icons";
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
  const rangePreview = hasSessionPrice({ min: priceMin, max: priceMax })
    ? formatSessionPriceAmount({ min: priceMin, max: priceMax }).replace(
        "–",
        " – "
      )
    : "";

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
        <p className="specialist-pricing-card__hint">
          Shown on Marketplace cards as your session range.
        </p>
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
        <p className="specialist-pricing-note">
          <InfoIcon className="specialist-pricing-note__icon" />
          {rangePreview
            ? `Shows as ${rangePreview} per session on your card.`
            : "Add a from and to amount for your Marketplace card."}
        </p>
      </section>

      <section
        className="specialist-pricing-card"
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
        <p className="specialist-pricing-card__hint">
          Shown on your public Details tab under Training options. If you skip
          this, clients see “Inquire for pricing details.”
        </p>
        <SpecialistPricingOfferingsFields
          value={offerings}
          onChange={onOfferingsChange}
        />
      </section>
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
  const canAdd = value.length < MAX_PRICING_OFFERINGS;

  function addOffering(type: SpecialistPricingOffering["type"]) {
    onChange([...value, createPricingOffering(type)]);
  }

  function patchOffering(
    id: string,
    patch: Partial<SpecialistPricingOffering>
  ) {
    onChange(
      value.map((offering) =>
        offering.id === id ? { ...offering, ...patch } : offering
      )
    );
  }

  function removeOffering(id: string) {
    onChange(value.filter((offering) => offering.id !== id));
  }

  return (
    <div className="specialist-pricing-offerings">
      {value.map((offering) => {
        const option = pricingOfferingOption(offering.type);
        const isFree = isFreeConsultOffering(offering);
        return (
          <article key={offering.id} className="specialist-pricing-offering">
            <div className="specialist-pricing-offering__top">
              <p className="specialist-pricing-offering__type">{option.label}</p>
              <button
                type="button"
                className="smoac-control specialist-pricing-offering__remove"
                onClick={() => removeOffering(offering.id)}
              >
                Remove
              </button>
            </div>

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

            <label className="login-field">
              <span className="login-field__label">What’s included</span>
              <textarea
                className="login-field__input profile-edit-input dashboard-edit-textarea"
                rows={2}
                value={offering.included}
                onChange={(event) =>
                  patchOffering(offering.id, { included: event.target.value })
                }
                placeholder="e.g. 60-minute session, program notes"
              />
            </label>

            <label className="login-field">
              <span className="login-field__label">
                Commitment length{" "}
                <span className="specialist-pricing-offering__optional">
                  optional
                </span>
              </span>
              <input
                className="login-field__input profile-edit-input"
                value={offering.commitment}
                onChange={(event) =>
                  patchOffering(offering.id, {
                    commitment: event.target.value,
                  })
                }
                placeholder={option.commitmentHint}
              />
            </label>
          </article>
        );
      })}

      {canAdd ? (
        <label className="login-field specialist-pricing-offerings__picker">
          <span className="login-field__label">
            {value.length === 0 ? "Add offering" : "Add another offering"}
          </span>
          <select
            className="smoac-control login-field__input login-field__select dashboard-edit-select profile-edit-input"
            value=""
            aria-label="Offering type"
            onChange={(event) => {
              const type = event.target.value;
              if (!isSpecialistPricingOfferingType(type)) return;
              addOffering(type);
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
      ) : null}
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
