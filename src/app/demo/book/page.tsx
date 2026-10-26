"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DemoBookRoutePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/demo?tab=explore");
  }, [router]);

  return null;
}
