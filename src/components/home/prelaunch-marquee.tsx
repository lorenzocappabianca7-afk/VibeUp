import { landingCopy } from "@/content/landing";
import { Fragment } from "react";

function MarqueeRun({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="vu-run font-[family-name:var(--font-brand)]" aria-hidden={hidden || undefined}>
      {landingCopy.marquee.map((item, index) => (
        <Fragment key={item}>
          <span>{item}</span>
          <span className={index % 2 === 0 ? "vu-star-pink text-brand-pink" : "vu-star-teal text-brand-teal"} aria-hidden>
            ✦
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export function PrelaunchMarquee() {
  return (
    <>
      <p className="vu-in vu-d5 vu-tagline vu-brand font-[family-name:var(--font-brand)] text-[20px] font-extrabold">
        {landingCopy.taglineBefore}
        <span className="vu-tagline-accent text-brand-teal">{landingCopy.taglineAccent}</span>
      </p>
      <div className="vu-in vu-d5 vu-marquee border-surface-2">
        <div className="vu-track">
          <MarqueeRun />
          <MarqueeRun hidden />
        </div>
      </div>
    </>
  );
}
