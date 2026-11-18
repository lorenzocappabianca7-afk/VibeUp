import { PrelaunchLandingPage } from "@/components/home/prelaunch-landing-page";
import { landingCopy } from "@/content/landing";
import { getRequestLocale } from "@/lib/locale/server";
import { localize } from "@/lib/locale/translate";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const copy = localize(await getRequestLocale(), landingCopy);
  return {
    title: { absolute: copy.metaTitle },
    description: copy.metaDescription,
    robots: { index: false, follow: false },
  };
}

/** Home of the pre-launch page once NEXT_PUBLIC_PLATFORM_LIVE is on. */
export default function CommunityPage() {
  return <PrelaunchLandingPage />;
}
