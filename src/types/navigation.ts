export type TabId = "explore" | "events" | "messages" | "profile";

export interface TabItem {
  id: TabId;
  label: string;
}

export const TABS: TabItem[] = [
  { id: "explore", label: "Esplora" },
  { id: "events", label: "Eventi" },
  { id: "messages", label: "Messaggi" },
  { id: "profile", label: "Profilo" },
];
