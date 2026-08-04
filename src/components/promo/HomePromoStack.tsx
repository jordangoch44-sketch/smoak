"use client";

import { useState } from "react";
import { BoostVisibilityModal } from "@/components/dashboard/shared/BoostVisibilityModal";
import { SitePromoSlot } from "@/components/promo/SitePromoSlot";

/** Homepage mid promos — specialist boost opens checkout in-place. */
export function HomePromoStack() {
  const [boostOpen, setBoostOpen] = useState(false);

  return (
    <>
      <SitePromoSlot
        slotId="home_mid_promo"
        variant="banner"
        onOpenBoost={() => setBoostOpen(true)}
      />
      <SitePromoSlot slotId="home_client_promo" variant="banner" />
      <BoostVisibilityModal
        open={boostOpen}
        onClose={() => setBoostOpen(false)}
      />
    </>
  );
}
