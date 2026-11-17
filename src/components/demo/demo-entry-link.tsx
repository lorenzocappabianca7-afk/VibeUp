"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const pressedCss = `
.vu-demo-entry:active,
.vu-demo-entry[data-pending] {
  opacity: 0.72;
  transform: scale(0.985);
}
`.trim();

/** Prefetches the demo when the control is on screen, and paints a pressed state on touch. */
export function DemoEntryLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const node = linkRef.current;
    if (!node) return;
    let done = false;
    const prefetch = () => {
      if (done) return;
      done = true;
      router.prefetch(href);
    };
    const visible = () => {
      const rect = node.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
    };
    if (visible()) prefetch();
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) prefetch();
          });
    observer?.observe(node);
    const scroller = node.closest("[data-prelaunch-landing]");
    const onScroll = () => {
      if (visible()) prefetch();
    };
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer?.disconnect();
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, [href, router]);

  return (
    <>
      <style>{pressedCss}</style>
      <a
        ref={linkRef}
        href={href}
        className={className ? `${className} vu-demo-entry` : "vu-demo-entry"}
        data-pending={pending ? "" : undefined}
        aria-busy={pending || undefined}
        onPointerDown={() => setPending(true)}
        onClick={() => setPending(true)}
      >
        {children}
      </a>
    </>
  );
}
