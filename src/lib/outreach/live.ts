/** Campaign and test delivery stay off until this is exactly "true". */
export function outreachLiveSendsEnabled(): boolean {
  return process.env.OUTREACH_LIVE_SENDS?.trim() === "true";
}

export const OUTREACH_BATCH_SIZE = 8;
export const OUTREACH_BATCH_DELAY_MS = 900;
