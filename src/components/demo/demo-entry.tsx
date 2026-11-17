"use client";

import { MobileShell } from "@/components/layout/mobile-shell";
import { isDemoExitToSite, useDemoMode } from "@/context/demo-mode-context";
import { brandTokens } from "@/lib/brand-tokens";
import { isSiteLocale, writeDemoLanguage } from "@/lib/demo/language";
import { markDemoFreshEntry } from "@/lib/demo/session";
import {
  confirmVerifiedSignup,
  DEMO_SIGNUP_ID_STORAGE_KEY,
  demoEntryIdentity,
  revalidateVerifiedSignup,
  trustSignupVerified,
} from "@/lib/demo/signup-gate";
import { useLayoutEffect, useRef } from "react";

function redirectToSignup() {
  if (window.location.pathname === "/" && window.location.hash === "#iscriviti") return;
  window.location.replace("/#iscriviti");
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

function rememberSignup(signupId: string) {
  try {
    window.localStorage.setItem(DEMO_SIGNUP_ID_STORAGE_KEY, signupId);
  } catch {
    // Private mode can block storage. The cookie still identifies a trusted entry.
  }
}

export function DemoEntry({ trustedSignupId }: { trustedSignupId: string | null }) {
  const { isDemoMode, enterDemo, exitDemo } = useDemoMode();
  const started = useRef(false);

  useLayoutEffect(() => {
    if (isDemoExitToSite() || isDemoMode || started.current) return;
    started.current = true;

    const token = new URLSearchParams(window.location.search).get("t")?.trim() ?? "";
    if (token) {
      void fetch("/api/launch/demo-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then((response) => response.json())
        .then((data: { ok?: boolean; signupId?: string; locale?: string }) => {
          if (isDemoExitToSite()) return;
          if (data.ok !== true || typeof data.signupId !== "string" || !data.signupId) {
            redirectToSignup();
            return;
          }
          if (isSiteLocale(data.locale)) {
            const active = document.documentElement.dataset.vibeupLang;
            writeDemoLanguage(data.locale);
            if (active !== data.locale) {
              window.location.replace(window.location.href);
              return;
            }
            window.__vibeupActivateDemoLang?.();
          }
          rememberSignup(data.signupId);
          trustSignupVerified(data.signupId);
          markDemoFreshEntry();
          History.prototype.replaceState.call(window.history, window.history.state, "", "/demo");
          enterDemo();
        })
        .catch(() => {
          redirectToSignup();
        });
      return;
    }

    const identity = demoEntryIdentity();
    const signupId = identity?.signupId ?? trustedSignupId;
    if (!signupId) {
      redirectToSignup();
      return;
    }
    if (!identity?.signupId) rememberSignup(signupId);
    const trusted = trustedSignupId === signupId;
    if (trusted) trustSignupVerified(signupId);
    enterDemo();
    void (trusted ? revalidateVerifiedSignup(signupId) : confirmVerifiedSignup(signupId)).then(
      (ok) => {
        if (ok !== false || isDemoExitToSite()) return;
        exitDemo();
        redirectToSignup();
      },
    );
  }, [enterDemo, exitDemo, isDemoMode, trustedSignupId]);

  if (!isDemoMode) return <DemoBootScreen />;
  return <MobileShell />;
}
