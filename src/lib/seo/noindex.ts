import type { Metadata } from "next";

/** Auth, account, and private app surfaces — keep out of Google index. */
export const NOINDEX_FOLLOW_NONE: Metadata = {
  robots: { index: false, follow: false },
};
