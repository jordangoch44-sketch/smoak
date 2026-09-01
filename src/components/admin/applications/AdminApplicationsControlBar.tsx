"use client";

import type { AdminApplicationStatusLabel } from "@/types/admin";

export type ApplicationQueue = "specialists" | "clients";

export interface QueueCountMetrics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  archived: number;
}

interface AdminApplicationsControlBarProps {
  queue: ApplicationQueue;
  onQueueChange: (queue: ApplicationQueue) => void;
  specialistCounts: QueueCountMetrics;
  clientCounts: QueueCountMetrics;
  statusFilter: AdminApplicationStatusLabel | "all";
  onStatusFilterChange: (status: AdminApplicationStatusLabel | "all") => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  totalFilteredCount: number;
  totalQueueCount: number;
}

const STATUS_FILTERS: readonly { id: AdminApplicationStatusLabel | "all"; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
];

export function AdminApplicationsControlBar({
  queue,
  onQueueChange,
  specialistCounts,
  clientCounts,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  totalFilteredCount,
  totalQueueCount,
}: AdminApplicationsControlBarProps) {
  const activeCounts = queue === "specialists" ? specialistCounts : clientCounts;

  const getStatusCount = (statusId: AdminApplicationStatusLabel | "all") => {
    if (statusId === "all") return activeCounts.total;
    return activeCounts[statusId];
  };

  return (
    <div className="admin-app-bar">
      {/* Top row: Role Segmented Switcher & Search Bar */}
      <div className="admin-app-bar__top">
        {/* Apple-style Segmented Queue Switcher */}
        <div
          className="admin-app-segments"
          role="tablist"
          aria-label="Application Type"
        >
          <button
            type="button"
            role="tab"
            aria-selected={queue === "specialists"}
            className={`admin-app-segment${queue === "specialists" ? " admin-app-segment--active" : ""}`}
            onClick={() => onQueueChange("specialists")}
          >
            <span className="admin-app-segment__title">Specialists</span>
            {specialistCounts.pending > 0 ? (
              <span
                className="admin-app-segment__badge admin-app-segment__badge--pending"
                title={`${specialistCounts.pending} pending specialist reviews`}
              >
                {specialistCounts.pending} pending
              </span>
            ) : (
              <span className="admin-app-segment__badge">
                {specialistCounts.total}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={queue === "clients"}
            className={`admin-app-segment${queue === "clients" ? " admin-app-segment--active" : ""}`}
            onClick={() => onQueueChange("clients")}
          >
            <span className="admin-app-segment__title">Clients</span>
            {clientCounts.pending > 0 ? (
              <span
                className="admin-app-segment__badge admin-app-segment__badge--pending"
                title={`${clientCounts.pending} pending client reviews`}
              >
                {clientCounts.pending} pending
              </span>
            ) : (
              <span className="admin-app-segment__badge">
                {clientCounts.total}
              </span>
            )}
          </button>
        </div>

        {/* Integrated Instant Search */}
        <div className="admin-app-search">
          <svg
            className="admin-app-search__icon"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.5 17.5l-3.8-3.8m1.8-4.7a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
            />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder={`Search ${queue === "specialists" ? "specialists" : "clients"} by name, email, city...`}
            className="admin-app-search__input"
            aria-label="Filter applications"
          />
          {searchQuery ? (
            <button
              type="button"
              className="admin-app-search__clear"
              onClick={() => onSearchQueryChange("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* Bottom row: Status Filter Chips & Summary count */}
      <div className="admin-app-bar__bottom">
        <div
          className="admin-app-status-chips"
          role="tablist"
          aria-label="Filter applications by status"
        >
          {STATUS_FILTERS.map((item) => {
            const count = getStatusCount(item.id);
            const isActive = statusFilter === item.id;
            const isPendingPill = item.id === "pending" && count > 0;

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`admin-app-chip${isActive ? " admin-app-chip--active" : ""}${isPendingPill ? " admin-app-chip--has-pending" : ""}`}
                onClick={() => onStatusFilterChange(item.id)}
              >
                <span className="admin-app-chip__label">{item.label}</span>
                <span className="admin-app-chip__count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="admin-app-bar__summary">
          {searchQuery ? (
            <span>
              Showing <strong>{totalFilteredCount}</strong> matching{" "}
              {totalFilteredCount === 1 ? "applicant" : "applicants"}
              <button
                type="button"
                className="admin-app-bar__reset-link"
                onClick={() => {
                  onSearchQueryChange("");
                  onStatusFilterChange("pending");
                }}
              >
                Reset
              </button>
            </span>
          ) : (
            <span>
              <strong>{totalFilteredCount}</strong> of{" "}
              <strong>{totalQueueCount}</strong> {queue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
