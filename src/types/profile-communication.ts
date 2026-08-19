export interface ProfileCommunication {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  kind: "deposit_policy" | "deposit_reminder" | "system" | "request_status";
}
