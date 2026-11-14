import { landingCopy } from "@/content/landing";
import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="vu-suite-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function SuiteIcon({ id }: { id: (typeof landingCopy.suite)[number]["icon"] }) {
  switch (id) {
    case "location":
      return (
        <Icon>
          <path d="M4 20V8l8-4 8 4v12" />
          <path d="M9 20v-6h6v6" />
        </Icon>
      );
    case "dj":
      return (
        <Icon>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.5" />
        </Icon>
      );
    case "photo":
      return (
        <Icon>
          <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" />
          <circle cx="12" cy="13" r="3" />
        </Icon>
      );
    case "decor":
      return (
        <Icon>
          <path d="M12 3v3" />
          <path d="M12 6c-3 2-5 4-5 7a5 5 0 0 0 10 0c0-3-2-5-5-7z" />
          <path d="M8 21h8" />
        </Icon>
      );
    case "security":
      return (
        <Icon>
          <path d="M12 3l7 3v6c0 4.5-3 7-7 9-4-2-7-4.5-7-9V6l7-3z" />
        </Icon>
      );
    case "quote":
      return (
        <Icon>
          <path d="M6 4h12v16l-3-2-3 2-3-2-3 2V4z" />
          <path d="M9 9h6M9 13h4" />
        </Icon>
      );
    case "confirm":
      return (
        <Icon>
          <path d="M5 12l5 5L20 7" />
        </Icon>
      );
    case "deposit":
      return (
        <Icon>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
        </Icon>
      );
    case "siae":
      return (
        <Icon>
          <path d="M7 3h7l5 5v13H7V3z" />
          <path d="M14 3v5h5" />
        </Icon>
      );
    case "tips":
      return (
        <Icon>
          <path d="M8 6h8M8 10h8M8 14h5" />
          <path d="M6 3h12v18H6V3z" />
        </Icon>
      );
  }
}

export function PrelaunchSuite() {
  return (
    <section className="vu-suite" data-vu-reveal aria-label={landingCopy.suiteLabel}>
      <h2 className="vu-suite-title vu-reveal-item vu-brand">{landingCopy.suiteTitle}</h2>
      <p className="vu-suite-lead vu-reveal-item vu-reveal-d1">{landingCopy.suiteSubtitle}</p>
      <ul className="vu-suite-grid">
        {landingCopy.suite.map((item) => (
          <li key={item.title} className="vu-suite-card vu-reveal-item">
            <SuiteIcon id={item.icon} />
            <h3 className="vu-suite-name vu-brand">{item.title}</h3>
            <p className="vu-suite-detail">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
