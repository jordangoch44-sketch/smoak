"use client";

import { useEffect, useState } from "react";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import {
  fetchSpecialistInquiryContacts,
  type SpecialistInquiryContact,
} from "@/lib/coaching/coaching-service";

const EMPTY: SpecialistInquiryContact[] = [];

/** Clients who have messaged this specialist, newest first. */
export function useSpecialistInquiryContacts(specialistId: string | null) {
  const [state, setState] = useState<{
    key: string | null;
    contacts: SpecialistInquiryContact[];
  }>({ key: null, contacts: EMPTY });

  useEffect(() => {
    const supabase = getMarketplaceAuthClient();
    if (!specialistId || !supabase) return;
    let cancelled = false;
    void fetchSpecialistInquiryContacts(supabase, specialistId).then((result) => {
      if (cancelled || !result.ok) return;
      setState({ key: specialistId, contacts: result.data });
    });
    return () => {
      cancelled = true;
    };
  }, [specialistId]);

  return {
    loaded: state.key === specialistId,
    contacts: state.key === specialistId ? state.contacts : EMPTY,
  };
}
