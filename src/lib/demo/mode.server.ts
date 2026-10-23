import {
  DEMO_MODE_COOKIE,
  DEMO_MODE_COOKIE_VALUE,
} from "@/lib/demo/mode";
import { cookies } from "next/headers";

/** Server kill switch. Not a NEXT_PUBLIC variable, so it never ships in the client bundle. */
export function isDemoKillSwitchOn(): boolean {
  const raw = process.env.DEMO_MODE_DISABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

/** True when the demo session cookie is present and the kill switch is off. */
export async function isDemoModeServer(): Promise<boolean> {
  if (isDemoKillSwitchOn()) return false;
  const store = await cookies();
  return store.get(DEMO_MODE_COOKIE)?.value === DEMO_MODE_COOKIE_VALUE;
}
