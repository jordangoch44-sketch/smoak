import { foundingCountdownGif } from "@/lib/email/founding-countdown-gif";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live Founding 100 countdown for the trainer outreach email. */
export function GET() {
  const body = foundingCountdownGif();
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
