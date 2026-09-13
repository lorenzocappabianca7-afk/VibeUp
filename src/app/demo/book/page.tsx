"use client";

import { DemoBookPage } from "@/components/demo/demo-book-page";
import { useDemoMode } from "@/context/demo-mode-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DemoBookRoutePage() {
  const { isDemoMode, selectedLocations, session } = useDemoMode();
  const router = useRouter();

  useEffect(() => {
    if (!isDemoMode) {
      router.replace("/");
      return;
    }
    if (session && selectedLocations.length === 0) {
      router.replace("/?tab=explore");
    }
  }, [isDemoMode, router, selectedLocations.length, session]);

  if (!isDemoMode) return null;
  return <DemoBookPage />;
}
