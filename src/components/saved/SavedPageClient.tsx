"use client";

import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { SavedPanelContent } from "./SavedPanelContent";

/** Direct /saved route — full page access */
export function SavedPageClient() {
  return (
    <div className="saved-page-route saved-page-route--fill relative overflow-hidden px-4 sm:px-6">
      <AuroraAtmosphere
        intensity="subtle"
        starDensity="none"
        glowPosition="header"
        glowColor="blue"
        enableMotion
        className="saved-page-route__cosmic"
      />
      <div className="saved-page-route__content">
        <SavedPanelContent variant="page" />
      </div>
    </div>
  );
}
