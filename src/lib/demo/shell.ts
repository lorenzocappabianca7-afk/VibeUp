import { isPlatformLive } from "@/lib/platform";
import type { TabId } from "@/types/navigation";

/** Pre-launch real app lives at /?app=1. Demo hrefs stay on /demo. */
export function withAdminApp(href: string) {
  if (isPlatformLive()) return href;
  if (href === "/") return "/?app=1";
  if (!href.startsWith("/?") || href.startsWith("//")) return href;
  const params = new URLSearchParams(href.slice(2));
  params.set("app", "1");
  return `/?${params.toString()}`;
}

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
  if (!demoShell) return withAdminApp(isDefault ? "/" : `/?tab=${tab}`);
  return isDefault ? DEMO_SHELL_PATH : `${DEMO_SHELL_PATH}?tab=${tab}`;
}

/** Keeps a real-app `/?tab=` href unchanged when demo mode is off. */
export function withDemoShell(href: string, demo: boolean) {
  if (!demo) return withAdminApp(href);
  if (href === "/") return DEMO_SHELL_PATH;
  if (href.startsWith("/?")) return `${DEMO_SHELL_PATH}${href.slice(1)}`;
  return href;
}
