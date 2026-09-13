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
        "min-w-0 max-w-full [&>button]:box-border [&>button]:h-auto [&>button]:w-full [&>button]:max-w-full [&>button]:min-w-0 [&>button]:whitespace-nowrap [&>button]:rounded-2xl [&>button]:px-3 [&>button]:py-3.5 [&>button]:text-center [&>button]:text-[clamp(1.15rem,6.4vw,1.65rem)] [&>button]:font-bold [&>button]:leading-none",
        isDemoHomeLocked && "relative z-10 mt-4 [&>button]:mt-0",
      )}
      onClick={isDemoHomeLocked ? dismissHomeTip : undefined}
    >
      {children}
    </div>
  );
}
