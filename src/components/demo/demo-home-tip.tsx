"use client";

import { DemoGate } from "@/components/demo/demo-layer";
import { useDemoMode } from "@/context/demo-mode-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function DemoHomeTip({ children }: { children: ReactNode }) {
  return (
    <DemoGate>
      <DemoHomeTipInner>{children}</DemoHomeTipInner>
    </DemoGate>
  );
}

function DemoHomeTipInner({ children }: { children: ReactNode }) {
  const { session, landingState, homeTipDismissed, dismissHomeTip } =
    useDemoMode();
  const { activeTab } = useTabNavigation();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<DOMRect | null>(null);

  const visible =
    landingState === "ready" &&
    !!session &&
    !session.completed &&
    !homeTipDismissed &&
    activeTab === "home";

  useLayoutEffect(() => {
    if (!visible) {
      setBox(null);
      return;
    }

    const el = anchorRef.current;
    if (!el) return;

    const update = () => setBox(el.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [visible]);

  useEffect(() => {
    if (activeTab === "home" || homeTipDismissed || !session) return;
    dismissHomeTip();
  }, [activeTab, dismissHomeTip, homeTipDismissed, session]);

  return (
    <>
      <div ref={anchorRef} className="relative" onClick={dismissHomeTip}>
        {children}
      </div>
      {visible && box && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[60] w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-full"
              style={{
                left: box.left + box.width / 2,
                top: box.top - 10,
              }}
            >
              <div className="pointer-events-auto relative rounded-2xl bg-paper px-3 py-2.5 text-sm font-semibold text-ink-inverse shadow-xl">
                <p>Inizia da qui 👇</p>
                <button
                  type="button"
                  onClick={dismissHomeTip}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-xs font-bold text-primary-black shadow"
                  aria-label="Chiudi suggerimento"
                >
                  ×
                </button>
                <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-paper" />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** When demo mode is off, render children unchanged. */
export function DemoHomeCreateWrap({ children }: { children: ReactNode }) {
  const { isDemoMode } = useDemoMode();
  if (!isDemoMode) return children;
  return <DemoHomeTip>{children}</DemoHomeTip>;
}
