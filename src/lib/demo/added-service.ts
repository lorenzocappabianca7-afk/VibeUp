import { markDemoStep } from "@/lib/demo/steps";
import type { PartyServicePick } from "@/types/party-criteria";

export const DEMO_ADDED_SERVICE_KEY = "vibeup-demo-added-service-v1";
export const DEMO_SERVICE_ADDED_EVENT = "vibeup-demo-service-added";
export const DEMO_GUIDE_SKIP_EVENT = "vibeup-demo-guide-skip";

export interface DemoAddedService {
  sessionId: string;
  serviceId: PartyServicePick;
  supplierId: string;
  supplierName: string;
  addedAt: string;
}

function readRaw(): DemoAddedService | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.sessionStorage.getItem(DEMO_ADDED_SERVICE_KEY) ??
      window.localStorage.getItem(DEMO_ADDED_SERVICE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const row = parsed as DemoAddedService;
    if (!row.sessionId || !row.serviceId || !row.supplierName) return null;
    return row;
  } catch {
    return null;
  }
}

export function readDemoAddedService(sessionId: string): DemoAddedService | null {
  const row = readRaw();
  return row && row.sessionId === sessionId ? row : null;
}

export function writeDemoAddedService(row: DemoAddedService) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(row);
  try {
    window.sessionStorage.setItem(DEMO_ADDED_SERVICE_KEY, raw);
  } catch {
    /* private mode */
  }
  try {
    window.localStorage.setItem(DEMO_ADDED_SERVICE_KEY, raw);
  } catch {
    /* private mode */
  }
  markDemoStep("service", {
    addedService: {
      serviceId: row.serviceId,
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      addedAt: row.addedAt,
    },
  });
  window.dispatchEvent(new Event(DEMO_SERVICE_ADDED_EVENT));
}

export function clearDemoAddedService() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DEMO_ADDED_SERVICE_KEY);
  } catch {
    /* private mode */
  }
  try {
    window.localStorage.removeItem(DEMO_ADDED_SERVICE_KEY);
  } catch {
    /* private mode */
  }
}
