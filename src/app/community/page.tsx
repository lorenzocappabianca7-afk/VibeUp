import { PrelaunchLanding } from "@/components/home/prelaunch-landing";
import { landingCopy } from "@/content/landing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: landingCopy.metaTitle },
  description: landingCopy.metaDescription,
  robots: { index: false, follow: false },
};

/** Home of the pre-launch page once NEXT_PUBLIC_PLATFORM_LIVE is on. */
export default function CommunityPage() {
  return <PrelaunchLanding />;
}
