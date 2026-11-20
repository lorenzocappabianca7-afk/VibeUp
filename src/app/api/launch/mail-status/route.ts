import { asText, isUuid, launchError, launchOk, readJsonObject } from "@/server/launch/request";
import { rejectLargeRequest } from "@/server/http/request-limits";
import { readVerifyMail } from "@/server/repositories/waitlist";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const tooBig = rejectLargeRequest(request, 4_000);
  if (tooBig) return tooBig;
  const body = await readJsonObject(request);
  const signupId = asText(body?.signupId).trim();
  if (!isUuid(signupId)) return launchError(400, "invalid");
  const status = await readVerifyMail(signupId).catch(() => null);
  return launchOk({ status });
}
