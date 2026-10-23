import { prelaunchCriticalCss } from "@/components/home/prelaunch-critical-css";
import { landingCopy } from "@/content/landing";
import Link from "next/link";

/** Legal pages share the landing canvas and stay outside the app tab bar. */
export function PrelaunchDocument({
  todo,
  title,
  body,
  version,
  sections,
  extraLink,
}: {
  todo: string;
  title: string;
  body?: string;
  version?: string;
  sections?: readonly { heading: string; body: string }[];
  extraLink?: { href: string; label: string };
}) {
  return (
    <>
      <style>{prelaunchCriticalCss}</style>
      <div data-prelaunch-landing>
        <article className="vu-land vu-land-doc">
          <p className="vu-land-todo">{todo}</p>
          <h1 className="vu-land-doc-title">{title}</h1>
          {version ? <p className="vu-land-version">{version}</p> : null}
          {body ? <p>{body}</p> : null}
          {sections?.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
          {extraLink ? (
            <a className="vu-land-textlink" href={extraLink.href}>
              {extraLink.label}
            </a>
          ) : null}
          <Link className="vu-land-textlink" href="/">
            {landingCopy.backHome}
          </Link>
        </article>
      </div>
    </>
  );
}
