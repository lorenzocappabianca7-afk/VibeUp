import { PrelaunchDocument } from "@/components/home/prelaunch-document";
import { landingCopy } from "@/content/landing";
import { LEGAL_VERSIONS, privacyPage } from "@/content/legal";
import { getRequestLocale } from "@/lib/locale/server";
import { localize } from "@/lib/locale/translate";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: localize(locale, privacyPage).title,
    description: localize(locale, landingCopy).privacyBody,
    robots: { index: false, follow: false },
  };
}

export default function PrivacyPage() {
  return (
    <PrelaunchDocument
      todo={landingCopy.legalTodo}
      title={privacyPage.title}
      versionLabel={privacyPage.versionLabel}
      versionId={LEGAL_VERSIONS.privacy}
      sections={privacyPage.sections}
      extraLink={{ href: "/privacy/richiesta", label: privacyPage.manage }}
    />
  );
}
