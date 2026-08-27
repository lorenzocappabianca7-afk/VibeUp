export type ConsumerTabId = "explore" | "home" | "events" | "messages" | "profile";
export type BusinessTabId = "notifications" | "calendar" | "feste" | "profile";
export type TabId = ConsumerTabId | BusinessTabId;

export interface TabItem {
  id: TabId;
  label: string;
}

export const CONSUMER_TABS: TabItem[] = [
  { id: "explore", label: "Esplora" },
  { id: "home", label: "Home" },
  { id: "events", label: "Eventi" },
  { id: "profile", label: "Profilo" },
];

export const BUSINESS_TABS: TabItem[] = [
  { id: "notifications", label: "Notifiche" },
  { id: "calendar", label: "Calendario" },
  { id: "feste", label: "Feste" },
  { id: "profile", label: "Profilo" },
];

/** @deprecated Prefer CONSUMER_TABS — kept for gradual migration */
export const TABS = CONSUMER_TABS;

export const ALL_TAB_IDS = new Set<TabId>([
  ...CONSUMER_TABS.map((tab) => tab.id),
  ...BUSINESS_TABS.map((tab) => tab.id),
  // Chat remains reachable from event detail, not from the main tab bar.
  "messages",
]);

export function isBusinessTabId(tab: string): tab is BusinessTabId {
  return BUSINESS_TABS.some((item) => item.id === tab);
}

export function isConsumerTabId(tab: string): tab is ConsumerTabId {
  return (
    tab === "explore" ||
    tab === "home" ||
    tab === "events" ||
    tab === "messages" ||
    tab === "profile"
  );
}
