import { cn } from "@/lib/utils";

type ProfileSectionVariant = "plain" | "panel";

interface ProfileSectionProps {
  children: React.ReactNode;
  variant?: ProfileSectionVariant;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export function ProfileSection({
  children,
  variant = "plain",
  className,
  id,
  "aria-label": ariaLabel,
}: ProfileSectionProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn(
        "profile-section",
        variant === "panel" && "profile-section--panel",
        className
      )}
    >
      {children}
    </section>
  );
}
