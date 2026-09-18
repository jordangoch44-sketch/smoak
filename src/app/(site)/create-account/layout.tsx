import type { Viewport } from "next";
import "@/styles/login.css";
import "@/styles/create-account-wizard.css";
import "@/styles/specialist-onboarding-interview.css";
import "@/styles/profile-photo-cropper.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020203",
  /* Overlay the keyboard instead of resizing the visual viewport — otherwise
     Done/autofill collapse the interview card, then Continue animates a jump. */
  interactiveWidget: "overlays-content",
};

export default function CreateAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
