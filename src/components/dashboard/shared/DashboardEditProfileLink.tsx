import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardEditProfileLinkProps {
  href?: string;
  className?: string;
}

/** Primary intro action on specialist dashboard */
export function DashboardEditProfileLink({
  href = "/specialist-dashboard/edit-profile",
  className,
}: DashboardEditProfileLinkProps) {
  return (
    <Link href={href} className={cn("dashboard-intro-cta", className)}>
      Edit Profile
    </Link>
  );
}
