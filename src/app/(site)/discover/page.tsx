import { redirect } from "next/navigation";
import { buildJoinFlowHref } from "@/lib/join-flow";

/** Legacy route — bottom nav now uses Join → create-account flow */
export default function DiscoverPage() {
  redirect(buildJoinFlowHref());
}
