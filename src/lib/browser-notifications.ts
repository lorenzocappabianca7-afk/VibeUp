/** Browser Notification helpers for new chat messages. */

export type NotificationPermissionState =
  | "unsupported"
  | "default"
  | "denied"
  | "granted";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return getNotificationPermission();
  }
}

export function canShowBrowserNotification(pushEnabled: boolean) {
  return (
    pushEnabled &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

/**
 * Shows a browser notification for a new chat message when allowed.
 * Skips when the document is focused and the caller opts out via `force`.
 */
export function notifyNewChatMessage(options: {
  pushEnabled: boolean;
  title: string;
  body: string;
  tag?: string;
  /** When false, skip if the tab is visible/focused. Default true = respect focus. */
  onlyWhenHidden?: boolean;
}) {
  const {
    pushEnabled,
    title,
    body,
    tag = "vibeup-chat",
    onlyWhenHidden = true,
  } = options;

  if (!canShowBrowserNotification(pushEnabled)) return false;
  if (onlyWhenHidden && typeof document !== "undefined" && !document.hidden) {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body: body.slice(0, 140),
      tag,
      icon: "/vibeup-mark-192.png",
      badge: "/vibeup-mark-192.png",
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}
