import { cn } from "@/lib/utils";
import { SquareArrowOutUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function EventHintLink({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 text-left text-sm font-semibold underline decoration-primary-black/45 underline-offset-[3px] transition-colors hover:decoration-primary-black",
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      <SquareArrowOutUpRight
        className="h-3.5 w-3.5 shrink-0 text-primary-black/40"
        aria-hidden
      />
    </button>
  );
}
