import {
  EMAIL_MARK_PNG_BASE64,
  EMAIL_WORDMARK_PNG_BASE64,
} from "@/lib/email/email-brand-inline-data";
import { TRAINER_MAP_PHONE_JPEG_BASE64 } from "@/lib/email/trainer-map-phone-inline";

/** Content-IDs referenced after `rewriteEmailBrandImagesToCid`. */
export const EMAIL_BRAND_CID = {
  mark: "smoac-mark",
  wordmark: "smoac-wordmark",
  trainerMapPhone: "smoac-trainer-map",
} as const;

export interface ResendInlineImage {
  filename: string;
  content_id: string;
  content_type: "image/png" | "image/jpeg";
  content: string;
}

const INLINE_ASSETS: Array<{
  filename: string;
  contentId: string;
  contentType: ResendInlineImage["content_type"];
  content: string;
}> = [
  {
    filename: "smoac-mark.png",
    contentId: EMAIL_BRAND_CID.mark,
    contentType: "image/png",
    content: EMAIL_MARK_PNG_BASE64,
  },
  {
    filename: "smoac-wordmark.png",
    contentId: EMAIL_BRAND_CID.wordmark,
    contentType: "image/png",
    content: EMAIL_WORDMARK_PNG_BASE64,
  },
  {
    filename: "trainer-map-phone.jpg",
    contentId: EMAIL_BRAND_CID.trainerMapPhone,
    contentType: "image/jpeg",
    content: TRAINER_MAP_PHONE_JPEG_BASE64,
  },
];

export function emailBrandInlineAttachments(): ResendInlineImage[] {
  return INLINE_ASSETS.filter((asset) => asset.contentType === "image/png").map(
    (asset) => ({
      filename: asset.filename,
      content_id: asset.contentId,
      content_type: asset.contentType,
      content: asset.content,
    })
  );
}

/** Attach only the images this HTML actually references. */
export function emailInlineAttachmentsForHtml(html: string): ResendInlineImage[] {
  return INLINE_ASSETS.filter((asset) =>
    html.includes(`cid:${asset.contentId}`)
  ).map((asset) => ({
    filename: asset.filename,
    content_id: asset.contentId,
    content_type: asset.contentType,
    content: asset.content,
  }));
}

/**
 * Point hosted brand PNGs at CID parts so Apple Mail does not have to
 * fetch localhost / LAN / Vercel URLs through Mail Privacy Protection.
 */
export function rewriteEmailBrandImagesToCid(html: string): string {
  return INLINE_ASSETS.reduce((next, asset) => {
    const escaped = asset.filename.replaceAll(".", "\\.");
    const pattern = new RegExp(
      `src=(["'])[^"'\\\\]*${escaped}[^"'\\\\]*\\1`,
      "gi"
    );
    return next.replace(pattern, `src=$1cid:${asset.contentId}$1`);
  }, html);
}
