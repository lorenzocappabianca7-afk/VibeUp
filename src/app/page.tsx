import { PrelaunchLanding } from "@/components/home/prelaunch-landing";
import { MobileShell } from "@/components/layout/mobile-shell";
import { landingCopy } from "@/content/landing";
import { getServerAdminAccess } from "@/lib/auth/staff-access";
import { isPlatformLive } from "@/lib/platform";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type HomeSearch = { app?: string | string[] };

function wantsAppPreview(app: string | string[] | undefined) {
  return app === "1" || (Array.isArray(app) && app.includes("1"));
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<HomeSearch>;
}): Promise<Metadata> {
  if (isPlatformLive()) return {};
  const params = await searchParams;
  if (wantsAppPreview(params.app) && (await getServerAdminAccess()) === "allowed") {
    return {};
  }
  return {
    title: { absolute: landingCopy.metaTitle },
    description: landingCopy.metaDescription,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearch>;
}) {
  if (isPlatformLive()) return <MobileShell />;
  const params = await searchParams;
  if (wantsAppPreview(params.app)) {
    if ((await getServerAdminAccess()) === "allowed") return <MobileShell />;
    redirect("/");
  }
  return <PrelaunchLanding />;
}
