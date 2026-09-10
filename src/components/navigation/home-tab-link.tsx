"use client";

import { useTabNavigation } from "@/context/tab-navigation-context";
import { isHomePath, pushHomeHref } from "@/lib/home-navigation";
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

function buildHref(tab: TabId | undefined, isBusinessUser: boolean, search?: string) {
  const params = new URLSearchParams(search?.replace(/^\?/, "") ?? "");
  if (tab) {
    const isDefault =
      (isBusinessUser && tab === "notifications") ||
      (!isBusinessUser && tab === "home");
    if (!isDefault) params.set("tab", tab);
    else params.delete("tab");
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
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
  const { setTab, isBusinessUser } = useTabNavigation();
  const href = buildHref(tab, isBusinessUser, search);

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
    if (isHomePath(pathname) && !hasExtraQuery) {
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
