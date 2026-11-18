"use client";

import { useDemoLanguage } from "@/context/demo-language-context";
import { consentText } from "@/content/legal";
import { signupCopy as signupMessages } from "@/content/signup";
import { useLocalized, useSignupCopy } from "@/lib/locale/use-localized";
import { DemoEntryLink } from "@/components/demo/demo-entry-link";
import { SignupMemberCard } from "@/components/home/signup-share";
import { DEMO_SIGNUP_ID_STORAGE_KEY, readVerifiedMember } from "@/lib/demo/signup-gate";
import {
  clearSignupDraft,
  loadSignupDraft,
  readStoredSignupReferral,
  saveSignupDraft,
  type SignupDraft,
} from "@/lib/launch/draft";
import {
  cleanDreamVenue,
  isAtLeast14OnDate,
  isE164,
  isEmailAddress,
  isHighSchool,
  isPersonName,
  isVibeUpCode,
  joinPhone,
  normalizeCode,
  normalizeEmail,
} from "@/lib/launch/fields";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])";
const SHEET_OPEN_MS = 350;
const STEP_NAME = 0;
const STEP_VERIFY = 1;
const STEP_VENUE = 2;
const STEP_PROFILE = 3;
const TOTAL_STEPS = 4;
const verifyInflight = new Set<string>();

function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function birthDateBounds(now = new Date()) {
  return {
    min: isoDate(new Date(now.getFullYear() - 100, now.getMonth(), now.getDate())),
    max: isoDate(new Date(now.getFullYear() - 14, now.getMonth(), now.getDate())),
  };
}

const birthBounds = birthDateBounds();

function focusWithoutScroll(node: HTMLElement) {
  try {
    node.focus({ preventScroll: true });
  } catch {
    node.focus();
  }
}

function revealInSheet(field: HTMLElement, scroller: HTMLElement) {
  const fieldBox = field.getBoundingClientRect();
  const frame = scroller.getBoundingClientRect();
  const above = frame.top - fieldBox.top;
  const below = fieldBox.bottom - frame.bottom;
  if (above > 1) scroller.scrollTop -= above;
  else if (below > 1) scroller.scrollTop += below;
}

function readVisibleFrame() {
  const viewport = window.visualViewport;
  const top = viewport && Number.isFinite(viewport.offsetTop) ? viewport.offsetTop : 0;
  const viewportHeight = viewport && Number.isFinite(viewport.height) ? viewport.height : 0;
  const height = viewportHeight > 0 ? viewportHeight : window.innerHeight;
  return { top, height: height > 0 ? height : window.innerHeight };
}

function scheduleFrame(callback: () => void) {
  if (typeof window.requestAnimationFrame === "function") return window.requestAnimationFrame(callback);
  return window.setTimeout(callback, 16);
}

function cancelFrame(id: number) {
  if (typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(id);
    return;
  }
  window.clearTimeout(id);
}

function errorText(code: string, copy: typeof signupMessages) {
  if (code.includes(" ")) return code;
  switch (code) {
    case "email_taken":
      return copy.emailTaken;
    case "phone_taken":
      return copy.phoneTaken;
    case "too_young":
      return copy.tooYoung;
    case "own_code":
      return copy.codeOwn;
    case "expired":
      return copy.codeExpired;
    case "locked":
      return copy.codeLocked;
    case "mismatch":
      return copy.codeInvalid;
    case "send_failed":
      return copy.sendFailed;
    default:
      return copy.genericError;
  }
}

