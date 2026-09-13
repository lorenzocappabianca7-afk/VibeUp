"use client";

import { DemoRatingPage } from "@/components/demo/demo-rating-page";
import { useDemoMode } from "@/context/demo-mode-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DemoRatingRoutePage() {
  const { isDemoMode } = useDemoMode();
  const router = useRouter();

  useEffect(() => {
    if (!isDemoMode) router.replace("/");
  }, [isDemoMode, router]);

  if (!isDemoMode) return null;
  return <DemoRatingPage />;
}
