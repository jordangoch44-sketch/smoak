import type { Metadata } from "next";
import { SavedPageClient } from "@/components/saved/SavedPageClient";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Saved Specialists",
  ...NOINDEX_FOLLOW_NONE,
};

export default function SavedPage() {
  return <SavedPageClient />;
}
