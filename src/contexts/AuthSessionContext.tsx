"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { AuthRole, AuthSession } from "@/types/auth";
import {
  getAuthSessionServerSnapshot,
  getAuthSessionSnapshot,
  setAuthSession,
  subscribeAuthSession,
} from "@/lib/auth-session-store";
import { logoutWithToast } from "@/lib/logout-with-toast";

export interface AuthSessionContextValue {
  isReady: boolean;
  session: AuthSession | null;
  isSignedIn: boolean;
  signIn: (role: AuthRole, email: string) => void;
  signOut: () => void;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function subscribeReady() {
  return () => {};
}

function getReadySnapshot() {
  return true;
}

function getServerReadySnapshot() {
  return false;
}

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isReady = useSyncExternalStore(
    subscribeReady,
    getReadySnapshot,
    getServerReadySnapshot
  );
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    getAuthSessionServerSnapshot
  );

  const signIn = useCallback((role: AuthRole, email: string) => {
    /* DEV ONLY — session persisted in localStorage for dashboard QA */
    setAuthSession({
      role,
      email: email.trim(),
      signedInAt: new Date().toISOString(),
    });
  }, []);

  const signOut = useCallback(() => {
    logoutWithToast();
  }, []);

  const value = useMemo(
    (): AuthSessionContextValue => ({
      isReady,
      session,
      isSignedIn: Boolean(session),
      signIn,
      signOut,
    }),
    [isReady, session, signIn, signOut]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSessionContext(): AuthSessionContextValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return ctx;
}
