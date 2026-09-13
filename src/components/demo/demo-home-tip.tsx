"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** When demo mode is off, render children unchanged. */
export function DemoHomeCreateWrap({ children }: { children: ReactNode }) {
  const { isDemoMode, isDemoHomeLocked, dismissHomeTip } = useDemoMode();
  if (!isDemoMode) return children;

  return (
    <div
      className={cn(
        isDemoHomeLocked &&
          "relative z-10 mt-4 [&>button]:mt-0 [&>button]:h-[8.25rem] [&>button]:w-full [&>button]:text-base",
      )}
      onClick={isDemoHomeLocked ? dismissHomeTip : undefined}
    >
      {children}
    </div>
  );
}
