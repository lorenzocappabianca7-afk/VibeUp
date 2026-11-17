"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import { useDemoLockedTab } from "@/lib/demo/chrome-lock";
import type { ReactNode } from "react";

/** When demo mode is off, render children unchanged. */
export function DemoHomeCreateWrap({ children }: { children: ReactNode }) {
  const { isDemoMode, isDemoHomeLocked, dismissHomeTip } = useDemoMode();
  const partyFirst = useDemoLockedTab() === "home";
  if (!isDemoMode) return children;

  return (
    <div className={partyFirst ? "relative" : undefined} onClick={isDemoHomeLocked ? dismissHomeTip : undefined}>
      {partyFirst ? (
        <span className="vu-demo-create-ring pointer-events-none absolute -inset-1.5 rounded-[22px]" aria-hidden />
      ) : null}
      {children}
    </div>
  );
}
