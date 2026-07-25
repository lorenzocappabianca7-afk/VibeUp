"use client";

import { useTabNavigation } from "@/context/tab-navigation-context";
import { assignHomeHref, isHomePath } from "@/lib/home-navigation";
import type { TabId } from "@/types/navigation";
import { usePathname } from "next/navigation";
import {
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

type HomeTabLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "onClick"
> & {
  /** Target home tab. Omit for the mode default (explore / notifications). */
  tab?: TabId;
  /** Extra query (e.g. `category=dj`) — forces a full home load when set. */
  search?: string;
  children: ReactNode;
};

function buildHref(tab: TabId | undefined, isBusinessUser: boolean, search?: string) {
  const params = new URLSearchParams(search?.replace(/^\?/, "") ?? "");
  if (tab) {
    const isDefault =
      (isBusinessUser && tab === "notifications") ||
      (!isBusinessUser && tab === "explore");
    if (!isDefault) params.set("tab", tab);
    else params.delete("tab");
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

/**
 * Link back into the home tab shell without Next.js soft navigation when
 * leaving detail routes (avoids Safari “page couldn’t load” after long use).
 */
export function HomeTabLink({
  tab,
  search,
  children,
  className,
  ...rest
}: HomeTabLinkProps) {
  const pathname = usePathname() || "/";
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
      setTab(tab ?? (isBusinessUser ? "notifications" : "explore"));
      return;
    }

    assignHomeHref(href);
  }

  return (
    <a href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
