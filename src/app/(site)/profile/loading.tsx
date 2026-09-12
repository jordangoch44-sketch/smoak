import { PageWaitState } from "@/components/brand/PageWaitState";
import "@/styles/profile-hub.css";

/** Instant shell while profile hub hydrates / redirects */
export default function ProfileLoading() {
  return (
    <div className="profile-hub profile-hub--loading" aria-busy="true">
      <PageWaitState
        label="Loading your profile"
        className="page-wait-state--embedded"
      />
    </div>
  );
}
