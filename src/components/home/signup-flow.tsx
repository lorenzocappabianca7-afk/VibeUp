"use client";

import { useDemoLanguage } from "@/context/demo-language-context";
import { consentText } from "@/content/legal";
import { signupCopy } from "@/content/signup";
import { SignupMemberCard } from "@/components/home/signup-share";
import { readDemoLanguage } from "@/lib/demo/language";
import { DEMO_SIGNUP_ID_STORAGE_KEY, readVerifiedMember } from "@/lib/demo/signup-gate";
import {
  clearSignupDraft,
  loadSignupDraft,
  readStoredSignupReferral,
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
  normalizeEmail,
  USERNAME_RE,
} from "@/lib/launch/fields";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

const years = birthYearChoices();
const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])";
const SHEET_OPEN_MS = 350;
const verifyInflight = new Set<string>();

function focusWithoutScroll(node: HTMLElement) {
  try {
    node.focus({ preventScroll: true });
  } catch {
    node.focus();
  }
}

/** Keep the active field in the sheet's middle scroller. The page and the visual viewport stay put. */
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
  if (typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }
  return window.setTimeout(callback, 16);
}

function cancelFrame(id: number) {
  if (typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(id);
    return;
  }
  window.clearTimeout(id);
}

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
      return 1;
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
  const storedReferral = readStoredSignupReferral();
  const linkedReferral =
    !draft.referralSkipped && storedReferral.length > 0 && normalizeCode(draft.referralCode) === storedReferral;

  useEffect(() => {
    draftRef.current = draft;
    saveSignupDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (!linkedReferral || draftRef.current.step !== 7) return;
    go(8);
    // Saved drafts that stopped on the friend-code step skip it once. A later
    // validation error can still open that step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const body = document.body;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    const landing = document.querySelector("[data-prelaunch-landing]");
    const landingTop = landing instanceof HTMLElement ? landing.scrollTop : 0;
    const landingOverflow = landing instanceof HTMLElement ? landing.style.overflow : "";
    const freezeLanding = () => {
      if (landing instanceof HTMLElement && landing.scrollTop !== landingTop) {
        landing.scrollTop = landingTop;
      }
    };
    if (landing instanceof HTMLElement) {
      landing.style.overflow = "hidden";
      landing.addEventListener("scroll", freezeLanding);
    }

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      if (landing instanceof HTMLElement) {
        landing.removeEventListener("scroll", freezeLanding);
        landing.style.overflow = landingOverflow;
        landing.scrollTop = landingTop;
      }
      window.scrollTo(0, scrollY);
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
        active instanceof HTMLElement &&
        scroller.contains(active) &&
        active.matches("input, select, textarea")
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
      void postJson("/api/launch/username", { username, signupId: draftRef.current.signupId }).then((result) => {
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
  }, [usernameActive, usernameQuery, draft.signupId]);

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
    setDir(step < draft.step ? "back" : "next");
    setError("");
    setReferralWarn("");
    setDraft((current) => ({ ...current, step }));
  }

  function stepAfter(step: number) {
    if (step === 1 && draft.emailConfirmed) return 3;
    if (step === 6 && linkedReferral) return 8;
    return Math.min(8, step + 1);
  }

  function stepBefore(step: number) {
    if (step === 3 && draft.emailConfirmed) return 1;
    if (step === 8 && linkedReferral) return 6;
    return Math.max(0, step - 1);
  }

  const year = Number(draft.birthYear);
  const phone = joinPhone(draft.phonePrefix, draft.phoneNational);
  const canContinue =
    (draft.step === 0 && isPersonName(draft.firstName) && isPersonName(draft.lastName)) ||
    (draft.step === 1 &&
      USERNAME_RE.test(draft.username.trim()) &&
      usernameState === "free" &&
      isEmailAddress(draft.email)) ||
    (draft.step === 2 && /^\d{6}$/.test(verifyCode)) ||
    (draft.step === 3 && isE164(phone)) ||
    (draft.step === 4 && Number.isInteger(year) && isAtLeast14(year)) ||
    (draft.step === 5 && isHighSchool(draft.highSchool)) ||
    (draft.step === 6 && draft.dreamVenue.trim().length > 1) ||
    (draft.step === 7 && isVibeUpCode(draft.referralCode)) ||
    (draft.step === 8 && draft.consentPrivacy && draft.consentRules);

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

  function showError(code: string) {
    const jump = stepForError(code);
    if (jump !== null && jump !== draft.step) go(jump);
    if (code === "username_taken") {
      setUsernameResult({ username: draft.username.trim(), state: "taken" });
    }
    setError(errorText(code));
  }

  async function sendAccountCode() {
    setBusy(true);
    setError("");
    const result = await postJson("/api/launch/signup", {
      firstName: draft.firstName,
      lastName: draft.lastName,
      username: draft.username,
      email: draft.email,
      consentPrivacy: false,
      consentRules: false,
      locale: readDemoLanguage(),
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
      emailConfirmed: false,
      step: 2,
    }));
  }

  async function submitSignup() {
    setBusy(true);
    setError("");
    const result = await postJson("/api/launch/signup", {
      signupId: draft.signupId,
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
      locale: readDemoLanguage(),
    });
    setBusy(false);
    const signupId = result.signupId || draft.signupId;
    if (!result.ok || !signupId) {
      showError(result.error || "unavailable");
      return;
    }
    if (result.vibeupCode) {
      await finishVerify(signupId, result.vibeupCode, result.demoPath || null);
      return;
    }
    const sentAt = result.sentAt ? new Date(result.sentAt).getTime() : Date.now();
    setVerifyCode("");
    setDir("next");
    setDraft((current) => ({
      ...current,
      signupId,
      codeSentAt: sentAt,
      codeSentFor: normalizeEmail(current.email),
      emailConfirmed: false,
      step: 2,
    }));
  }

  async function continueStep() {
    if (busy || !canContinue || done) return;
    if (draft.step === 1) {
      const emailKey = normalizeEmail(draft.email);
      if (draft.emailConfirmed && draft.signupId && draft.confirmedSignupId === draft.signupId) {
        go(3);
        return;
      }
      if (
        draft.signupId &&
        draft.codeSentFor === emailKey &&
        draft.codeSentAt > 0 &&
        Date.now() - draft.codeSentAt < 30_000
      ) {
        go(2);
        return;
      }
      await sendAccountCode();
      return;
    }
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
    if (draft.step === 2) {
      await verifyNow(verifyCode);
      return;
    }
    if (draft.step === 8) {
      await submitSignup();
      return;
    }
    go(stepAfter(draft.step));
  }

  async function verifyNow(code: string) {
    if (!/^\d{6}$/.test(code) || !draft.signupId) return;
    const key = `${draft.signupId}:${code}`;
    if (verifyInflight.has(key)) return;
    verifyInflight.add(key);
    setBusy(true);
    const result = await postJson("/api/launch/verify", {
      signupId: draft.signupId,
      code,
    });
    setBusy(false);
    if (result.ok && result.vibeupCode) {
      await finishVerify(draft.signupId, result.vibeupCode, result.demoPath || null);
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
        step: 3,
      }));
      return;
    }
    verifyInflight.delete(key);
    setError(errorText(result.error || "mismatch"));
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
      codeSentFor: normalizeEmail(current.email),
      emailConfirmed: false,
    }));
    setError("");
  }

  function skipOptional() {
    if (draft.step === 7) {
      patch({ referralCode: "", referralSkipped: true });
      setReferralWarn("");
      go(8);
    }
  }

  function hasEnteredData() {
    return Boolean(
      draft.firstName.trim() ||
        draft.lastName.trim() ||
        draft.username.trim() ||
        draft.email.trim() ||
        draft.phoneNational.trim() ||
        draft.birthYear ||
        draft.highSchool.trim() ||
        draft.dreamVenue.trim() ||
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

  function chooseYear(value: string) {
    setError("");
    setDraft((current) => ({ ...current, birthYear: value }));
  }

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

  const visibleSteps = linkedReferral ? [0, 1, 2, 3, 4, 5, 6, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const stepNumber = Math.max(1, visibleSteps.indexOf(draft.step) + 1);
  const progress = (stepNumber / visibleSteps.length) * 100;
  const stepLabel = lang === "en"
    ? `Step ${stepNumber} of ${visibleSteps.length}`
    : signupCopy.stepProgress
        .replaceAll("{n}", String(stepNumber))
        .replaceAll("{total}", String(visibleSteps.length));
  const sheetStyle: CSSProperties = { ["--drag" as string]: `${dragY}px` };
  const lead =
    draft.step === 2
      ? signupCopy.verifyBody
      : draft.step === 6
        ? signupCopy.venueOptional
        : draft.step === 1 && usernameState === "idle"
          ? signupCopy.usernameHint
          : "";
  const showBack = !done && draft.step > 0;

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
        <div
          className="vu-sheet-grab"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <span className="vu-sheet-handle" />
        </div>
        <header
          className="vu-sheet-head"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          {showBack ? (
            <button type="button" className="vu-btn vu-icon-btn" onClick={() => go(stepBefore(draft.step))} aria-label={signupCopy.back}>
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
          <div
            className="vu-sheet-bar"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={visibleSteps.length}
            aria-valuenow={stepNumber}
            aria-valuetext={stepLabel}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        )}

        {checking ? (
          <div className="vu-sheet-body" />
        ) : done ? (
          <div className="vu-sheet-body vu-sheet-done">
            <Confetti />
            <h1 id="signup-title" className="vu-sheet-title">
              {signupCopy.doneTitle}
            </h1>
            <p className="vu-sheet-lead">{signupCopy.doneBody}</p>
            <SignupMemberCard
              firstName={done.firstName}
              code={done.code}
              inviteCount={done.inviteCount}
              variant="full"
            />
            <a className="vu-btn vu-cta vu-signup-demo" href={done.demoPath ?? "/demo"}>
              {signupCopy.tryDemo}
            </a>
            <button type="button" className="vu-text-btn" onClick={dismiss}>
              {signupCopy.backToSite}
            </button>
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
              <h1 id="signup-title" className="vu-sheet-title">
                {titleFor(draft.step)}
              </h1>
              {lead ? <p className="vu-sheet-lead">{lead}</p> : null}
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
              {referralWarn ? <p className="vu-signup-error">{referralWarn}</p> : null}
              {error ? <p className="vu-signup-error">{error}</p> : null}
            </div>
            <div className="vu-sheet-foot">
              {draft.step === 7 ? (
                <button type="button" className="vu-sheet-skip" onClick={skipOptional}>
                  {signupCopy.skip}
                </button>
              ) : null}
              {draft.step === 2 ? (
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
          <div
            ref={exitRef}
            className="vu-exit"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="signup-exit-title"
            aria-describedby="signup-exit-body"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="signup-exit-title">{signupCopy.exitTitle}</h2>
            <p id="signup-exit-body">{signupCopy.exitBody}</p>
            <button type="button" className="vu-btn vu-cta" onClick={() => setExitOpen(false)}>
              {signupCopy.exitStay}
            </button>
            <button type="button" className="vu-text-btn" onClick={dismiss}>
              {signupCopy.exitLeave}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  function fieldsFor() {
    if (draft.step === 0) {
      return (
        <div className="vu-signup-fields">
          <Field valid={isPersonName(draft.firstName)}>
            <input
              className="vu-input"
              autoComplete="given-name"
              enterKeyHint="next"
              placeholder={signupCopy.firstName}
              value={draft.firstName}
              onChange={(event) => patch({ firstName: event.target.value })}
            />
          </Field>
          <Field valid={isPersonName(draft.lastName)}>
            <input
              className="vu-input"
              autoComplete="family-name"
              enterKeyHint="next"
              placeholder={signupCopy.lastName}
              value={draft.lastName}
              onChange={(event) => patch({ lastName: event.target.value })}
            />
          </Field>
        </div>
      );
    }
    if (draft.step === 1) {
      return (
        <div className="vu-signup-fields">
          <Field valid={usernameState === "free"} invalid={usernameState === "taken"}>
            <input
              className="vu-input"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="nome_utente"
              value={draft.username}
              aria-invalid={usernameState === "taken"}
              onChange={(event) => patch({ username: event.target.value.replace(/\s/g, "") })}
            />
          </Field>
          <Field valid={isEmailAddress(draft.email)} invalid={error === signupCopy.emailTaken}>
            <input
              className="vu-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              enterKeyHint="go"
              placeholder={signupCopy.emailPlaceholder}
              value={draft.email}
              aria-invalid={error === signupCopy.emailTaken}
              onChange={(event) => {
                const email = event.target.value;
                const key = normalizeEmail(email);
                patch({
                  email,
                  emailConfirmed:
                    key.length > 0 &&
                    key === draft.confirmedEmail &&
                    draft.signupId.length > 0 &&
                    draft.signupId === draft.confirmedSignupId,
                });
              }}
            />
          </Field>
        </div>
      );
    }
    if (draft.step === 2) {
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
              if (/^\d{6}$/.test(next)) void verifyNow(next);
            }}
          />
        </Field>
      );
    }
    if (draft.step === 3) {
      const invalid = Boolean(draft.phoneNational) && !isE164(phone);
      return (
        <div className="vu-phone-row">
          <input
            className="vu-input vu-prefix"
            type="tel"
            inputMode="tel"
            autoComplete="tel-country-code"
            aria-label="Prefisso"
            value={draft.phonePrefix}
            onChange={(event) => patch({ phonePrefix: event.target.value })}
          />
          <Field valid={isE164(phone)} invalid={invalid}>
            <input
              className="vu-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              enterKeyHint="next"
              placeholder="333 123 4567"
              value={draft.phoneNational}
              aria-invalid={invalid}
              onChange={(event) => patch({ phoneNational: event.target.value })}
            />
          </Field>
        </div>
      );
    }
    if (draft.step === 4) {
      const invalid = Boolean(draft.birthYear) && !isAtLeast14(year);
      return (
        <Field valid={Boolean(draft.birthYear) && isAtLeast14(year)} invalid={invalid}>
          <select
            className="vu-input"
            value={draft.birthYear}
            aria-invalid={invalid}
            onChange={(event) => chooseYear(event.target.value)}
          >
            <option value="">{signupCopy.yearPlaceholder}</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
      );
    }
    if (draft.step === 5 || draft.step === 6) {
      const value = draft.step === 5 ? draft.highSchool : draft.dreamVenue;
      const placeholder = draft.step === 5 ? signupCopy.schoolPlaceholder : signupCopy.venuePlaceholder;
      const valid = draft.step === 5 ? isHighSchool(value) : value.trim().length > 1;
      return (
        <div className="vu-suggest-wrap">
          <Field valid={valid}>
            <input
              className="vu-input"
              placeholder={placeholder}
              value={value}
              autoComplete="off"
              enterKeyHint="next"
              onChange={(event) =>
                patch(draft.step === 5 ? { highSchool: event.target.value } : { dreamVenue: event.target.value })
              }
            />
          </Field>
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
      );
    }
    if (draft.step === 8) {
      return (
        <div className="vu-checks">
          {linkedReferral ? <p className="vu-sheet-chip">{signupCopy.invitedByFriend}</p> : null}
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
    return null;
  }
}

function Field({
  valid,
  invalid,
  children,
}: {
  valid?: boolean;
  invalid?: boolean;
  children: ReactNode;
}) {
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
      {Array.from({ length: 14 }, (_, index) => (
        <i key={index} style={{ ["--i" as string]: index }} />
      ))}
    </div>
  );
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
      return signupCopy.accountTitle;
    case 2:
      return signupCopy.verifyTitle;
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

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.2 4.2L19 7.5" />
    </svg>
  );
}
