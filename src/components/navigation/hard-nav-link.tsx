"use client";

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

  return (
    <a href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
