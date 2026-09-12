import { PageWaitState } from "@/components/brand/PageWaitState";
import "@/styles/saved-panel.css";

/** Instant shell while /saved client tree mounts */
export default function SavedLoading() {
  return (
    <div
      className="saved-page-route saved-page-route--fill saved-page-route--loading relative overflow-hidden px-4 sm:px-6"
      aria-busy="true"
    >
      <div className="saved-page-route__content">
        <PageWaitState label="Loading saved" />
      </div>
    </div>
  );
}
