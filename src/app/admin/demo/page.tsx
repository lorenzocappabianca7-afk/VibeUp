import { CommunityPanel } from "@/components/admin/community-panel";
import { getServerAdminAccess } from "@/lib/auth/staff-access";
import { pageMetadata, STATIC_PAGE_METADATA } from "@/lib/seo";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = pageMetadata({
  ...STATIC_PAGE_METADATA.adminDemo,
});

export default async function AdminDemoPage() {
  const initialAccess = await getServerAdminAccess();
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-primary-black/50">Caricamento…</p>}>
      <CommunityPanel initialAccess={initialAccess} />
    </Suspense>
  );
}
