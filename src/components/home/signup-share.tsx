"use client";

import { signupCopy } from "@/content/signup";
import { fillShareMessage, shareUrl } from "@/lib/launch/fields";
import { useState } from "react";

export function invitedLabel(count: number) {
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
  const name = firstName.trim();
  return (
    <div className={variant === "full" ? "vu-member vu-member-full" : "vu-member"}>
      <p className="vu-hello">{name ? signupCopy.hello.replaceAll("{nome}", name) : "Ciao"}</p>
      <SignupShare code={code} variant={variant} />
      {inviteCount === null ? null : <p className="vu-invites">{invitedLabel(inviteCount)}</p>}
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
