"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { AuthSession } from "@/types/auth";
import type { PublicAuthRole } from "@/types/auth-roles";
import {
  getAuthSessionServerSnapshot,
  getAuthSessionSnapshot,
  resetAuthSessionCache,
  setAuthSession,
  subscribeAuthSession,
} from "@/lib/auth-session-store";
import { useSupabaseConfig } from "@/contexts/SupabaseConfigContext";
import type { CreateAccountProfile } from "@/types/create-account";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import {
  lookupMarketplaceSession,
  setClientSupabaseEnabled,
  signInWithPassword,
  signOutMarketplace,
  signUpWithPassword,
  type AuthResult,
  type MarketplaceSessionLookup,
} from "@/lib/auth/marketplace-auth";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import { clearSavedTrainersActiveSession } from "@/lib/saved-trainers-store";
import { clearAuthClientState } from "@/lib/auth/clear-auth-client-state";
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
      emailRedirectTo?: string;
    }
  ) => Promise<AuthResult & { userId?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

const AUTH_HYDRATE_ATTEMPTS = 4;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function applyMarketplaceLookup(
  result: MarketplaceSessionLookup
): "ok" | "signed_out" | "transient_error" {
  if (result.status === "ok") {
    setAuthSession(result.session);
    return "ok";
  }
  if (result.status === "signed_out") {
    setAuthSession(null);
    return "signed_out";
  }
  /* Keep any existing session — do not flicker to logged-out. */
  return "transient_error";
}

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
  const signingOutRef = useRef(false);

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
    if (!supabaseAuth || signingOutRef.current) return;

    const result = await lookupMarketplaceSession();
    if (signingOutRef.current) return;
    applyMarketplaceLookup(result);
  }, [supabaseAuth]);

  useEffect(() => {
    if (!supabaseAuth) {
      return;
    }

    let cancelled = false;

    async function hydrateAuth() {
      for (let attempt = 0; attempt < AUTH_HYDRATE_ATTEMPTS; attempt += 1) {
        if (cancelled || signingOutRef.current) return;

        const result = await lookupMarketplaceSession();
        if (cancelled || signingOutRef.current) return;

        const status = applyMarketplaceLookup(result);
        if (status === "ok" || status === "signed_out") {
          setSupabaseHydrated(true);
          return;
        }

        await delay(400 * (attempt + 1));
      }

      /* Transient errors: still mark ready so the UI can retry without a
       * dashboard↔login bounce. useRequireAuth will not send us to /login
       * while a Supabase cookie session still exists. */
      if (!cancelled) setSupabaseHydrated(true);
    }

    void hydrateAuth();

    const supabase = getMarketplaceAuthClient();
    if (!supabase) {
      setSupabaseHydrated(true);
      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (signingOutRef.current) return;

      if (event === "SIGNED_OUT") {
        resetAuthSessionCache();
        clearSavedTrainersActiveSession();
        setAuthSession(null);
        return;
      }

      /* Defer auth API work — calling getUser inside the listener can stall. */
      window.setTimeout(() => {
        if (signingOutRef.current) return;
        void refreshSession();
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabaseAuth, refreshSession]);

  /* Cookie session exists but app session never built (timeout / huge row).
   * Keep retrying instead of bouncing to /login (proxy would send us back). */
  useEffect(() => {
    if (!supabaseAuth || !supabaseHydrated || session) return;
    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;

    let cancelled = false;
    const id = window.setInterval(() => {
      void (async () => {
        if (cancelled || signingOutRef.current) return;
        const { data } = await supabase.auth.getSession();
        if (cancelled || !data.session) return;
        await refreshSession();
      })();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [supabaseAuth, supabaseHydrated, session, refreshSession]);

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

  useEffect(() => {
    if (!supabaseAuth || !session || session.role !== "specialist") return;
    let cancelled = false;
    void (async () => {
      const { ensurePendingSpecialistApplicationForAuthUser } = await import(
        "@/lib/auth/ensure-specialist-application"
      );
      if (cancelled) return;
      await ensurePendingSpecialistApplicationForAuthUser({
        userId: session.userId,
        email: session.email,
        firstName: session.firstName,
        displayName: session.displayName,
        avatarUrl: session.avatarUrl,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseAuth, session?.userId, session?.role, session?.email]);

  const handleSignInWithPassword = useCallback(
    async (role: PublicAuthRole, email: string, password: string) => {
      const result = await signInWithPassword(role, email, password);
      if (result.ok === true) {
        setAuthSession(result.session);
        if (result.session.role === "specialist") {
          const { completePendingSpecialistApplicationAfterAuth } = await import(
            "@/lib/auth/complete-pending-specialist-application"
          );
          const pending = await completePendingSpecialistApplicationAfterAuth(
            result.session.email
          );
          if (pending.submitted) {
            showToast({
              type: "success",
              message: "Application submitted — pending SMOAC review.",
            });
          } else if (pending.message) {
            showToast({ type: "info", message: pending.message });
          }

          const { ensurePendingSpecialistApplicationForAuthUser } = await import(
            "@/lib/auth/ensure-specialist-application"
          );
          const ensured = await ensurePendingSpecialistApplicationForAuthUser({
            userId: result.session.userId,
            email: result.session.email,
            firstName: result.session.firstName,
            displayName: result.session.displayName,
            avatarUrl: result.session.avatarUrl,
          });
          if (ensured.created) {
            showToast({
              type: "success",
              message: "Application submitted — pending SMOAC review.",
            });
          } else if (ensured.message) {
            showToast({ type: "info", message: ensured.message });
          }
        }
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
        emailRedirectTo?: string;
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
    if (signingOutRef.current) return;
    signingOutRef.current = true;

    const role = getAuthSessionSnapshot()?.role;
    if (role === "client") {
      clearSavedUserZipLocation();
    }

    clearAuthClientState();
    clearSavedTrainersActiveSession();
    resetAuthSessionCache();
    setAuthSession(null);

    try {
      await signOutMarketplace();
    } finally {
      resetAuthSessionCache();
      setAuthSession(null);
      clearSavedTrainersActiveSession();
      /* Keep gate briefly so late USER_UPDATED / TOKEN_REFRESHED cannot restore. */
      window.setTimeout(() => {
        signingOutRef.current = false;
      }, 750);
    }

    showToast({ type: "info", message: "Logged out" });
  }, []);

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
