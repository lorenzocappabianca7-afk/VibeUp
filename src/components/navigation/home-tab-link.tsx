"use client";

import { useTabNavigation } from "@/context/tab-navigation-context";
import { useDemoMode } from "@/context/demo-mode-context";
import { buildShellTabHref, usesDemoShell } from "@/lib/demo/shell";
import { isHomePath, pushHomeHref } from "@/lib/home-navigation";
import { isPlatformLive } from "@/lib/platform";
import type { TabId } from "@/types/navigation";
import { usePathname, useRouter } from "next/navigation";
import {
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

type HomeTabLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "onClick"
> & {
  /** Target home tab. Omit for the mode default (home / notifications). */
  tab?: TabId;
  /** Extra query (e.g. `category=dj`) — applied on the home shell URL. */
  search?: string;
  children: ReactNode;
};

function buildHref(
  tab: TabId | undefined,
  isBusinessUser: boolean,
  demoShell: boolean,
  search?: string,
) {
  const params = new URLSearchParams(search?.replace(/^\?/, "") ?? "");
  if (tab) {
    const base = buildShellTabHref(tab, isBusinessUser, demoShell);
    const query = base.includes("?") ? base.slice(base.indexOf("?") + 1) : "";
    if (query) {
      new URLSearchParams(query).forEach((value, key) => {
        params.set(key, value);
      });
    }
  }
  if (!demoShell && !isPlatformLive()) params.set("app", "1");
  const qs = params.toString();
  const path = demoShell ? "/demo" : "/";
  return qs ? `${path}?${qs}` : path;
}

/**
 * Link back into the home tab shell. Same-document tab switches stay local;
 * leaving a detail route uses a client navigation so the splash does not replay.
 */
export function HomeTabLink({
  tab,
  search,
  children,
  className,
  ...rest
}: HomeTabLinkProps) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { isDemoMode } = useDemoMode();
  const { setTab, isBusinessUser } = useTabNavigation();
  const demoShell = usesDemoShell(pathname, isDemoMode);
  const href = buildHref(tab, isBusinessUser, demoShell, search);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    const hasExtraQuery = Boolean(search && search.replace(/^\?/, "").length);
    const onShellHome =
      pathname === "/demo" || isHomePath(pathname);
    if (onShellHome && !hasExtraQuery) {
      setTab(tab ?? (isBusinessUser ? "notifications" : "home"));
      return;
    }

    pushHomeHref(router, href);
  }

  return (
    <a href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
