import { landingCopy } from "@/content/landing";

export function Wordmark({ size }: { size: "header" | "footer" | "mock" }) {
  return (
    <span className="vu-mark">
      <span className={`vu-brand vu-mark-${size} font-[family-name:var(--font-brand)] font-extrabold text-primary-black`}>
        <span className="vu-v text-brand-teal">{landingCopy.logoV}</span>
        {landingCopy.logoIbe}
        <span className="vu-u text-brand-pink">{landingCopy.logoU}</span>
        {landingCopy.logoP}
      </span>
      <span className="vu-script font-[family-name:var(--font-events-script)] text-primary-black">
        {landingCopy.logoScript}
      </span>
    </span>
  );
}

export function ArrowIcon() {
  return (
    <svg
      className="vu-arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
