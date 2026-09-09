import { pageMetadata, STATIC_PAGE_METADATA } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  ...STATIC_PAGE_METADATA.activate,
});

export default function ActivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
