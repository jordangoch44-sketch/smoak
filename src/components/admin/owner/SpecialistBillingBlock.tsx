"use client";

import {
  formatBillingCents,
  formatTierPrice,
} from "@/lib/admin-specialist-billing-service";
import type { SpecialistBillingRecord } from "@/types/admin-specialist-billing";

interface SpecialistBillingBlockProps {
  billing: SpecialistBillingRecord;
  variant?: "card" | "inline";
}

export function SpecialistBillingBlock({
  billing,
  variant = "card",
}: SpecialistBillingBlockProps) {
  return (
    <div
      className={
        variant === "card"
          ? "admin-billing-block"
          : "admin-billing-block admin-billing-block--inline"
      }
    >
      <div className="admin-billing-block__row">
        <span className="admin-billing-block__label">Tier</span>
        <span className="admin-billing-block__value">
          {billing.tierLabel} · {formatTierPrice(billing.tierMonthlyCents)}
        </span>
      </div>
      {billing.activeAddOns.length > 0 ? (
        <div className="admin-billing-block__addons">
          <span className="admin-billing-block__label">Active add-ons</span>
          <ul className="admin-billing-block__addon-list">
            {billing.activeAddOns.map((addOn) => (
              <li key={addOn.id}>
                {addOn.label}{" "}
                <span className="admin-billing-block__addon-price">
                  +{formatBillingCents(addOn.monthlyCents, { decimals: 0 })}/mo
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="admin-billing-block__none">No paid ad add-ons</p>
      )}
      <div className="admin-billing-block__totals">
        <div>
          <span className="admin-billing-block__label">Add-on revenue</span>
          <span className="admin-billing-block__money">
            {formatBillingCents(billing.addOnMonthlyCents, { decimals: 0 })}/mo
          </span>
        </div>
        <div className="admin-billing-block__total">
          <span className="admin-billing-block__label">Total monthly value</span>
          <span className="admin-billing-block__money admin-billing-block__money--accent">
            {formatBillingCents(billing.totalMonthlyCents, { decimals: 2 })}/mo
          </span>
        </div>
      </div>
    </div>
  );
}
