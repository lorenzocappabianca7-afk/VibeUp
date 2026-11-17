"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import {
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

type HardNavLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "onClick"
> & {
  href: string;
  children: ReactNode;
};

function isLocationDetailHref(href: string) {
  const path = href.split(/[?#]/, 1)[0] ?? href;
  return path === "/location" || path.startsWith("/location/");
}

/**
 * Same-origin link that always does a full document navigation.
 * Next.js App Router intercepts plain <a> / <Link> into RSC soft nav;
 * after long PWA sessions that soft path often dies with Safari’s
 * “This page couldn’t load”.
 */
export function HardNavLink({
  href,
  children,
  className,
  ...rest
}: HardNavLinkProps) {
  const { isDemoMode } = useDemoMode();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    window.location.assign(href);
  }

  if (isDemoMode && isLocationDetailHref(href)) {
    return <span className={className}>{children}</span>;
  }

  return (
    <a href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
