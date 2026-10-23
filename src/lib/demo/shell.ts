import type { TabId } from "@/types/navigation";

export const DEMO_SHELL_PATH = "/demo";

/** Tab links stay on /demo while the visitor is inside the demo flow. */
export function usesDemoShell(pathname: string, demo: boolean) {
  if (!demo) return false;
  if (pathname === DEMO_SHELL_PATH || pathname.startsWith(`${DEMO_SHELL_PATH}/`)) {
    return true;
  }
  return (
    pathname === "/location" ||
    pathname.startsWith("/location/") ||
    pathname === "/service" ||
    pathname.startsWith("/service/") ||
    pathname === "/event" ||
    pathname.startsWith("/event/")
  );
}

export function buildShellTabHref(
  tab: TabId,
  isBusinessUser: boolean,
  demoShell: boolean,
) {
  const isDefault =
    (isBusinessUser && tab === "notifications") ||
    (!isBusinessUser && tab === "home");
  if (!demoShell) return isDefault ? "/" : `/?tab=${tab}`;
  return isDefault ? DEMO_SHELL_PATH : `${DEMO_SHELL_PATH}?tab=${tab}`;
}

/** Keeps a real-app `/?tab=` href unchanged when demo mode is off. */
export function withDemoShell(href: string, demo: boolean) {
  if (!demo) return href;
  if (href === "/") return DEMO_SHELL_PATH;
  if (href.startsWith("/?")) return `${DEMO_SHELL_PATH}${href.slice(1)}`;
  return href;
}
