import { pageMetadata, STATIC_PAGE_METADATA } from "@/lib/seo";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = pageMetadata({
  ...STATIC_PAGE_METADATA.adminSignups,
});

export default function AdminSignupsPage() {
  redirect("/admin/demo?tab=iscritti");
}
