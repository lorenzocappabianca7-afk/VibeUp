import { cn } from "@/lib/utils";
import { Navigation } from "lucide-react";

interface DistanceBadgeProps {
  label: string;
  className?: string;
}

export function DistanceBadge({ label, className }: DistanceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-teal/15 px-2.5 py-1 text-[10px] font-semibold text-brand-teal",
        className,
      )}
    >
      <Navigation className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
