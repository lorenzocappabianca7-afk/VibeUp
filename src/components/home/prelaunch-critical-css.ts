import { brandTokens } from "@/lib/brand-tokens";

const { background, text, surface, surface2, ink, paper, teal, pink } =
  brandTokens;

/** Secondary ink from the landing reference. Not a theme token. */
const muted = "#C9CAD0";
const faint = "#A1A3AB";
/** Phone illustration only. Not a theme token. */
const mockPanel = "#12262A";
const mockPanelLine = "#1F4A4A";

/** Hides app tab bar, app footer, and the PWA install banner while the landing is mounted. */
export const prelaunchChromeHideCss = `
html:has([data-prelaunch-landing]) nav[aria-label="Navigazione principale"],
html:has([data-prelaunch-landing]) footer:not([data-landing-footer]),
html:has([data-prelaunch-landing]) [aria-label="Installa VibeUp"] {
  display: none !important;
}
`.trim();

/** Painted with the landing HTML. Does not wait for globals.css. */
export const prelaunchCriticalCss = `
${prelaunchChromeHideCss}
[data-prelaunch-landing] {
  position: fixed;
  inset: 0;
  z-index: 60;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: ${background};
  color: ${text};
  font-family: var(--font-geist-sans), system-ui, sans-serif;
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
}
[data-prelaunch-landing][data-dialog-open] {
  overflow: hidden;
}
[data-prelaunch-landing],
[data-prelaunch-landing] * {
  box-sizing: border-box;
}
[data-prelaunch-landing] button,
[data-prelaunch-landing] .vu-btn {
  appearance: none;
  margin: 0;
  cursor: pointer;
  text-decoration: none;
  touch-action: manipulation;
}
[data-prelaunch-landing] :focus-visible {
  outline: 2px solid ${teal};
  outline-offset: 3px;
}
[data-prelaunch-landing] svg {
  display: block;
  max-width: none;
  flex: none;
}

@keyframes vuUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}
@keyframes vuPulse {
  0% { box-shadow: 0 0 0 0 rgba(62, 207, 207, 0.55); }
  70% { box-shadow: 0 0 0 8px rgba(62, 207, 207, 0); }
  100% { box-shadow: 0 0 0 0 rgba(62, 207, 207, 0); }
}
@keyframes vuMarquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.vu-in { animation: vuUp 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.vu-d1 { animation-delay: 0.06s; }
.vu-d2 { animation-delay: 0.14s; }
.vu-d3 { animation-delay: 0.22s; }
.vu-d4 { animation-delay: 0.3s; }
.vu-d5 { animation-delay: 0.38s; }
.vu-dot { animation: vuPulse 2s ease-out infinite; }
.vu-track { animation: vuMarquee 22s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .vu-in, .vu-dot, .vu-track {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

.vu-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  min-height: 100%;
  margin: 0 auto;
  padding-top: env(safe-area-inset-top, 0px);
}
.vu-brand {
  font-family: var(--font-brand), system-ui, sans-serif;
  font-weight: 800;
}
.vu-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 0;
}
.vu-mark {
  display: flex;
  align-items: baseline;
  gap: 3px;
  color: ${text};
}
.vu-mark-header { font-size: 22px; letter-spacing: -0.4px; }
.vu-mark-footer { font-size: 20px; letter-spacing: -0.3px; }
.vu-mark-mock { font-size: 14px; }
.vu-script {
  font-family: var(--font-events-script), cursive;
  font-weight: 500;
  color: ${text};
}
.vu-mark-header + .vu-script,
.vu-head .vu-script { font-size: 16px; }
.vu-foot .vu-script { font-size: 15px; }
.vu-phone .vu-script { font-size: 11px; }
.vu-v { color: ${teal}; }
.vu-u { color: ${pink}; }
.vu-pill {
  display: inline-flex;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  border: 1px solid ${surface2};
  border-radius: 999px;
  background: ${surface};
  color: ${text};
  font-size: 15px;
  font-weight: 500;
}
.vu-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 36px 20px 28px;
}
.vu-deco {
  position: absolute;
  pointer-events: none;
}
.vu-deco-wave { top: 30px; right: 30px; width: 30px; height: 16px; }
.vu-deco-square { top: 104px; right: 24px; width: 14px; height: 14px; }
.vu-deco-circle { top: 164px; right: 66px; width: 12px; height: 12px; }
.vu-badge {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 10px;
  border: 1px solid ${surface2};
  border-radius: 999px;
  background: ${surface};
  color: ${muted};
  font-size: 13px;
}
.vu-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: ${teal};
}
.vu-h1 {
  margin: 0;
  color: ${text};
  font-size: 40px;
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -1.4px;
}
.vu-cool {
  position: relative;
  display: inline-block;
  color: ${teal};
}
.vu-underline {
  position: absolute;
  left: 0;
  bottom: -6px;
  width: 86px;
  height: 10px;
  pointer-events: none;
}
.vu-parties { color: ${pink}; }
.vu-lead {
  margin: 4px 0 0;
  color: ${muted};
  font-size: 17px;
  line-height: 1.45;
}
.vu-em { color: ${text}; font-weight: 600; }
.vu-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}
.vu-cta,
.vu-ghost,
.vu-cta-teal {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 50px;
  padding: 0 12px;
  border-radius: 14px;
  font-size: 17px;
  line-height: 1.15;
  text-align: center;
}
.vu-cta,
.vu-cta-teal {
  border: 0;
  font-family: var(--font-brand), system-ui, sans-serif;
  font-weight: 700;
  color: ${ink};
}
.vu-cta { background: ${pink}; }
.vu-cta-teal { background: ${teal}; }
.vu-cta-late { margin-top: 2px; }
.vu-ghost {
  border: 1px solid ${surface2};
  background: transparent;
  color: ${text};
  font-weight: 500;
}
.vu-arrow { width: 16px; height: 16px; }
.vu-tagline {
  margin: 0;
  padding: 6px 20px 14px;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.4px;
}
.vu-tagline-accent { color: ${teal}; }
.vu-marquee {
  overflow: hidden;
  padding: 12px 0;
  border-top: 1px solid ${surface2};
  border-bottom: 1px solid ${surface2};
}
.vu-track {
  display: flex;
  width: max-content;
}
.vu-run {
  display: flex;
  gap: 22px;
  padding-right: 22px;
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.6px;
  white-space: nowrap;
}
.vu-star-pink { color: ${pink}; }
.vu-star-teal { color: ${teal}; }
.vu-join {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 36px 20px 32px;
}
.vu-stack { display: flex; flex-direction: column; gap: 8px; }
.vu-kicker {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.6px;
  color: ${teal};
}
.vu-kicker-pink { color: ${pink}; }
.vu-h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.9px;
}
.vu-body {
  margin: 0;
  color: ${muted};
  font-size: 15px;
  line-height: 1.45;
}
.vu-podium {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-items: end;
  padding-top: 6px;
}
.vu-prize {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  border-radius: 16px;
  background: ${surface};
}
.vu-prize-2 { height: 92px; padding: 12px 8px; }
.vu-prize-1 {
  height: 120px;
  padding: 12px 8px 14px;
  box-shadow: 0 0 0 1px ${pink}, 0 8px 24px -12px color-mix(in srgb, ${pink} 40%, transparent);
}
.vu-prize-3 { height: 76px; padding: 10px 8px; }
.vu-place { font-size: 12px; font-weight: 800; }
.vu-place-teal { color: ${teal}; }
.vu-place-pink { color: ${pink}; }
.vu-place-muted { color: ${muted}; }
.vu-amount { font-weight: 800; }
.vu-amount-2 { font-size: 20px; letter-spacing: -0.4px; }
.vu-amount-1 { font-size: 24px; letter-spacing: -0.6px; color: ${pink}; }
.vu-amount-3 { font-size: 17px; letter-spacing: -0.3px; }
.vu-trophy {
  position: absolute;
  top: 12px;
  width: 22px;
  height: 22px;
  pointer-events: none;
}
.vu-steps {
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}
.vu-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.vu-step-pad { padding-bottom: 14px; }
.vu-step-line {
  position: absolute;
  top: 32px;
  bottom: 0;
  left: 15px;
  width: 1px;
  background: ${surface2};
  pointer-events: none;
}
.vu-step-n {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid ${surface2};
  border-radius: 10px;
  background: ${surface};
  color: ${teal};
  font-size: 14px;
  font-weight: 800;
}
.vu-step-copy { display: flex; flex-direction: column; gap: 2px; }
.vu-step-copy-loose { gap: 6px; }
.vu-step-title { font-size: 15px; font-weight: 600; }
.vu-step-note { font-size: 13px; color: ${faint}; }
.vu-code {
  align-self: flex-start;
  padding: 5px 9px;
  border: 1px dashed ${pink};
  border-radius: 8px;
  color: ${pink};
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1.8px;
}
.vu-fine {
  margin: 0;
  color: ${faint};
  font-size: 12px;
  line-height: 1.45;
  text-align: center;
}
.vu-fine a {
  color: ${text};
  text-decoration: underline;
  text-underline-offset: 0.15em;
}
.vu-demo { padding: 4px 20px 40px; }
.vu-demo-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
  padding: 22px 18px 20px;
  border-radius: 22px;
  background: ${surface};
}
.vu-phone-wrap {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
}
.vu-phone {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 220px;
  padding: 14px;
  border: 1px solid ${surface2};
  border-radius: 22px;
  background: ${background};
  box-shadow: 0 20px 40px -18px rgba(0, 0, 0, 0.8);
  transform: rotate(-3deg);
  pointer-events: none;
}
.vu-phone-brand { display: flex; justify-content: center; }
.vu-phone-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid ${mockPanelLine};
  border-radius: 14px;
  background: ${mockPanel};
}
.vu-mock-kicker {
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 1.2px;
  color: ${teal};
}
.vu-mock-title { font-size: 14px; font-weight: 800; }
.vu-mock-cta {
  padding: 8px;
  border-radius: 9px;
  background: ${paper};
  color: ${ink};
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}
.vu-tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.vu-tile {
  position: relative;
  height: 54px;
  border-radius: 10px;
  background: ${surface2};
}
.vu-heart {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: ${background};
}
.vu-heart svg { width: 9px; height: 9px; }
.vu-lock {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: ${faint};
  font-size: 12px;
}
.vu-lock svg { width: 13px; height: 13px; }
.vu-foot {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: auto;
  padding: 22px 20px calc(32px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid ${surface2};
}
.vu-foot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.vu-socials { display: flex; gap: 8px; }
.vu-social {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid ${surface2};
  border-radius: 999px;
  background: ${surface};
}
.vu-social svg { width: 18px; height: 18px; }
.vu-mail {
  color: ${muted};
  font-size: 15px;
  text-decoration: none;
}
.vu-legal { display: flex; flex-wrap: wrap; gap: 12px 16px; }
.vu-legal a {
  color: ${faint};
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.vu-signup {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  background: ${background};
  color: ${text};
}
.vu-signup-top,
.vu-signup-main {
  width: 100%;
  max-width: 480px;
  margin-right: auto;
  margin-left: auto;
}
.vu-signup-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 10px;
}
.vu-icon-btn {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: ${text};
}
.vu-icon-btn svg { width: 22px; height: 22px; }
.vu-signup-spacer { width: 44px; height: 44px; flex: none; }
.vu-progress {
  flex: 1;
  height: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: ${surface2};
}
.vu-progress > span {
  display: block;
  height: 100%;
  background: ${pink};
}
.vu-signup-main {
  flex: 1;
  overflow: auto;
  padding: 12px 20px 220px;
}
.vu-signup-title {
  margin: 8px 0 18px;
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.9px;
}
.vu-signup-lead {
  margin: -6px 0 16px;
  color: ${muted};
  font-size: 17px;
  line-height: 1.45;
}
.vu-signup-fields, .vu-suggest-wrap { display: flex; flex-direction: column; gap: 10px; }
.vu-input {
  width: 100%;
  height: 50px;
  padding: 0 14px;
  border: 1px solid ${surface2};
  border-radius: 14px;
  background: ${surface};
  color: ${text};
  font-family: inherit;
  font-size: 17px;
}
.vu-input:focus { outline: 2px solid ${teal}; outline-offset: 2px; }
.vu-phone-row { display: flex; gap: 8px; }
.vu-prefix { width: 92px; flex: none; }
.vu-signup-note { margin: 10px 0 0; color: ${faint}; font-size: 15px; line-height: 1.4; }
.vu-signup-ok { margin: 10px 0 0; color: ${teal}; font-size: 15px; font-weight: 600; }
.vu-signup-error { margin: 10px 0 0; color: ${pink}; font-size: 15px; line-height: 1.4; }
.vu-suggest {
  margin: 0;
  padding: 0;
  list-style: none;
  overflow: hidden;
  border: 1px solid ${surface2};
  border-radius: 14px;
  background: ${surface};
}
.vu-suggest button {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  padding: 0 14px;
  border: 0;
  border-bottom: 1px solid ${surface2};
  background: transparent;
  color: ${text};
  font-size: 16px;
  text-align: left;
}
.vu-suggest li:last-child button { border-bottom: 0; }
.vu-consent-summary { display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }
.vu-consent-summary p { margin: 0; color: ${muted}; font-size: 15px; line-height: 1.4; }
.vu-checks { display: flex; flex-direction: column; gap: 12px; }
.vu-check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 44px;
  font-size: 16px;
  line-height: 1.4;
}
.vu-check input { width: 22px; height: 22px; margin-top: 1px; flex: none; accent-color: ${pink}; }
.vu-check a { color: ${text}; text-decoration: underline; text-underline-offset: 0.15em; }
.vu-signup-foot {
  position: absolute;
  left: 50%;
  width: min(100%, 480px);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 20px calc(16px + env(safe-area-inset-bottom, 0px));
  background: ${background};
}
.vu-signup-foot .vu-cta:disabled,
.vu-signup-foot .vu-ghost:disabled {
  opacity: 0.45;
}
.vu-text-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-top: 8px;
  border: 0;
  background: transparent;
  color: ${muted};
  font-size: 15px;
}
.vu-signup-demo { margin-top: 18px; }
.vu-member { display: flex; flex-direction: column; gap: 8px; }
.vu-hello {
  margin: 0;
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.4px;
}
.vu-invites { margin: 0; color: ${muted}; font-size: 15px; }
.vu-share { display: flex; flex-direction: column; gap: 10px; }
.vu-share-label {
  margin: 0;
  color: ${muted};
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.4px;
}
.vu-share-code {
  margin: 0;
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 1px;
}
.vu-share-code-lg { font-size: 34px; letter-spacing: 1.4px; }
.vu-share-actions { display: flex; flex-direction: column; gap: 10px; }
.vu-share-full { margin-top: 8px; }
@keyframes vuFade {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
.vu-fade { animation: vuFade 0.28s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; }
@media (prefers-reduced-motion: reduce) {
  .vu-fade { animation: none; opacity: 1; transform: none; }
}

.vu-land {
  box-sizing: border-box;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: calc(1.25rem + env(safe-area-inset-top, 0px)) 20px
    calc(1.75rem + env(safe-area-inset-bottom, 0px));
}
.vu-land-btn {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  height: 50px;
  margin-top: 1.25rem;
  padding: 0 12px;
  border: 0;
  border-radius: 14px;
  background: ${pink};
  color: ${ink};
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  touch-action: manipulation;
}
.vu-land-textlink {
  display: inline-block;
  margin-top: 0.85rem;
  color: ${teal};
  font-size: 15px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}
.vu-land-dialog {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 20px;
  background: color-mix(in srgb, ${background} 78%, transparent);
}
.vu-land-dialog-card {
  width: min(100%, 28rem);
  margin-bottom: env(safe-area-inset-bottom, 0px);
  padding: 22px 18px 18px;
  border-radius: 22px;
  background: ${surface};
  color: ${text};
}
.vu-land-dialog-card h2 {
  margin: 0;
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.9px;
}
.vu-land-todo {
  margin: 0 0 0.75rem;
  color: ${pink};
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.vu-land-doc-title {
  margin: 0;
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.9px;
}
.vu-land-version {
  margin: 8px 0 0;
  color: ${faint};
  font-size: 15px;
}
.vu-land-doc h2 {
  margin: 1.5rem 0 0;
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.2px;
}
.vu-land-doc p {
  margin: 0.55rem 0 0;
  font-size: 15px;
  line-height: 1.5;
}
.vu-privacy-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}
`.replace(/\n+/g, "\n").trim();
