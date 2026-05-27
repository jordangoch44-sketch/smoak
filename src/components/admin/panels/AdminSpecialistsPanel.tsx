"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard";
import { AdminCollapsible } from "@/components/admin/AdminCollapsible";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminSpecialistsTierNav } from "@/components/admin/specialists/AdminSpecialistsTierNav";
import { SpecialistBillingBlock } from "@/components/admin/owner/SpecialistBillingBlock";
import {
  countSpecialistsByTierCategory,
  filterSpecialistsByTierCategory,
  SPECIALIST_TIER_CATEGORIES,
  type SpecialistTierCategory,
} from "@/lib/admin-specialist-tier-groups";
import { formatBillingCents } from "@/lib/admin-specialist-billing-service";
import type { AdminSpecialistRow } from "@/hooks/useAdminDashboard";
import type { AdminSpecialistVisibility } from "@/types/admin";
import type { AdminPermissions } from "@/types/admin-permissions";
import type { SpecialistBillingRecord } from "@/types/admin-specialist-billing";

interface AdminSpecialistsPanelProps {
  specialists: AdminSpecialistRow[];
  permissions: AdminPermissions;
  isOwnerAdmin?: boolean;
  billingById?: ReadonlyMap<string, SpecialistBillingRecord>;
  onVisibilityChange: (id: string, visibility: AdminSpecialistVisibility) => void;
  onFeaturedChange: (id: string, value: boolean) => void;
  onTopRankedChange: (id: string, value: boolean) => void;
  onBasicsChange: (
    id: string,
    basics: { profession?: string; city?: string; neighborhood?: string }
  ) => void;
}

function SpecialistCard({
  row,
  billing,
  showBilling,
  permissions,
  onVisibilityChange,
  onFeaturedChange,
  onTopRankedChange,
  onBasicsChange,
}: {
  row: AdminSpecialistRow;
  billing?: SpecialistBillingRecord;
  showBilling: boolean;
  permissions: AdminPermissions;
  onVisibilityChange: AdminSpecialistsPanelProps["onVisibilityChange"];
  onFeaturedChange: AdminSpecialistsPanelProps["onFeaturedChange"];
  onTopRankedChange: AdminSpecialistsPanelProps["onTopRankedChange"];
  onBasicsChange: AdminSpecialistsPanelProps["onBasicsChange"];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="admin-entity-card admin-entity-card--specialist">
      <div className="admin-entity-card__head">
        <div>
          <h3 className="admin-entity-card__title">{row.name}</h3>
          <p className="admin-entity-card__sub">{row.profession}</p>
        </div>
        <AdminStatusBadge label={row.visibility} />
      </div>

      {showBilling && billing ? (
        <SpecialistBillingBlock billing={billing} />
      ) : (
        <dl className="admin-entity-card__meta">
          <div>
            <dt>Category</dt>
            <dd>{row.profession || "—"}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>
              {row.neighborhood ? `${row.neighborhood}, ` : ""}
              {row.city || "—"}
            </dd>
          </div>
        </dl>
      )}

      {!showBilling ? (
        <div className="admin-entity-card__chips">
          {row.featured ? <span className="admin-chip">Featured</span> : null}
          {row.topRanked ? <span className="admin-chip">Top ranked</span> : null}
        </div>
      ) : null}

      <div className="admin-entity-card__actions admin-entity-card__actions--row">
        <Link href={row.profileHref} className="admin-btn smoac-control">
          View profile
        </Link>
        {permissions.canEditSpecialists ? (
          <button
            type="button"
            className="admin-btn smoac-control"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Hide details" : "Edit"}
          </button>
        ) : null}
      </div>

      {expanded && permissions.canEditSpecialists ? (
        <div className="admin-entity-card__expand">
          <label className="admin-field-label">
            Visibility
            <select
              className="admin-field"
              value={row.visibility}
              onChange={(e) =>
                onVisibilityChange(row.id, e.target.value as AdminSpecialistVisibility)
              }
            >
              <option value="active">active</option>
              <option value="hidden">hidden</option>
              <option value="pending">pending</option>
            </select>
          </label>
          {permissions.canFeatureSpecialists ? (
            <>
              <label className="admin-check admin-check--block">
                <input
                  type="checkbox"
                  checked={row.featured}
                  onChange={(e) => onFeaturedChange(row.id, e.target.checked)}
                />
                Featured
              </label>
              <label className="admin-check admin-check--block">
                <input
                  type="checkbox"
                  checked={row.topRanked}
                  onChange={(e) => onTopRankedChange(row.id, e.target.checked)}
                />
                Top ranked
              </label>
            </>
          ) : null}
          <label className="admin-field-label">
            Category
            <input
              className="admin-field"
              defaultValue={row.profession}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value !== row.profession) {
                  onBasicsChange(row.id, { profession: value });
                }
              }}
            />
          </label>
          <label className="admin-field-label">
            Location
            <input
              className="admin-field"
              defaultValue={`${row.neighborhood}, ${row.city}`}
              onBlur={(e) => {
                const parts = e.target.value.split(",").map((p) => p.trim());
                onBasicsChange(row.id, {
                  neighborhood: parts[0] ?? "",
                  city: parts.slice(1).join(", ").trim() || row.city,
                });
              }}
            />
          </label>
        </div>
      ) : null}
    </li>
  );
}

