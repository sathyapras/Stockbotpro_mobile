import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSettings, fetchSettings, whatsappUrl } from "@/services/settingsService";

// ─── App info ─────────────────────────────────────────────────

const APP_VERSION   = "5.0";
const APP_NAME      = "Stockbot Pro";
const APP_TAGLINE   = "Market Intelligence Platform";

// Ganti dengan URL app store setelah publish
const PLAYSTORE_URL = "https://play.google.com/store/apps/details?id=com.stockbotpro";
const APPSTORE_URL  = "https://apps.apple.com/app/stockbot-pro/id0000000000";

const PRIVACY_URL   = "https://stockbotpro.replit.app/privacy";
const TERMS_URL     = "https://stockbotpro.replit.app/terms";

// ─── Helpers ──────────────────────────────────────────────────

function openURL(url: string) {
  if (!url) return;
  Linking.openURL(url).catch(() => {
    Alert.alert("Tidak dapat membuka link", url);
  });
}

function handleShare() {
  Share.share({
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    message:
      `📊 *${APP_NAME}* — ${APP_TAGLINE}\n\n` +
      `Smart Money Flow, Radar Market, dan sinyal saham berbasis data institusional.\n\n` +
      `Download: ${PLAYSTORE_URL}`,
    url: PLAYSTORE_URL,
  }).catch(() => {});
}

function handleRateUs() {
  const url = Platform.OS === "ios" ? APPSTORE_URL : PLAYSTORE_URL;
  Linking.canOpenURL(url)
    .then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert(
          "Rate Us",
          "Terima kasih sudah menggunakan Stockbot Pro!\nFitur rating akan tersedia setelah app dipublikasikan di store.",
          [{ text: "OK" }]
        );
      }
    })
    .catch(() => {
      Alert.alert("Rate Us", "Belum tersedia — cek kembali setelah update.");
    });
}

// ─── Types ────────────────────────────────────────────────────

type MenuItem = {
  icon: string;
  label: string;
  onPress: () => void;
  badge?: string;
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
  const waUrl = settings?.whatsappNumber ? whatsappUrl(settings.whatsappNumber) : "";

  return [
    // ── [1] Akun & Langganan ──────────────────────────────────
    {
      section: null,
      items: [
        {
          icon: "⚙️",
          label: "Setting",
          onPress: () => router.push("/settings" as any),
        },
        {
          icon: "👑",
          label: "Subscribe",
          onPress: () => router.push("/subscribe" as any),
        },
        {
          icon: "🎁",
          label: "Program Afiliasi",
          onPress: () => router.push("/affiliate" as any),
        },
      ],
    },

    // ── [2] Stock Tools ───────────────────────────────────────
    {
      section: "STOCK TOOLS",
      items: [
        {
          icon: "💹",
          label: "BOS Explorer — Buy on Strength",
          onPress: () => router.push("/bos" as any),
        },
      ],
    },

    // ── [3] Komunitas ─────────────────────────────────────────
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
        {
          icon: "📤",
          label: "Share ke Teman",
          onPress: handleShare,
        },
      ],
    },

    // ── [3] More ──────────────────────────────────────────────
    {
      section: "MORE",
      items: [
        {
          icon: "📈",
          label: "Buka Rekening Saham",
          onPress: () => router.push("/buka-rekening" as any),
        },
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
          icon: "⭐",
          label: "Rate Us",
          onPress: handleRateUs,
        },
        {
          icon: "✉️",
          label: "Contact Us",
          onPress: () => router.push("/contact-us" as any),
        },
      ],
    },

    // ── [4] Legal ─────────────────────────────────────────────
    {
      section: "LEGAL",
      items: [
        {
          icon: "🔒",
          label: "Privacy Policy",
          onPress: () => openURL(PRIVACY_URL),
        },
        {
          icon: "📋",
          label: "Term & Condition",
          onPress: () => openURL(TERMS_URL),
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
      <View style={{
        paddingHorizontal: 20, paddingTop: topPad, paddingBottom: 20,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 24 }}>Menu</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "#1e2433", borderRadius: 20,
            width: 32, height: 32, alignItems: "center", justifyContent: "center",
          }}
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
                {item.badge ? (
                  <View style={{
                    backgroundColor: "#0ea5e920", borderRadius: 10,
                    paddingHorizontal: 8, paddingVertical: 2,
                    marginRight: 6,
                  }}>
                    <Text style={{ color: "#0ea5e9", fontSize: 11, fontWeight: "700" }}>
                      {item.badge}
                    </Text>
                  </View>
                ) : null}
                <Text style={{ color: "#334155", fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* ── App version badge ── */}
      <View style={{ alignItems: "center", marginTop: 28, marginBottom: 8, gap: 6 }}>
        <View style={{
          backgroundColor: "#1e2433", borderRadius: 20,
          paddingHorizontal: 20, paddingVertical: 10,
          borderWidth: 1, borderColor: "#0ea5e920",
          alignItems: "center",
        }}>
          <Text style={{ color: "#e2e8f0", fontWeight: "800", fontSize: 13 }}>
            {APP_NAME} · {APP_TAGLINE}
          </Text>
          <Text style={{ color: "#0ea5e9", fontSize: 11, fontWeight: "700", marginTop: 3 }}>
            Versi {APP_VERSION} — Totally Rebuilt ✨
          </Text>
        </View>
        <Text style={{ color: "#1e293b", fontSize: 10 }}>
          © 2025 Stockbot Pro. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}
