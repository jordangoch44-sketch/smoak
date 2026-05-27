"use client";

import { SavedPanelContent } from "./SavedPanelContent";

/** Direct /saved route — full page access */
export function SavedPageClient() {
  return (
    <div className="saved-page-route saved-page-route--fill px-4 sm:px-6">
      <SavedPanelContent variant="page" />
    </div>
  );
}
