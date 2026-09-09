import { ProtectedCatalogManager } from "@/components/admin/protected-catalog-manager";
import { pageMetadata, STATIC_PAGE_METADATA } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  ...STATIC_PAGE_METADATA.adminCatalog,
});

export default function AdminCatalogPage() {
  return <ProtectedCatalogManager />;
}
