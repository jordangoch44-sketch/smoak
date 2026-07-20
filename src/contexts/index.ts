/**
 * Optional barrel — prefer direct imports: `@/contexts/AuthSessionContext`.
 * Incomplete (not all providers listed). @see contexts/README.md
 */
export {
  SavedTrainersProvider,
  useSavedTrainersContext,
  type SavedTrainersContextValue,
} from "./SavedTrainersContext";
export {
  AuthSessionProvider,
  useAuthSessionContext,
  type AuthSessionContextValue,
} from "./AuthSessionContext";
export { SaveToastProvider, useSaveToast } from "./SaveToastContext";
