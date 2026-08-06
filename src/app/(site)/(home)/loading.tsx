import { HomeRouteLoading } from "@/components/home/HomeRouteLoading";

/** Shows immediately on soft nav to `/` while catalog / reviews load */
export default function SiteHomeLoading() {
  return <HomeRouteLoading />;
}
