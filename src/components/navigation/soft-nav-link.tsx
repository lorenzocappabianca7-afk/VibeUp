"use client";

import Link from "next/link";
import { type ComponentProps, type ReactNode } from "react";

type SoftNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Soft App Router navigation for opening location/service previews.
 * Prefetch keeps taps instant; no hard reload (avoids double-nav races).
 * HardNavLink remains for home returns after long Safari sessions.
 */
export function SoftNavLink({
  href,
  children,
  className,
  prefetch = true,
  ...rest
}: SoftNavLinkProps) {
  return (
    <Link href={href} prefetch={prefetch} className={className} {...rest}>
      {children}
    </Link>
  );
}
