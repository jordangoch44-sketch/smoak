"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import {
  computeProTrialConversion,
  entitlementToTrialFields,
  formatProTrialDaysLabel,
  type AdminSpecialistEntitlement,
} from "@/lib/admin-specialist-trial-service";
import type { AdminSpecialistRow } from "@/hooks/useAdminDashboard";
import type { AdminSpecialistVisibility } from "@/types/admin";
import type { AdminPermissions } from "@/types/admin-permissions";
import type { SpecialistBillingRecord } from "@/types/admin-specialist-billing";
import {
  SPECIALIST_SERVICE_TYPE_OPTIONS,
  SPECIALIST_TRAVEL_RADIUS_OPTIONS,
} from "@/types/specialist-service-area";
import { purgeSpecialistFromMarketplace } from "@/lib/admin-specialist-purge-client";

interface AdminSpecialistsPanelProps {
  specialists: AdminSpecialistRow[];
  permissions: AdminPermissions;
  isOwnerAdmin?: boolean;
  billingById?: ReadonlyMap<string, SpecialistBillingRecord>;
  onVisibilityChange: (
    id: string,
    visibility: AdminSpecialistVisibility
  ) => void | Promise<void>;
  onFeaturedChange: (id: string, value: boolean) => void;
  onSponsoredChange: (id: string, value: boolean) => void;
  onTopRankedChange: (id: string, value: boolean) => void;
  onPremiumChange: (id: string, value: boolean) => void;
  onBasicsChange: (
    id: string,
    basics: {
      profession?: string;
      city?: string;
      state?: string;
      neighborhood?: string;
      zipCode?: string;
      serviceType?: "in-person" | "virtual" | "both";
      travelRadius?: string;
    }
  ) => void;
  onProtectedChange: (id: string, value: boolean) => void;
  onAccountKindChange: (id: string, value: "real" | "test") => void;
}

