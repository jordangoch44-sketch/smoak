"use client";

import { AuthSessionProvider } from "@/contexts/AuthSessionContext";
import { MobileBottomNavTransitionProvider } from "@/contexts/MobileBottomNavTransitionContext";
import { SavedTrainersProvider } from "@/contexts/SavedTrainersContext";
import { SaveToastProvider } from "@/contexts/SaveToastContext";
import { UserLocationProvider } from "@/contexts/UserLocationContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionProvider>
      <UserLocationProvider>
        <SavedTrainersProvider>
          <SaveToastProvider>
            <MobileBottomNavTransitionProvider>
              {children}
            </MobileBottomNavTransitionProvider>
          </SaveToastProvider>
        </SavedTrainersProvider>
      </UserLocationProvider>
    </AuthSessionProvider>
  );
}
