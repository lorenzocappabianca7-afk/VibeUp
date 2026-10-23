"use client";

import { DemoRatingPage } from "@/components/demo/demo-rating-page";
import { isDemoExitToSite, useDemoMode } from "@/context/demo-mode-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DemoRatingRoutePage() {
  const { isDemoMode, bookingConfirmed, landingState, session } = useDemoMode();
  const router = useRouter();

  useEffect(() => {
    if (isDemoExitToSite()) return;
    if (!isDemoMode) {
      router.replace("/demo");
      return;
    }
    if (landingState === "loading") return;
    if (landingState === "error") {
      router.replace("/demo");
      return;
    }
    if (
      landingState === "ready" &&
      (!session || session.completed || !bookingConfirmed)
    ) {
      router.replace("/demo");
    }
  }, [bookingConfirmed, isDemoMode, landingState, router, session]);

  if (!isDemoMode) return null;
  return <DemoRatingPage />;
}
