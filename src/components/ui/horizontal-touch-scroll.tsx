"use client";

import { attachAxisLockedHorizontalScroll } from "@/lib/axis-locked-horizontal-scroll";
import { cn } from "@/lib/utils";
import { useEffect, useRef, type ReactNode } from "react";

/** pan-y: vertical page scroll stays native. Horizontal is JS-locked. */
export const HORIZONTAL_TOUCH_SCROLL_CLASS =
  "overflow-x-auto overflow-y-clip overscroll-x-contain touch-pan-y [-webkit-overflow-scrolling:touch]";

interface HorizontalTouchScrollProps {
  className?: string;
  children: ReactNode;
}

export function HorizontalTouchScroll({
  className,
  children,
}: HorizontalTouchScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return attachAxisLockedHorizontalScroll(node);
  }, []);

  return (
    <div ref={ref} className={cn(HORIZONTAL_TOUCH_SCROLL_CLASS, className)}>
      {children}
    </div>
  );
}
