"use client";

import { Suspense } from "react";
import { AuthSessionProvider } from "@/contexts/AuthSessionContext";
import { MobileBottomNavTransitionProvider } from "@/contexts/MobileBottomNavTransitionContext";
import { SavedTrainersProvider } from "@/contexts/SavedTrainersContext";
import { SaveToastProvider } from "@/contexts/SaveToastContext";
import { SupabaseConfigProvider } from "@/contexts/SupabaseConfigContext";
import { UserLocationProvider } from "@/contexts/UserLocationContext";
import { InquiryAutoSendBridge } from "@/components/inquiry";
import { PendingSaveResumeBridge } from "@/components/auth/PendingSaveResumeBridge";

export function AppProviders({
  children,
  supabaseConfigured = false,
}: {
  children: React.ReactNode;
  supabaseConfigured?: boolean;
}) {
  return (
    <SupabaseConfigProvider enabled={supabaseConfigured}>
      <AuthSessionProvider>
        <UserLocationProvider>
          <SavedTrainersProvider>
            <SaveToastProvider>
              <MobileBottomNavTransitionProvider>
                <Suspense fallback={null}>
                  <InquiryAutoSendBridge />
                  <PendingSaveResumeBridge />
                </Suspense>
                {children}
              </MobileBottomNavTransitionProvider>
            </SaveToastProvider>
          </SavedTrainersProvider>
        </UserLocationProvider>
      </AuthSessionProvider>
    </SupabaseConfigProvider>
  );
}
