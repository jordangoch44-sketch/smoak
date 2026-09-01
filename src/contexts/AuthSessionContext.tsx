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
  /** Bumps on each sign-in / sign-out start so a late logout cannot wipe a newer session. */
  const authGenerationRef = useRef(0);
  /** Role undergoing sign-in verification — blocks onAuthStateChange race conditions */
  const pendingSignInRoleRef = useRef<PublicAuthRole | null>(null);

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
    if (
      pendingSignInRoleRef.current &&
      result.status === "ok" &&
      result.session.role !== pendingSignInRoleRef.current
    ) {
      /* Suppress publishing mismatched session while role verification is in flight */
      return;
    }
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
      if (signingOutRef.current && event !== "SIGNED_OUT") return;

      if (event === "SIGNED_OUT") {
        /* Stale SIGNED_OUT after a quick re-login — keep the new session. */
        if (!signingOutRef.current) {
          void (async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) return;
            resetAuthSessionCache();
            clearSavedTrainersActiveSession();
            setAuthSession(null);
          })();
          return;
        }
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
      /* Cancel any in-flight logout gate so a quick re-login isn't blocked. */
      signingOutRef.current = false;
      pendingSignInRoleRef.current = role;

      try {
        const result = await signInWithPassword(role, email, password);
        if (result.ok === true) {
          authGenerationRef.current += 1;
          signingOutRef.current = false;
          pendingSignInRoleRef.current = null;
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
        } else {
          pendingSignInRoleRef.current = null;
          clearAuthClientState();
          clearSavedTrainersActiveSession();
          resetAuthSessionCache();
          setAuthSession(null);
        }
        return result;
      } catch (err) {
        pendingSignInRoleRef.current = null;
        clearAuthClientState();
        clearSavedTrainersActiveSession();
        resetAuthSessionCache();
        setAuthSession(null);
        throw err;
      }
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
        authGenerationRef.current += 1;
        signingOutRef.current = false;
        setAuthSession(result.session);
      }
      return result;
    },
    []
  );

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    const logoutGeneration = ++authGenerationRef.current;

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
      /*
       * Quick re-login can finish before this logout resolves. Never wipe a
       * newer session that landed while signOutMarketplace was still in flight.
       */
      if (authGenerationRef.current !== logoutGeneration) {
        return;
      }

      try {
        const supabase = getMarketplaceAuthClient();
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            signingOutRef.current = false;
            await refreshSession();
            return;
          }
        }
      } catch {
        /* fall through to local clear */
      }

      if (authGenerationRef.current !== logoutGeneration) {
        return;
      }

      resetAuthSessionCache();
      setAuthSession(null);
      clearSavedTrainersActiveSession();
      /* Keep gate briefly so late USER_UPDATED / TOKEN_REFRESHED cannot restore. */
      window.setTimeout(() => {
        if (authGenerationRef.current === logoutGeneration) {
          signingOutRef.current = false;
        }
      }, 750);
    }

    showToast({ type: "info", message: "Logged out" });
  }, [refreshSession]);

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
