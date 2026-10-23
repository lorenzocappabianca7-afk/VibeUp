import { HomeGate } from "@/components/home/home-gate";
import { MobileShell } from "@/components/layout/mobile-shell";
import { landingCopy } from "@/content/landing";
import { isServerStaffUser } from "@/lib/auth/staff-access";
import { isPlatformLive } from "@/lib/platform";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  if (isPlatformLive()) return {};
  if (await isServerStaffUser()) return {};
  return {
    title: { absolute: landingCopy.metaTitle },
    description: landingCopy.metaDescription,
  };
}

export default async function Home() {
  if (isPlatformLive()) return <MobileShell />;
  const initialStaff = await isServerStaffUser();
  return <HomeGate initialStaff={initialStaff} />;
}
