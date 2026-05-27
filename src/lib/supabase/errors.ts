export class SupabaseNotConfiguredError extends Error {
  readonly code = "SUPABASE_NOT_CONFIGURED";

  constructor() {
    super(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

export class SpecialistStorageValidationError extends Error {
  readonly code = "SPECIALIST_STORAGE_VALIDATION";

  constructor(message: string) {
    super(message);
    this.name = "SpecialistStorageValidationError";
  }
}
