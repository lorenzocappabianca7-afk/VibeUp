import { privacyRequestCopy } from "@/content/legal";
import { hashClientIp } from "@/server/launch/code-mail";
import { clientIp, clientUserAgent, isUuid } from "@/server/launch/request";
import { revokeMarketingConsent } from "@/server/repositories/privacy";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(title: string, body: string) {
  const html = `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#0F1115;color:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <main style="max-width:480px;margin:0 auto;padding:48px 20px;">
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.1;">${title}</h1>
      <p style="margin:0 0 20px;font-size:17px;line-height:1.45;color:#C9CAD0;">${body}</p>
      <a href="/" style="color:#3ECFCF;font-size:15px;">Torna al sito</a>
    </main>
  </body>
</html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  const token = request.nextUrl.searchParams.get("t")?.trim() ?? "";
  if (!isUuid(id) || !token) {
    return page(privacyRequestCopy.unsubscribeTitle, privacyRequestCopy.unsubscribeInvalid);
  }
  try {
    const result = await revokeMarketingConsent(id, token, {
      ipHash: hashClientIp(clientIp(request)),
      userAgent: clientUserAgent(request),
    });
    if (!result.ok) {
      return page(privacyRequestCopy.unsubscribeTitle, privacyRequestCopy.unsubscribeInvalid);
    }
    return page(privacyRequestCopy.unsubscribeTitle, privacyRequestCopy.unsubscribeOk);
  } catch {
    return page(privacyRequestCopy.unsubscribeTitle, privacyRequestCopy.unsubscribeInvalid);
  }
}
