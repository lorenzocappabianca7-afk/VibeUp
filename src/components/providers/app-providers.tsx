"use client";

import { AppStateProvider } from "@/context/app-state-context";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}