function SpecialistCard({
  row,
  billing,
  showBilling,
  permissions,
  canDelete,
  onVisibilityChange,
  onFeaturedChange,
  onSponsoredChange,
  onTopRankedChange,
  onPremiumChange,
  onBasicsChange,
  onProtectedChange,
  onAccountKindChange,
}: {
  row: AdminSpecialistRow;
  billing?: SpecialistBillingRecord;
  showBilling: boolean;
  permissions: AdminPermissions;
  canDelete: boolean;
  onVisibilityChange: AdminSpecialistsPanelProps["onVisibilityChange"];
  onFeaturedChange: AdminSpecialistsPanelProps["onFeaturedChange"];
  onSponsoredChange: AdminSpecialistsPanelProps["onSponsoredChange"];
  onTopRankedChange: AdminSpecialistsPanelProps["onTopRankedChange"];
  onPremiumChange: AdminSpecialistsPanelProps["onPremiumChange"];
  onBasicsChange: AdminSpecialistsPanelProps["onBasicsChange"];
  onProtectedChange: AdminSpecialistsPanelProps["onProtectedChange"];
  onAccountKindChange: AdminSpecialistsPanelProps["onAccountKindChange"];
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!canDelete || deleting) return;
    if (row.isProtected) {
      window.alert(
        "This specialist is marked protected. Uncheck “Protected real account” first, then delete."
      );
      return;
    }
    const confirmed = window.confirm(
      `Permanently delete ${row.name}? This removes their profile from the site, clears saves of them, and deletes their specialist login. This cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    const result = await purgeSpecialistFromMarketplace(row.id);
    setDeleting(false);
    if (!result.ok) {
      window.alert(result.message);
    }
  }

  const locationLine = [
    row.neighborhood,
    row.city,
    row.state ? row.state : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <li className="admin-entity-card admin-entity-card--specialist">
      <div className="admin-entity-card__head">
        <div className="admin-entity-card__identity">
          <h3 className="admin-entity-card__title">{row.name}</h3>
          <p className="admin-entity-card__sub">
            {[row.profession || null, row.email || null]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          {showBilling && billing && !row.premiumTrialActive ? (
            <p className="admin-entity-card__sub admin-entity-card__sub--billing">
              {billing.tierLabel} ·{" "}
              {formatBillingCents(billing.totalMonthlyCents, { decimals: 0 })}
              /mo
              {billing.activeAddOns.length > 0
                ? ` · ${billing.activeAddOns.length} add-on${
                    billing.activeAddOns.length === 1 ? "" : "s"
                  }`
                : ""}
            </p>
          ) : row.premiumTrialActive ? (
            <p className="admin-entity-card__sub admin-entity-card__sub--billing">
              {formatProTrialDaysLabel(row.premiumTrialDaysRemaining ?? null)}
            </p>
          ) : locationLine ? (
            <p className="admin-entity-card__sub">{locationLine}</p>
          ) : null}
        </div>
        <AdminStatusBadge label={row.visibility} />
      </div>

      <div className="admin-entity-card__actions admin-entity-card__actions--row">
        <Link
          href={row.profileHref}
          className="admin-btn admin-btn--compact smoac-control"
        >
          Profile
        </Link>
        {permissions.canEditSpecialists ? (
          <button
            type="button"
            className="admin-btn admin-btn--compact smoac-control"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Close" : "Edit"}
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className="admin-btn admin-btn--compact smoac-control admin-btn--danger"
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        ) : null}
      </div>

      {expanded && permissions.canEditSpecialists ? (
        <div className="admin-entity-card__expand">
          {showBilling && billing ? (
            <SpecialistBillingBlock billing={billing} />
          ) : null}

          <div className="admin-entity-card__chips">
            {row.featured ? <span className="admin-chip">Featured</span> : null}
            {row.sponsored ? <span className="admin-chip">Sponsored</span> : null}
            {row.topRanked ? (
              <span className="admin-chip">Top ranked</span>
            ) : null}
            {row.premiumTrialActive ? (
              <span className="admin-chip">Pro trial</span>
            ) : row.isPremium ? (
              <span className="admin-chip">Pro</span>
            ) : null}
            {row.isProtected || row.accountKind === "real" ? (
              <span className="admin-chip">Real / protected</span>
            ) : null}
          </div>

          <div className="admin-review-grid admin-review-grid--2col">
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
                <option value="suspended">suspended</option>
              </select>
            </label>
            <label className="admin-field-label">
              Account kind
              <select
                className="admin-field"
                value={row.accountKind ?? "test"}
                onChange={(e) =>
                  onAccountKindChange(
                    row.id,
                    e.target.value as "real" | "test"
                  )
                }
              >
                <option value="real">real</option>
                <option value="test">test</option>
              </select>
            </label>
          </div>

          <label className="admin-check admin-check--block">
            <input
              type="checkbox"
              checked={Boolean(row.isProtected)}
              onChange={(e) => onProtectedChange(row.id, e.target.checked)}
            />
            Protected real account
          </label>

          {permissions.canFeatureSpecialists ? (
            <div className="admin-check-grid">
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={row.featured}
                  onChange={(e) => onFeaturedChange(row.id, e.target.checked)}
                />
                Featured
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={row.sponsored}
                  onChange={(e) => onSponsoredChange(row.id, e.target.checked)}
                />
                Sponsored
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={row.topRanked}
                  onChange={(e) => onTopRankedChange(row.id, e.target.checked)}
                />
                Top ranked
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={row.isPremium}
                  onChange={(e) => onPremiumChange(row.id, e.target.checked)}
                />
                Pro
              </label>
            </div>
          ) : null}

          <label className="admin-field-label">
            Category / Profession
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

          <div className="admin-review-grid admin-review-grid--3col">
            <label className="admin-field-label">
              ZIP code
              <input
                className="admin-field"
                defaultValue={row.zipCode}
                inputMode="numeric"
                maxLength={5}
                onBlur={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                  if (value !== row.zipCode) {
                    onBasicsChange(row.id, { zipCode: value });
                  }
                }}
              />
            </label>
            <label className="admin-field-label">
              City
              <input
                className="admin-field"
                defaultValue={row.city}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value !== row.city) onBasicsChange(row.id, { city: value });
                }}
              />
            </label>
            <label className="admin-field-label">
              State
              <input
                className="admin-field"
                defaultValue={row.state}
                maxLength={2}
                onBlur={(e) => {
                  const value = e.target.value.trim().toUpperCase();
                  if (value !== row.state) onBasicsChange(row.id, { state: value });
                }}
              />
            </label>
          </div>

          <label className="admin-field-label">
            Neighborhood
            <input
              className="admin-field"
              defaultValue={row.neighborhood}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value !== row.neighborhood) {
                  onBasicsChange(row.id, { neighborhood: value });
                }
              }}
            />
          </label>

          <div className="admin-review-grid admin-review-grid--2col">
            <label className="admin-field-label">
              Service type
              <select
                className="admin-field"
                value={row.serviceType || ""}
                onChange={(e) =>
                  onBasicsChange(row.id, {
                    serviceType: e.target.value as "in-person" | "virtual" | "both",
                  })
                }
              >
                <option value="">—</option>
                {SPECIALIST_SERVICE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field-label">
              Travel radius
              <select
                className="admin-field"
                value={row.travelRadius || ""}
                onChange={(e) =>
                  onBasicsChange(row.id, { travelRadius: e.target.value })
                }
              >
                <option value="">—</option>
                {SPECIALIST_TRAVEL_RADIUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
  onSponsoredChange,
  onTopRankedChange,
  onPremiumChange,
  onBasicsChange,
  onProtectedChange,
  onAccountKindChange,
}: AdminSpecialistsPanelProps) {
  const showTierBilling = isOwnerAdmin && billingById != null;
  const canDelete = isOwnerAdmin;
  const [activeCategory, setActiveCategory] =
    useState<SpecialistTierCategory>("free");
  const [search, setSearch] = useState("");
  const [entitlementsById, setEntitlementsById] = useState<
    Record<string, AdminSpecialistEntitlement>
  >({});

  useEffect(() => {
    if (!showTierBilling) return;
    let cancelled = false;
    void fetch("/api/admin/specialist-entitlements", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(
        (body: {
          ok?: boolean;
          byProfileId?: Record<string, AdminSpecialistEntitlement>;
        }) => {
          if (cancelled || !body?.ok || !body.byProfileId) return;
          setEntitlementsById(body.byProfileId);
        }
      )
      .catch(() => {
        if (!cancelled) setEntitlementsById({});
      });
    return () => {
      cancelled = true;
    };
  }, [showTierBilling, specialists.length]);

  const roster = useMemo(
    () =>
      specialists.map((row) => ({
        ...row,
        ...entitlementToTrialFields(entitlementsById[row.id]),
      })),
    [specialists, entitlementsById]
  );

  const trialConversion = useMemo(
    () => computeProTrialConversion(roster),
    [roster]
  );

  const tierCounts = useMemo(() => {
    if (!billingById) return null;
    return countSpecialistsByTierCategory(roster, billingById);
  }, [roster, billingById]);

  const filteredSpecialists = useMemo(() => {
    const byTier =
      showTierBilling && billingById
        ? filterSpecialistsByTierCategory(
            roster,
            billingById,
            activeCategory
          )
        : roster;

    const query = search.trim().toLowerCase();
    if (!query) return byTier;

    return byTier.filter((row) => {
      const name = row.name.toLowerCase();
      const email = row.email.toLowerCase();
      const profession = row.profession.toLowerCase();
      return (
        name.includes(query) ||
        email.includes(query) ||
        profession.includes(query)
      );
    });
  }, [
    roster,
    billingById,
    showTierBilling,
    activeCategory,
    search,
  ]);

  const activeMeta = SPECIALIST_TIER_CATEGORIES.find(
    (c) => c.id === activeCategory
  );

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
          <p className="admin-status-note">
            Paid Pro is Stripe-settled. Pro trial is the complimentary 30-day
            window — it is not counted as paid Pro.
          </p>
          <AdminSpecialistsTierNav
            activeCategory={activeCategory}
            counts={tierCounts}
            trialConversion={trialConversion}
            onSelect={setActiveCategory}
          />
          <p className="admin-tier-section__summary">
            <strong>{activeMeta?.label}</strong>
            <span className="admin-tier-section__summary-meta">
              {filteredSpecialists.length} specialist
              {filteredSpecialists.length === 1 ? "" : "s"}
              {search.trim() ? " matching" : ""}
              {activeCategory === "pro_trial" &&
              trialConversion.startedCount > 0
                ? ` · ${trialConversion.convertedCount} of ${trialConversion.startedCount} trials converted to paid Pro (${trialConversion.conversionPercent ?? 0}%)`
                : ""}
            </span>
          </p>
        </>
      ) : null}

      <div className="admin-specialists-search">
        <input
          className="admin-field"
          type="search"
          placeholder="Search specialists by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search specialists by name"
        />
      </div>

      {filteredSpecialists.length === 0 ? (
        <p className="admin-empty">
          {search.trim()
            ? "No specialists match that search."
            : showTierBilling
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
              canDelete={canDelete}
              onVisibilityChange={onVisibilityChange}
              onFeaturedChange={onFeaturedChange}
              onSponsoredChange={onSponsoredChange}
              onTopRankedChange={onTopRankedChange}
              onPremiumChange={onPremiumChange}
              onBasicsChange={onBasicsChange}
              onProtectedChange={onProtectedChange}
              onAccountKindChange={onAccountKindChange}
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
                  if (!billing && !row.premiumTrialActive) return null;
                  const onTrial = Boolean(row.premiumTrialActive);
                  return (
                    <tr key={`billing-${row.id}`}>
                      <td>
                        {row.name}
                        {onTrial ? (
                          <div className="admin-card__meta">
                            {formatProTrialDaysLabel(
                              row.premiumTrialDaysRemaining ?? null
                            )}
                          </div>
                        ) : null}
                      </td>
                      <td>{onTrial ? "Pro trial" : billing?.tierLabel ?? "—"}</td>
                      <td>
                        {onTrial
                          ? "$0.00"
                          : formatBillingCents(billing?.tierMonthlyCents ?? 0, {
                              decimals: 2,
                            })}
                      </td>
                      <td>
                        {billing && billing.activeAddOns.length > 0
                          ? billing.activeAddOns.map((a) => a.label).join(", ")
                          : "—"}
                      </td>
                      <td>
                        {billing && billing.addOnMonthlyCents > 0
                          ? formatBillingCents(billing.addOnMonthlyCents, {
                              decimals: 0,
                            })
                          : "—"}
                      </td>
                      <td className="admin-table__money">
                        {formatBillingCents(
                          onTrial ? billing?.addOnMonthlyCents ?? 0 : billing?.totalMonthlyCents ?? 0,
                          { decimals: 2 }
                        )}
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
                  <th>Email</th>
                  <th>Visibility</th>
                  <th>Featured</th>
                  <th>Sponsored</th>
                  <th>Top</th>
                  <th>Pro</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Profile</th>
                </tr>
              </thead>
              <tbody>
                {filteredSpecialists.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>
                      {row.email ? (
                        <a href={`mailto:${row.email}`}>{row.email}</a>
                      ) : (
                        "—"
                      )}
                    </td>
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
                          <option value="suspended">suspended</option>
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
                            checked={row.sponsored}
                            onChange={(e) => onSponsoredChange(row.id, e.target.checked)}
                          />
                        </label>
                      ) : (
                        row.sponsored ? "Yes" : "—"
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
                      {permissions.canFeatureSpecialists ? (
                        <label className="admin-check">
                          <input
                            type="checkbox"
                            checked={row.isPremium}
                            onChange={(e) => onPremiumChange(row.id, e.target.checked)}
                          />
                        </label>
                      ) : (
                        row.isPremium ? "Yes" : "—"
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
