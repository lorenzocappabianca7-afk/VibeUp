import { landingCopy } from "@/content/landing";
import { Wordmark } from "@/components/home/prelaunch-wordmark";

export function PrelaunchFooter() {
  return (
    <footer className="vu-foot border-surface-2" data-landing-footer>
      <div className="vu-foot-row">
        <div className="vu-foot-brand">
          <Wordmark size="footer" />
          <a className="vu-mail" href={`mailto:${landingCopy.email}`}>
            {landingCopy.email}
          </a>
        </div>
        <div className="vu-socials">
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
        </div>
      </div>
      <div className="vu-legal">
        <a href="/privacy">{landingCopy.privacyLink}</a>
        <a href="/regolamento">{landingCopy.rulesLink}</a>
        <a href="/privacy/richiesta">{landingCopy.manageDataLink}</a>
      </div>
    </footer>
  );
}
