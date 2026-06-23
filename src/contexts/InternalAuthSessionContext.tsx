"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { useSupabaseConfig } from "@/contexts/SupabaseConfigContext";
import {
  getCurrentMarketplaceSession,
  setClientSupabaseEnabled,
  signInAdminWithPassword,
  signOutAdmin,
} from "@/lib/auth/marketplace-auth";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import type { AdminRoleType } from "@/types/admin-permissions";
import { validateDevInternalLogin } from "@/lib/internal-auth";

export interface InternalAuthSessionContextValue {
  isReady: boolean;
  session: InternalAuthSession | null;
  isSignedIn: boolean;
  signIn: (session: InternalAuthSession) => void;
  signInWithPassword: (
    adminRole: AdminRoleType,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
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

function toInternalSession(
  auth: Awaited<ReturnType<typeof getCurrentMarketplaceSession>>
): InternalAuthSession | null {
  if (!auth || auth.role !== "admin" || !auth.adminRole) return null;
  return {
    email: auth.email,
    signedInAt: auth.signedInAt,
    adminRole: auth.adminRole,
    displayName: auth.displayName,
  };
}

export function InternalAuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { enabled: supabaseAuth } = useSupabaseConfig();

  useEffect(() => {
    setClientSupabaseEnabled(supabaseAuth);
  }, [supabaseAuth]);
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

  const refreshInternalSession = useCallback(async () => {
    if (!supabaseAuth) return;
    const marketplace = await getCurrentMarketplaceSession();
    setInternalAuthSession(toInternalSession(marketplace));
  }, [supabaseAuth]);

  useEffect(() => {
    if (!supabaseAuth) return;

    void refreshInternalSession();

    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshInternalSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseAuth, refreshInternalSession]);

  const signIn = useCallback((next: InternalAuthSession) => {
    if (supabaseAuth) return;
    setInternalAuthSession(next);
  }, [supabaseAuth]);

  const signInWithPassword = useCallback(
    async (adminRole: AdminRoleType, email: string, password: string) => {
      if (!supabaseAuth) {
        const next = validateDevInternalLogin(adminRole, email, password);
        if (!next) {
          return { ok: false, message: "Sign-in failed. Check your email and password." };
        }
        setInternalAuthSession(next);
        return { ok: true };
      }

      const result = await signInAdminWithPassword(adminRole, email, password);
      if (result.ok !== true) {
        return {
          ok: false,
          message: result.ok === false ? result.message : "Sign-in failed.",
        };
      }

      const internal = toInternalSession(result.session);
      if (!internal) {
        await signOutAdmin();
        return { ok: false, message: "Sign-in failed. Check your email and password." };
      }

      setInternalAuthSession(internal);
      return { ok: true };
    },
    [supabaseAuth]
  );

  const signOut = useCallback(async () => {
    if (supabaseAuth) {
      await signOutAdmin();
    }
    setInternalAuthSession(null);
  }, [supabaseAuth]);

  const value = useMemo(
    (): InternalAuthSessionContextValue => ({
      isReady,
      session,
      isSignedIn: Boolean(session),
      signIn,
      signInWithPassword,
      signOut,
    }),
    [isReady, session, signIn, signInWithPassword, signOut]
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
