import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { forgotPassword } from "@/services/userService";

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  const { email } = useLocalSearchParams<{ email?: string }>();

  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [err,     setErr]     = useState("");

  async function handleSend() {
    if (!email) {
      setErr("Email tidak ditemukan. Kembali dan coba lagi.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setErr("Gagal mengirim email. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={{ paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: "#1e2433" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 20 }}>
            🔐 Ganti Password
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}>
        {!sent ? (
          <>
            {/* Explanation */}
            <View style={{ backgroundColor: "#1e2433", borderRadius: 14,
              padding: 20, marginBottom: 28 }}>
              <Text style={{ color: "#94a3b8", fontSize: 14, lineHeight: 24 }}>
                Link reset password akan dikirim ke:{"\n"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8,
                backgroundColor: "#0ea5e912", borderRadius: 10, padding: 12,
                borderWidth: 1, borderColor: "#0ea5e933" }}>
                <Text style={{ fontSize: 18 }}>📧</Text>
                <Text style={{ color: "#0ea5e9", fontWeight: "700", fontSize: 15, flex: 1 }}>
                  {email ?? "—"}
                </Text>
              </View>
              <Text style={{ color: "#475569", fontSize: 12, marginTop: 14, lineHeight: 18 }}>
                Email akan dikirim dari{" "}
                <Text style={{ color: "#94a3b8", fontWeight: "600" }}>noreply@stockbot.id</Text>
                {"\n"}Setelah klik link di email, kamu bisa set password baru melalui browser.
                Login kembali ke aplikasi setelah password berhasil diubah.
              </Text>
            </View>

            {/* Error */}
            {err ? (
              <View style={{ backgroundColor: "#f8717120", borderRadius: 8, padding: 12,
                marginBottom: 16, borderWidth: 1, borderColor: "#f8717140" }}>
                <Text style={{ color: "#f87171", fontSize: 13 }}>⚠ {err}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSend}
              disabled={loading}
              style={{ backgroundColor: loading ? "#1e293b" : "#0ea5e9",
                borderRadius: 12, paddingVertical: 16, alignItems: "center" }}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                    Kirim Link Reset
                  </Text>}
            </TouchableOpacity>
          </>
        ) : (
          /* Success state */
          <View style={{ alignItems: "center", paddingTop: 32 }}>
            <Text style={{ fontSize: 60, marginBottom: 20 }}>✉️</Text>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 20,
              textAlign: "center", marginBottom: 10 }}>
              Email Terkirim!
            </Text>
            <Text style={{ color: "#64748b", fontSize: 13, textAlign: "center",
              lineHeight: 22, marginBottom: 10 }}>
              Cek inbox
            </Text>
            <Text style={{ color: "#0ea5e9", fontWeight: "700", fontSize: 14,
              textAlign: "center", marginBottom: 6 }}>
              {email}
            </Text>
            <Text style={{ color: "#64748b", fontSize: 12, textAlign: "center",
              lineHeight: 20, marginBottom: 6 }}>
              dan klik link reset password.
            </Text>
            <Text style={{ color: "#475569", fontSize: 11, textAlign: "center",
              lineHeight: 18, marginBottom: 36 }}>
              Email dikirim dari{" "}
              <Text style={{ color: "#94a3b8", fontWeight: "600" }}>noreply@stockbot.id</Text>
              {"\n"}Jika tidak ada di inbox, cek folder Spam.
            </Text>

            <View style={{ gap: 12, width: "100%" }}>
              <TouchableOpacity
                onPress={() => setSent(false)}
                style={{ backgroundColor: "#1e2433", borderRadius: 12,
                  paddingVertical: 14, alignItems: "center",
                  borderWidth: 1, borderColor: "#334155" }}>
                <Text style={{ color: "#94a3b8", fontWeight: "600", fontSize: 14 }}>
                  Kirim Ulang
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/menu" as any)}
                style={{ backgroundColor: "#0ea5e9", borderRadius: 12,
                  paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                  Kembali ke Menu
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
