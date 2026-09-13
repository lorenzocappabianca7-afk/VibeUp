import { DemoResponsesPanel } from "@/components/admin/demo-responses-panel";
import { pageMetadata, STATIC_PAGE_METADATA } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  ...STATIC_PAGE_METADATA.adminDemo,
});

export default function AdminDemoPage() {
  return <DemoResponsesPanel />;
}
