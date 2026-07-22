export type ConsumerTabId = "explore" | "events" | "messages" | "profile";
export type BusinessTabId = "notifications" | "calendar" | "profile";
export type TabId = ConsumerTabId | BusinessTabId;

export interface TabItem {
  id: TabId;
  label: string;
}

export const CONSUMER_TABS: TabItem[] = [
  { id: "explore", label: "Esplora" },
  { id: "events", label: "Eventi" },
  { id: "messages", label: "Messaggi" },
  { id: "profile", label: "Profilo" },
];

export const BUSINESS_TABS: TabItem[] = [
  { id: "notifications", label: "Notifiche" },
  { id: "calendar", label: "Calendario" },
  { id: "profile", label: "Profilo" },
];

/** @deprecated Prefer CONSUMER_TABS — kept for gradual migration */
export const TABS = CONSUMER_TABS;

export const ALL_TAB_IDS = new Set<TabId>([
  ...CONSUMER_TABS.map((tab) => tab.id),
  ...BUSINESS_TABS.map((tab) => tab.id),
]);

export function isBusinessTabId(tab: string): tab is BusinessTabId {
  return tab === "notifications" || tab === "calendar" || tab === "profile";
}

export function isConsumerTabId(tab: string): tab is ConsumerTabId {
  return (
    tab === "explore" ||
    tab === "events" ||
    tab === "messages" ||
    tab === "profile"
  );
}
