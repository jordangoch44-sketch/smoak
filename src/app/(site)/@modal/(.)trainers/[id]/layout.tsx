import "@/styles/profile.css";
import "@/styles/profile-sheet.css";
import "@/styles/trainer-market-value.css";
import "@/styles/inquiry.css";

/** Soft-nav intercept of `/trainers/[id]` — same styles as the full profile route. */
export default function InterceptedTrainerProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
