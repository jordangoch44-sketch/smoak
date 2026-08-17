"use client";

import { useEffect } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getProfileZipFromSession } from "@/lib/client-profile-location";
import {
  readIpLocationHint,
  writeIpLocationHint,
  type IpLocationHint,
} from "@/lib/geo/ip-location-hint";
import {
  hasSavedGeolocation,
  loadSavedZipCode,
} from "@/lib/user-location-storage";

/**
 * Fetch a coarse IP metro for Marketplace rails when the visitor has not
 * set a ZIP or precise location. Does not fill Search / header ZIP.
 */
export function IpLocationHintBoot() {
  const { session } = useAuthSession();

  useEffect(() => {
    if (getProfileZipFromSession(session)) return;
    if (loadSavedZipCode()) return;
    if (hasSavedGeolocation()) return;
    if (readIpLocationHint()) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/geo/ip-hint", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const body = (await response.json()) as IpLocationHint;
        if (cancelled) return;
        if (!body.city && body.latitude == null) return;
        writeIpLocationHint({
          city: body.city ?? null,
          marketplaceCity: body.marketplaceCity ?? null,
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
        });
      } catch {
        /* offline / blocked — rails stay unscoped */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  return null;
}
