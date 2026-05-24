import type { Metadata } from "next";
import { LoginPageClient } from "@/components/auth";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to SMOAC as a client or wellness specialist.",
};

export default function LoginPage() {
  return <LoginPageClient />;
}
