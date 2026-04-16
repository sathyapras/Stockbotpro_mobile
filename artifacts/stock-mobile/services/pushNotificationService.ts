import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getAuthToken } from "./userService";

// ── Notification handler (foreground display) ─────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── API base ──────────────────────────────────────────────────

function apiBase(): string {
  const d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  if (d) return `https://${d}/api`;
  return "http://localhost:8080/api";
}

// ── Request permission ────────────────────────────────────────

async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ── Get Expo push token ───────────────────────────────────────

async function getToken(): Promise<string | null> {
  try {
    // Android channel setup
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Stockbot Pro",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor:       "#0ea5e9",
        sound:            "default",
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      undefined;

    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return tokenResult.data;
  } catch {
    // Fallback: get native device push token
    try {
      const dt = await Notifications.getDevicePushTokenAsync();
      return dt.data as string;
    } catch {
      return null;
    }
  }
}

// ── Register token with server ────────────────────────────────

async function sendTokenToServer(token: string): Promise<void> {
  const authToken = await getAuthToken();
  if (!authToken) return;

  await fetch(`${apiBase()}/notifications/push-token`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      Authorization:   `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS,
    }),
  });
}

// ── Public: register for push notifications ───────────────────

export async function registerForPushNotifications(): Promise<void> {
  try {
    const granted = await requestPermission();
    if (!granted) return;

    const token = await getToken();
    if (!token) return;

    await sendTokenToServer(token);
  } catch {
    // silent fail — non-critical
  }
}

// ── Public: add listeners (call once in root layout) ──────────

export function addNotificationListeners(
  onReceive?: (n: Notifications.Notification) => void,
  onResponse?: (r: Notifications.NotificationResponse) => void,
) {
  const recSub = onReceive
    ? Notifications.addNotificationReceivedListener(onReceive)
    : null;

  const resSub = onResponse
    ? Notifications.addNotificationResponseReceivedListener(onResponse)
    : null;

  return () => {
    recSub?.remove();
    resSub?.remove();
  };
}
