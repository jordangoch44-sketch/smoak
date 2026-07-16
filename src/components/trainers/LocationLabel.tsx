import { formatProviderLocation } from "@/lib/provider-location";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/types";

interface LocationLabelProps {
  provider: Pick<Trainer, "city" | "neighborhood">;
  className?: string;
  as?: "p" | "span";
}

/** Renders neighborhood/city, or nothing when both are empty. */
export function LocationLabel({
  provider,
  className,
  as: Tag = "p",
}: LocationLabelProps) {
  const label = formatProviderLocation(provider);
  if (!label) return null;

  return <Tag className={cn("provider-location", className)}>{label}</Tag>;
}
