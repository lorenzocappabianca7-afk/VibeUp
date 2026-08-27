"use client";

import dynamic from "next/dynamic";

const AppCssLoader = dynamic(() => import("@/components/app-css-loader"), {
  ssr: false,
});

/** Client gate: Next 16 forbids `ssr: false` on `next/dynamic` in Server Components. */
export function AppCssLoaderGate() {
  return <AppCssLoader />;
}
