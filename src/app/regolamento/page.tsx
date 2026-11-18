import { PrelaunchDocument } from "@/components/home/prelaunch-document";
import { landingCopy } from "@/content/landing";
import { getRequestLocale } from "@/lib/locale/server";
import { localize } from "@/lib/locale/translate";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = localize(locale, landingCopy);
  return {
    title: copy.rulesHeading,
    description: copy.rulesBody,
    robots: { index: false, follow: false },
  };
}

export default function RegolamentoPage() {
  return (
    <PrelaunchDocument
      todo={landingCopy.legalTodo}
      title={landingCopy.rulesHeading}
      body={landingCopy.rulesBody}
    />
  );
}
