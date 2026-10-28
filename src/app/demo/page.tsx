"use client";

import { MobileShell } from "@/components/layout/mobile-shell";
import { isDemoExitToSite, useDemoMode } from "@/context/demo-mode-context";
import { isSiteLocale, writeDemoLanguage } from "@/lib/demo/language";
import { confirmVerifiedSignup, DEMO_SIGNUP_ID_STORAGE_KEY, demoEntryIdentity } from "@/lib/demo/signup-gate";
import { isUnlimitedDemoTesterEmail, rememberDemoTesterEmail } from "@/lib/demo/testers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DemoRoutePage() {
  const { isDemoMode, enterDemo } = useDemoMode();
  const router = useRouter();

  useEffect(() => {
    if (isDemoExitToSite() || isDemoMode) return;

    const token = new URLSearchParams(window.location.search).get("t")?.trim() ?? "";
    if (token) {
      let cancelled = false;
      void fetch("/api/launch/demo-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then((response) => response.json())
        .then((data: { ok?: boolean; signupId?: string; locale?: string }) => {
          if (cancelled || isDemoExitToSite()) return;
          if (data.ok !== true || typeof data.signupId !== "string" || !data.signupId) {
            router.replace("/#iscriviti");
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
          window.localStorage.setItem(DEMO_SIGNUP_ID_STORAGE_KEY, data.signupId);
          History.prototype.replaceState.call(window.history, window.history.state, "", "/demo");
          enterDemo();
        })
        .catch(() => {
          if (!cancelled) router.replace("/#iscriviti");
        });
      return () => {
        cancelled = true;
      };
    }

    const identity = demoEntryIdentity();
    if (!identity) {
      router.replace("/#iscriviti");
      return;
    }
    if (isUnlimitedDemoTesterEmail(identity.email)) {
      rememberDemoTesterEmail(identity.email);
      enterDemo();
      return;
    }
    if (!identity.signupId) {
      router.replace("/#iscriviti");
      return;
    }

    let cancelled = false;
    void confirmVerifiedSignup(identity.signupId).then((ok) => {
      if (cancelled || isDemoExitToSite()) return;
      if (!ok) {
        router.replace("/#iscriviti");
        return;
      }
      enterDemo();
    });
    return () => {
      cancelled = true;
    };
  }, [enterDemo, isDemoMode, router]);

  if (!isDemoMode) return null;
  return <MobileShell />;
}
