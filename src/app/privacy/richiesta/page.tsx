import { PrivacyRequest } from "@/components/home/privacy-request";
import { prelaunchCriticalCss } from "@/components/home/prelaunch-critical-css";
import { privacyRequestCopy } from "@/content/legal";
import { getRequestLocale } from "@/lib/locale/server";
import { localize } from "@/lib/locale/translate";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: localize(await getRequestLocale(), privacyRequestCopy).title },
    robots: { index: false, follow: false },
  };
}

export default function PrivacyRequestPage() {
  return (
    <>
      <style>{prelaunchCriticalCss}</style>
      <div data-prelaunch-landing>
        <PrivacyRequest />
      </div>
    </>
  );
}
