"use client";

import { SmoacProUpgradeModal } from "./SmoacProUpgradeModal";

interface PremiumTrialEndedModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Day-30 notice: complimentary Pro ended → free tier + option to continue at $9.99.
 */
export function PremiumTrialEndedModal({
  open,
  onClose,
}: PremiumTrialEndedModalProps) {
  return (
    <SmoacProUpgradeModal open={open} onClose={onClose} trialEnded />
  );
}
