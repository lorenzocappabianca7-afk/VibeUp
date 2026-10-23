import { NextResponse, type NextRequest } from "next/server";
import { rejectLargeRequest } from "@/server/http/request-limits";
import { rateLimit } from "@/server/http/rate-limit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

export function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

/** Browser string for the consent log. Never the IP. */
export function clientUserAgent(request: NextRequest) {
  const clean = (request.headers.get("user-agent") ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
  return clean.slice(0, 300) || null;
}

export function requestOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function guardLaunchRequest(
  request: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
  bucket?: string,
) {
  const tooBig = rejectLargeRequest(request, 16_000);
  if (tooBig) return tooBig;
  return rateLimit(request, { scope, limit, windowMs, bucket });
}

export async function readJsonObject(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function launchError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { error, ...extra },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function launchOk(data: Record<string, unknown>) {
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

export function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}
