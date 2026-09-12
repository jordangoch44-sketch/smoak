import { PageWaitState } from "@/components/brand/PageWaitState";

export default function RankingsLoading() {
  return (
    <div className="rankings-page" aria-busy="true">
      <PageWaitState label="Loading rankings" />
    </div>
  );
}
