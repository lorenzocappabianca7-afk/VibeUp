"use client";

import { DemoBookPage } from "@/components/demo/demo-book-page";
import { isDemoExitToSite, useDemoMode } from "@/context/demo-mode-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DemoBookRoutePage() {
  const { isDemoMode, landingState, selectedLocations, session } = useDemoMode();
  const router = useRouter();

  useEffect(() => {
    if (isDemoExitToSite()) return;
    if (!isDemoMode) {
      router.replace("/demo");
      return;
    }
    if (landingState === "loading") return;
    if (!session || selectedLocations.length === 0) {
      router.replace("/demo?tab=explore");
    }
  }, [isDemoMode, landingState, router, selectedLocations.length, session]);

  if (!isDemoMode) return null;
  return <DemoBookPage />;
}
