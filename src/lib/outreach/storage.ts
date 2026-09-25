import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";

export function outreachService(): SupabaseClient | null {
  return createSupabaseServiceClient();
}

export function outreachStorageError(message: string, fallback: string): string {
  if (
    /relation .* does not exist|Could not find the table|schema cache|column .* does not exist/i.test(
      message
    )
  ) {
    return "Apply the outreach CRM migration, then reload this page.";
  }
  return fallback;
}

export function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function selectInChunks<T>(
  ids: string[],
  load: (chunk: string[]) => Promise<T[]>
): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < ids.length; index += 200) {
    rows.push(...(await load(ids.slice(index, index + 200))));
  }
  return rows;
}
