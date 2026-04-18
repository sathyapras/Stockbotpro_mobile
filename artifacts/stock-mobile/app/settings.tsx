import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { useVerification } from "@/context/VerificationContext";
import { fetchMe, clearAuthToken, type UserProfile } from "@/services/userService";
import { isSoundEnabled, setSoundEnabled } from "@/services/soundService";

// ─── Plan config ──────────────────────────────────────────────

const PLAN_LABEL: Record<string, string> = {
  free: "Gratis", pro: "Pro", elite: "Elite", enterprise: "Enterprise",
};
const PLAN_COLOR: Record<string, string> = {
  Gratis: "#64748b", Pro: "#0ea5e9", Elite: "#a78bfa", Enterprise: "#f59e0b",
};

function planLabel(plan?: string) {
  return PLAN_LABEL[plan ?? "free"] ?? "Gratis";
}
function planColor(label: string) {
  return PLAN_COLOR[label] ?? "#64748b";
}
function expiryText(user: UserProfile): string {
  if (user.planExpiresAt) {
    return `Aktif sampai ${new Date(user.planExpiresAt).toLocaleDateString("id-ID",
      { day: "numeric", month: "long", year: "numeric" })}`;
  }
  if (user.subscriptionPlan !== "free") return "Aktif tanpa batas waktu";
  if (user.isTrialActive) return `Trial — sisa ${user.trialDaysRemaining} hari`;
  return "Akun Gratis";
}

// ─── Theme Toggle ─────────────────────────────────────────────

function ThemeToggle({ colors, preference, setPreference, effectiveScheme }: {
  colors: Colors;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  effectiveScheme: "light" | "dark";
}) {
  const labels: Record<ThemePreference, string> = { system: "Auto", light: "☀️ Terang", dark: "🌙 Gelap" };
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 12 }}>
        Tema aktif: {effectiveScheme === "dark" ? "🌙 Gelap" : "☀️ Terang"}
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["system", "light", "dark"] as ThemePreference[]).map(opt => {
          const active = preference === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => setPreference(opt)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10,
                alignItems: "center",
                backgroundColor: active ? "#0ea5e9" : colors.muted,
                borderWidth: 1,
                borderColor: active ? "#0ea5e9" : colors.border }}>
              <Text style={{ color: active ? "#fff" : colors.mutedForeground,
                fontSize: 12, fontWeight: active ? "700" : "400" }}>
                {labels[opt]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Profile Card ─────────────────────────────────────────────

function ProfileCard({ user, colors }: { user: UserProfile; colors: Colors }) {
  const initial = ((user.name ?? user.username ?? "U")[0]).toUpperCase();
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14,
      backgroundColor: colors.card, borderRadius: 16, padding: 20 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28,
        backgroundColor: "#0ea5e922", alignItems: "center",
        justifyContent: "center", marginBottom: 12 }}>
        <Text style={{ color: "#0ea5e9", fontWeight: "900", fontSize: 22 }}>{initial}</Text>
      </View>

      <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 18 }}>
        {user.name ?? user.username}
      </Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 3 }}>{user.email}</Text>
      {user.phone ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>📱 {user.phone}</Text>
      ) : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 10, opacity: 0.6 }}>
        Bergabung {new Date(user.createdAt).toLocaleDateString("id-ID",
          { month: "long", year: "numeric" })}
      </Text>
    </View>
  );
}

// ─── Subscription Card ────────────────────────────────────────

type Colors = ReturnType<typeof useColors>;

