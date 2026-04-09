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

import { loginUser, saveAuthToken } from "@/services/userService";

export default function LoginScreen() {
  const router       = useRouter();
  const insets       = useSafeAreaInsets();
  const queryClient  = useQueryClient();

  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  async function handleLogin() {
    if (!identifier.trim() || !password) {
      setError("Email/username dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = await loginUser(identifier.trim(), password);
      await saveAuthToken(token);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "Login gagal. Cek email/username dan password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0a0f1e" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center",
          padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6,
            marginBottom: 40, alignSelf: "flex-start" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={20} color="#64748b" />
          <Text style={{ color: "#64748b", fontSize: 13 }}>Kembali</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 32, letterSpacing: -1 }}>
            Selamat Datang
          </Text>
          <Text style={{ color: "#64748b", fontSize: 14, marginTop: 6, lineHeight: 20 }}>
            Masuk ke akun StockBot Pro kamu
          </Text>
        </View>

        {/* Email / Username */}
        <Text style={labelStyle}>Email atau Username</Text>
        <TextInput
          value={identifier}
          onChangeText={t => { setIdentifier(t); setError(""); }}
          placeholder="email@kamu.com atau username"
          placeholderTextColor="#334155"
          autoCapitalize="none"
          keyboardType="email-address"
          style={inputStyle}
        />

        {/* Password */}
        <Text style={labelStyle}>Password</Text>
        <View style={{ position: "relative", marginBottom: 8 }}>
          <TextInput
            value={password}
            onChangeText={t => { setPassword(t); setError(""); }}
            placeholder="••••••••"
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

        {/* Forgot password */}
        <TouchableOpacity
          onPress={() => router.push("/forgot-password" as any)}
          style={{ alignSelf: "flex-end", marginBottom: 28 }}>
          <Text style={{ color: "#0ea5e9", fontSize: 12 }}>Lupa Password?</Text>
        </TouchableOpacity>

        {/* Error */}
        {error ? (
          <View style={{ backgroundColor: "#f8717115", borderRadius: 10,
            padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#f8717130" }}>
            <Text style={{ color: "#f87171", fontSize: 13 }}>⚠ {error}</Text>
          </View>
        ) : null}

        {/* Login button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{ backgroundColor: loading ? "#1e293b" : "#0ea5e9",
            borderRadius: 14, paddingVertical: 16,
            alignItems: "center", marginBottom: 16 }}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Masuk</Text>}
        </TouchableOpacity>

        {/* Sign Up link */}
        <View style={{ flexDirection: "row", justifyContent: "center",
          alignItems: "center", marginTop: 4 }}>
          <Text style={{ color: "#64748b", fontSize: 13 }}>Belum punya akun? </Text>
          <TouchableOpacity onPress={() => router.push("/sign-up" as any)}>
            <Text style={{ color: "#0ea5e9", fontWeight: "700", fontSize: 13 }}>
              Daftar Gratis
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 32 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: "#1e2433" }} />
          <Text style={{ color: "#334155", fontSize: 11 }}>atau</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "#1e2433" }} />
        </View>

        {/* Continue without login */}
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={{ marginTop: 20, alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ color: "#475569", fontSize: 13 }}>
            Lanjut tanpa login →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const labelStyle = {
  color: "#94a3b8",
  fontSize: 13,
  marginBottom: 8,
  fontWeight: "600" as const,
};
const inputStyle = {
  backgroundColor: "#1e2433",
  borderRadius: 12,
  color: "#fff" as const,
  fontSize: 14,
  padding: 16,
  marginBottom: 16,
};
