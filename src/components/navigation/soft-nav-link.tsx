"use client";

import Link from "next/link";
import {
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

type SoftNavLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * In-app soft navigation for opening location/service previews.
 * Prefetches the destination and uses the App Router so taps feel instant.
 * Falls back to a full assign only if soft nav does not land within ~1.2s
 * (Safari edge cases after long idle sessions).
 */
export function SoftNavLink({
  href,
  children,
  className,
  onClick,
  prefetch = true,
  ...rest
}: SoftNavLinkProps) {
  const router = useRouter();
  const pendingRef = useRef(false);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
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
    if (pendingRef.current) return;
    pendingRef.current = true;

    const startHref = window.location.href;
    const fallbackTimer = window.setTimeout(() => {
      if (window.location.href === startHref) {
        window.location.assign(href);
      }
      pendingRef.current = false;
    }, 1200);

    try {
      router.push(href);
    } catch {
      window.clearTimeout(fallbackTimer);
      pendingRef.current = false;
      window.location.assign(href);
      return;
    }

    const startedAt = Date.now();
    const poll = window.setInterval(() => {
      if (window.location.href !== startHref || Date.now() - startedAt > 1500) {
        window.clearInterval(poll);
        window.clearTimeout(fallbackTimer);
        pendingRef.current = false;
      }
    }, 40);
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={className}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Link>
  );
}
