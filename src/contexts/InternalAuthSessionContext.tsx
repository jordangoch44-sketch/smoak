"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  getInternalAuthSessionServerSnapshot,
  getInternalAuthSessionSnapshot,
  setInternalAuthSession,
  subscribeInternalAuthSession,
} from "@/lib/internal-auth-session-store";
import type { InternalAuthSession } from "@/types/internal-auth";

export interface InternalAuthSessionContextValue {
  isReady: boolean;
  session: InternalAuthSession | null;
  isSignedIn: boolean;
  signIn: (session: InternalAuthSession) => void;
  signOut: () => void;
}

const InternalAuthSessionContext =
  createContext<InternalAuthSessionContextValue | null>(null);

function subscribeClientReady(onStoreChange: () => void) {
  if (typeof window !== "undefined") {
    onStoreChange();
  }
  return () => {};
}

function getClientReadySnapshot() {
  return typeof window !== "undefined";
}

function getServerReadySnapshot() {
  return false;
}

export function InternalAuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isReady = useSyncExternalStore(
    subscribeClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot
  );
  const session = useSyncExternalStore(
    subscribeInternalAuthSession,
    getInternalAuthSessionSnapshot,
    getInternalAuthSessionServerSnapshot
  );

  const signIn = useCallback((next: InternalAuthSession) => {
    setInternalAuthSession(next);
  }, []);

  const signOut = useCallback(() => {
    setInternalAuthSession(null);
  }, []);

  const value = useMemo(
    (): InternalAuthSessionContextValue => ({
      isReady,
      session,
      isSignedIn: Boolean(session),
      signIn,
      signOut,
    }),
    [isReady, session, signIn, signOut]
  );

  return (
    <InternalAuthSessionContext.Provider value={value}>
      {children}
    </InternalAuthSessionContext.Provider>
  );
}

export function useInternalAuthSessionContext(): InternalAuthSessionContextValue {
  const ctx = useContext(InternalAuthSessionContext);
  if (!ctx) {
    throw new Error(
      "useInternalAuthSession must be used within InternalAuthSessionProvider"
    );
  }
  return ctx;
}
