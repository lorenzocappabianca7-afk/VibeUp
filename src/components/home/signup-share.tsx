"use client";

import { useDemoLanguage } from "@/context/demo-language-context";
import { useSignupCopy } from "@/lib/locale/use-localized";
import { fillShareMessage, shareUrl } from "@/lib/launch/fields";
import { useState } from "react";

export function invitedLabel(count: number, one: string, many: string) {
  if (count === 1) return one;
  return many.replaceAll("N", String(count));
}

export function SignupMemberCard({
  firstName,
  code,
  inviteCount,
  variant,
}: {
  firstName: string;
  code: string;
  inviteCount: number | null;
  variant: "compact" | "full";
}) {
  const { t } = useDemoLanguage();
  const copy = useSignupCopy();
  const name = firstName.trim();
  const hello = name ? copy.hello.replaceAll("{nome}", name) : t("Ciao");
  return (
    <div className={variant === "full" ? "vu-member vu-member-full" : "vu-member"}>
      <p className="vu-hello">{hello}</p>
      <SignupShare code={code} variant={variant} />
      {inviteCount === null ? null : (
        <p className="vu-invites">{invitedLabel(inviteCount, copy.invitedOne, copy.invitedMany)}</p>
      )}
    </div>
  );
}

export function SignupShare({
  code,
  variant,
}: {
  code: string;
  variant: "compact" | "full";
}) {
  const copy = useSignupCopy();
  const [copied, setCopied] = useState(false);
  const message = fillShareMessage(copy.shareMessage, code);
  const link = shareUrl(code);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function shareNative() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: message, url: link });
        return;
      } catch {
        /* dismissed */
      }
    }
    await copyCode();
  }

  return (
    <div className={variant === "full" ? "vu-share vu-share-full" : "vu-share"}>
      <p className="vu-share-label">{copy.yourCode}</p>
      <p className={variant === "full" ? "vu-share-code vu-share-code-lg" : "vu-share-code"}>{code}</p>
      <div className="vu-share-actions">
        <button type="button" className="vu-btn vu-cta" onClick={() => void copyCode()}>
          {copied ? copy.copied : copy.copy}
        </button>
        {variant === "full" ? (
          <a
            className="vu-btn vu-ghost"
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
          >
            {copy.shareWhatsapp}
          </a>
        ) : null}
        <button type="button" className="vu-btn vu-ghost" onClick={() => void shareNative()}>
          {copy.share}
        </button>
      </div>
    </div>
  );
}
