"use client";

import { signupCopy } from "@/content/signup";
import { useDemoLanguage } from "@/context/demo-language-context";
import { fillShareMessage, shareUrl } from "@/lib/launch/fields";
import { useState } from "react";

export function invitedLabel(count: number, lang: "it" | "en" = "it") {
  if (lang === "en") {
    return count === 1 ? "You invited 1 friend" : `You invited ${count} friends`;
  }
  if (count === 1) return signupCopy.invitedOne;
  return signupCopy.invitedMany.replaceAll("N", String(count));
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
  const { lang } = useDemoLanguage();
  const name = firstName.trim();
  const hello = lang === "en"
    ? (name ? `Hi ${name}` : "Hi")
    : (name ? signupCopy.hello.replaceAll("{nome}", name) : "Ciao");
  return (
    <div className={variant === "full" ? "vu-member vu-member-full" : "vu-member"}>
      <p className="vu-hello">{hello}</p>
      <SignupShare code={code} variant={variant} />
      {inviteCount === null ? null : <p className="vu-invites">{invitedLabel(inviteCount, lang)}</p>}
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
  const [copied, setCopied] = useState(false);
  const message = fillShareMessage(signupCopy.shareMessage, code);
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
      <p className="vu-share-label">{signupCopy.yourCode}</p>
      <p className={variant === "full" ? "vu-share-code vu-share-code-lg" : "vu-share-code"}>{code}</p>
      <div className="vu-share-actions">
        <button type="button" className="vu-btn vu-cta" onClick={() => void copyCode()}>
          {copied ? signupCopy.copied : signupCopy.copy}
        </button>
        {variant === "full" ? (
          <a
            className="vu-btn vu-ghost"
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
          >
            {signupCopy.shareWhatsapp}
          </a>
        ) : null}
        <button type="button" className="vu-btn vu-ghost" onClick={() => void shareNative()}>
          {signupCopy.share}
        </button>
      </div>
    </div>
  );
}
