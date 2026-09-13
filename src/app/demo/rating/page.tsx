"use client";

import { DemoRatingPage } from "@/components/demo/demo-rating-page";
import { useDemoMode } from "@/context/demo-mode-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DemoRatingRoutePage() {
  const { isDemoMode, bookingConfirmed, landingState, session } = useDemoMode();
  const router = useRouter();

  useEffect(() => {
    if (!isDemoMode) {
      router.replace("/");
      return;
    }
    if (landingState === "form") {
      router.replace("/");
      return;
    }
    if (
      landingState === "ready" &&
      session &&
      !session.completed &&
      !bookingConfirmed
    ) {
      router.replace("/");
    }
  }, [bookingConfirmed, isDemoMode, landingState, router, session]);

  if (!isDemoMode) return null;
  return <DemoRatingPage />;
}
