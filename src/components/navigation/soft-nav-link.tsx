"use client";

import Link from "next/link";
import { type ComponentProps, type ReactNode } from "react";
import { useDemoMode } from "@/context/demo-mode-context";

type SoftNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  children: ReactNode;
};

function isLocationDetailHref(href: string) {
  const path = href.split(/[?#]/, 1)[0] ?? href;
  return path === "/location" || path.startsWith("/location/");
}

/**
 * Soft App Router navigation for opening location/service previews.
 * Prefetch keeps taps instant; no hard reload (avoids double-nav races).
 * HardNavLink remains for home returns after long Safari sessions.
 * In the demo a location href stays on the page: the detail is easy to get lost in.
 */
export function SoftNavLink({
  href,
  children,
  className,
  prefetch = true,
  ...rest
}: SoftNavLinkProps) {
  const { isDemoMode } = useDemoMode();
  if (isDemoMode && isLocationDetailHref(href)) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={href} prefetch={prefetch} className={className} {...rest}>
      {children}
    </Link>
  );
}
