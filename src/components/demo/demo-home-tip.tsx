"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import type { ReactNode } from "react";

/** When demo mode is off, render children unchanged. */
export function DemoHomeCreateWrap({ children }: { children: ReactNode }) {
  const { isDemoMode, isDemoHomeLocked, dismissHomeTip } = useDemoMode();
  if (!isDemoMode) return children;

  return (
    <div onClick={isDemoHomeLocked ? dismissHomeTip : undefined}>
      {children}
    </div>
  );
}
