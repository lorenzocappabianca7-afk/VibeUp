import { landingCopy } from "@/content/landing";
import { ArrowIcon, Wordmark } from "@/components/home/prelaunch-wordmark";
import { brandTokens } from "@/lib/brand-tokens";

export function PrelaunchDemoSection({
  canEnterDemo,
  onNeedSignup,
}: {
  canEnterDemo: boolean;
  onNeedSignup: () => void;
}) {
  return (
    <section id="demo" className="vu-demo">
      <div className="vu-demo-card bg-surface" data-vu-reveal>
        <span className="vu-kicker vu-kicker-pink vu-reveal-item text-brand-pink">{landingCopy.demoKicker}</span>
        <h2 className="vu-h2 vu-reveal-item vu-reveal-d1 vu-brand font-[family-name:var(--font-brand)] text-[28px] font-extrabold leading-[1.08] tracking-[-0.9px]">
          {landingCopy.demoTitle1}
          <br />
          {landingCopy.demoTitle2}
        </h2>
        <p className="vu-body vu-reveal-item vu-reveal-d2 text-[15px]">{landingCopy.demoBody}</p>

        <div className="vu-phone-wrap vu-reveal-item vu-reveal-d3" aria-hidden>
          <div className="vu-phone border-surface-2 bg-background">
            <div className="vu-phone-brand">
              <Wordmark size="mock" />
            </div>
            <div className="vu-phone-card">
              <span className="vu-mock-kicker text-brand-teal">{landingCopy.mockKicker}</span>
              <span className="vu-mock-title vu-brand font-[family-name:var(--font-brand)]">
                {landingCopy.mockTitle}
              </span>
              <span className="vu-mock-cta vu-brand bg-paper font-[family-name:var(--font-brand)] text-ink-inverse">
                {landingCopy.mockCta}
              </span>
            </div>
            <div className="vu-tiles">
              <div className="vu-tile bg-surface-2">
                <span className="vu-heart bg-background">
                  <svg viewBox="0 0 24 24" fill={brandTokens.pink} aria-hidden>
                    <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
                  </svg>
                </span>
              </div>
              <div className="vu-tile bg-surface-2" />
            </div>
          </div>
        </div>

        {canEnterDemo ? (
          <a className="vu-btn vu-cta-teal vu-reveal-item vu-reveal-d3 bg-brand-teal font-[family-name:var(--font-brand)] text-[17px] text-ink-inverse" href="/demo">
            {landingCopy.demoEnter}
            <ArrowIcon />
          </a>
        ) : (
          <a
            className="vu-btn vu-cta-teal vu-reveal-item vu-reveal-d3 bg-brand-teal font-[family-name:var(--font-brand)] text-[17px] text-ink-inverse"
            href="#iscriviti"
            onClick={(event) => {
              event.preventDefault();
              onNeedSignup();
            }}
          >
            {landingCopy.demoNeedSignup}
            <ArrowIcon />
          </a>
        )}

        {canEnterDemo ? null : (
        <div className="vu-lock vu-reveal-item vu-reveal-d3">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span>{landingCopy.demoLock}</span>
        </div>
        )}
      </div>
    </section>
  );
}
