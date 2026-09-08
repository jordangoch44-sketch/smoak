import {
  CLIENT_DASHBOARD_PATH,
  SPECIALIST_DASHBOARD_INQUIRIES_HREF,
} from "@/lib/auth-routes";

export function inquiryThreadHref(
  viewer: "client" | "specialist",
  conversationId: string
): string {
  const id = encodeURIComponent(conversationId.trim());
  if (viewer === "client") {
    return `${CLIENT_DASHBOARD_PATH}?tab=messages&c=${id}`;
  }
  return `${SPECIALIST_DASHBOARD_INQUIRIES_HREF}&c=${id}`;
}

export function isDemoInquiryConversationId(id: string): boolean {
  return id.startsWith("lead-");
}
