import "@/styles/profile-hub.css";

/** Instant shell while /saved client tree mounts */
export default function SavedLoading() {
  return (
    <div
      className="saved-page-route saved-page-route--fill saved-page-route--loading relative overflow-hidden px-4 sm:px-6"
      aria-busy="true"
    >
      <div className="saved-page-route__content">
        <p className="profile-hub__loading-text">Loading saved…</p>
      </div>
    </div>
  );
}
