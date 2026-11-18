"use client";

import { prelaunchCriticalCss } from "@/components/home/prelaunch-critical-css";
import { useLocale } from "@/context/locale-context";
import { landingCopy } from "@/content/landing";
import Link from "next/link";
import { useEffect } from "react";

/** Legal pages share the landing canvas and stay outside the app tab bar. */
export function PrelaunchDocument({
  todo,
  title,
  body,
  versionLabel,
  versionId,
  sections,
  extraLink,
}: {
  todo: string;
  title: string;
  body?: string;
  versionLabel?: string;
  versionId?: string;
  sections?: readonly { heading: string; body: string }[];
  extraLink?: { href: string; label: string };
}) {
  const { t } = useLocale();
  useEffect(() => {
    document.title = t(title);
  }, [t, title]);
  return (
    <>
      <style>{prelaunchCriticalCss}</style>
      <div data-prelaunch-landing>
        <article className="vu-land vu-land-doc">
          <p className="vu-land-todo">{t(todo)}</p>
          <h1 className="vu-land-doc-title">{t(title)}</h1>
          {versionLabel ? (
            <p className="vu-land-version">
              {t(versionLabel)}
              {versionId ? ` ${versionId}` : ""}
            </p>
          ) : null}
          {body ? <p>{t(body)}</p> : null}
          {sections?.map((section) => (
            <section key={section.heading}>
              <h2>{t(section.heading)}</h2>
              <p>{t(section.body)}</p>
            </section>
          ))}
          {extraLink ? (
            <a className="vu-land-textlink" href={extraLink.href}>
              {t(extraLink.label)}
            </a>
          ) : null}
          <Link className="vu-land-textlink" href="/">
            {t(landingCopy.backHome)}
          </Link>
        </article>
      </div>
    </>
  );
}
