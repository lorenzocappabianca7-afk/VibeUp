import { contestConfig, topPrizeAmount } from "@/config/contest";
import { landingCopy } from "@/content/landing";
import { brandTokens } from "@/lib/brand-tokens";

const prizeClass = {
  second: "vu-prize-2",
  first: "vu-prize-1",
  third: "vu-prize-3",
} as const;

const placeClass = {
  second: "vu-place-teal text-brand-teal",
  first: "vu-place-pink text-brand-pink",
  third: "vu-place-muted",
} as const;

const amountClass = {
  second: "vu-amount-2",
  first: "vu-amount-1 text-brand-pink",
  third: "vu-amount-3",
} as const;

const podiumOrder = ["second", "first", "third"] as const;

export function PrelaunchCommunity({
  onSignup,
  member,
  contestOver,
}: {
  onSignup: () => void;
  member: { firstName: string; code: string; inviteCount: number } | null;
  contestOver: boolean;
}) {
  return (
    <section id="iscriviti" className="vu-join">
      <div className="vu-join-main">
      <div className="vu-stack">
        <span className="vu-kicker text-brand-teal">{landingCopy.communityKicker}</span>
        <h2 className="vu-h2 vu-brand font-[family-name:var(--font-brand)] text-[28px] font-extrabold leading-[1.08] tracking-[-0.9px]">
          {landingCopy.communityTitle1}
          <br />
          {landingCopy.communityTitle2}
          <span className="vu-parties text-brand-pink">{landingCopy.communityTitleAccent}</span>
        </h2>
        {contestOver ? (
          <p className="vu-body text-[15px]">{landingCopy.contestEnded}</p>
        ) : (
          <p className="vu-body text-[15px]">
            {landingCopy.communityBefore}
            <span className="vu-em text-primary-black">{topPrizeAmount()}</span>
            {landingCopy.communityAfter}
          </p>
        )}
      </div>

      <ol className="vu-steps">
        {landingCopy.steps.map((step, index) => (
          <li key={step.n} className={index < landingCopy.steps.length - 1 ? "vu-step vu-step-pad" : "vu-step"}>
            {index < landingCopy.steps.length - 1 ? <span className="vu-step-line bg-surface-2" aria-hidden /> : null}
            <span className="vu-step-n vu-brand border-surface-2 bg-surface font-[family-name:var(--font-brand)] text-brand-teal">
              {step.n}
            </span>
            <span className={step.code ? "vu-step-copy vu-step-copy-loose" : "vu-step-copy"}>
              <span className="vu-step-title">{step.title}</span>
              {step.detail ? <span className="vu-step-note">{step.detail}</span> : null}
              {step.code ? (
                <span className="vu-code vu-brand border-brand-pink font-[family-name:var(--font-brand)] text-brand-pink">
                  {step.code}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      </div>

      <div className="vu-join-aside">
      <div className="vu-podium">
        {podiumOrder.map((rank) => {
          const prize = contestConfig.prizes.find((item) => item.rank === rank);
          if (!prize) return null;
          return (
          <div key={prize.rank} className={`vu-prize bg-surface ${prizeClass[prize.rank]}`}>
            {prize.rank === "first" ? (
              <svg
                className="vu-trophy"
                viewBox="0 0 24 24"
                fill="none"
                stroke={brandTokens.pink}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
                <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
              </svg>
            ) : null}
            <span className={`vu-place vu-brand font-[family-name:var(--font-brand)] ${placeClass[prize.rank]}`}>
              {prize.label}
            </span>
            <span className={`vu-amount vu-brand font-[family-name:var(--font-brand)] ${amountClass[prize.rank]}`}>
              {prize.amount}
            </span>
          </div>
          );
        })}
      </div>

      {member ? null : (
        <button
          type="button"
          className="vu-btn vu-cta vu-cta-late bg-brand-pink font-[family-name:var(--font-brand)] text-[17px] text-ink-inverse"
          onClick={onSignup}
        >
          <span>{landingCopy.joinCta}</span>
        </button>
      )}
      <p className="vu-fine">
        {contestConfig.redeemNote}{" "}
        <a href="/regolamento">{landingCopy.rulesLink}</a>
      </p>
      </div>
    </section>
  );
}
