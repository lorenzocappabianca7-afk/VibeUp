import { PrelaunchDocument } from "@/components/home/prelaunch-document";
import { landingCopy } from "@/content/landing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: landingCopy.rulesHeading,
  description: landingCopy.rulesBody,
  robots: { index: false, follow: false },
};

export default function RegolamentoPage() {
  return (
    <PrelaunchDocument
      todo={landingCopy.legalTodo}
      title={landingCopy.rulesHeading}
      body={landingCopy.rulesBody}
    />
  );
}
