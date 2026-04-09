import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { forgotPassword } from "@/services/userService";

export default function ForgotPasswordScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Masukkan alamat email yang valid.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await forgotPassword(trimmed);
      setSent(true);
    } catch {
      setError("Gagal mengirim email. Cek koneksi dan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0a0f1e" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24,
          paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6,
            marginBottom: 40, alignSelf: "flex-start" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={20} color="#64748b" />
          <Text style={{ color: "#64748b", fontSize: 13 }}>Kembali ke Login</Text>
        </TouchableOpacity>

        {!sent ? (
          <>
            <Text style={{ fontSize: 36, marginBottom: 16 }}>🔑</Text>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 28,
              letterSpacing: -0.5, marginBottom: 8 }}>
              Lupa Password?
            </Text>
            <Text style={{ color: "#64748b", fontSize: 14, lineHeight: 22, marginBottom: 36 }}>
              Masukkan email akun StockBot Pro kamu. Kami akan kirim link untuk reset password.
            </Text>

            {/* Email input */}
            <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
              Alamat Email
            </Text>
            <TextInput
              value={email}
              onChangeText={t => { setEmail(t); setError(""); }}
              placeholder="email@kamu.com"
              placeholderTextColor="#334155"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              style={{ backgroundColor: "#1e2433", borderRadius: 12,
                color: "#fff", fontSize: 14, padding: 16, marginBottom: 6 }}
            />
            <Text style={{ color: "#475569", fontSize: 11, marginBottom: 28 }}>
              Gunakan email yang terdaftar di akun StockBot Pro kamu.
            </Text>

            {/* Error */}
            {error ? (
              <View style={{ backgroundColor: "#f8717115", borderRadius: 10,
                padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "#f8717130" }}>
                <Text style={{ color: "#f87171", fontSize: 13 }}>⚠ {error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSend}
              disabled={loading}
              style={{ backgroundColor: loading ? "#1e293b" : "#0ea5e9",
                borderRadius: 14, paddingVertical: 16, alignItems: "center" }}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                    Kirim Link Reset
                  </Text>}
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 28 }}>
              <Text style={{ color: "#475569", fontSize: 13 }}>Ingat password?{" "}</Text>
              <TouchableOpacity onPress={() => router.push("/login" as any)}>
                <Text style={{ color: "#0ea5e9", fontWeight: "700", fontSize: 13 }}>
                  Masuk
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* ── Success ── */
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 20 }}>
            <Text style={{ fontSize: 64, marginBottom: 24 }}>✉️</Text>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22,
              textAlign: "center", marginBottom: 12 }}>
              Email Terkirim!
            </Text>
            <Text style={{ color: "#64748b", fontSize: 13, textAlign: "center",
              lineHeight: 22, marginBottom: 10 }}>
              Cek inbox
            </Text>
            <View style={{ backgroundColor: "#0ea5e915", borderRadius: 10, padding: 12,
              borderWidth: 1, borderColor: "#0ea5e930", marginBottom: 20 }}>
              <Text style={{ color: "#0ea5e9", fontWeight: "700", fontSize: 15,
                textAlign: "center" }}>
                {email}
              </Text>
            </View>
            <Text style={{ color: "#475569", fontSize: 12, textAlign: "center",
              lineHeight: 20, marginBottom: 36 }}>
              Klik link reset di email dan set password baru melalui browser.
              Setelah itu, login kembali di aplikasi.{"\n\n"}
              Tidak menerima email? Cek folder spam.
            </Text>

            <TouchableOpacity
              onPress={() => setSent(false)}
              style={{ backgroundColor: "#1e2433", borderRadius: 12,
                paddingHorizontal: 24, paddingVertical: 13, marginBottom: 12,
                width: "100%", alignItems: "center",
                borderWidth: 1, borderColor: "#334155" }}>
              <Text style={{ color: "#94a3b8", fontWeight: "600", fontSize: 14 }}>
                Kirim Ulang
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/login" as any)}
              style={{ backgroundColor: "#0ea5e9", borderRadius: 12,
                paddingHorizontal: 24, paddingVertical: 13,
                width: "100%", alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                Kembali ke Login
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
