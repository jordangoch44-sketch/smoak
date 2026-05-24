import type { Metadata } from "next";
import { CreateAccountWizardClient } from "@/components/auth/CreateAccountWizardClient";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Join SMOAC — find specialists as a client or get discovered as a health & wellness professional.",
};

export default function CreateAccountPage() {
  return <CreateAccountWizardClient />;
}
