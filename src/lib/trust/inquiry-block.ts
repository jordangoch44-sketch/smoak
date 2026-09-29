import type { SupabaseClient } from "@supabase/supabase-js";

const CLOSED = "This conversation is closed.";

export function inquiryClosedMessage(): string {
  return CLOSED;
}

function isMissingBlockCheck(message: string | undefined): boolean {
  return Boolean(
    message && /42883|PGRST202|inquiry_pair_is_blocked|does not exist|schema cache/i.test(message)
  );
}

/** True when either party has blocked the other on this specialist thread. */
export async function inquiryPairIsBlocked(
  supabase: SupabaseClient,
  input: {
    partyA: string;
    partyB?: string | null;
    specialistId?: string | null;
  }
): Promise<boolean> {
  const partyA = input.partyA.trim();
  if (!partyA) return false;
  const partyB = input.partyB?.trim() || null;
  const specialistId = input.specialistId?.trim() || "";

  const { data, error } = await supabase.rpc("inquiry_pair_is_blocked", {
    p_party_a: partyA,
    p_party_b: partyB,
    p_specialist_id: specialistId,
  });

  if (error) {
    if (!isMissingBlockCheck(error.message)) {
      console.warn("[SMOAC trust] block check failed:", error.message);
    }
    return false;
  }
  return data === true;
}
