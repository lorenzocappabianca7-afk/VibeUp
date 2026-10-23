"use client";

import { consentText } from "@/content/legal";
import { signupCopy } from "@/content/signup";
import { SignupMemberCard } from "@/components/home/signup-share";
import { DEMO_SIGNUP_ID_STORAGE_KEY, readVerifiedMember } from "@/lib/demo/signup-gate";
import {
  clearSignupDraft,
  loadSignupDraft,
  saveSignupDraft,
  type SignupDraft,
} from "@/lib/launch/draft";
import {
  birthYearChoices,
  isAtLeast14,
  isE164,
  isEmailAddress,
  isHighSchool,
  isPersonName,
  isVibeUpCode,
  joinPhone,
  normalizeCode,
  USERNAME_RE,
} from "@/lib/launch/fields";
import { useEffect, useRef, useState } from "react";

const STEP_COUNT = 10;
const years = birthYearChoices();

function errorText(code: string) {
  if (code.includes(" ")) return code;
  switch (code) {
    case "username_taken":
      return signupCopy.usernameTaken;
    case "email_taken":
      return signupCopy.emailTaken;
    case "phone_taken":
      return signupCopy.phoneTaken;
    case "too_young":
      return signupCopy.tooYoung;
    case "own_code":
      return signupCopy.codeOwn;
    case "expired":
      return signupCopy.codeExpired;
    case "locked":
      return signupCopy.codeLocked;
    case "mismatch":
      return signupCopy.codeInvalid;
    case "send_failed":
      return signupCopy.sendFailed;
    default:
      return signupCopy.genericError;
  }
}

function stepForError(code: string) {
  switch (code) {
    case "username_taken":
      return 1;
    case "email_taken":
      return 2;
    case "phone_taken":
      return 3;
    case "too_young":
      return 4;
    case "own_code":
      return 7;
    default:
      return null;
  }
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    ok: response.ok,
    status: response.status,
    error: typeof data.error === "string" ? data.error : "",
    available: data.available === true,
    exists: data.exists === true,
    signupId: typeof data.signupId === "string" ? data.signupId : "",
    sentAt: typeof data.sentAt === "string" ? data.sentAt : "",
    vibeupCode: typeof data.vibeupCode === "string" ? data.vibeupCode : "",
    demoPath:
      typeof data.demoPath === "string" && data.demoPath.startsWith("/demo?t=") ? data.demoPath : "",
  };
}

