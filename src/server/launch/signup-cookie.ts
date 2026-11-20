import { createHmac, timingSafeEqual } from "node:crypto";
import { isUuid } from "@/server/launch/request";
import { waitlistPepper } from "@/server/launch/code-mail";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const SIGNUP_COOKIE = "vu_signup";
const VERIFY_COOKIE = "vu_verify";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const VERIFY_MAX_AGE_SECONDS = 10 * 60;

function cookieSecure() {
  return process.env.NODE_ENV === "production";
}

function signSignupId(signupId: string) {
  return createHmac("sha256", waitlistPepper()).update(signupId).digest("base64url");
}

function signVerifyId(signupId: string) {
  return createHmac("sha256", waitlistPepper()).update(`verify:${signupId}`).digest("base64url");
}

export function attachSignupCookie(response: NextResponse, signupId: string) {
  if (!isUuid(signupId)) return;
  try {
    response.cookies.set(SIGNUP_COOKIE, `${signupId}.${signSignupId(signupId)}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(),
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
  } catch {
    // Missing pepper: the demo still checks the signup over the network.
  }
}

export function clearSignupCookie(response: NextResponse) {
  response.cookies.set(SIGNUP_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 0,
  });
}

export function attachVerifyCookie(response: NextResponse, signupId: string) {
  if (!isUuid(signupId)) return;
  try {
    response.cookies.set(VERIFY_COOKIE, `${signupId}.${signVerifyId(signupId)}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(),
      path: "/",
      maxAge: VERIFY_MAX_AGE_SECONDS,
    });
  } catch {
    /* missing pepper */
  }
}

export function clearVerifyCookie(response: NextResponse) {
  response.cookies.set(VERIFY_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 0,
  });
}

function idFromSignedCookie(value: string | undefined | null, sign: (id: string) => string) {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const signupId = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!isUuid(signupId)) return null;
  try {
    const expected = sign(signupId);
    const given = Buffer.from(mac);
    const actual = Buffer.from(expected);
    if (given.length !== actual.length || !timingSafeEqual(given, actual)) return null;
    return signupId;
  } catch {
    return null;
  }
}

export function signupIdFromCookie(value: string | undefined | null) {
  return idFromSignedCookie(value, signSignupId);
}

export function verifyIdFromCookie(value: string | undefined | null) {
  return idFromSignedCookie(value, signVerifyId);
}

/** Signed proof set when a signup is verified. Null when absent or unreadable. */
export async function readTrustedSignupId() {
  try {
    const store = await cookies();
    return signupIdFromCookie(store.get(SIGNUP_COOKIE)?.value);
  } catch {
    return null;
  }
}

export async function readVerifySignupId() {
  try {
    const store = await cookies();
    return verifyIdFromCookie(store.get(VERIFY_COOKIE)?.value);
  } catch {
    return null;
  }
}
