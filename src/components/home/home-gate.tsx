"use client";

import { PrelaunchLanding } from "@/components/home/prelaunch-landing";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useAppState } from "@/context/app-state-context";
import { isStaffRole } from "@/lib/platform";

export function HomeGate({ initialStaff }: { initialStaff: boolean }) {
  const { currentUser, isBusinessUser, isStorageHydrated } = useAppState();
  const staff = isStorageHydrated
    ? isBusinessUser || isStaffRole(currentUser.role)
    : initialStaff;

  if (staff) return <MobileShell />;
  return <PrelaunchLanding />;
}
