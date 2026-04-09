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

const TELEGRAM_URL = "https://t.me/stockbotpro";
const WHATSAPP_URL = "https://wa.me/6281234567890";
const BROKER_URL   = "https://stockbotpro.replit.app";

function openURL(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert("Tidak dapat membuka link", url);
  });
}

type MenuItem = {
  icon: string;
  label: string;
  onPress: () => void;
};

type MenuGroup = {
  section: string | null;
  items: MenuItem[];
};

function buildMenuGroups(router: ReturnType<typeof useRouter>): MenuGroup[] {
  return [
    {
      section: null,
      items: [
        {
          icon: "🎁",
          label: "Program Afiliasi",
          onPress: () => router.push("/affiliate" as any),
        },
      ],
    },
    {
      section: "MORE",
      items: [
        {
          icon: "✈️",
          label: "Grup Telegram Eksklusif",
          onPress: () => openURL(TELEGRAM_URL),
        },
        {
          icon: "💬",
          label: "Hubungi via WhatsApp",
          onPress: () => openURL(WHATSAPP_URL),
        },
        {
          icon: "📈",
          label: "Buka Rekening Saham",
          onPress: () => openURL(BROKER_URL),
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
          icon: "👑",
          label: "Subscribe",
          onPress: () => router.push("/subscribe" as any),
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

export default function MenuScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const topPad  = Platform.OS === "web" ? 24 : insets.top + 16;
  const groups  = buildMenuGroups(router);

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
