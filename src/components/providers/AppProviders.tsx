"use client";

import { AuthSessionProvider } from "@/contexts/AuthSessionContext";
import { SavedTrainersProvider } from "@/contexts/SavedTrainersContext";
import { SaveToastProvider } from "@/contexts/SaveToastContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionProvider>
      <SavedTrainersProvider>
        <SaveToastProvider>{children}</SaveToastProvider>
      </SavedTrainersProvider>
    </AuthSessionProvider>
  );
}
