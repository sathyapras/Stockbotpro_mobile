import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useNotifications } from "@/context/NotificationContext";
import {
  type AppNotification,
  type NotifCategory,
  NOTIF_CATEGORY,
  timeAgo,
} from "@/services/notificationService";

// ─── Notification Card ────────────────────────────────────────

function NotifCard({
  notif, onPress,
}: {
  notif: AppNotification;
  onPress: () => void;
}) {
  const colors = useColors();
  const cfg    = NOTIF_CATEGORY[notif.category];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: notif.read ? colors.card : colors.card + "ee",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: notif.read ? colors.border : notif.color + "50",
        borderLeftWidth: 3,
        borderLeftColor: notif.read ? colors.border : notif.color,
        padding: 14,
        gap: 4,
      }}
    >
      {/* Row 1: Icon + Title + Unread dot + Time */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Text style={{ fontSize: 18, lineHeight: 22 }}>{notif.icon}</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{
              color: notif.read ? colors.foreground : "#fff",
              fontWeight: notif.read ? "600" : "800",
              fontSize: 14, flex: 1,
            }} numberOfLines={1}>
              {notif.title}
            </Text>
            {!notif.read && (
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: notif.color,
              }} />
            )}
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 1 }}>
            {cfg.label} · {timeAgo(notif.timestamp)}
          </Text>
        </View>
      </View>

      {/* Row 2: Body */}
      <Text style={{
        color: notif.read ? colors.mutedForeground : "#94a3b8",
        fontSize: 12, lineHeight: 18, paddingLeft: 26,
      }}>
        {notif.body}
      </Text>

      {/* Ticker chip */}
      {notif.ticker && (
        <View style={{ paddingLeft: 26, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{
            backgroundColor: notif.color + "20",
            borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
            borderWidth: 1, borderColor: notif.color + "40",
          }}>
            <Text style={{ color: notif.color, fontSize: 10, fontWeight: "700" }}>
              {notif.ticker}
            </Text>
          </View>
          {notif.grade && (
            <View style={{
              backgroundColor: "#1e2433", borderRadius: 6,
              paddingHorizontal: 6, paddingVertical: 2,
            }}>
              <Text style={{ color: "#fbbf24", fontSize: 10, fontWeight: "700" }}>
                Grade {notif.grade}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Category Filter ─────────────────────────────────────────

const FILTER_ALL = "ALL";
type Filter = NotifCategory | typeof FILTER_ALL;

// ─── Main Screen ──────────────────────────────────────────────

export default function NotificationsScreen() {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const colors   = useColors();
  const topPad   = Platform.OS === "web" ? 67 : insets.top + 8;

  const { notifications, unreadCount, isLoading, markRead, markAllAsRead } = useNotifications();

  const [filter, setFilter] = useState<Filter>(FILTER_ALL);

  const filtered = filter === FILTER_ALL
    ? notifications
    : notifications.filter(n => n.category === filter);

  // Build filter pills — only categories that exist
  const availableCategories = Array.from(
    new Set(notifications.map(n => n.category))
  ) as NotifCategory[];

  const handlePress = (notif: AppNotification) => {
    markRead(notif.id);
    if (notif.ticker) {
      router.push(`/stock/${notif.ticker}` as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={{
        paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <View>
              <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 20 }}>
                🔔 Notifikasi
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 1 }}>
                {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"}
              </Text>
            </View>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              style={{
                backgroundColor: "#1e2433", borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 6,
                borderWidth: 1, borderColor: "#334155",
              }}
            >
              <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "600" }}>
                Baca Semua
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        {availableCategories.length > 1 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => setFilter(FILTER_ALL)}
              style={{
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
                backgroundColor: filter === FILTER_ALL ? "#1e2433" : "transparent",
                borderWidth: 1, borderColor: filter === FILTER_ALL ? "#94a3b8" : "#334155",
              }}
            >
              <Text style={{
                color: filter === FILTER_ALL ? "#94a3b8" : colors.mutedForeground,
                fontSize: 11, fontWeight: filter === FILTER_ALL ? "700" : "400",
              }}>
                Semua {notifications.length}
              </Text>
            </TouchableOpacity>

            {availableCategories.map(cat => {
              const cfg    = NOTIF_CATEGORY[cat];
              const active = filter === cat;
              const count  = notifications.filter(n => n.category === cat).length;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setFilter(f => f === cat ? FILTER_ALL : cat)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
                    backgroundColor: active ? cfg.color + "20" : "transparent",
                    borderWidth: 1, borderColor: active ? cfg.color : "#334155",
                    flexDirection: "row", alignItems: "center", gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 10 }}>{cfg.icon}</Text>
                  <Text style={{
                    color: active ? cfg.color : colors.mutedForeground,
                    fontSize: 11, fontWeight: active ? "700" : "400",
                  }}>
                    {cfg.label} {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Loading ── */}
      {isLoading && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#a78bfa" />
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Memuat notifikasi…
          </Text>
        </View>
      )}

      {/* ── Empty ── */}
      {!isLoading && filtered.length === 0 && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
          <Text style={{ fontSize: 48 }}>🔕</Text>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 16, textAlign: "center" }}>
            Belum Ada Notifikasi
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
            Notifikasi akan muncul otomatis berdasarkan sinyal BOW/BOS, Smart Money, dan Net Buy Flow.
          </Text>
        </View>
      )}

      {/* ── List ── */}
      {!isLoading && filtered.length > 0 && (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotifCard notif={item} onPress={() => handlePress(item)} />
          )}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 80,
            gap: 8,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ flexDirection: "row", justifyContent: "space-between",
              alignItems: "center", marginBottom: 4 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                {filtered.length} notifikasi · Data realtime dari server
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
