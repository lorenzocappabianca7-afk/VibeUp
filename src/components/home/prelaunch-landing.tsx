"use client";

import { PrelaunchCommunity } from "@/components/home/prelaunch-community";
import { prelaunchCriticalCss } from "@/components/home/prelaunch-critical-css";
import { PrelaunchDemoSection } from "@/components/home/prelaunch-demo-section";
import { PrelaunchFooter } from "@/components/home/prelaunch-footer";
import { PrelaunchHero } from "@/components/home/prelaunch-hero";
import { PrelaunchMarquee } from "@/components/home/prelaunch-marquee";
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
            onSignup={() => setSignupOpen(true)}
            onDemo={() => scrollToLanding("demo")}
          />
          <PrelaunchMarquee />
          <PrelaunchCommunity
            member={member}
            contestOver={contestOver}
            onSignup={() => setSignupOpen(true)}
          />
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
