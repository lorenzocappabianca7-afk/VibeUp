import { PrivacyRequest } from "@/components/home/privacy-request";
import { prelaunchCriticalCss } from "@/components/home/prelaunch-critical-css";
import { privacyRequestCopy } from "@/content/legal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: privacyRequestCopy.title },
  robots: { index: false, follow: false },
};

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