export function AdminSpecialistsPanel({
  specialists,
  permissions,
  isOwnerAdmin = false,
  billingById,
  onVisibilityChange,
  onFeaturedChange,
  onTopRankedChange,
  onBasicsChange,
}: AdminSpecialistsPanelProps) {
  const showTierBilling = isOwnerAdmin && billingById != null;
  const [activeCategory, setActiveCategory] = useState<SpecialistTierCategory>("free");

  const tierCounts = useMemo(() => {
    if (!billingById) return null;
    return countSpecialistsByTierCategory(specialists, billingById);
  }, [specialists, billingById]);

  const filteredSpecialists = useMemo(() => {
    if (!showTierBilling || !billingById) return specialists;
    return filterSpecialistsByTierCategory(
      specialists,
      billingById,
      activeCategory
    );
  }, [specialists, billingById, showTierBilling, activeCategory]);

  const activeMeta = SPECIALIST_TIER_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <DashboardSection
      title="Specialists"
      description={
        showTierBilling
          ? "Browse by tier and add-ons — tap a category to manage specialists."
          : "Manage visibility and profile basics."
      }
    >
      {showTierBilling && tierCounts ? (
        <>
          <p className="admin-mock-label">
            DEV mock billing until Stripe/Supabase connects.
          </p>
          <AdminSpecialistsTierNav
            activeCategory={activeCategory}
            counts={tierCounts}
            onSelect={setActiveCategory}
          />
          <p className="admin-tier-section__summary">
            <strong>{activeMeta?.label}</strong>
            <span className="admin-tier-section__summary-meta">
              {filteredSpecialists.length} specialist
              {filteredSpecialists.length === 1 ? "" : "s"}
            </span>
          </p>
        </>
      ) : null}

      {filteredSpecialists.length === 0 ? (
        <p className="admin-empty">
          {showTierBilling
            ? `No specialists in ${activeMeta?.label ?? "this category"}.`
            : "No specialists to manage."}
        </p>
      ) : (
        <ul className="admin-card-list admin-specialists-by-tier">
          {filteredSpecialists.map((row) => (
            <SpecialistCard
              key={row.id}
              row={row}
              billing={billingById?.get(row.id)}
              showBilling={showTierBilling}
              permissions={permissions}
              onVisibilityChange={onVisibilityChange}
              onFeaturedChange={onFeaturedChange}
              onTopRankedChange={onTopRankedChange}
              onBasicsChange={onBasicsChange}
            />
          ))}
        </ul>
      )}

      {showTierBilling ? (
        <AdminCollapsible
          title={`${activeMeta?.label ?? "Tier"} billing table`}
          defaultOpen={false}
        >
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--billing">
              <thead>
                <tr>
                  <th>Specialist</th>
                  <th>Tier</th>
                  <th>Tier / mo</th>
                  <th>Add-ons</th>
                  <th>Add-on / mo</th>
                  <th>Total / mo</th>
                </tr>
              </thead>
              <tbody>
                {filteredSpecialists.map((row) => {
                  const billing = billingById?.get(row.id);
                  if (!billing) return null;
                  return (
                    <tr key={`billing-${row.id}`}>
                      <td>{row.name}</td>
                      <td>{billing.tierLabel}</td>
                      <td>
                        {formatBillingCents(billing.tierMonthlyCents, {
                          decimals: 2,
                        })}
                      </td>
                      <td>
                        {billing.activeAddOns.length > 0
                          ? billing.activeAddOns.map((a) => a.label).join(", ")
                          : "—"}
                      </td>
                      <td>
                        {billing.addOnMonthlyCents > 0
                          ? formatBillingCents(billing.addOnMonthlyCents, {
                              decimals: 0,
                            })
                          : "—"}
                      </td>
                      <td className="admin-table__money">
                        {formatBillingCents(billing.totalMonthlyCents, {
                          decimals: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCollapsible>
      ) : (
        <AdminCollapsible title="Management table" defaultOpen={false}>
          <div className="admin-table-wrap admin-desktop-only">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Visibility</th>
                  <th>Featured</th>
                  <th>Top</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Profile</th>
                </tr>
              </thead>
              <tbody>
                {specialists.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>
                      {permissions.canEditSpecialists ? (
                        <select
                          className="admin-field admin-field--select"
                          value={row.visibility}
                          onChange={(e) =>
                            onVisibilityChange(
                              row.id,
                              e.target.value as AdminSpecialistVisibility
                            )
                          }
                        >
                          <option value="active">active</option>
                          <option value="hidden">hidden</option>
                          <option value="pending">pending</option>
                        </select>
                      ) : (
                        <AdminStatusBadge label={row.visibility} />
                      )}
                    </td>
                    <td>
                      {permissions.canFeatureSpecialists ? (
                        <label className="admin-check">
                          <input
                            type="checkbox"
                            checked={row.featured}
                            onChange={(e) => onFeaturedChange(row.id, e.target.checked)}
                          />
                        </label>
                      ) : (
                        row.featured ? "Yes" : "—"
                      )}
                    </td>
                    <td>
                      {permissions.canFeatureSpecialists ? (
                        <label className="admin-check">
                          <input
                            type="checkbox"
                            checked={row.topRanked}
                            onChange={(e) => onTopRankedChange(row.id, e.target.checked)}
                          />
                        </label>
                      ) : (
                        row.topRanked ? "Yes" : "—"
                      )}
                    </td>
                    <td>
                      {permissions.canEditSpecialists ? (
                        <input
                          className="admin-field"
                          defaultValue={row.profession}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value !== row.profession) {
                              onBasicsChange(row.id, { profession: value });
                            }
                          }}
                        />
                      ) : (
                        row.profession
                      )}
                    </td>
                    <td>
                      {permissions.canEditSpecialists ? (
                        <input
                          className="admin-field"
                          defaultValue={`${row.neighborhood}, ${row.city}`}
                          onBlur={(e) => {
                            const parts = e.target.value.split(",").map((p) => p.trim());
                            onBasicsChange(row.id, {
                              neighborhood: parts[0] ?? "",
                              city: parts.slice(1).join(", ").trim() || row.city,
                            });
                          }}
                        />
                      ) : (
                        `${row.neighborhood}, ${row.city}`
                      )}
                    </td>
                    <td>
                      <Link href={row.profileHref} className="admin-btn">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCollapsible>
      )}
    </DashboardSection>
  );
}