function SubscriptionCard({
  user, onUpgrade, colors,
}: { user: UserProfile; onUpgrade: () => void; colors: Colors }) {
  const label  = planLabel(user.subscriptionPlan);
  const color  = planColor(label);
  const expiry = expiryText(user);

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14,
      backgroundColor: colors.card, borderRadius: 16, padding: 20 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700",
        letterSpacing: 1, marginBottom: 12 }}>LANGGANAN</Text>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color, fontWeight: "900", fontSize: 22,
              textTransform: "uppercase" }}>{label}</Text>
            {user.hasPremiumAccess && (
              <View style={{ backgroundColor: color + "22", borderRadius: 8,
                paddingHorizontal: 8, paddingVertical: 3,
                borderWidth: 1, borderColor: color + "44" }}>
                <Text style={{ color, fontSize: 10, fontWeight: "700" }}>AKTIF ✓</Text>
              </View>
            )}
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>{expiry}</Text>
          {user.isTrialActive && (
            <Text style={{ color: "#f59e0b", fontSize: 11, marginTop: 4 }}>
              ⚡ Trial masih berjalan
            </Text>
          )}
        </View>

        {!user.hasPremiumAccess && (
          <TouchableOpacity onPress={onUpgrade}
            style={{ backgroundColor: "#0ea5e9", borderRadius: 10,
              paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Setting Row ──────────────────────────────────────────────

function SettingRow({
  icon, label, onPress, last, danger = false, colors,
}: {
  icon: string; label: string; onPress: () => void;
  last?: boolean; danger?: boolean; colors: Colors;
}) {
  return (
    <TouchableOpacity onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 15,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 17, marginRight: 13 }}>{icon}</Text>
      <Text style={{ color: danger ? colors.destructive : colors.foreground, fontSize: 14, flex: 1 }}>{label}</Text>
      {!danger && <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>›</Text>}
    </TouchableOpacity>
  );
}

// ─── Section ──────────────────────────────────────────────────

function SectionCard({ children, colors }: { children: React.ReactNode; colors: Colors }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14,
      overflow: "hidden", marginHorizontal: 16, marginBottom: 14 }}>
      {children}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function SettingsScreen() {
  const insets      = useSafeAreaInsets();
  const router      = useRouter();
  const colors      = useColors();
  const queryClient = useQueryClient();
  const topPad      = Platform.OS === "web" ? 67 : insets.top + 8;

  const { preference, setPreference, effectiveScheme } = useTheme();
  const { needsVerification, dismiss: dismissVerification } = useVerification();

  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    isSoundEnabled().then(setSoundOn);
  }, []);

  async function handleSoundToggle(val: boolean) {
    setSoundOn(val);
    await setSoundEnabled(val);
  }

  const { data: user, isLoading, isError, error } = useQuery<UserProfile>({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  async function handleLogout() {
    Alert.alert("Keluar", "Yakin ingin keluar dari akun?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await clearAuthToken();
          queryClient.clear();
          router.replace("/menu" as any);
        },
      },
    ]);
  }

  const noToken = isError && (error as Error)?.message === "UNAUTHORIZED";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={{ paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 20 }}>
            ⚙️ Pengaturan
          </Text>
        </View>
      </View>

      {/* ── Loading ── */}
      {isLoading && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Memuat profil…</Text>
        </View>
      )}

      {/* ── No token / not logged in ── */}
      {(noToken || (!isLoading && !user && isError)) && (
        <ScrollView contentContainerStyle={{ padding: 24, alignItems: "center", paddingTop: 60 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🔐</Text>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18, textAlign: "center",
            marginBottom: 10 }}>Login Diperlukan</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center", lineHeight: 20,
            marginBottom: 32 }}>
            Login untuk melihat profil, info langganan, dan kelola akun StockBot Pro kamu.
          </Text>
          <TouchableOpacity onPress={() => router.push("/login" as any)}
            style={{ backgroundColor: "#0ea5e9", borderRadius: 12,
              paddingHorizontal: 28, paddingVertical: 14, width: "100%",
              alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Masuk ke Akun</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/sign-up" as any)}
            style={{ marginTop: 12, paddingVertical: 12, width: "100%", alignItems: "center" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              Belum punya akun?{" "}
              <Text style={{ color: "#0ea5e9", fontWeight: "700" }}>Daftar Gratis</Text>
            </Text>
          </TouchableOpacity>

          {/* Theme toggle — always visible */}
          <View style={{ marginTop: 32, width: "100%" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700",
              marginBottom: 8, letterSpacing: 1 }}>TAMPILAN</Text>
            <ThemeToggle colors={colors} preference={preference} setPreference={setPreference} effectiveScheme={effectiveScheme} />
          </View>

          {/* Sound toggle — always visible */}
          <View style={{ marginTop: 16, width: "100%" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700",
              marginBottom: 8, letterSpacing: 1 }}>SUARA</Text>
            <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16,
              flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                  🔊 Suara Pembuka
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>
                  Sound saat aplikasi pertama dibuka
                </Text>
              </View>
              <Switch
                value={soundOn}
                onValueChange={handleSoundToggle}
                trackColor={{ false: colors.muted, true: "#0ea5e944" }}
                thumbColor={soundOn ? "#0ea5e9" : colors.mutedForeground}
              />
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Content ── */}
      {!isLoading && user && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 60 }}>

          {/* Email Verification Banner */}
          {needsVerification && (
            <View style={{ marginHorizontal: 16, marginBottom: 14,
              backgroundColor: "#fbbf2415", borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: "#fbbf2440",
              flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <Text style={{ fontSize: 20, marginTop: 1 }}>📧</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fbbf24", fontWeight: "700", fontSize: 13,
                  marginBottom: 4 }}>
                  Verifikasi Email
                </Text>
                <Text style={{ color: "#92400e", fontSize: 12, lineHeight: 18 }}>
                  Cek inbox <Text style={{ color: "#fbbf24", fontWeight: "600" }}>
                    {user.email}
                  </Text> dan klik link verifikasi yang kami kirim.
                </Text>
              </View>
              <TouchableOpacity onPress={dismissVerification}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={16} color="#78350f" />
              </TouchableOpacity>
            </View>
          )}

          <ProfileCard user={user} colors={colors} />

          <SubscriptionCard
            user={user}
            colors={colors}
            onUpgrade={() => router.push("/subscribe" as any)}
          />

          {/* Section: Akun */}
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700",
            marginHorizontal: 16, marginBottom: 8, letterSpacing: 1 }}>AKUN</Text>
          <SectionCard colors={colors}>
            <SettingRow
              icon="✏️"
              label="Edit Profil"
              colors={colors}
              onPress={() => router.push({
                pathname: "/edit-profile",
                params: {
                  name:  user.name ?? "",
                  phone: user.phone ?? "",
                  email: user.email,
                },
              } as any)}
            />
            <SettingRow
              icon="🔐"
              label="Ganti Password"
              colors={colors}
              onPress={() => router.push({
                pathname: "/change-password",
                params: { email: user.email },
              } as any)}
            />
            <SettingRow
              icon="🎁"
              label="Program Afiliasi"
              colors={colors}
              last
              onPress={() => router.push("/affiliate" as any)}
            />
          </SectionCard>

          {/* Section: Tampilan */}
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700",
            marginHorizontal: 16, marginBottom: 8, letterSpacing: 1 }}>TAMPILAN</Text>
          <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
            <ThemeToggle colors={colors} preference={preference} setPreference={setPreference} effectiveScheme={effectiveScheme} />
          </View>

          {/* Section: Suara */}
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700",
            marginHorizontal: 16, marginBottom: 8, letterSpacing: 1 }}>SUARA</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 14,
            marginHorizontal: 16, marginBottom: 14, padding: 16,
            flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                🔊 Suara Pembuka
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>
                Sound saat aplikasi pertama dibuka
              </Text>
            </View>
            <Switch
              value={soundOn}
              onValueChange={handleSoundToggle}
              trackColor={{ false: colors.muted, true: "#0ea5e944" }}
              thumbColor={soundOn ? "#0ea5e9" : colors.mutedForeground}
            />
          </View>

          {/* Section: Bantuan */}
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700",
            marginHorizontal: 16, marginBottom: 8, letterSpacing: 1 }}>BANTUAN</Text>
          <SectionCard colors={colors}>
            <SettingRow
              icon="📞"
              label="Hubungi Kami"
              colors={colors}
              onPress={() => router.push("/contact-us" as any)}
            />
            <SettingRow
              icon="ℹ️"
              label="Tentang Aplikasi"
              colors={colors}
              last
              onPress={() => router.push("/about-us" as any)}
            />
          </SectionCard>

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout}
            style={{ marginHorizontal: 16, marginTop: 6,
              backgroundColor: colors.card, borderRadius: 14,
              paddingVertical: 16, alignItems: "center",
              borderWidth: 1, borderColor: colors.destructive + "33" }}>
            <Text style={{ color: colors.destructive, fontWeight: "700", fontSize: 15 }}>
              🚪 Keluar dari Akun
            </Text>
          </TouchableOpacity>

          <Text style={{ color: colors.mutedForeground, fontSize: 10, textAlign: "center", marginTop: 20, opacity: 0.6 }}>
            Stock Insight Mobile
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
