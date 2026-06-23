"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { AuthSession } from "@/types/auth";
import type { PublicAuthRole } from "@/types/auth-roles";
import {
  getAuthSessionServerSnapshot,
  getAuthSessionSnapshot,
  setAuthSession,
  subscribeAuthSession,
} from "@/lib/auth-session-store";
import { useSupabaseConfig } from "@/contexts/SupabaseConfigContext";
import type { CreateAccountProfile } from "@/types/create-account";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import {
  getCurrentMarketplaceSession,
  setClientSupabaseEnabled,
  signInWithPassword,
  signOutMarketplace,
  signUpWithPassword,
  type AuthResult,
} from "@/lib/auth/marketplace-auth";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import { clearSavedTrainersActiveSession } from "@/lib/saved-trainers-store";
import { showToast } from "@/lib/toast-store";
import { hydrateClientLocationFromSession } from "@/lib/client-profile-location";
import { clearSavedUserZipLocation } from "@/lib/user-location-storage";

export interface AuthSessionContextValue {
  isReady: boolean;
  session: AuthSession | null;
  isSignedIn: boolean;
  signInWithPassword: (
    role: PublicAuthRole,
    email: string,
    password: string
  ) => Promise<AuthResult>;
  signUp: (
    role: PublicAuthRole,
    email: string,
    password: string,
    options?: {
      firstName?: string;
      lastName?: string;
      clientProfile?: CreateAccountProfile;
      specialistProfile?: CreateAccountProfile;
      specialistOnboarding?: SpecialistOnboardingState;
    }
  ) => Promise<AuthResult & { userId?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

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

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { enabled: supabaseAuth } = useSupabaseConfig();
  const [supabaseHydrated, setSupabaseHydrated] = useState(() => !supabaseAuth);

  useEffect(() => {
    setClientSupabaseEnabled(supabaseAuth);
  }, [supabaseAuth]);
  const clientReady = useSyncExternalStore(
    subscribeClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot
  );
  const isReady = clientReady && supabaseHydrated;
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    getAuthSessionServerSnapshot
  );

  const refreshSession = useCallback(async () => {
    if (!supabaseAuth) return;
    const next = await getCurrentMarketplaceSession();
    setAuthSession(next);
  }, [supabaseAuth]);

  useEffect(() => {
    if (!supabaseAuth) {
      return;
    }

    void refreshSession().finally(() => setSupabaseHydrated(true));

    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseAuth, refreshSession]);

  useEffect(() => {
    if (!supabaseAuth || !session || session.role !== "client") return;
    void hydrateClientLocationFromSession(session);
  }, [
    supabaseAuth,
    session?.userId,
    session?.role,
    session?.clientZipCode,
    session?.clientCity,
  ]);

  const handleSignInWithPassword = useCallback(
    async (role: PublicAuthRole, email: string, password: string) => {
      const result = await signInWithPassword(role, email, password);
      if (result.ok === true) {
        setAuthSession(result.session);
      }
      return result;
    },
    []
  );

  const handleSignUp = useCallback(
    async (
      role: PublicAuthRole,
      email: string,
      password: string,
      options?: {
        firstName?: string;
        lastName?: string;
        clientProfile?: CreateAccountProfile;
        specialistProfile?: CreateAccountProfile;
        specialistOnboarding?: SpecialistOnboardingState;
      }
    ) => {
      const result = await signUpWithPassword(role, email, password, options);
      if (result.ok === true) {
        setAuthSession(result.session);
      }
      return result;
    },
    []
  );

  const signOut = useCallback(async () => {
    clearSavedTrainersActiveSession();
    if (session?.role === "client") {
      clearSavedUserZipLocation();
    }
    await signOutMarketplace();
    setAuthSession(null);
    showToast({ type: "info", message: "Logged out" });
  }, [session?.role]);

  const value = useMemo(
    (): AuthSessionContextValue => ({
      isReady,
      session,
      isSignedIn: Boolean(session),
      signInWithPassword: handleSignInWithPassword,
      signUp: handleSignUp,
      signOut,
      refreshSession,
    }),
    [
      isReady,
      session,
      handleSignInWithPassword,
      handleSignUp,
      signOut,
      refreshSession,
    ]
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