function stepForError(code: string) {
  switch (code) {
    case "email_taken":
    case "phone_taken":
      return 0;
    case "too_young":
    case "own_code":
      return STEP_PROFILE;
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
    exists: data.exists === true,
    signupId: typeof data.signupId === "string" ? data.signupId : "",
    sentAt: typeof data.sentAt === "string" ? data.sentAt : "",
    vibeupCode: typeof data.vibeupCode === "string" ? data.vibeupCode : "",
    confirmed: data.confirmed === true,
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
  const [referralWarn, setReferralWarn] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [resendTick, setResendTick] = useState(0);
  const [narrow, setNarrow] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [opened, setOpened] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dir, setDir] = useState<"next" | "back" | "none">("none");
  const [exitOpen, setExitOpen] = useState(false);
  const [done, setDone] = useState<{
    id: string;
    code: string;
    firstName: string;
    inviteCount: number | null;
    demoPath: string | null;
  } | null>(null);
  const [school, setSchool] = useState("");
  const [detailFocus, setDetailFocus] = useState<"school" | "">("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [checking, setChecking] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem(DEMO_SIGNUP_ID_STORAGE_KEY)?.trim());
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef(0);
  const exitRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);
  const requestCloseRef = useRef<() => void>(() => undefined);
  const closingRef = useRef(false);
  const dragRef = useRef<{ y: number; id: number } | null>(null);

  const { lang } = useDemoLanguage();
  const signupCopy = useSignupCopy();
  const consent = useLocalized(consentText);
  const storedReferral = readStoredSignupReferral();
  const linkedReferral =
    !draft.referralSkipped && storedReferral.length > 0 && normalizeCode(draft.referralCode) === storedReferral;

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
        setDone({ id, code: card.code, firstName: card.firstName, inviteCount: card.inviteCount, demoPath: null });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const width = window.matchMedia("(max-width: 767px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setNarrow(width.matches);
      setReduced(motion.matches);
    };
    sync();
    width.addEventListener("change", sync);
    motion.addEventListener("change", sync);
    const frame = requestAnimationFrame(() => {
      openedAtRef.current = Date.now();
      setOpened(true);
    });
    return () => {
      cancelAnimationFrame(frame);
      width.removeEventListener("change", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);

  useLayoutEffect(() => {
    const root = frameRef.current;
    if (!root) return;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const { top, height } = readVisibleFrame();
      root.style.setProperty("--vv-top", `${top}px`);
      root.style.setProperty("--vv-height", `${height}px`);
      const scroller = panelRef.current;
      const active = document.activeElement;
      if (
        scroller &&
        active instanceof HTMLElement &&
        scroller.contains(active) &&
        active.matches("input, select, textarea")
      ) {
        revealInSheet(active, scroller);
      }
    };
    const schedule = () => {
      if (frame) return;
      frame = scheduleFrame(apply);
    };
    apply();
    const viewport = window.visualViewport;
    if (viewport && typeof viewport.addEventListener === "function") {
      viewport.addEventListener("resize", schedule);
      viewport.addEventListener("scroll", schedule);
    }
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    return () => {
      if (frame) cancelFrame(frame);
      if (viewport && typeof viewport.removeEventListener === "function") {
        viewport.removeEventListener("resize", schedule);
        viewport.removeEventListener("scroll", schedule);
      }
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, []);

  useEffect(() => {
    if (!opened || checking || done || exitOpen) return;
    const wait = Math.max(0, SHEET_OPEN_MS - (Date.now() - openedAtRef.current));
    const timer = window.setTimeout(() => {
      const scroller = panelRef.current;
      if (!scroller) return;
      const active = document.activeElement;
      const current =
        active instanceof HTMLElement && scroller.contains(active) && active.matches("input, select, textarea")
          ? active
          : scroller.querySelector("input, select, textarea");
      if (!(current instanceof HTMLElement)) return;
      focusWithoutScroll(current);
      revealInSheet(current, scroller);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [opened, draft.step, checking, done, exitOpen]);

  useEffect(() => {
    if (!exitOpen) return;
    const node = exitRef.current?.querySelector<HTMLElement>(".vu-cta");
    if (node) focusWithoutScroll(node);
  }, [exitOpen]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        requestCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const root = exitOpen ? exitRef.current : dialogRef.current;
      if (!root) return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault();
        focusWithoutScroll(last);
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        focusWithoutScroll(first);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [exitOpen]);

  const resendClock = resendTick >= draft.codeSentAt ? resendTick : draft.codeSentAt;
  const resendIn = draft.codeSentAt ? Math.max(0, 30 - Math.floor((resendClock - draft.codeSentAt) / 1000)) : 0;
  const schoolQuery = school.trim();
  const venueQuery = draft.step === STEP_VENUE ? draft.dreamVenue.trim() : "";

  useEffect(() => {
    if (!draft.codeSentAt) return;
    const timer = window.setInterval(() => setResendTick(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [draft.codeSentAt]);

  useEffect(() => {
    if (!done || schoolQuery.length < 2 || detailFocus !== "school") {
      if (done) setSuggestions([]);
      return;
    }
    const query = schoolQuery;
    const timer = window.setTimeout(() => {
      void fetch(`/api/launch/schools?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((data: { suggestions?: string[] }) => {
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        })
        .catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [detailFocus, done, schoolQuery]);

  useEffect(() => {
    if (done || draft.step !== STEP_VENUE || venueQuery.length < 2) {
      if (!done) setSuggestions([]);
      return;
    }
    const query = venueQuery;
    const timer = window.setTimeout(() => {
      void fetch(`/api/launch/venues?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((data: { suggestions?: string[] }) => {
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        })
        .catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [done, draft.step, venueQuery]);

  function patch(partial: Partial<SignupDraft>) {
    setError("");
    setDraft((current) => ({ ...current, ...partial }));
  }

  function go(step: number) {
    setDir(step < draft.step ? "back" : "next");
    setError("");
    setReferralWarn("");
    setDraft((current) => ({ ...current, step }));
  }

  const birthdayReady = isAtLeast14OnDate(draft.birthDate);
  const venueReady = Boolean(cleanDreamVenue(draft.dreamVenue));
  const signupPhone = joinPhone(draft.phonePrefix, draft.phoneNational);
  const phoneReady = isE164(signupPhone);
  const canContinue =
    (draft.step === STEP_NAME && isPersonName(draft.firstName) && isPersonName(draft.lastName) && isEmailAddress(draft.email) && phoneReady) ||
    (draft.step === STEP_VERIFY && /^\d{6}$/.test(verifyCode)) ||
    (draft.step === STEP_VENUE && venueReady) ||
    (draft.step === STEP_PROFILE && birthdayReady && draft.consentPrivacy && draft.consentRules);

  async function finishVerify(id: string, code: string, demoPath: string | null) {
    window.localStorage.setItem(DEMO_SIGNUP_ID_STORAGE_KEY, id);
    clearSignupDraft();
    setDone({ id, code, firstName: draft.firstName.trim(), inviteCount: null, demoPath });
    onVerified({ id, code });
    const card = await readVerifiedMember(id);
    if (!card) return;
    setDone({ id, code: card.code, firstName: card.firstName, inviteCount: card.inviteCount, demoPath });
  }

  function showError(code: string) {
    const jump = stepForError(code);
    if (jump !== null && jump !== draft.step) go(jump);
    setError(errorText(code, signupCopy));
  }

  async function sendAccountCode() {
    setBusy(true);
    setError("");
    const result = await postJson("/api/launch/signup", {
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phonePrefix: draft.phonePrefix,
      phoneNational: draft.phoneNational,
      consentPrivacy: false,
      consentRules: false,
      locale: lang,
    });
    setBusy(false);
    if (!result.ok || !result.signupId) {
      showError(result.error || "unavailable");
      return;
    }
    const sentAt = result.sentAt ? new Date(result.sentAt).getTime() : Date.now();
    setVerifyCode("");
    setDir("next");
    setDraft((current) => ({
      ...current,
      signupId: result.signupId,
      codeSentAt: sentAt,
      codeSentFor: normalizeEmail(current.email),
      codeSentPhone: joinPhone(current.phonePrefix, current.phoneNational),
      emailConfirmed: false,
      step: 1,
    }));
  }

  async function submitSignup() {
    setBusy(true);
    setError("");
    const result = await postJson("/api/launch/signup", {
      signupId: draft.signupId,
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      birthDate: draft.birthDate,
      dreamVenue: draft.dreamVenueUndecided ? "" : draft.dreamVenue,
      dreamVenueUndecided: draft.dreamVenueUndecided,
      referralCode: draft.referralSkipped ? "" : draft.referralCode,
      consentPrivacy: draft.consentPrivacy,
      consentRules: draft.consentRules,
      consentMarketing: draft.consentMarketing,
      locale: lang,
    });
    setBusy(false);
    const signupId = result.signupId || draft.signupId;
    if (!result.ok || !signupId || !result.vibeupCode) {
      showError(result.error || "unavailable");
      return;
    }
    await finishVerify(signupId, result.vibeupCode, result.demoPath || null);
  }

  async function continueStep() {
    if (busy || !canContinue || done) return;
    if (draft.step === STEP_NAME) {
      const emailKey = normalizeEmail(draft.email);
      const samePhone = draft.codeSentPhone === signupPhone;
      if (draft.emailConfirmed && draft.signupId && draft.confirmedSignupId === draft.signupId && draft.confirmedEmail === emailKey && samePhone) {
        go(STEP_VENUE);
        return;
      }
      if (draft.signupId && draft.codeSentFor === emailKey && samePhone && draft.codeSentAt > 0 && Date.now() - draft.codeSentAt < 30_000) {
        go(STEP_VERIFY);
        return;
      }
      await sendAccountCode();
      return;
    }
    if (draft.step === STEP_VERIFY) {
      await verifyNow(verifyCode);
      return;
    }
    if (draft.step === STEP_VENUE) {
      const venue = cleanDreamVenue(draft.dreamVenue);
      if (!venue) return;
      setDir("next");
      setError("");
      setReferralWarn("");
      setDraft((current) => ({
        ...current,
        dreamVenue: venue,
        dreamVenueUndecided: false,
        step: STEP_PROFILE,
      }));
      return;
    }
    const typedCode = draft.referralCode.trim();
    if (!linkedReferral && !draft.referralSkipped && typedCode) {
      if (!isVibeUpCode(typedCode)) {
        setReferralWarn(signupCopy.codeMissing);
        return;
      }
      if (referralWarn) {
        patch({ referralCode: "", referralSkipped: true });
        await submitSignup();
        return;
      }
      setBusy(true);
      const result = await postJson("/api/launch/referral", { code: normalizeCode(typedCode) });
      setBusy(false);
      if (!result.ok) {
        setError(signupCopy.genericError);
        return;
      }
      if (!result.exists) {
        setReferralWarn(signupCopy.codeMissing);
        return;
      }
    }
    await submitSignup();
  }

  async function verifyNow(code: string) {
    if (!/^\d{6}$/.test(code) || !draft.signupId) return;
    const key = `${draft.signupId}:${code}`;
    if (verifyInflight.has(key)) return;
    verifyInflight.add(key);
    setBusy(true);
    const result = await postJson("/api/launch/verify", { signupId: draft.signupId, code });
    setBusy(false);
    if (result.ok && result.vibeupCode) {
      await finishVerify(draft.signupId, result.vibeupCode, result.demoPath || null);
      verifyInflight.delete(key);
      return;
    }
    if (result.ok && result.confirmed) {
      const emailKey = normalizeEmail(draft.email);
      setVerifyCode("");
      setDir("next");
      setDraft((current) => ({
        ...current,
        emailConfirmed: true,
        confirmedEmail: emailKey,
        confirmedSignupId: current.signupId,
        step: STEP_VENUE,
      }));
      verifyInflight.delete(key);
      return;
    }
    verifyInflight.delete(key);
    setError(errorText(result.error || "mismatch", signupCopy));
  }

  async function resend() {
    if (busy || resendIn > 0 || !draft.signupId) return;
    setBusy(true);
    const result = await postJson("/api/launch/resend", { signupId: draft.signupId });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.error || "send_failed", signupCopy));
      return;
    }
    setDraft((current) => ({
      ...current,
      codeSentAt: result.sentAt ? new Date(result.sentAt).getTime() : Date.now(),
      codeSentFor: normalizeEmail(current.email),
      emailConfirmed: false,
    }));
    setError("");
  }

  function chooseNoVenueIdea() {
    setDir("next");
    setError("");
    setReferralWarn("");
    setSuggestions([]);
    setDraft((current) => ({
      ...current,
      dreamVenue: "",
      dreamVenueUndecided: true,
      step: STEP_PROFILE,
    }));
  }

  async function saveDetails() {
    if (busy || !done) return;
    if (!isHighSchool(school)) return;
    setBusy(true);
    setError("");
    const result = await postJson("/api/launch/signup", {
      preferences: true,
      signupId: done.id,
      highSchool: school,
    });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.error || "unavailable", signupCopy));
      return;
    }
    setDetailsSaved(true);
    setSuggestions([]);
  }

  function hasEnteredData() {
    return Boolean(
      draft.firstName.trim() ||
        draft.lastName.trim() ||
        draft.email.trim() ||
        draft.phoneNational.trim() ||
        draft.birthDate ||
        draft.dreamVenue.trim() ||
        draft.dreamVenueUndecided ||
        (!linkedReferral && draft.referralCode.trim()) ||
        draft.consentPrivacy ||
        draft.consentRules ||
        draft.consentMarketing ||
        verifyCode ||
        draft.signupId,
    );
  }

  function dismiss() {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpened(false);
    window.setTimeout(() => onClose(), reduced ? 0 : 350);
  }

  function requestClose() {
    if (closingRef.current) return;
    if (exitOpen) {
      setExitOpen(false);
      return;
    }
    if (!done && hasEnteredData()) {
      setExitOpen(true);
      return;
    }
    dismiss();
  }

  requestCloseRef.current = requestClose;

  function onDragStart(event: ReactPointerEvent<HTMLElement>) {
    if (!narrow || event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest("button, a, input, select, textarea, label")) return;
    dragRef.current = { y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function onDragMove(event: ReactPointerEvent<HTMLElement>) {
    if (!dragRef.current || dragRef.current.id !== event.pointerId) return;
    setDragY(Math.max(0, event.clientY - dragRef.current.y));
  }

  function onDragEnd(event: ReactPointerEvent<HTMLElement>) {
    if (!dragRef.current || dragRef.current.id !== event.pointerId) return;
    const travel = Math.max(0, event.clientY - dragRef.current.y);
    dragRef.current = null;
    setDragging(false);
    setDragY(0);
    if (travel > 80) requestClose();
  }

  const stepNumber = draft.step + 1;
  const progress = (stepNumber / TOTAL_STEPS) * 100;
  const stepLabel = signupCopy.stepProgress
    .replaceAll("{n}", String(stepNumber))
    .replaceAll("{total}", String(TOTAL_STEPS));
  const sheetStyle: CSSProperties = { ["--drag" as string]: `${dragY}px` };
  const lead = draft.step === STEP_VERIFY ? signupCopy.verifyBody : draft.step === STEP_VENUE ? signupCopy.venueHint : "";
  const showBack = !done && draft.step > 0;
  const detailsReady = isHighSchool(school);

  return (
    <div className="vu-sheet-root" ref={frameRef}>
      <div className="vu-sheet-overlay" onClick={requestClose} />
      <div
        ref={dialogRef}
        className={`vu-sheet${opened ? " is-open" : ""}${dragging ? " is-dragging" : ""}`}
        style={sheetStyle}
        role="dialog"
        aria-modal={exitOpen ? undefined : true}
        aria-hidden={exitOpen || undefined}
        aria-labelledby="signup-title"
      >
        <div className="vu-sheet-grab" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
          <span className="vu-sheet-handle" />
        </div>
        <header className="vu-sheet-head" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
          {showBack ? (
            <button type="button" className="vu-btn vu-icon-btn" onClick={() => go(draft.step === STEP_VENUE && draft.emailConfirmed ? STEP_NAME : draft.step - 1)} aria-label={signupCopy.back}>
              <ArrowBack />
            </button>
          ) : (
            <span className="vu-sheet-spacer" />
          )}
          {done ? <span className="vu-sheet-step" /> : <p className="vu-sheet-step">{stepLabel}</p>}
          <button type="button" className="vu-btn vu-icon-btn" onClick={requestClose} aria-label={signupCopy.close}>
            <CloseMark />
          </button>
        </header>
        {done ? null : (
          <div className="vu-sheet-bar" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={stepNumber} aria-valuetext={stepLabel}>
            <span style={{ width: `${progress}%` }} />
          </div>
        )}

        {checking ? (
          <div className="vu-sheet-body" />
        ) : done ? (
          <div className="vu-sheet-body vu-sheet-done">
            <Confetti />
            <h1 id="signup-title" className="vu-sheet-title">{signupCopy.doneTitle}</h1>
            <p className="vu-sheet-lead">{signupCopy.doneBody}</p>
            <SignupMemberCard firstName={done.firstName} code={done.code} inviteCount={done.inviteCount} variant="full" />
            <div className="vu-signup-fields">
              <p className="vu-sheet-lead">{signupCopy.schoolTitle}</p>
              <Field valid={isHighSchool(school)}>
                <input
                  className="vu-input"
                  placeholder={signupCopy.schoolPlaceholder}
                  value={school}
                  autoComplete="off"
                  onFocus={() => setDetailFocus("school")}
                  onChange={(event) => {
                    setDetailsSaved(false);
                    setSchool(event.target.value);
                  }}
                />
              </Field>
              {detailFocus === "school" && suggestions.length > 0 ? <SuggestionList items={suggestions} onPick={(item) => { setSchool(item); setSuggestions([]); }} /> : null}
              {detailsSaved ? <p className="vu-signup-ok">{signupCopy.detailsSaved}</p> : null}
              {error ? <p className="vu-signup-error">{error}</p> : null}
              <button type="button" className="vu-btn vu-cta" disabled={!detailsReady || busy || detailsSaved} onClick={() => void saveDetails()}>
                {busy ? signupCopy.wait : signupCopy.saveDetails}
              </button>
            </div>
            <DemoEntryLink className="vu-btn vu-cta vu-signup-demo" href={done.demoPath ?? "/demo"}>{signupCopy.tryDemo}</DemoEntryLink>
            <button type="button" className="vu-text-btn" onClick={dismiss}>{signupCopy.backToSite}</button>
          </div>
        ) : (
          <form
            className="vu-sheet-form"
            noValidate
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              void continueStep();
            }}
            onFocusCapture={(event) => {
              const target = event.target;
              const scroller = panelRef.current;
              if (!(target instanceof HTMLElement) || !scroller || !scroller.contains(target)) return;
              if (!target.matches("input, select, textarea")) return;
              revealInSheet(target, scroller);
            }}
          >
            <div className={`vu-sheet-body vu-sheet-slide is-${dir}`} key={draft.step} ref={panelRef}>
              <h1 id="signup-title" className="vu-sheet-title">{titleFor(draft.step, signupCopy)}</h1>
              {lead ? <p className="vu-sheet-lead">{lead}</p> : null}
              {fieldsFor(draft, patch, verifyCode, setVerifyCode, setError, error, birthdayReady, linkedReferral, referralWarn, setReferralWarn, (code) => void verifyNow(code), suggestions, (item) => {
                setSuggestions([]);
                patch({ dreamVenue: item.slice(0, 60), dreamVenueUndecided: false });
              }, chooseNoVenueIdea, signupCopy, consent)}
              {draft.step === STEP_NAME && draft.phoneNational.trim() && !phoneReady ? <p className="vu-signup-error">{signupCopy.phoneInvalid}</p> : null}
              {draft.step === STEP_PROFILE && draft.birthDate && !birthdayReady ? <p className="vu-signup-error">{signupCopy.tooYoung}</p> : null}
              {referralWarn ? <p className="vu-signup-error">{referralWarn}</p> : null}
              {error ? <p className="vu-signup-error">{error}</p> : null}
            </div>
            <div className="vu-sheet-foot">
              {draft.step === STEP_VERIFY ? (
                <button type="button" className="vu-sheet-skip" disabled={busy || resendIn > 0} onClick={() => void resend()}>
                  {resendIn > 0 ? `${signupCopy.resendIn} ${resendIn}s` : signupCopy.resend}
                </button>
              ) : null}
              <button type="submit" className="vu-btn vu-cta" disabled={!canContinue || busy}>
                {busy ? signupCopy.wait : signupCopy.continue}
              </button>
            </div>
          </form>
        )}
      </div>

      {exitOpen ? (
        <div className="vu-exit-layer" onClick={() => setExitOpen(false)}>
          <div ref={exitRef} className="vu-exit" role="alertdialog" aria-modal="true" aria-labelledby="signup-exit-title" aria-describedby="signup-exit-body" onClick={(event) => event.stopPropagation()}>
            <h2 id="signup-exit-title">{signupCopy.exitTitle}</h2>
            <p id="signup-exit-body">{signupCopy.exitBody}</p>
            <button type="button" className="vu-btn vu-cta" onClick={() => setExitOpen(false)}>{signupCopy.exitStay}</button>
            <button type="button" className="vu-text-btn" onClick={dismiss}>{signupCopy.exitLeave}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function fieldsFor(
  draft: SignupDraft,
  patch: (partial: Partial<SignupDraft>) => void,
  verifyCode: string,
  setVerifyCode: (value: string) => void,
  setError: (value: string) => void,
  error: string,
  birthdayReady: boolean,
  linkedReferral: boolean,
  referralWarn: string,
  setReferralWarn: (value: string) => void,
  onCode: (code: string) => void,
  suggestions: string[],
  onVenuePick: (item: string) => void,
  onNoVenueIdea: () => void,
  signupCopy: typeof signupMessages,
  consent: { summary: readonly string[] },
) {
  if (draft.step === STEP_NAME) {
    const phoneReady = isE164(joinPhone(draft.phonePrefix, draft.phoneNational));
    return (
      <div className="vu-signup-fields">
        <Field valid={isPersonName(draft.firstName)}>
          <input className="vu-input" autoComplete="given-name" enterKeyHint="next" placeholder={signupCopy.firstName} value={draft.firstName} onChange={(event) => patch({ firstName: event.target.value })} />
        </Field>
        <Field valid={isPersonName(draft.lastName)}>
          <input className="vu-input" autoComplete="family-name" enterKeyHint="next" placeholder={signupCopy.lastName} value={draft.lastName} onChange={(event) => patch({ lastName: event.target.value })} />
        </Field>
        <Field valid={isEmailAddress(draft.email)} invalid={error === signupCopy.emailTaken}>
          <input
            className="vu-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            enterKeyHint="next"
            placeholder={signupCopy.emailPlaceholder}
            value={draft.email}
            aria-invalid={error === signupCopy.emailTaken}
            onChange={(event) => {
              const email = event.target.value;
              const key = normalizeEmail(email);
              patch({
                email,
                emailConfirmed: key.length > 0 && key === draft.confirmedEmail && draft.signupId.length > 0 && draft.signupId === draft.confirmedSignupId,
              });
            }}
          />
        </Field>
        <div className="vu-phone-block">
          <label className="vu-phone-label" htmlFor="signup-phone">{signupCopy.phoneLabel}</label>
          <div className="vu-phone-row">
            <input
              className="vu-input vu-prefix"
              type="tel"
              inputMode="tel"
              autoComplete="tel-country-code"
              aria-label={signupCopy.phonePrefix}
              enterKeyHint="next"
              value={draft.phonePrefix}
              onChange={(event) => patch({ phonePrefix: event.target.value })}
            />
            <Field valid={phoneReady} invalid={error === signupCopy.phoneTaken || (Boolean(draft.phoneNational.trim()) && !phoneReady)}>
              <input
                id="signup-phone"
                className="vu-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                enterKeyHint="go"
                placeholder={signupCopy.phonePlaceholder}
                value={draft.phoneNational}
                aria-invalid={error === signupCopy.phoneTaken || (Boolean(draft.phoneNational.trim()) && !phoneReady)}
                onChange={(event) => patch({ phoneNational: event.target.value })}
              />
            </Field>
          </div>
        </div>
      </div>
    );
  }
  if (draft.step === STEP_VERIFY) {
    return (
      <Field valid={/^\d{6}$/.test(verifyCode)} invalid={Boolean(error)}>
        <input
          className="vu-input vu-code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="go"
          maxLength={6}
          placeholder={signupCopy.verifyPlaceholder}
          value={verifyCode}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setError("");
            const next = event.target.value.replace(/\D/g, "").slice(0, 6);
            setVerifyCode(next);
            if (/^\d{6}$/.test(next)) onCode(next);
          }}
        />
      </Field>
    );
  }
  if (draft.step === STEP_VENUE) {
    return (
      <div className="vu-signup-fields">
        <Field valid={Boolean(cleanDreamVenue(draft.dreamVenue))}>
          <input
            className="vu-input"
            placeholder={signupCopy.venuePlaceholder}
            value={draft.dreamVenue}
            autoComplete="off"
            enterKeyHint="next"
            maxLength={60}
            onChange={(event) => patch({ dreamVenue: event.target.value.slice(0, 60), dreamVenueUndecided: false })}
          />
        </Field>
        {suggestions.length > 0 ? <SuggestionList items={suggestions} onPick={onVenuePick} /> : null}
        <button type="button" className="vu-sheet-secondary" onClick={onNoVenueIdea}>{signupCopy.venueUndecided}</button>
      </div>
    );
  }
  return (
    <div className="vu-signup-fields">
      <label className="vu-sheet-lead" htmlFor="signup-birth">{signupCopy.birthLabel}</label>
      <Field valid={birthdayReady} invalid={Boolean(draft.birthDate) && !birthdayReady}>
        <input
          id="signup-birth"
          className={`vu-input${draft.birthDate ? "" : " is-empty"}`}
          type="date"
          autoComplete="bday"
          enterKeyHint="next"
          min={birthBounds.min}
          max={birthBounds.max}
          value={draft.birthDate}
          aria-invalid={Boolean(draft.birthDate) && !birthdayReady}
          onChange={(event) => patch({ birthDate: event.target.value })}
        />
        {draft.birthDate ? null : <span className="vu-date-hint" aria-hidden="true">{signupCopy.birthPlaceholder}</span>}
      </Field>
      {linkedReferral ? <p className="vu-sheet-chip">{signupCopy.invitedByFriend}</p> : (
        <>
          <p className="vu-sheet-lead">{signupCopy.codeTitle}</p>
          <Field valid={isVibeUpCode(draft.referralCode)} invalid={Boolean(referralWarn)}>
            <input
              className="vu-input"
              autoCapitalize="characters"
              autoCorrect="off"
              enterKeyHint="next"
              placeholder={signupCopy.codePlaceholder}
              value={draft.referralCode}
              aria-invalid={Boolean(referralWarn)}
              onChange={(event) => {
                setReferralWarn("");
                patch({ referralCode: event.target.value.toUpperCase(), referralSkipped: false });
              }}
            />
          </Field>
        </>
      )}
      <div className="vu-checks">
        <div className="vu-consent-summary">
          {consent.summary.map((line) => <p key={line}>{line}</p>)}
        </div>
        <label className="vu-check">
          <input type="checkbox" checked={draft.consentPrivacy} onChange={(event) => patch({ consentPrivacy: event.target.checked })} />
          <span><ConsentSentence sentence={signupCopy.consentPrivacy} link={signupCopy.consentPrivacyLink} href="/privacy" /></span>
        </label>
        <label className="vu-check">
          <input type="checkbox" checked={draft.consentRules} onChange={(event) => patch({ consentRules: event.target.checked })} />
          <span><ConsentSentence sentence={signupCopy.consentRules} link={signupCopy.consentRulesLink} href="/regolamento" /></span>
        </label>
        <label className="vu-check">
          <input type="checkbox" checked={draft.consentMarketing} onChange={(event) => patch({ consentMarketing: event.target.checked })} />
          <span>{signupCopy.consentMarketing}</span>
        </label>
      </div>
    </div>
  );
}

function SuggestionList({ items, onPick }: { items: string[]; onPick: (item: string) => void }) {
  return (
    <ul className="vu-suggest">
      {items.map((item) => (
        <li key={item}>
          <button type="button" onClick={() => onPick(item)}>{item}</button>
        </li>
      ))}
    </ul>
  );
}

function titleFor(step: number, signupCopy: typeof signupMessages) {
  if (step === STEP_NAME) return signupCopy.nameTitle;
  if (step === STEP_VERIFY) return signupCopy.verifyTitle;
  if (step === STEP_VENUE) return signupCopy.venueTitle;
  return signupCopy.consentTitle;
}

function Field({ valid, invalid, children }: { valid?: boolean; invalid?: boolean; children: ReactNode }) {
  const state = invalid ? " is-invalid" : valid ? " is-valid" : "";
  return (
    <div className={`vu-field${state}`}>
      {children}
      {valid && !invalid ? <span className="vu-sheet-mark" aria-hidden><CheckMark /></span> : null}
    </div>
  );
}

function Confetti() {
  return (
    <div className="vu-confetti" aria-hidden>
      {Array.from({ length: 14 }, (_, index) => <i key={index} style={{ ["--i" as string]: index }} />)}
    </div>
  );
}

function ConsentSentence({ sentence, link, href }: { sentence: string; link: string; href: string }) {
  const index = sentence.toLowerCase().indexOf(link.toLowerCase());
  if (index < 0) return sentence;
  return (
    <>
      {sentence.slice(0, index)}
      <ConsentLink href={href}>{sentence.slice(index, index + link.length)}</ConsentLink>
      {sentence.slice(index + link.length)}
    </>
  );
}

function ConsentLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onMouseDown={(event) => event.preventDefault()} onClick={(event) => event.stopPropagation()}>
      {children}
    </a>
  );
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

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.2 4.2L19 7.5" />
    </svg>
  );
}
