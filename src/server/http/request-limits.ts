import { NextResponse, type NextRequest } from "next/server";

export const REQUEST_LIMITS = {
  aiTextChars: 20_000,
  maxUploadFiles: 6,
  maxUploadBytes: 4 * 1024 * 1024,
  quoteBodyBytes: 64 * 1024,
  webhookBodyBytes: 128 * 1024,
  chatMessageChars: 2_000,
  maxWebhookMessages: 20,
};

export function rejectLargeRequest(
  request: NextRequest,
  maxBytes: number,
): NextResponse | null {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    return NextResponse.json(
      { error: "Payload troppo grande." },
      { status: 413 },
    );
  }

  return null;
}

export function limitText(value: string, maxChars: number): string {
  return value.trim().slice(0, maxChars);
}
