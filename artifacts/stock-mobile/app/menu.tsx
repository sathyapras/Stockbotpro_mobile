import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSettings, fetchSettings, whatsappUrl } from "@/services/settingsService";

// ─── Helpers ──────────────────────────────────────────────────

function openURL(url: string) {
  if (!url) return;
  Linking.openURL(url).catch(() => {
    Alert.alert("Tidak dapat membuka link", url);
  });
}

// ─── Types ────────────────────────────────────────────────────

type MenuItem = {
  icon: string;
  label: string;
  onPress: () => void;
};

type MenuGroup = {
  section: string | null;
  items: MenuItem[];
};

// ─── Menu groups builder ──────────────────────────────────────

function buildMenuGroups(
  router: ReturnType<typeof useRouter>,
  settings: AppSettings | undefined
): MenuGroup[] {
  const telegramUrl = settings?.telegramInviteLink ?? "";
  const waUrl = settings?.whatsappNumber
    ? whatsappUrl(settings.whatsappNumber)
    : "";
  const brokerUrl = settings?.mitraResmiList?.[0]?.registerUrl ?? "";

  return [
    {
      section: null,
      items: [
        {
          icon: "🎁",
          label: "Program Afiliasi",
          onPress: () => router.push("/affiliate" as any),
        },
        {
          icon: "👑",
          label: "Subscribe",
          onPress: () => router.push("/subscribe" as any),
        },
      ],
    },
    {
      section: "KOMUNITAS",
      items: [
        {
          icon: "✈️",
          label: "Grup Telegram Eksklusif",
          onPress: () => openURL(telegramUrl),
        },
        {
          icon: "💬",
          label: "Hubungi via WhatsApp",
          onPress: () => openURL(waUrl),
        },
      ],
    },
    {
      section: "MORE",
      items: [
        ...(brokerUrl
          ? [{
              icon: "📈",
              label: "Buka Rekening Saham",
              onPress: () => openURL(brokerUrl),
            }]
          : []),
        {
          icon: "ℹ️",
          label: "About Us",
          onPress: () => router.push("/about-us" as any),
        },
        {
          icon: "📖",
          label: "Tutorial",
          onPress: () => router.push("/tutorial" as any),
        },
        {
          icon: "✉️",
          label: "Contact Us",
          onPress: () => router.push("/contact-us" as any),
        },
      ],
    },
  ];
}

// ─── Screen ───────────────────────────────────────────────────

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 24 : insets.top + 16;

  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["app-settings"],
    queryFn: fetchSettings,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const groups = buildMenuGroups(router, settings);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0f1629" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: topPad, paddingBottom: 20,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 24 }}>Menu</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: "#1e2433", borderRadius: 20,
            width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#94a3b8", fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Menu Groups ── */}
      {groups.map((group, gi) => (
        <View key={gi} style={{ marginBottom: 10 }}>
          {group.section && (
            <Text style={{
              color: "#475569", fontSize: 11, fontWeight: "700",
              paddingHorizontal: 20, paddingBottom: 8, letterSpacing: 1,
            }}>
              {group.section}
            </Text>
          )}
          <View style={{
            backgroundColor: "#1e2433", marginHorizontal: 16,
            borderRadius: 16, overflow: "hidden",
          }}>
            {group.items.map((item, ii) => (
              <TouchableOpacity
                key={ii}
                onPress={item.onPress}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row", alignItems: "center",
                  paddingHorizontal: 16, paddingVertical: 16,
                  borderBottomWidth: ii < group.items.length - 1 ? 1 : 0,
                  borderBottomColor: "#0f1629",
                }}
              >
                <Text style={{ fontSize: 20, marginRight: 14 }}>{item.icon}</Text>
                <Text style={{ color: "#cbd5e1", fontSize: 15, flex: 1 }}>{item.label}</Text>
                <Text style={{ color: "#334155", fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* ── App version ── */}
      <View style={{ alignItems: "center", marginTop: 32 }}>
        <Text style={{ color: "#1e293b", fontSize: 12 }}>StockBot Pro · IDX Analysis</Text>
        <Text style={{ color: "#1e293b", fontSize: 11, marginTop: 4 }}>v1.0.0</Text>
      </View>
    </ScrollView>
  );
}
