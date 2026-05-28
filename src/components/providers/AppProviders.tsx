"use client";

import { AuthSessionProvider } from "@/contexts/AuthSessionContext";
import { MobileBottomNavTransitionProvider } from "@/contexts/MobileBottomNavTransitionContext";
import { SavedTrainersProvider } from "@/contexts/SavedTrainersContext";
import { SaveToastProvider } from "@/contexts/SaveToastContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionProvider>
      <SavedTrainersProvider>
        <SaveToastProvider>
          <MobileBottomNavTransitionProvider>
            {children}
          </MobileBottomNavTransitionProvider>
        </SaveToastProvider>
      </SavedTrainersProvider>
    </AuthSessionProvider>
  );
}
