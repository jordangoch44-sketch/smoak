"use client";

import { createContext, useContext } from "react";

export interface SupabaseConfigContextValue {
  /** Server-evaluated: Supabase env vars present at request time */
  enabled: boolean;
}

const SupabaseConfigContext = createContext<SupabaseConfigContextValue>({
  enabled: false,
});

export function SupabaseConfigProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <SupabaseConfigContext.Provider value={{ enabled }}>
      {children}
    </SupabaseConfigContext.Provider>
  );
}

export function useSupabaseConfig(): SupabaseConfigContextValue {
  return useContext(SupabaseConfigContext);
}
