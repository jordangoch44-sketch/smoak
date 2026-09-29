import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import {
  forgetHiddenInquiryIds,
  hideInquiryId,
  listHiddenInquiryIds,
} from "@/lib/inquiry/inquiry-hidden-store";
import { hideLocalInquiryForSpecialist } from "@/lib/inquiry/inquiry-local-store";
import {
  isDemoInquiryConversationId,
  isSmoacWelcomeConversationId,
} from "@/lib/inquiry/inquiry-paths";
import {
  flagInquiryUnreadIds,
  listFlaggedUnreadInquiryIds,
  unflagInquiryUnread,
  unflagInquiryUnreadIds,
} from "@/lib/inquiry/inquiry-unread-flag-store";

export type InquiryInboxViewer = "client" | "specialist";

const importedOwners = new Map<string, Promise<void>>();

let partyColumnsMissing = false;

export function noteNewInboxColumnsMissing(): void {
  partyColumnsMissing = true;
}

export function isPersistableInquiryId(id: string): boolean {
  const trimmed = id.trim();
  if (!trimmed) return false;
  if (isDemoInquiryConversationId(trimmed)) return false;
  if (isSmoacWelcomeConversationId(trimmed)) return false;
  return true;
}

export function isNewInboxColumnError(message: string | undefined): boolean {
  return Boolean(
    message &&
      /42703|PGRST204|schema cache|does not exist/i.test(message) &&
      /client_hidden_at|marked_unread_at/i.test(message)
  );
}

function markedUnreadColumn(
  viewer: InquiryInboxViewer
): "client_marked_unread_at" | "specialist_marked_unread_at" {
  return viewer === "client"
    ? "client_marked_unread_at"
    : "specialist_marked_unread_at";
}

/**
 * One-time copy of this browser's hide / mark-unread flags onto the account.
 * Demo and welcome-preview ids stay in localStorage.
 */
export function importLocalInquiryInboxFlags(
  viewer: InquiryInboxViewer,
  ownerId: string
): Promise<void> {
  const owner = ownerId.trim();
  if (!owner || typeof window === "undefined") return Promise.resolve();
  if (!isMarketplaceSupabaseActive() || partyColumnsMissing) {
    return Promise.resolve();
  }

  const key = `${viewer}:${owner}`;
  const existing = importedOwners.get(key);
  if (existing) return existing;

  const promise = runImport(viewer, owner).then((ok) => {
    if (!ok) importedOwners.delete(key);
  });
  importedOwners.set(key, promise);
  return promise;
}

async function runImport(
  viewer: InquiryInboxViewer,
  ownerId: string
): Promise<boolean> {
  const hidden = listHiddenInquiryIds(ownerId).filter(isPersistableInquiryId);
  const hiddenSet = new Set(hidden);
  const unread = listFlaggedUnreadInquiryIds(ownerId).filter(
    (id) => isPersistableInquiryId(id) && !hiddenSet.has(id)
  );
  if (hidden.length === 0 && unread.length === 0) return true;

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return false;

  const now = new Date().toISOString();
  const hiddenColumn =
    viewer === "client" ? "client_hidden_at" : "specialist_hidden_at";
  const unreadColumn = markedUnreadColumn(viewer);

  if (hidden.length > 0) {
    const { data, error } = await supabase
      .from("inquiry_conversations")
      .update({ [hiddenColumn]: now })
      .in("id", hidden)
      .select("id");

    if (error) {
      if (isNewInboxColumnError(error.message)) {
        partyColumnsMissing = true;
        return true;
      }
      return false;
    }

    const saved = new Set(
      ((data ?? []) as { id?: string }[])
        .map((row) => row.id?.trim() ?? "")
        .filter(Boolean)
    );
    forgetHiddenInquiryIds(
      ownerId,
      hidden.filter((id) => saved.has(id))
    );
    unflagInquiryUnreadIds(
      ownerId,
      hidden.filter((id) => saved.has(id))
    );
  }

  if (unread.length > 0) {
    const { data, error } = await supabase
      .from("inquiry_conversations")
      .update({ [unreadColumn]: now })
      .in("id", unread)
      .select("id");

    if (error) {
      if (isNewInboxColumnError(error.message)) {
        partyColumnsMissing = true;
        return true;
      }
      return false;
    }

    const saved = new Set(
      ((data ?? []) as { id?: string }[])
        .map((row) => row.id?.trim() ?? "")
        .filter(Boolean)
    );
    unflagInquiryUnreadIds(
      ownerId,
      unread.filter((id) => saved.has(id))
    );
  }

  return true;
}

