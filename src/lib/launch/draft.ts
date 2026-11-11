import { isVibeUpCode, normalizeCode } from "@/lib/launch/fields";

export const SIGNUP_DRAFT_KEY = "vu_signup_draft";
export const SIGNUP_REFERRAL_KEY = "vu_referral";

export type SignupDraft = {
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  referralCode: string;
  referralSkipped: boolean;
  consentPrivacy: boolean;
  consentRules: boolean;
  consentMarketing: boolean;
  step: number;
  signupId: string;
  codeSentAt: number;
  codeSentFor: string;
  emailConfirmed: boolean;
  confirmedEmail: string;
  confirmedSignupId: string;
  flow: number;
};

export function readStoredSignupReferral() {
  return storedReferral();
}

function storedReferral() {
  if (typeof window === "undefined") return "";
  try {
    const value = normalizeCode(sessionStorage.getItem(SIGNUP_REFERRAL_KEY) ?? "");
    return isVibeUpCode(value) ? value : "";
  } catch {
    return "";
  }
}

/** Valid ?ref= on this page. Saved immediately so a later visit still has it. */
function urlReferral() {
  if (typeof window === "undefined") return "";
  try {
    const ref = normalizeCode(new URLSearchParams(window.location.search).get("ref") ?? "");
    if (!isVibeUpCode(ref)) return "";
    sessionStorage.setItem(SIGNUP_REFERRAL_KEY, ref);
    return ref;
  } catch {
    return "";
  }
}

function referralFromLocation() {
  return urlReferral() || storedReferral();
}

export function rememberSignupReferral(code: string) {
  const value = normalizeCode(code);
  if (!isVibeUpCode(value) || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SIGNUP_REFERRAL_KEY, value);
  } catch {
    /* private mode */
  }
}

export function emptySignupDraft(): SignupDraft {
  return {
    firstName: "",
    lastName: "",
    email: "",
    birthDate: "",
    referralCode: referralFromLocation(),
    referralSkipped: false,
    consentPrivacy: false,
    consentRules: false,
    consentMarketing: false,
    step: 0,
    signupId: "",
    codeSentAt: 0,
    codeSentFor: "",
    emailConfirmed: false,
    confirmedEmail: "",
    confirmedSignupId: "",
    flow: 3,
  };
}

export function loadSignupDraft(): SignupDraft {
  const base = emptySignupDraft();
  if (typeof window === "undefined") return base;
  try {
    const raw = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SignupDraft> & { flow?: number; emailConfirmed?: boolean; signupId?: string };
    const legacy = parsed.flow !== 3;
    const confirmed = parsed.emailConfirmed === true;
    const hasId = typeof parsed.signupId === "string" && parsed.signupId.length > 0;
    let step = typeof parsed.step === "number" ? parsed.step : 0;
    if (legacy) step = confirmed ? 2 : hasId ? 1 : 0;
    const fromUrl = urlReferral();
    const skipped = parsed.referralSkipped === true && !fromUrl;
    const savedCode = typeof parsed.referralCode === "string" ? parsed.referralCode : "";
    const birthDate = typeof parsed.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.birthDate) ? parsed.birthDate : "";
    return {
      ...base,
      firstName: typeof parsed.firstName === "string" ? parsed.firstName : "",
      lastName: typeof parsed.lastName === "string" ? parsed.lastName : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      birthDate,
      consentPrivacy: parsed.consentPrivacy === true,
      consentRules: parsed.consentRules === true,
      consentMarketing: parsed.consentMarketing === true,
      referralSkipped: skipped,
      referralCode: fromUrl || (skipped ? "" : savedCode || storedReferral()),
      step: Math.min(2, Math.max(0, step)),
      signupId: hasId ? parsed.signupId! : "",
      codeSentAt: typeof parsed.codeSentAt === "number" ? parsed.codeSentAt : 0,
      codeSentFor: !legacy && typeof parsed.codeSentFor === "string" ? parsed.codeSentFor : "",
      emailConfirmed: !legacy && confirmed,
      confirmedEmail: !legacy && typeof parsed.confirmedEmail === "string" ? parsed.confirmedEmail : "",
      confirmedSignupId: !legacy && typeof parsed.confirmedSignupId === "string" ? parsed.confirmedSignupId : "",
      flow: 3,
    };
  } catch {
    return base;
  }
}

export function saveSignupDraft(draft: SignupDraft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}

export function clearSignupDraft() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SIGNUP_DRAFT_KEY);
  } catch {
    /* private mode */
  }
}
