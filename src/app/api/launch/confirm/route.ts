import { requestOrigin } from "@/server/launch/request";
import { attachSignupCookie, attachVerifyCookie, clearVerifyCookie } from "@/server/launch/signup-cookie";
import { confirmEmailToken, readPendingSignup } from "@/server/repositories/waitlist";
import { deliverWelcomeEmail } from "@/server/launch/welcome-mail";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const signupId = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  const token = request.nextUrl.searchParams.get("t")?.trim() ?? "";
  const target = new URL("/", requestOrigin(request));
  target.searchParams.set("open", "signup");
  try {
    const result = await confirmEmailToken(signupId, token);
    if (!result.ok) {
      target.searchParams.set("sid", signupId);
      if (result.error === "expired") {
        target.searchParams.set("confirm", "expired");
        const failed = NextResponse.redirect(target);
        attachVerifyCookie(failed, signupId);
        return failed;
      }
      const pending = await readPendingSignup(signupId).catch(() => null);
      if (pending?.stage === "done" || pending?.stage === "continue") {
        target.searchParams.set("confirm", pending.stage === "done" ? "done" : "continue");
        const again = NextResponse.redirect(target);
        if (pending.stage === "done") {
          attachSignupCookie(again, signupId);
          clearVerifyCookie(again);
        } else {
          attachVerifyCookie(again, signupId);
        }
        return again;
      }
      target.searchParams.set("confirm", "used");
      const failed = NextResponse.redirect(target);
      attachVerifyCookie(failed, signupId);
      return failed;
    }
    if (!result.confirmed && result.welcomePending && result.vibeupCode) {
      await deliverWelcomeEmail({
        signupId,
        email: result.email,
        firstName: result.firstName,
        code: result.vibeupCode,
      }).catch(() => undefined);
    }
    target.searchParams.set("sid", signupId);
    target.searchParams.set("confirm", result.confirmed ? "continue" : "done");
    const response = NextResponse.redirect(target);
    if (result.confirmed) {
      attachVerifyCookie(response, signupId);
    } else {
      attachSignupCookie(response, signupId);
      clearVerifyCookie(response);
    }
    return response;
  } catch {
    target.searchParams.set("confirm", "used");
    return NextResponse.redirect(target);
  }
}
