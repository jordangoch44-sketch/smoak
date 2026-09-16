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
  interactiveWidget: "resizes-visual",
};

export default function CreateAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
