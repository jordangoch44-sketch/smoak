/**
 * Clear client-side auth-adjacent state on logout.
 */
import {
  clearInquiryAutoSendFlag,
  clearPendingInquirySignup,
  clearSaveAutoApplyFlag,
} from "@/lib/inquiry/inquiry-session-flags";
import { clearPendingMarketplaceSignup } from "@/lib/auth/pending-marketplace-signup";
import { clearPendingSave } from "@/lib/pending-save-storage";
import { clearPendingInquiryDraft } from "@/lib/pending-inquiry-storage";

export function clearAuthClientState(): void {
  clearPendingInquirySignup();
  clearInquiryAutoSendFlag();
  clearSaveAutoApplyFlag();
  clearPendingMarketplaceSignup();
  clearPendingSave();
  clearPendingInquiryDraft();
}
