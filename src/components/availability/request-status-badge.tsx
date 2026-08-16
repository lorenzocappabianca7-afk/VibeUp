"use client";

import {
  getEventStatusPresentation,
  getRequestStatusPresentation,
} from "@/lib/availability/request-status-display";
import { cn } from "@/lib/utils";
import type { AvailabilityRequestStatus } from "@/types/availability-request";
import type { EventStatus } from "@/types/event";

type RequestStatusBadgeProps = {
  className?: string;
  size?: "sm" | "md";
} & (
  | {
      kind?: "request";
      status: AvailabilityRequestStatus;
      confirmationDeadline?: string | null;
    }
  | {
      kind: "event";
      status: EventStatus;
      confirmationDeadline?: never;
    }
);

export function RequestStatusBadge(props: RequestStatusBadgeProps) {
  const presentation =
    props.kind === "event"
      ? getEventStatusPresentation({ status: props.status })
      : getRequestStatusPresentation({
          status: props.status,
          confirmationDeadline: props.confirmationDeadline,
        });

  const sizeClass =
    props.size === "md"
      ? "px-2.5 py-1 text-xs"
      : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full font-semibold leading-tight",
        sizeClass,
        presentation.badgeClassName,
        props.className,
      )}
      title={presentation.label}
    >
      <span className="truncate">{presentation.label}</span>
    </span>
  );
}
