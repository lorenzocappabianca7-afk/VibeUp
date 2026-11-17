"use client";

import { MobileShell } from "@/components/layout/mobile-shell";
import { isDemoExitToSite, useDemoMode } from "@/context/demo-mode-context";
import { brandTokens } from "@/lib/brand-tokens";
import { isSiteLocale, writeDemoLanguage } from "@/lib/demo/language";
import { markDemoFreshEntry, readDemoSession } from "@/lib/demo/session";
import {
  demoEntryIdentity,
  ensureSignupKnown,
  rememberDemoSignupId,
  trustSignupVerified,
} from "@/lib/demo/signup-gate";
import { useLayoutEffect, useRef } from "react";

let entryGeneration = 0;

function redirectToSignup() {
  if (window.location.pathname === "/" && window.location.hash === "#iscriviti") return;
  window.location.replace("/#iscriviti");
}

function redirectHome() {
  if (window.location.pathname === "/" && window.location.hash === "") return;
  window.location.replace("/");
}

const bootCss = `
.vu-demo-boot {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${brandTokens.background};
}
.vu-demo-boot-mark {
  opacity: 0;
  text-align: center;
  animation: vuDemoBootIn 0.18s ease 300ms forwards;
}
.vu-demo-boot-word {
  display: block;
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -1.2px;
  line-height: 0.95;
  color: #f4f5f7;
}
.vu-demo-boot-script {
  display: block;
  margin-top: 2px;
  font-family: var(--font-events-script), cursive;
  font-size: 28px;
  line-height: 1;
  color: #f4f5f7;
}
.vu-demo-boot-dot {
  width: 6px;
  height: 6px;
  margin: 16px auto 0;
  border-radius: 999px;
  background: ${brandTokens.teal};
  opacity: 0;
  animation: vuDemoBootIn 0.18s ease 300ms forwards, vuDemoBootPulse 1.1s ease-in-out 300ms infinite;
}
@keyframes vuDemoBootIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}
@keyframes vuDemoBootPulse {
  50% { transform: scale(0.55); opacity: 0.4; }
}
@media (prefers-reduced-motion: reduce) {
  .vu-demo-boot-mark { animation: vuDemoBootIn 0.01s linear 300ms forwards; }
  .vu-demo-boot-dot { animation: none; }
}
`.trim();

function DemoBootScreen() {
  return (
    <div className="vu-demo-boot" role="status" aria-label="Caricamento">
      <style>{bootCss}</style>
      <div className="vu-demo-boot-mark">
        <span className="vu-demo-boot-word">
          <span style={{ color: brandTokens.teal }}>V</span>
          ibe
          <span style={{ color: brandTokens.pink }}>U</span>
          p
        </span>
        <span className="vu-demo-boot-script">events</span>
        <div className="vu-demo-boot-dot" />
      </div>
    </div>
  );
}

export function DemoEntry({ trustedSignupId }: { trustedSignupId: string | null }) {
  const { isDemoMode, enterDemo, exitDemo } = useDemoMode();
  const started = useRef(false);

  useLayoutEffect(() => {
    if (isDemoExitToSite() || started.current) return;
    const token = new URLSearchParams(window.location.search).get("t")?.trim() ?? "";
    // A token must be checked even when a previous demo is still on screen.
    // Otherwise a bad link keeps the open demo and leaves ?t= in the address.
    if (!token && (isDemoMode || started.current)) return;
    started.current = true;
    const generation = ++entryGeneration;
    const still = () => generation === entryGeneration && !isDemoExitToSite();

    if (token) {
      void fetch("/api/launch/demo-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then((response) => response.json())
        .then((data: { ok?: boolean; signupId?: string; locale?: string }) => {
          if (!still()) return;
          if (data.ok !== true || typeof data.signupId !== "string" || !data.signupId) {
            redirectHome();
            return;
          }
          rememberDemoSignupId(data.signupId);
          trustSignupVerified(data.signupId);
          markDemoFreshEntry();
          const nextLocale = isSiteLocale(data.locale) ? data.locale : null;
          if (nextLocale) writeDemoLanguage(nextLocale);
          History.prototype.replaceState.call(window.history, window.history.state, "", "/demo");
          const active = document.documentElement.dataset.vibeupLang;
          if (isDemoMode || (nextLocale && active !== nextLocale)) {
            window.location.replace("/demo");
            return;
          }
          window.__vibeupActivateDemoLang?.();
          enterDemo();
        })
        .catch(() => {
          if (still()) redirectHome();
        });
      return;
    }

    const identity = demoEntryIdentity();
    const signupId = identity?.signupId ?? trustedSignupId;
    if (!signupId) {
      redirectToSignup();
      return;
    }
    if (!identity?.signupId) rememberDemoSignupId(signupId);
    const trusted = trustedSignupId === signupId;
    const completedHere = readDemoSession()?.completed === true;
    if (trusted && !completedHere) {
      trustSignupVerified(signupId);
      enterDemo();
    }
    void ensureSignupKnown(signupId).then((ok) => {
      if (!still()) return;
      if (ok === false) {
        exitDemo();
        redirectToSignup();
        return;
      }
      if (ok === null || isDemoMode) return;
      enterDemo();
    });
  }, [enterDemo, exitDemo, isDemoMode, trustedSignupId]);

  if (!isDemoMode) return <DemoBootScreen />;
  return <MobileShell />;
}
