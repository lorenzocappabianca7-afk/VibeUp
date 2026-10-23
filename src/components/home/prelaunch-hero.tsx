import { DemoLanguageSwitch } from "@/components/demo/demo-language-switch";
import { SignupMemberCard } from "@/components/home/signup-share";
import { landingCopy } from "@/content/landing";
import { ArrowIcon, Wordmark } from "@/components/home/prelaunch-wordmark";
import { brandTokens } from "@/lib/brand-tokens";

export function PrelaunchHero({
  onSignup,
  onDemo,
  member,
}: {
  onSignup: () => void;
  onDemo: () => void;
  member: { firstName: string; code: string; inviteCount: number } | null;
}) {
  return (
    <>
      <header className="vu-in vu-head">
        <div className="vu-head-lang">
          <DemoLanguageSwitch />
        </div>
        <Wordmark size="header" />
        <div className="vu-head-end">
        <a
          href="#demo"
          className="vu-btn vu-pill border-surface-2 bg-surface text-primary-black"
          onClick={(event) => {
            event.preventDefault();
            onDemo();
          }}
        >
          {landingCopy.headerDemo}
        </a>
        </div>
      </header>

      <section className="vu-hero">
        <svg className="vu-deco vu-deco-wave" viewBox="0 0 34 18" aria-hidden>
          <path
            d="M3 9q5-7 10 0t10 0t9 0"
            stroke={brandTokens.pink}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M3 9q5-7 10 0t10 0t9 0"
            stroke={brandTokens.surface}
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        <svg className="vu-deco vu-deco-square" viewBox="0 0 16 16" aria-hidden>
          <rect
            x="2"
            y="2"
            width="12"
            height="12"
            rx="2"
            fill={brandTokens.surface}
            stroke={brandTokens.teal}
            strokeWidth="2"
          />
        </svg>
        <svg className="vu-deco vu-deco-circle" viewBox="0 0 14 14" aria-hidden>
          <circle cx="7" cy="7" r="5" fill={brandTokens.surface} stroke={brandTokens.pink} strokeWidth="2" />
        </svg>

        <div className="vu-in vu-d1 vu-badge border-surface-2 bg-surface">
          <span className="vu-dot bg-brand-teal" />
          <span>{landingCopy.launchBadge}</span>
        </div>

        <h1 className="vu-in vu-d2 vu-h1 vu-brand font-[family-name:var(--font-brand)] text-[40px] font-extrabold leading-[1.02] tracking-[-1.4px]">
          {landingCopy.heroLine1}
          <br />
          {landingCopy.heroPlan}
          <span className="vu-cool text-brand-teal">
            {landingCopy.heroCool}
            <svg className="vu-underline" viewBox="0 0 118 14" aria-hidden>
              <path
                d="M3 9q14-9 28 0t28 0t28 0t28 0"
                stroke={brandTokens.teal}
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <br />
          <span className="vu-parties text-brand-pink">{landingCopy.heroParties}</span>
        </h1>

        <p className="vu-in vu-d3 vu-lead text-[17px]">
          <span className="vu-em text-primary-black">{landingCopy.heroBrand}</span>
          {landingCopy.heroSubtitleRest}
        </p>

        <div className="vu-in vu-d4 vu-actions">
          {member ? (
            <SignupMemberCard
              firstName={member.firstName}
              code={member.code}
              inviteCount={member.inviteCount}
              variant="compact"
            />
          ) : (
            <button type="button" className="vu-btn vu-cta bg-brand-pink font-[family-name:var(--font-brand)] text-[17px] text-ink-inverse" onClick={onSignup}>
              <span>{landingCopy.joinCta}</span>
              <ArrowIcon />
            </button>
          )}
          <a
            href="#demo"
            className="vu-btn vu-ghost border-surface-2 text-[17px] text-primary-black"
            onClick={(event) => {
              event.preventDefault();
              onDemo();
            }}
          >
            {landingCopy.howItWorks}
          </a>
        </div>
      </section>
    </>
  );
}
