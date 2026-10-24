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
  padding-right: var(--vu-scrollbar, 0px);
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
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 0;
}
.vu-head-lang { justify-self: start; }
.vu-head-lang > div {
  gap: 2px;
  padding: 2px;
  background: ${surface};
  box-shadow: none;
}
.vu-head-end { display: flex; justify-content: flex-end; }
.vu-head-join,
.vu-pill-long { display: none; }
.vu-pill-short { display: contents; }
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
.vu-hero-tagline {
  width: 100%;
  margin: -4px 0 6px;
  overflow: hidden;
  color: ${text};
  font-size: 26px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.4px;
  white-space: nowrap;
}
.vu-hero-tagline span {
  display: inline-block;
  transform-origin: left center;
  text-decoration: underline;
  text-decoration-color: ${teal};
  text-decoration-thickness: 3px;
  text-underline-offset: 5px;
}
@media (max-width: 446px) {
  .vu-hero-tagline span {
    transform: scaleX(calc((100vw - 40px) / 420px));
  }
}
.vu-cool {
  position: relative;
  display: inline-block;
  color: ${teal};
}
.vu-underline {
  position: absolute;
  left: 0;
  bottom: -0.15em;
  width: 2.15em;
  height: 0.25em;
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
.vu-preview {
  position: relative;
  height: 500px;
  margin-top: 8px;
  overflow: hidden;
}
.vu-preview-fit { display: contents; }
.vu-preview-stage {
  position: absolute;
  top: 0;
  left: 50%;
  width: 390px;
  height: 500px;
  transform: translateX(-50%);
}
.vu-preview .vu-phone {
  position: absolute;
  display: block;
  gap: 0;
  background: #0B0C0F;
  box-shadow: none;
  pointer-events: none;
}
.vu-phone-left,
.vu-phone-right {
  top: 112px;
  width: 168px;
  height: 344px;
  transform: rotate(9deg);
  opacity: 0.55;
  border: 1px solid ${surface2};
  border-radius: 30px;
  padding: 5px;
}
.vu-phone-left { left: -34px; }
.vu-phone-right { left: 256px; }
.vu-phone-center {
  left: 77px;
  top: 48px;
  z-index: 1;
  width: 236px;
  height: 430px;
  transform: none;
  border: 1px solid #3A3C44;
  border-radius: 36px;
  padding: 6px;
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.9);
}
.vu-phone-screen {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.vu-phone-left .vu-phone-screen,
.vu-phone-right .vu-phone-screen { border-radius: 25px; }
.vu-phone-center .vu-phone-screen { border-radius: 30px; }
.vu-preview .vu-phone-screen img {
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
  object-position: top center;
}
.vu-sticker {
  position: absolute;
  top: 22px;
  right: 14px;
  z-index: 2;
  width: 88px;
  height: 88px;
}
.vu-sticker svg {
  width: 88px;
  height: 88px;
}
.vu-sticker text {
  font-family: var(--font-brand), sans-serif;
  font-synthesis: weight;
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
.vu-join-main,
.vu-join-aside { display: contents; }
.vu-stack { order: 1; }
.vu-podium { order: 2; }
.vu-steps { order: 3; }
.vu-join .vu-cta { order: 4; }
.vu-fine { order: 5; }
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
.vu-phone-wrap .vu-phone {
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
  flex-wrap: wrap;
  row-gap: 14px;
}
.vu-foot-brand { display: contents; }
.vu-socials { order: 2; }
.vu-mail { order: 3; flex-basis: 100%; }
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
.vu-phone-row .vu-field { flex: 1; min-width: 0; }
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
.vu-sheet .vu-suggest { background: #0F1115; }
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
.vu-check input { width: 24px; height: 24px; margin-top: 0; flex: none; accent-color: ${teal}; }
.vu-check a { color: ${text}; text-decoration: underline; text-underline-offset: 0.15em; }
.vu-text-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  margin-top: 4px;
  border: 0;
  background: transparent;
  color: ${faint};
  font-size: 15px;
}
.vu-signup-demo { margin-top: 8px; }
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

.vu-sheet-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.vu-sheet-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
}
@supports ((backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px))) {
  .vu-sheet-overlay {
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
  }
}
.vu-sheet {
  --drag: 0px;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 75dvh;
  max-height: 75dvh;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid #2A2C33;
  background: #1A1C21;
  color: ${text};
  transform: translateY(100%);
  transition: transform 350ms cubic-bezier(.32, .72, 0, 1);
}
.vu-sheet.is-open { transform: translateY(var(--drag)); }
.vu-sheet.is-dragging { transition: none; }
.vu-sheet-grab {
  display: flex;
  flex: none;
  justify-content: center;
  padding: 10px 0 2px;
  touch-action: none;
}
.vu-sheet-handle {
  width: 36px;
  height: 5px;
  border-radius: 999px;
  background: #3A3C44;
}
.vu-sheet-head {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 0 8px;
  touch-action: none;
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
.vu-sheet-spacer { width: 44px; height: 44px; flex: none; }
.vu-sheet-step {
  margin: 0;
  flex: 1;
  color: #A1A3AB;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}
.vu-sheet-bar {
  flex: none;
  height: 3px;
  margin: 0 20px 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #2A2C33;
}
.vu-sheet-bar > span {
  display: block;
  height: 100%;
  background: #F091B2;
  transition: width 250ms cubic-bezier(.32, .72, 0, 1);
}
.vu-sheet-form {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}
.vu-sheet-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 8px 20px 12px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.vu-sheet-title {
  margin: 4px 0 8px;
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 24px;
  font-weight: 800;
  font-synthesis: weight;
  line-height: 1.15;
  letter-spacing: -0.6px;
}
.vu-sheet-lead {
  margin: 0 0 16px;
  color: #A1A3AB;
  font-size: 15px;
  line-height: 1.4;
}
.vu-sheet .vu-field { position: relative; }
.vu-sheet .vu-input {
  height: 52px;
  padding: 0 14px;
  border: 1px solid #2A2C33;
  border-radius: 14px;
  background: #0F1115;
  font-size: 17px;
}
.vu-sheet .vu-field.is-valid .vu-input { padding-right: 44px; }
.vu-sheet .vu-field.is-invalid .vu-input { border-color: #F091B2; }
.vu-sheet .vu-input:focus,
.vu-sheet .vu-input:focus-visible {
  outline: none;
  border-color: #3ECFCF;
}
.vu-sheet-mark {
  position: absolute;
  top: 16px;
  right: 14px;
  color: #3ECFCF;
}
.vu-sheet-mark svg { width: 20px; height: 20px; }
.vu-sheet .vu-signup-error { margin: 8px 0 0; font-size: 13px; line-height: 1.35; }
.vu-sheet .vu-check { font-size: 15px; cursor: pointer; }
.vu-sheet-chip {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  margin: 0 0 14px;
  padding: 0 12px;
  border-radius: 999px;
  background: #0F1115;
  color: #3ECFCF;
  font-size: 14px;
  font-weight: 700;
}
.vu-sheet-foot {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 2px;
  padding: 8px 20px calc(12px + env(safe-area-inset-bottom, 0px));
  background: #1A1C21;
}
.vu-sheet-skip {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: #A1A3AB;
  font-size: 15px;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}
.vu-sheet-skip:disabled { opacity: 0.4; }
.vu-sheet-foot .vu-cta {
  height: 50px;
  background: #F091B2;
  color: #0F1115;
}
.vu-sheet-foot .vu-cta:disabled { opacity: 0.4; }
.vu-sheet-done { position: relative; }
.vu-sheet .vu-share-code-lg {
  padding: 16px 12px;
  border: 1.5px dashed #F091B2;
  border-radius: 14px;
  color: #F091B2;
  font-size: 28px;
  letter-spacing: 1.8px;
  text-align: center;
}
.vu-confetti {
  position: absolute;
  inset: 0 0 auto;
  height: 160px;
  overflow: hidden;
  pointer-events: none;
}
.vu-confetti i {
  position: absolute;
  top: 0;
  left: calc(6% + (var(--i) * 6.4%));
  width: 7px;
  height: 10px;
  border-radius: 2px;
  background: #F091B2;
  opacity: 0;
  animation: vuConfetti 900ms cubic-bezier(.2, .7, .2, 1) forwards;
  animation-delay: calc(var(--i) * 28ms);
}
.vu-confetti i:nth-child(odd) { background: #3ECFCF; }
.vu-sheet-slide.is-next { animation: vuSheetNext 250ms cubic-bezier(.32, .72, 0, 1); }
.vu-sheet-slide.is-back { animation: vuSheetBack 250ms cubic-bezier(.32, .72, 0, 1); }
.vu-exit-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}
.vu-exit {
  width: min(100%, 320px);
  padding: 20px 18px 16px;
  border: 1px solid #2A2C33;
  border-radius: 18px;
  background: #1A1C21;
  color: ${text};
}
.vu-exit h2 {
  margin: 0;
  font-family: var(--font-brand), system-ui, sans-serif;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.4px;
}
.vu-exit p { margin: 8px 0 16px; color: #A1A3AB; font-size: 15px; line-height: 1.4; }
.vu-exit .vu-cta { height: 50px; background: #F091B2; color: #0F1115; }
.vu-exit .vu-text-btn { margin-top: 4px; }
@keyframes vuSheetNext {
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes vuSheetBack {
  from { opacity: 0; transform: translateX(-24px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes vuConfetti {
  0% { opacity: 1; transform: translateY(0) rotate(0deg); }
  100% { opacity: 0; transform: translateY(130px) rotate(160deg); }
}
@media (min-width: 768px) {
  .vu-sheet-root { align-items: center; padding: 24px; }
  .vu-sheet {
    width: 440px;
    height: auto;
    max-height: min(640px, calc(100dvh - 48px));
    border: 1px solid #2A2C33;
    border-radius: 24px;
    opacity: 0;
    transform: scale(0.96);
    transition: opacity 250ms ease, transform 250ms cubic-bezier(.32, .72, 0, 1);
  }
  .vu-sheet.is-open { opacity: 1; transform: scale(1); }
  .vu-sheet.is-dragging { transition: none; }
  .vu-sheet-grab { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .vu-sheet {
    opacity: 0;
    transform: none;
    transition: opacity 200ms ease;
  }
  .vu-sheet.is-open { opacity: 1; transform: none; }
  .vu-sheet-bar > span { transition: none; }
  .vu-sheet-slide.is-next,
  .vu-sheet-slide.is-back {
    animation: vuSheetFade 200ms ease;
  }
  .vu-confetti { display: none; }
}
@keyframes vuSheetFade {
  from { opacity: 0; }
  to { opacity: 1; }
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
@media (min-width: 768px) {
  .vu-page { max-width: 640px; }
  .vu-h1 { font-size: 48px; letter-spacing: -1.8px; }
  .vu-h2 { font-size: 34px; letter-spacing: -1px; }
  .vu-lead,
  .vu-body { font-size: 17px; }
  .vu-tagline { font-size: 24px; }
  [data-prelaunch-landing] a,
  [data-prelaunch-landing] button { cursor: pointer; }
}
@media (hover: hover) and (min-width: 768px) {
  .vu-cta:hover,
  .vu-cta-teal:hover { filter: brightness(1.08); }
  .vu-ghost:hover,
  .vu-pill:hover,
  .vu-social:hover {
    background: #32343c;
    border-color: #3A3C44;
  }
  .vu-mail:hover,
  .vu-legal a:hover,
  .vu-fine a:hover { color: ${text}; }
}
@media (min-width: 1024px) {
  .vu-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 64px;
    align-items: start;
    max-width: 1120px;
    min-width: 0;
    padding-left: 40px;
    padding-right: 40px;
  }
  .vu-head {
    display: flex;
    grid-column: 1 / -1;
    grid-row: 1;
    align-items: center;
    gap: 12px;
    padding: 20px 0 0;
  }
  .vu-head .vu-mark { margin-right: auto; }
  .vu-head-lang { order: 2; }
  .vu-head-end { order: 3; align-items: center; gap: 10px; }
  .vu-pill-short { display: none; }
  .vu-pill-long { display: inline; }
  .vu-pill { white-space: nowrap; }
  .vu-head .vu-head-join {
    display: inline-flex;
    width: auto;
    height: 44px;
    padding: 0 18px;
    border-radius: 999px;
    font-size: 15px;
  }
  .vu-hero {
    container-type: inline-size;
    grid-column: 1;
    grid-row: 2;
    align-self: stretch;
    justify-content: center;
    min-height: calc(100dvh - 96px);
    gap: 20px;
    padding: 28px 0 8px;
  }
  .vu-deco { display: none; }
  .vu-h1 {
    font-size: min(64px, calc(100cqw * 0.135));
    letter-spacing: -2px;
    max-width: 100%;
  }
  .vu-h2 { font-size: 40px; letter-spacing: -1.2px; }
  .vu-lead,
  .vu-body,
  .vu-step-title { font-size: 18px; }
  .vu-lead,
  .vu-body,
  .vu-stack,
  .vu-steps,
  .vu-demo-card > .vu-h2,
  .vu-demo-card > .vu-body { max-width: 600px; }
  .vu-step-note { font-size: 16px; }
  .vu-actions {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  .vu-actions .vu-cta,
  .vu-actions .vu-ghost {
    width: auto;
    flex: none;
    padding: 0 22px;
  }
  .vu-actions .vu-member { flex: 1 1 100%; }
  .vu-preview {
    container-type: inline-size;
    grid-column: 2;
    grid-row: 2;
    align-self: center;
    height: auto;
    margin-top: 0;
    overflow: hidden;
  }
  .vu-preview-fit {
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(500px * min(1.271, 100cqw / 390px));
    overflow: hidden;
  }
  .vu-preview-stage {
    position: relative;
    top: auto;
    left: auto;
    transform: scale(min(1.271, 100cqw / 390px));
    transform-origin: center center;
  }
  .vu-tagline {
    grid-column: 1 / -1;
    grid-row: 3;
    max-width: none;
    padding: 36px 0 16px;
    font-size: 28px;
  }
  .vu-marquee {
    grid-column: 1 / -1;
    grid-row: 4;
    margin-left: -40px;
    margin-right: -40px;
  }
  .vu-join {
    display: grid;
    grid-column: 1 / -1;
    grid-row: 5;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 64px;
    align-items: center;
    padding: 120px 0 0;
  }
  .vu-join-main,
  .vu-join-aside {
    display: flex;
    flex-direction: column;
    gap: 28px;
    min-width: 0;
  }
  .vu-join-aside { align-items: center; }
  .vu-podium { gap: 16px; width: 100%; }
  .vu-prize-2 { height: 160px; }
  .vu-prize-1 { height: 210px; }
  .vu-prize-3 { height: 130px; }
  .vu-amount-2 { font-size: 32px; }
  .vu-amount-1 { font-size: 40px; }
  .vu-amount-3 { font-size: 24px; }
  .vu-place { font-size: 14px; }
  .vu-trophy { width: 28px; height: 28px; top: 18px; }
  .vu-join-aside .vu-cta {
    width: auto;
    margin-top: 0;
    padding: 0 28px;
  }
  .vu-fine { max-width: 420px; font-size: 14px; }
  .vu-demo {
    grid-column: 1 / -1;
    grid-row: 6;
    padding: 120px 0 0;
  }
  .vu-demo-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "kicker phone"
      "title phone"
      "body phone"
      "cta phone"
      "lock phone";
    column-gap: 48px;
    row-gap: 14px;
    align-items: center;
    overflow: visible;
    padding: 36px 40px;
  }
  .vu-demo-card > .vu-kicker { grid-area: kicker; }
  .vu-demo-card > .vu-h2 { grid-area: title; }
  .vu-demo-card > .vu-body { grid-area: body; }
  .vu-demo-card > .vu-phone-wrap { grid-area: phone; padding: 8px 12px; }
  .vu-demo-card > .vu-cta-teal,
  .vu-demo-card > a {
    grid-area: cta;
    width: auto;
    justify-self: start;
    padding: 0 22px;
  }
  .vu-demo-card > .vu-lock { grid-area: lock; justify-self: start; }
  .vu-foot {
    display: grid;
    grid-column: 1 / -1;
    grid-row: 7;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 24px;
    margin-top: 120px;
    padding: 28px 0 calc(28px + env(safe-area-inset-bottom, 0px));
  }
  .vu-foot-row { display: contents; }
  .vu-foot-brand {
    display: flex;
    grid-column: 1;
    grid-row: 1;
    align-items: baseline;
    justify-self: start;
    gap: 18px;
  }
  .vu-foot-brand .vu-mail {
    order: 0;
    flex-basis: auto;
    width: auto;
  }
  .vu-legal {
    grid-column: 2;
    grid-row: 1;
    justify-self: center;
    flex-wrap: nowrap;
  }
  .vu-socials {
    order: 0;
    grid-column: 3;
    grid-row: 1;
    justify-self: end;
  }
}
`.replace(/\n+/g, "\n").trim();
