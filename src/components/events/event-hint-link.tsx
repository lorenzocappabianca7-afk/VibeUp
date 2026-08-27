import { cn } from "@/lib/utils";
import { ChevronDown, SquareArrowOutUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function EventHintLink({
  children,
  onClick,
  className,
  expanded,
  disabled,
  icon = "expand",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  expanded?: boolean;
  disabled?: boolean;
  icon?: "expand" | "external" | "none";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      className={cn(
        "inline-flex max-w-full items-center gap-1 text-left text-sm font-semibold underline decoration-current underline-offset-[3px] transition-colors hover:opacity-80 disabled:opacity-50",
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {icon === "expand" ? (
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-150",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      ) : icon === "external" ? (
        <SquareArrowOutUpRight
          className="h-3.5 w-3.5 shrink-0 opacity-70"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
