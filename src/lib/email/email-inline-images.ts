import {
  EMAIL_MARK_PNG_BASE64,
  EMAIL_WORDMARK_PNG_BASE64,
} from "@/lib/email/email-brand-inline-data";

/** Content-IDs referenced after `rewriteEmailBrandImagesToCid`. */
export const EMAIL_BRAND_CID = {
  mark: "smoac-mark",
  wordmark: "smoac-wordmark",
} as const;

export interface ResendInlineImage {
  filename: string;
  content_id: string;
  content_type: "image/png";
  content: string;
}

const BRAND_INLINE_ASSETS = [
  {
    filename: "smoac-mark.png",
    contentId: EMAIL_BRAND_CID.mark,
    content: EMAIL_MARK_PNG_BASE64,
  },
  {
    filename: "smoac-wordmark.png",
    contentId: EMAIL_BRAND_CID.wordmark,
    content: EMAIL_WORDMARK_PNG_BASE64,
  },
] as const;

export function emailBrandInlineAttachments(): ResendInlineImage[] {
  return BRAND_INLINE_ASSETS.map((asset) => ({
    filename: asset.filename,
    content_id: asset.contentId,
    content_type: "image/png",
    content: asset.content,
  }));
}

/**
 * Point hosted brand PNGs at CID parts so Apple Mail does not have to
 * fetch localhost / LAN / Vercel URLs through Mail Privacy Protection.
 */
export function rewriteEmailBrandImagesToCid(html: string): string {
  return BRAND_INLINE_ASSETS.reduce((next, asset) => {
    const escaped = asset.filename.replaceAll(".", "\\.");
    const pattern = new RegExp(
      `src=(["'])[^"'\\\\]*${escaped}[^"'\\\\]*\\1`,
      "gi"
    );
    return next.replace(pattern, `src=$1cid:${asset.contentId}$1`);
  }, html);
}
