"use client";

import { SavedPanelContent } from "./SavedPanelContent";

/** Direct /saved route — full page access */
export function SavedPageClient() {
  return (
    <div className="saved-page-route min-h-[100dvh] px-4 pb-12 pt-[calc(3.5rem+env(safe-area-inset-top,0px)+1.5rem)] sm:px-6 sm:pb-16 md:pt-[calc(4rem+env(safe-area-inset-top,0px)+2rem)] lg:pt-[calc(72px+env(safe-area-inset-top,0px)+2.5rem)]">
      <SavedPanelContent variant="page" />
    </div>
  );
}
