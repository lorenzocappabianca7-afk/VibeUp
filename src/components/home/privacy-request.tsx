"use client";

import { privacyRequestCopy } from "@/content/legal";
import { signupCopy } from "@/content/signup";
import { DEMO_SIGNUP_ID_STORAGE_KEY } from "@/lib/demo/signup-gate";
import { clearSignupDraft } from "@/lib/launch/draft";
import { isEmailAddress } from "@/lib/launch/fields";
import Link from "next/link";
import { useEffect, useState } from "react";

function errorText(code: string) {
  if (code.includes(" ")) return code;
  if (code === "expired") return signupCopy.codeExpired;
  if (code === "locked") return signupCopy.codeLocked;
  if (code === "mismatch") return signupCopy.codeInvalid;
  if (code === "send_failed") return signupCopy.sendFailed;
  return signupCopy.genericError;
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
    error: typeof data.error === "string" ? data.error : "",
    signupId: typeof data.signupId === "string" ? data.signupId : "",
    export: data.export,
  };
}

export function PrivacyRequest() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!sent || deleted) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deleted, sent]);

  const secondsLeft =
    sent && now > 0 ? Math.max(0, 30 - Math.floor((now - resendAt) / 1000)) : 0;

  async function sendCode() {
    if (busy || !isEmailAddress(email)) return;
    setBusy(true);
    setError("");
    const result = await postJson("/api/launch/privacy", { email });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.error || "unavailable"));
      return;
    }
    const sentAt = Date.now();
    setSent(true);
    setResendAt(sentAt);
    setNow(sentAt);
    setNote(privacyRequestCopy.sent);
  }

  async function download() {
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    setError("");
    const result = await postJson("/api/launch/privacy/export", { email, code });
    setBusy(false);
    if (!result.ok || !result.export) {
      setError(errorText(result.error || "mismatch"));
      return;
    }
    const blob = new Blob([JSON.stringify(result.export, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vibeup-dati.json";
    link.click();
    URL.revokeObjectURL(url);
    setNote(privacyRequestCopy.downloaded);
  }

  async function remove() {
    if (!confirming) {
      setConfirming(true);
      setError("");
      return;
    }
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    setError("");
    const result = await postJson("/api/launch/privacy/delete", { email, code });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.error || "mismatch"));
      return;
    }
    try {
      if (result.signupId && window.localStorage.getItem(DEMO_SIGNUP_ID_STORAGE_KEY) === result.signupId) {
        window.localStorage.removeItem(DEMO_SIGNUP_ID_STORAGE_KEY);
        clearSignupDraft();
      }
    } catch {
      /* private mode */
    }
    setDeleted(true);
    setNote(privacyRequestCopy.deleted);
  }

  if (deleted) {
    return (
      <article className="vu-land vu-land-doc">
        <h1 className="vu-land-doc-title">{privacyRequestCopy.title}</h1>
        <p>{privacyRequestCopy.deleted}</p>
        <Link className="vu-land-textlink" href="/">
          {privacyRequestCopy.backHome}
        </Link>
      </article>
    );
  }

  return (
    <article className="vu-land vu-land-doc">
      <h1 className="vu-land-doc-title">{privacyRequestCopy.title}</h1>
      <p>{privacyRequestCopy.lead}</p>
      <form
        className="vu-privacy-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!sent) void sendCode();
        }}
      >
        <input
          className="vu-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder={privacyRequestCopy.emailPlaceholder}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
        />
        {sent ? (
          <input
            className="vu-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder={privacyRequestCopy.codePlaceholder}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setConfirming(false);
              setError("");
            }}
          />
        ) : null}
        {note ? <p className="vu-signup-note">{note}</p> : null}
        {error ? <p className="vu-signup-error">{error}</p> : null}
        {sent ? (
          <>
            <button type="button" className="vu-btn vu-cta" disabled={busy || !/^\d{6}$/.test(code)} onClick={() => void download()}>
              {privacyRequestCopy.download}
            </button>
            <button type="button" className="vu-btn vu-ghost" disabled={busy || !/^\d{6}$/.test(code)} onClick={() => void remove()}>
              {confirming ? privacyRequestCopy.deleteConfirm : privacyRequestCopy.delete}
            </button>
            {confirming ? <p className="vu-signup-note">{privacyRequestCopy.deleteHint}</p> : null}
            <button type="button" className="vu-btn vu-ghost" disabled={busy || secondsLeft > 0} onClick={() => void sendCode()}>
              {secondsLeft > 0 ? `${privacyRequestCopy.resendIn} ${secondsLeft}s` : privacyRequestCopy.resend}
            </button>
          </>
        ) : (
          <button type="submit" className="vu-btn vu-cta" disabled={busy || !isEmailAddress(email)}>
            {busy ? signupCopy.wait : privacyRequestCopy.send}
          </button>
        )}
      </form>
      <Link className="vu-land-textlink" href="/">
        {privacyRequestCopy.backHome}
      </Link>
    </article>
  );
}