/** Specialist or client “mark unread”. Message is_read is left as-is. */
export async function persistInquiryMarkedUnread(
  viewer: InquiryInboxViewer,
  ownerId: string,
  conversationIds: readonly string[]
): Promise<void> {
  const ids = [...new Set(conversationIds.map((id) => id.trim()).filter(Boolean))];
  if (!ownerId.trim() || ids.length === 0) return;

  const localIds = ids.filter(
    (id) =>
      !isPersistableInquiryId(id) ||
      !isMarketplaceSupabaseActive() ||
      partyColumnsMissing
  );
  const liveIds = ids.filter((id) => !localIds.includes(id));
  if (localIds.length > 0) flagInquiryUnreadIds(ownerId, localIds);
  if (liveIds.length === 0) return;

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    flagInquiryUnreadIds(ownerId, liveIds);
    return;
  }

  const { data, error } = await supabase
    .from("inquiry_conversations")
    .update({ [markedUnreadColumn(viewer)]: new Date().toISOString() })
    .in("id", liveIds)
    .select("id");

  if (error) {
    if (isNewInboxColumnError(error.message)) partyColumnsMissing = true;
    flagInquiryUnreadIds(ownerId, liveIds);
    return;
  }

  const saved = new Set(
    ((data ?? []) as { id?: string }[])
      .map((row) => row.id?.trim() ?? "")
      .filter(Boolean)
  );
  unflagInquiryUnreadIds(
    ownerId,
    liveIds.filter((id) => saved.has(id))
  );
  const missed = liveIds.filter((id) => !saved.has(id));
  if (missed.length > 0) flagInquiryUnreadIds(ownerId, missed);
}

/** Clear the party mark-unread stamp. No-op when it is already clear. */
export async function clearInquiryMarkedUnread(
  viewer: InquiryInboxViewer,
  conversationId: string
): Promise<void> {
  const id = conversationId.trim();
  if (!isPersistableInquiryId(id) || !isMarketplaceSupabaseActive()) return;
  if (partyColumnsMissing) return;

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;

  const column = markedUnreadColumn(viewer);
  const { data, error: readError } = await supabase
    .from("inquiry_conversations")
    .select(column)
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    if (isNewInboxColumnError(readError.message)) partyColumnsMissing = true;
    return;
  }

  const stamp = (data as Record<string, string | null> | null)?.[column];
  if (!stamp) return;

  const { error } = await supabase
    .from("inquiry_conversations")
    .update({ [column]: null })
    .eq("id", id);

  if (error && isNewInboxColumnError(error.message)) {
    partyColumnsMissing = true;
  }
}

/**
 * Hide a thread for this party only.
 * Server column when the migration is applied; this browser otherwise.
 */
export async function hideInquiryForViewer(
  viewer: InquiryInboxViewer,
  ownerId: string,
  conversationId: string
): Promise<void> {
  const id = conversationId.trim();
  const owner = ownerId.trim();
  if (!id || !owner) return;

  if (viewer === "specialist") {
    hideLocalInquiryForSpecialist(id);
  }
  unflagInquiryUnread(owner, id);

  const canPersist =
    isPersistableInquiryId(id) &&
    isMarketplaceSupabaseActive() &&
    !partyColumnsMissing;

  if (!canPersist) {
    hideInquiryId(owner, id);
    return;
  }

  let persisted = false;
  try {
    const response = await fetch("/api/inquiry/hide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ conversationId: id, viewer }),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; localOnly?: boolean }
      | null;
    persisted = Boolean(response.ok && data?.ok && !data.localOnly);
    if (data?.localOnly && viewer === "client") partyColumnsMissing = true;
  } catch {
    persisted = false;
  }

  if (!persisted) hideInquiryId(owner, id);
}

/**
 * Live inbox updates for an open dashboard.
 * Dispatches `smoac:inquiry-updated` so list and open thread reload together.
 * Falls back to focus refresh when Realtime is not enabled yet.
 */
export function subscribeInquiryInbox(scope: {
  column: "client_user_id" | "specialist_id";
  value: string;
}): () => void {
  const supabase = getMarketplaceAuthClient();
  const value = scope.value.trim();
  if (!supabase || !value || typeof window === "undefined") return () => {};

  let timer = 0;
  const notify = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      window.dispatchEvent(new Event("smoac:inquiry-updated"));
    }, 400);
  };

  const channelName = `inquiry-inbox:${scope.column}:${value}`.replace(
    /[^a-zA-Z0-9:_-]/g,
    ""
  );

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "inquiry_conversations",
        filter: `${scope.column}=eq.${value}`,
      },
      notify
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "inquiry_messages" },
      notify
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "inquiry_messages" },
      notify
    )
    .subscribe();

  return () => {
    window.clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}
