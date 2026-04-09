import { useQueryClient } from "@tanstack/react-query";
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

import { registerUser, saveAuthToken } from "@/services/userService";
import { useVerification } from "@/context/VerificationContext";

// ─── Helpers ──────────────────────────────────────────────────

function FormLabel({ text }: { text: string }) {
  return (
    <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, fontWeight: "600" }}>
      {text}
    </Text>
  );
}

function PasswordCheck({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ color: ok ? "#34d399" : "#475569", fontSize: 12 }}>
        {ok ? "✓" : "○"}
      </Text>
      <Text style={{ color: ok ? "#34d399" : "#475569", fontSize: 12 }}>{text}</Text>
    </View>
  );
}

const inputStyle = {
  backgroundColor: "#1e2433",
  borderRadius: 12,
  color: "#fff" as const,
  fontSize: 14,
  padding: 16,
  marginBottom: 16,
};

// ─── Screen ───────────────────────────────────────────────────

export default function SignUpScreen() {
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { setNeedsVerification } = useVerification();

  const [name,     setName]     = useState("");
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agreed,   setAgreed]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const passLongEnough = password.length >= 8;
  const passHasUpper   = /[A-Z]/.test(password);
  const passHasNumber  = /[0-9]/.test(password);
  const usernameValid  = /^[a-z0-9_]{3,30}$/.test(username);

  async function handleRegister() {
    setError("");
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setError("Nama, username, email, dan password wajib diisi.");
      return;
    }
    if (!usernameValid) {
      setError("Username hanya boleh huruf kecil, angka, dan underscore (3–30 karakter).");
      return;
    }
    if (!passLongEnough || !passHasUpper || !passHasNumber) {
      setError("Password min 8 karakter, harus ada huruf KAPITAL dan angka.");
      return;
    }
    if (!agreed) {
      setError("Kamu harus menyetujui Risk & Disclaimer untuk mendaftar.");
      return;
    }
    setLoading(true);
    try {
      const token = await registerUser({
        name:     name.trim(),
        username: username.trim().toLowerCase(),
        email:    email.trim().toLowerCase(),
        password,
        phone:    phone.trim() || undefined,
      });
      await saveAuthToken(token);
      setNeedsVerification(true);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "Gagal mendaftar. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0a0f1e" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6,
            marginBottom: 28, alignSelf: "flex-start" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={20} color="#64748b" />
          <Text style={{ color: "#64748b", fontSize: 13 }}>Kembali</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 30,
          letterSpacing: -1, marginBottom: 4 }}>
          Buat Akun
        </Text>
        <Text style={{ color: "#64748b", fontSize: 13, marginBottom: 28, lineHeight: 20 }}>
          Gratis · Trial 7 hari akses penuh
        </Text>

        {/* Nama */}
        <FormLabel text="Nama Lengkap *" />
        <TextInput
          value={name}
          onChangeText={t => { setName(t); setError(""); }}
          placeholder="Nama kamu"
          placeholderTextColor="#334155"
          style={inputStyle}
        />

        {/* Username */}
        <FormLabel text="Username *" />
        <TextInput
          value={username}
          onChangeText={t => { setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, "")); setError(""); }}
          placeholder="contoh: budi_trader"
          placeholderTextColor="#334155"
          autoCapitalize="none"
          style={[inputStyle,
            username.length >= 3 && !usernameValid
              ? { borderWidth: 1, borderColor: "#f87171", marginBottom: 6 }
              : {}]}
        />
        <Text style={{ color: "#475569", fontSize: 11, marginBottom: 14 }}>
          Huruf kecil, angka, underscore · 3–30 karakter{" "}
          {username.length >= 3 && (
            <Text style={{ color: usernameValid ? "#34d399" : "#f87171" }}>
              {usernameValid ? "✓ Valid" : "✗ Tidak valid"}
            </Text>
          )}
        </Text>

        {/* Email */}
        <FormLabel text="Email *" />
        <TextInput
          value={email}
          onChangeText={t => { setEmail(t); setError(""); }}
          placeholder="email@kamu.com"
          placeholderTextColor="#334155"
          keyboardType="email-address"
          autoCapitalize="none"
          style={inputStyle}
        />

        {/* Nomor HP */}
        <FormLabel text="Nomor HP (opsional)" />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="08xxxxxxxxxx"
          placeholderTextColor="#334155"
          keyboardType="phone-pad"
          style={inputStyle}
        />

        {/* Password */}
        <FormLabel text="Password *" />
        <View style={{ position: "relative", marginBottom: 10 }}>
          <TextInput
            value={password}
            onChangeText={t => { setPassword(t); setError(""); }}
            placeholder="Min 8 karakter"
            placeholderTextColor="#334155"
            secureTextEntry={!showPass}
            style={[inputStyle, { paddingRight: 52, marginBottom: 0 }]}
          />
          <TouchableOpacity
            onPress={() => setShowPass(p => !p)}
            style={{ position: "absolute", right: 16, top: 0, bottom: 0,
              justifyContent: "center" }}>
            <Text style={{ fontSize: 18 }}>{showPass ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        </View>

        {/* Password strength */}
        {password.length > 0 && (
          <View style={{ marginBottom: 20, gap: 6 }}>
            <PasswordCheck ok={passLongEnough} text="Minimal 8 karakter" />
            <PasswordCheck ok={passHasUpper}   text="Ada huruf KAPITAL" />
            <PasswordCheck ok={passHasNumber}  text="Ada angka (0-9)" />
          </View>
        )}

        {/* Disclaimer checkbox */}
        <TouchableOpacity
          onPress={() => setAgreed(a => !a)}
          activeOpacity={0.8}
          style={{ flexDirection: "row", alignItems: "flex-start",
            marginBottom: 24, gap: 14 }}>
          <View style={{ width: 22, height: 22, borderRadius: 6,
            backgroundColor: agreed ? "#0ea5e9" : "#1e2433",
            borderWidth: agreed ? 0 : 1, borderColor: "#334155",
            alignItems: "center", justifyContent: "center", marginTop: 1,
            flexShrink: 0 }}>
            {agreed && (
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>✓</Text>
            )}
          </View>
          <Text style={{ color: "#64748b", fontSize: 12, lineHeight: 20, flex: 1 }}>
            Saya memahami bahwa StockBot Pro hanya memberikan{" "}
            <Text style={{ color: "#94a3b8" }}>analisa dan edukasi investasi</Text>,
            bukan rekomendasi beli/jual. Keputusan investasi sepenuhnya menjadi
            tanggung jawab saya sendiri.
          </Text>
        </TouchableOpacity>

        {/* Error */}
        {error ? (
          <View style={{ backgroundColor: "#f8717115", borderRadius: 10,
            padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#f8717130" }}>
            <Text style={{ color: "#f87171", fontSize: 13 }}>⚠ {error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={{ backgroundColor: loading ? "#1e293b" : "#0ea5e9",
            borderRadius: 14, paddingVertical: 16,
            alignItems: "center", marginBottom: 20 }}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Daftar Gratis
              </Text>}
        </TouchableOpacity>

        {/* Already have account */}
        <View style={{ flexDirection: "row", justifyContent: "center" }}>
          <Text style={{ color: "#64748b", fontSize: 13 }}>Sudah punya akun? </Text>
          <TouchableOpacity onPress={() => router.push("/login" as any)}>
            <Text style={{ color: "#0ea5e9", fontWeight: "700", fontSize: 13 }}>Masuk</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
