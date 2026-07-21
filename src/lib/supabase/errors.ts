export class SpecialistStorageValidationError extends Error {
  readonly code = "SPECIALIST_STORAGE_VALIDATION";

  constructor(message: string) {
    super(message);
    this.name = "SpecialistStorageValidationError";
  }
}
