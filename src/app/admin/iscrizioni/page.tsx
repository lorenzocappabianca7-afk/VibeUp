import { SignupsPanel } from "@/components/admin/signups-panel";
import { pageMetadata, STATIC_PAGE_METADATA } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  ...STATIC_PAGE_METADATA.adminSignups,
});

export default function AdminSignupsPage() {
  return <SignupsPanel />;
}
