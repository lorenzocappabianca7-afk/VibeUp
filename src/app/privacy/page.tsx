import { PrelaunchDocument } from "@/components/home/prelaunch-document";
import { landingCopy } from "@/content/landing";
import { LEGAL_VERSIONS, privacyPage } from "@/content/legal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: privacyPage.title,
  description: landingCopy.privacyBody,
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <PrelaunchDocument
      todo={landingCopy.legalTodo}
      title={privacyPage.title}
      version={`${privacyPage.versionLabel} ${LEGAL_VERSIONS.privacy}`}
      sections={privacyPage.sections}
      extraLink={{ href: "/privacy/richiesta", label: privacyPage.manage }}
    />
  );
}
