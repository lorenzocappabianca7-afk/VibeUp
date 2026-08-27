import { cn } from "@/lib/utils";
import { SquareArrowOutUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function EventHintLink({
  children,
  onClick,
  className,
  expanded,
  icon = "external",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  expanded?: boolean;
  icon?: "external" | "none";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 text-left text-sm font-semibold underline decoration-current underline-offset-[3px] transition-colors hover:opacity-80",
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {icon === "external" ? (
        <SquareArrowOutUpRight
          className="h-3.5 w-3.5 shrink-0 text-primary-black/40"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
