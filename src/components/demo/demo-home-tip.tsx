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
        "[&>button]:h-auto [&>button]:w-full [&>button]:whitespace-normal [&>button]:rounded-2xl [&>button]:px-4 [&>button]:py-5 [&>button]:text-center [&>button]:text-[3rem] [&>button]:font-bold [&>button]:leading-tight",
        isDemoHomeLocked && "relative z-10 mt-4 [&>button]:mt-0",
      )}
      onClick={isDemoHomeLocked ? dismissHomeTip : undefined}
    >
      {children}
    </div>
  );
}
