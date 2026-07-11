import { MobileShell } from "@/components/layout/mobile-shell";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense>
      <MobileShell />
    </Suspense>
  );
}
