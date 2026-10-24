"use client";

import { PrelaunchCommunity } from "@/components/home/prelaunch-community";
import { prelaunchCriticalCss } from "@/components/home/prelaunch-critical-css";
import { PrelaunchDemoSection } from "@/components/home/prelaunch-demo-section";
import { PrelaunchFooter } from "@/components/home/prelaunch-footer";
import { PrelaunchHero } from "@/components/home/prelaunch-hero";
import { PrelaunchMarquee } from "@/components/home/prelaunch-marquee";
import { PrelaunchPreview } from "@/components/home/prelaunch-preview";
import { SignupFlow } from "@/components/home/signup-flow";
import { landingCopy } from "@/content/landing";
import { isContestOver } from "@/config/contest";
import { readDemoSignupId, readVerifiedMember, type VerifiedMemberCard } from "@/lib/demo/signup-gate";
import { rememberSignupReferral } from "@/lib/launch/draft";
import { isVibeUpCode, normalizeCode } from "@/lib/launch/fields";
import { readRememberedDemoTesterEmail } from "@/lib/demo/testers";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";

function scrollToLanding(id: string) {
  const root = document.querySelector("[data-prelaunch-landing]");
  const node = document.getElementById(id);
  if (!(root instanceof HTMLElement) || !node) return;
  const top =
    node.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
  root.scrollTo({ top: Math.max(0, top - 12), behavior: "auto" });
}

export function PrelaunchLanding({ startSignup = false }: { startSignup?: boolean }) {
  const router = useRouter();
  const [signupOpen, setSignupOpen] = useState(startSignup);
  const [canEnterDemo, setCanEnterDemo] = useState(false);
  const [member, setMember] = useState<VerifiedMemberCard | null>(null);
  const contestOver = isContestOver();

  useLayoutEffect(() => {
    document.title = landingCopy.metaTitle;
    const params = new URLSearchParams(window.location.search);
    const ref = normalizeCode(params.get("ref") ?? "");
    if (isVibeUpCode(ref)) rememberSignupReferral(ref);
    if (readRememberedDemoTesterEmail()) {
      queueMicrotask(() => setCanEnterDemo(true));
    }
    const signupId = readDemoSignupId();
    if (signupId) {
      void readVerifiedMember(signupId).then((card) => {
        if (!card) return;
        setMember(card);
        setCanEnterDemo(true);
      });
    }
    const hash = window.location.hash;
    if (hash !== "#iscriviti" && hash !== "#demo") return;
    const id = hash.slice(1);
    scrollToLanding(id);
    const again = requestAnimationFrame(() => scrollToLanding(id));
    return () => cancelAnimationFrame(again);
  }, []);

  function openSignup() {
    const root = document.querySelector("[data-prelaunch-landing]");
    if (root instanceof HTMLElement && !root.hasAttribute("data-dialog-open")) {
      const gap = root.offsetWidth - root.clientWidth;
      root.style.setProperty("--vu-scrollbar", `${gap}px`);
    }
    setSignupOpen(true);
  }

  function closeSignup() {
    setSignupOpen(false);
    if (startSignup) router.push("/");
  }

  return (
    <>
      <style>{prelaunchCriticalCss}</style>
      <div
        data-prelaunch-landing
        className="bg-background font-sans text-primary-black"
        data-dialog-open={signupOpen ? "" : undefined}
      >
        <div className="vu-page mx-auto flex w-full max-w-[480px] flex-col">
          <PrelaunchHero
            member={member}
            onSignup={openSignup}
            onDemo={() => scrollToLanding("demo")}
          />
          <PrelaunchMarquee />
          <PrelaunchPreview />
          <p className="vu-invite vu-brand font-[family-name:var(--font-brand)]">
            {landingCopy.inviteBefore}
            <span className="vu-invite-prize">{landingCopy.invitePrize}</span>
          </p>
          <PrelaunchCommunity
            member={member}
            contestOver={contestOver}
            onSignup={openSignup}
          />
          <section className="vu-follow">
            <div className="vu-follow-row">
              <p className="vu-follow-title vu-brand">{landingCopy.followSocial}</p>
              <div className="vu-follow-socials">
                <a
                  className="vu-btn vu-social border-surface-2 bg-surface text-primary-black"
                  href={landingCopy.tiktokHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={landingCopy.tiktokLabel}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
                    <path d="M14 3c.5 2.6 2.3 4.2 5 4.5" />
                  </svg>
                </a>
                <a
                  className="vu-btn vu-social border-surface-2 bg-surface text-primary-black"
                  href={landingCopy.instagramHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={landingCopy.instagramLabel}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
                  </svg>
                </a>
              </div>
            </div>
            <p className="vu-follow-note vu-brand">{landingCopy.followDemo}</p>
          </section>
          <PrelaunchDemoSection
            canEnterDemo={canEnterDemo}
            onNeedSignup={() => scrollToLanding("iscriviti")}
          />
          <PrelaunchFooter />
        </div>

        {signupOpen ? (
          <SignupFlow
            onClose={closeSignup}
            onVerified={({ id }) => {
              setCanEnterDemo(true);
              void readVerifiedMember(id).then((card) => {
                if (card) setMember(card);
              });
            }}
          />
        ) : null}
      </div>
    </>
  );
}
