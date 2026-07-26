export interface TrainerFilters {
  /** User preferred or filter-drawer ZIP — primary location match key */
  zipCode: string;
  city: string;
  neighborhood: string;
  profession: string;
  specialty: string;
  gender: string;
  /** Inclusive session price floor (dollars). Empty = no minimum. */
  priceMin: string;
  /** Inclusive session price ceiling (dollars). Empty = no maximum. */
  priceMax: string;
  /**
   * Quick-filter / Explore service mode.
   * Empty = any; `in-person` / `virtual` also match specialists marked `both`.
   */
  serviceType: "" | "in-person" | "virtual";
}
