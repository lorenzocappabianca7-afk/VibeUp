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
        "demo-home-create-wrap min-w-0 max-w-full",
        isDemoHomeLocked && "relative z-10 mt-4",
      )}
      onClick={isDemoHomeLocked ? dismissHomeTip : undefined}
    >
      <style>{`
        .demo-home-create-wrap > button {
          box-sizing: border-box;
          display: flex;
          height: auto;
          min-height: 6.75rem;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          margin-top: 0;
          white-space: nowrap;
          border-radius: 1rem;
          padding: 2.5rem 0.75rem;
          text-align: center;
          font-size: clamp(1.15rem, 6.4vw, 1.65rem);
          font-weight: 700;
          line-height: 1;
        }
      `}</style>
      {children}
    </div>
  );
}
