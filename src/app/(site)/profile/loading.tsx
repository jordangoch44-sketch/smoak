import "@/styles/profile-hub.css";

/** Instant shell while profile hub hydrates / redirects */
export default function ProfileLoading() {
  return (
    <div className="profile-hub profile-hub--loading" aria-busy="true">
      <p className="profile-hub__loading-text">Loading your profile…</p>
    </div>
  );
}