export function SignupFlow({
  onClose,
  onVerified,
}: {
  onClose: () => void;
  onVerified: (signup: { id: string; code: string }) => void;
}) {
  const [draft, setDraft] = useState<SignupDraft>(() => loadSignupDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [usernameResult, setUsernameResult] = useState<{
    username: string;
    state: "free" | "taken" | "error";
  } | null>(null);
  const [suggestionResult, setSuggestionResult] = useState<{ query: string; items: string[] } | null>(
    null,
  );
  const [referralWarn, setReferralWarn] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [resendTick, setResendTick] = useState(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [done, setDone] = useState<{
    id: string;
    code: string;
    firstName: string;
    inviteCount: number | null;
    demoPath: string | null;
  } | null>(null);
  const [checking, setChecking] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem(DEMO_SIGNUP_ID_STORAGE_KEY)?.trim());
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
    saveSignupDraft(draft);
  }, [draft]);

  useEffect(() => {
    const id = window.localStorage.getItem(DEMO_SIGNUP_ID_STORAGE_KEY)?.trim() ?? "";
    if (!id) return;
    let cancelled = false;
    void readVerifiedMember(id)
      .then((card) => {
        if (cancelled || !card) return;
        setDone({
          id,
          code: card.code,
          firstName: card.firstName,
          inviteCount: card.inviteCount,
          demoPath: null,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, []);

  useEffect(() => {
    if (checking || done) return;
    const node = panelRef.current?.querySelector("input, select");
    if (node instanceof HTMLElement) node.focus();
  }, [draft.step, checking, done]);

  const resendClock = resendTick >= draft.codeSentAt ? resendTick : draft.codeSentAt;
  const resendIn = draft.codeSentAt
    ? Math.max(0, 30 - Math.floor((resendClock - draft.codeSentAt) / 1000))
    : 0;
  const usernameQuery = draft.username.trim();
  const usernameActive = draft.step === 1 && USERNAME_RE.test(usernameQuery);
  const usernameState: "idle" | "checking" | "free" | "taken" = !usernameActive
    ? "idle"
    : !usernameResult || usernameResult.username !== usernameQuery
      ? "checking"
      : usernameResult.state === "error"
        ? "idle"
        : usernameResult.state;
  const suggestionQuery = draft.step === 5 ? draft.highSchool : draft.step === 6 ? draft.dreamVenue : "";
  const suggestionNeedle = suggestionQuery.trim();
  const suggestionActive = (draft.step === 5 || draft.step === 6) && suggestionNeedle.length >= 2;
  const suggestions =
    suggestionActive && suggestionResult?.query === suggestionNeedle ? suggestionResult.items : [];

  useEffect(() => {
    if (!draft.codeSentAt) return;
    const timer = window.setInterval(() => setResendTick(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [draft.codeSentAt]);

  useEffect(() => {
    if (!usernameActive) return;
    const username = usernameQuery;
    const timer = window.setTimeout(() => {
      void postJson("/api/launch/username", { username }).then((result) => {
        if (draftRef.current.username.trim() !== username) return;
        if (!result.ok) {
          setUsernameResult({ username, state: "error" });
          setError(signupCopy.genericError);
          return;
        }
        setUsernameResult({
          username,
          state: result.available === true ? "free" : "taken",
        });
      }).catch(() => {
        if (draftRef.current.username.trim() === username) {
          setUsernameResult({ username, state: "error" });
        }
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [usernameActive, usernameQuery]);

  useEffect(() => {
    if (!suggestionActive) return;
    const query = suggestionNeedle;
    const path = draft.step === 5 ? "schools" : "venues";
    const timer = window.setTimeout(() => {
      void fetch(`/api/launch/${path}?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((data: { suggestions?: string[] }) => {
          setSuggestionResult({
            query,
            items: Array.isArray(data.suggestions) ? data.suggestions : [],
          });
        })
        .catch(() => setSuggestionResult({ query, items: [] }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draft.step, suggestionActive, suggestionNeedle]);

  function patch(partial: Partial<SignupDraft>) {
    setError("");
    setDraft((current) => ({ ...current, ...partial }));
  }

  function go(step: number) {
    setError("");
    setReferralWarn("");
    setDraft((current) => ({ ...current, step }));
  }

  const year = Number(draft.birthYear);
  const phone = joinPhone(draft.phonePrefix, draft.phoneNational);
  const canContinue =
    (draft.step === 0 && isPersonName(draft.firstName) && isPersonName(draft.lastName)) ||
    (draft.step === 1 && USERNAME_RE.test(draft.username.trim()) && usernameState === "free") ||
    (draft.step === 2 && isEmailAddress(draft.email)) ||
    (draft.step === 3 && isE164(phone)) ||
    (draft.step === 4 && Number.isInteger(year) && isAtLeast14(year)) ||
    (draft.step === 5 && isHighSchool(draft.highSchool)) ||
    (draft.step === 6 && draft.dreamVenue.trim().length > 1) ||
    (draft.step === 7 && isVibeUpCode(draft.referralCode)) ||
    (draft.step === 8 && draft.consentPrivacy && draft.consentRules) ||
    (draft.step === 9 && /^\d{6}$/.test(verifyCode));

  async function finishVerify(id: string, code: string, demoPath: string | null) {
    window.localStorage.setItem(DEMO_SIGNUP_ID_STORAGE_KEY, id);
    clearSignupDraft();
    setDone({ id, code, firstName: draft.firstName.trim(), inviteCount: null, demoPath });
    onVerified({ id, code });
    const card = await readVerifiedMember(id);
    if (!card) return;
    setDone({
      id,
      code: card.code,
      firstName: card.firstName,
      inviteCount: card.inviteCount,
      demoPath,
    });
  }

  async function submitSignup() {
    setBusy(true);
    setError("");
    const result = await postJson("/api/launch/signup", {
      firstName: draft.firstName,
      lastName: draft.lastName,
      username: draft.username,
      email: draft.email,
      phonePrefix: draft.phonePrefix,
      phoneNational: draft.phoneNational,
      birthYear: year,
      highSchool: draft.highSchool,
      dreamVenue: draft.dreamVenue,
      referralCode: draft.referralCode,
      consentPrivacy: draft.consentPrivacy,
      consentRules: draft.consentRules,
      consentMarketing: draft.consentMarketing,
    });
    setBusy(false);
    const signupId = result.signupId;
    if (!result.ok || !signupId) {
      const code = result.error || "unavailable";
      const jump = stepForError(code);
      setError(errorText(code));
      if (jump !== null) go(jump);
      return;
    }
    const sentAt = result.sentAt ? new Date(result.sentAt).getTime() : Date.now();
    setDraft((current) => ({ ...current, signupId, codeSentAt: sentAt, step: 9 }));
  }

  async function continueStep() {
    if (busy || !canContinue) return;
    if (draft.step === 7) {
      if (referralWarn) {
        patch({ referralCode: "", referralSkipped: true });
        go(8);
        return;
      }
      setBusy(true);
      const result = await postJson("/api/launch/referral", { code: normalizeCode(draft.referralCode) });
      setBusy(false);
      const exists = result.exists;
      if (!result.ok) {
        setError(signupCopy.genericError);
        return;
      }
      if (!exists) {
        setReferralWarn(signupCopy.codeMissing);
        return;
      }
      go(8);
      return;
    }
    if (draft.step === 8) {
      await submitSignup();
      return;
    }
    if (draft.step === 9) {
      setBusy(true);
      const result = await postJson("/api/launch/verify", {
        signupId: draft.signupId,
        code: verifyCode,
      });
      setBusy(false);
      const vibeupCode = result.vibeupCode;
      if (!result.ok || !vibeupCode) {
        setError(errorText(result.error || "mismatch"));
        return;
      }
      await finishVerify(draft.signupId, vibeupCode, result.demoPath || null);
      return;
    }
    go(draft.step + 1);
  }

  async function resend() {
    if (busy || resendIn > 0 || !draft.signupId) return;
    setBusy(true);
    const result = await postJson("/api/launch/resend", { signupId: draft.signupId });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.error || "send_failed"));
      return;
    }
    setDraft((current) => ({
      ...current,
      codeSentAt: result.sentAt ? new Date(result.sentAt).getTime() : Date.now(),
    }));
    setError("");
  }

  function skipOptional() {
    if (draft.step === 6) {
      patch({ dreamVenue: "" });
      go(7);
      return;
    }
    if (draft.step === 7) {
      patch({ referralCode: "", referralSkipped: true });
      setReferralWarn("");
      go(8);
    }
  }

  const progress = ((Math.min(draft.step, 9) + 1) / STEP_COUNT) * 100;

  return (
    <div className="vu-signup" role="dialog" aria-modal="true" aria-labelledby="signup-title">
      <header className="vu-signup-top">
        {done || draft.step === 0 ? (
          <span className="vu-signup-spacer" />
        ) : (
          <button type="button" className="vu-btn vu-icon-btn" onClick={() => go(draft.step - 1)} aria-label={signupCopy.back}>
            <ArrowBack />
          </button>
        )}
        {done ? (
          <span className="vu-signup-spacer" />
        ) : (
          <span
            className="vu-progress"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEP_COUNT}
            aria-valuenow={draft.step + 1}
          >
            <span style={{ width: `${progress}%` }} />
          </span>
        )}
        <button type="button" className="vu-btn vu-icon-btn" onClick={onClose} aria-label={signupCopy.close}>
          <CloseMark />
        </button>
      </header>

      {checking ? null : done ? (
        <div className="vu-signup-main vu-fade">
          <h1 id="signup-title" className="vu-signup-title">
            {signupCopy.doneTitle}
          </h1>
          <p className="vu-signup-lead">{signupCopy.doneBody}</p>
          <SignupMemberCard
            firstName={done.firstName}
            code={done.code}
            inviteCount={done.inviteCount}
            variant="full"
          />
          <a className="vu-btn vu-cta-teal vu-signup-demo" href={done.demoPath ?? "/demo"}>
            {signupCopy.tryDemo}
          </a>
          <button type="button" className="vu-text-btn" onClick={onClose}>
            {signupCopy.backToSite}
          </button>
        </div>
      ) : (
        <>
          <div className="vu-signup-main vu-fade" key={draft.step} ref={panelRef}>
            <h1 id="signup-title" className="vu-signup-title">
              {titleFor(draft.step)}
            </h1>
            {draft.step === 9 ? <p className="vu-signup-lead">{signupCopy.verifyBody}</p> : null}
            {fieldsFor()}
            {draft.step === 4 && draft.birthYear && !isAtLeast14(year) ? (
              <p className="vu-signup-error">{signupCopy.tooYoung}</p>
            ) : null}
            {draft.step === 3 && draft.phoneNational && !isE164(phone) ? (
              <p className="vu-signup-error">{signupCopy.phoneInvalid}</p>
            ) : null}
            {draft.step === 1 && usernameState === "checking" ? (
              <p className="vu-signup-note">{signupCopy.usernameChecking}</p>
            ) : null}
            {draft.step === 1 && usernameState === "free" ? (
              <p className="vu-signup-ok">{signupCopy.usernameFree}</p>
            ) : null}
            {draft.step === 1 && usernameState === "taken" ? (
              <p className="vu-signup-error">{signupCopy.usernameTaken}</p>
            ) : null}
            {draft.step === 1 && usernameState === "idle" ? (
              <p className="vu-signup-note">{signupCopy.usernameHint}</p>
            ) : null}
            {referralWarn ? <p className="vu-signup-error">{referralWarn}</p> : null}
            {error ? <p className="vu-signup-error">{error}</p> : null}
          </div>
          <div className="vu-signup-foot" style={{ bottom: keyboardInset }}>
            {draft.step === 6 || draft.step === 7 ? (
              <button type="button" className="vu-btn vu-ghost" onClick={skipOptional}>
                {signupCopy.skip}
              </button>
            ) : null}
            {draft.step === 9 ? (
              <button type="button" className="vu-btn vu-ghost" disabled={busy || resendIn > 0} onClick={() => void resend()}>
                {resendIn > 0 ? `${signupCopy.resendIn} ${resendIn}s` : signupCopy.resend}
              </button>
            ) : null}
            <button
              type="button"
              className="vu-btn vu-cta"
              disabled={!canContinue || busy}
              onClick={() => void continueStep()}
            >
              {busy ? signupCopy.wait : signupCopy.continue}
            </button>
          </div>
        </>
      )}
    </div>
  );

  function fieldsFor() {
    if (draft.step === 0) {
      return (
        <div className="vu-signup-fields">
          <input className="vu-input" autoComplete="given-name" placeholder={signupCopy.firstName} value={draft.firstName} onChange={(event) => patch({ firstName: event.target.value })} />
          <input className="vu-input" autoComplete="family-name" placeholder={signupCopy.lastName} value={draft.lastName} onChange={(event) => patch({ lastName: event.target.value })} />
        </div>
      );
    }
    if (draft.step === 1) {
      return (
        <input
          className="vu-input"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="nome_utente"
          value={draft.username}
          onChange={(event) => patch({ username: event.target.value.replace(/\s/g, "") })}
        />
      );
    }
    if (draft.step === 2) {
      return (
        <input
          className="vu-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder={signupCopy.emailPlaceholder}
          value={draft.email}
          onChange={(event) => patch({ email: event.target.value })}
        />
      );
    }
    if (draft.step === 3) {
      return (
        <div className="vu-phone-row">
          <input
            className="vu-input vu-prefix"
            inputMode="tel"
            autoComplete="tel-country-code"
            aria-label="Prefisso"
            value={draft.phonePrefix}
            onChange={(event) => patch({ phonePrefix: event.target.value })}
          />
          <input
            className="vu-input"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="333 123 4567"
            value={draft.phoneNational}
            onChange={(event) => patch({ phoneNational: event.target.value })}
          />
        </div>
      );
    }
    if (draft.step === 4) {
      return (
        <select className="vu-input" value={draft.birthYear} onChange={(event) => patch({ birthYear: event.target.value })}>
          <option value="">{signupCopy.yearPlaceholder}</option>
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      );
    }
    if (draft.step === 5 || draft.step === 6) {
      const value = draft.step === 5 ? draft.highSchool : draft.dreamVenue;
      const placeholder = draft.step === 5 ? signupCopy.schoolPlaceholder : signupCopy.venuePlaceholder;
      return (
        <div className="vu-suggest-wrap">
          {draft.step === 6 ? <p className="vu-signup-note">{signupCopy.venueOptional}</p> : null}
          <input
            className="vu-input"
            placeholder={placeholder}
            value={value}
            autoComplete="off"
            onChange={(event) =>
              patch(draft.step === 5 ? { highSchool: event.target.value } : { dreamVenue: event.target.value })
            }
          />
          {suggestions.length > 0 ? (
            <ul className="vu-suggest">
              {suggestions.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => {
                      patch(draft.step === 5 ? { highSchool: item } : { dreamVenue: item });
                    }}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    }
    if (draft.step === 7) {
      return (
        <input
          className="vu-input"
          autoCapitalize="characters"
          autoCorrect="off"
          placeholder={signupCopy.codePlaceholder}
          value={draft.referralCode}
          onChange={(event) => {
            setReferralWarn("");
            patch({ referralCode: event.target.value.toUpperCase(), referralSkipped: false });
          }}
        />
      );
    }
    if (draft.step === 8) {
      return (
        <div className="vu-checks">
          <div className="vu-consent-summary">
            {consentText.summary.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <label className="vu-check">
            <input type="checkbox" checked={draft.consentPrivacy} onChange={(event) => patch({ consentPrivacy: event.target.checked })} />
            <span>
              <ConsentSentence sentence={signupCopy.consentPrivacy} link={signupCopy.consentPrivacyLink} href="/privacy" />
            </span>
          </label>
          <label className="vu-check">
            <input type="checkbox" checked={draft.consentRules} onChange={(event) => patch({ consentRules: event.target.checked })} />
            <span>
              <ConsentSentence sentence={signupCopy.consentRules} link={signupCopy.consentRulesLink} href="/regolamento" />
            </span>
          </label>
          <label className="vu-check">
            <input type="checkbox" checked={draft.consentMarketing} onChange={(event) => patch({ consentMarketing: event.target.checked })} />
            <span>{signupCopy.consentMarketing}</span>
          </label>
        </div>
      );
    }
    return (
      <input
        className="vu-input vu-code-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder={signupCopy.verifyPlaceholder}
        value={verifyCode}
        onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
      />
    );
  }
}

function ConsentSentence({
  sentence,
  link,
  href,
}: {
  sentence: string;
  link: string;
  href: string;
}) {
  const index = sentence.toLowerCase().indexOf(link.toLowerCase());
  if (index < 0) return sentence;
  const before = sentence.slice(0, index);
  const after = sentence.slice(index + link.length);
  return (
    <>
      {before}
      <ConsentLink href={href}>{sentence.slice(index, index + link.length)}</ConsentLink>
      {after}
    </>
  );
}

function ConsentLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}

function titleFor(step: number) {
  switch (step) {
    case 0:
      return signupCopy.nameTitle;
    case 1:
      return signupCopy.usernameTitle;
    case 2:
      return signupCopy.emailTitle;
    case 3:
      return signupCopy.phoneTitle;
    case 4:
      return signupCopy.yearTitle;
    case 5:
      return signupCopy.schoolTitle;
    case 6:
      return signupCopy.venueTitle;
    case 7:
      return signupCopy.codeTitle;
    case 8:
      return signupCopy.consentTitle;
    default:
      return signupCopy.verifyTitle;
  }
}

function ArrowBack() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function CloseMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
