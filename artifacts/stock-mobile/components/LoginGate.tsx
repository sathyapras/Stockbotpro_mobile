import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const TOKEN_KEY = "sbp_auth_token";

interface Props {
  feature?: string;
  children: React.ReactNode;
}

export function LoginGate({ feature, children }: Props) {
  const [checking, setChecking] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then(token => {
        setHasToken(!!token);
        setChecking(false);
      })
      .catch(() => {
        setHasToken(false);
        setChecking(false);
      });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background,
        alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!hasToken) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background,
        alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>🔐</Text>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 20,
          textAlign: "center", marginBottom: 10 }}>
          Login Diperlukan
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14,
          textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
          {feature
            ? `Fitur ${feature} hanya tersedia untuk pengguna terdaftar.`
            : "Fitur ini hanya tersedia untuk pengguna terdaftar."}
          {"\n\n"}Login atau daftar gratis untuk akses penuh.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/login" as any)}
          style={{ backgroundColor: "#0ea5e9", borderRadius: 14,
            paddingHorizontal: 32, paddingVertical: 14,
            width: "100%", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            Masuk ke Akun
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/sign-up" as any)}
          style={{ paddingVertical: 12, width: "100%", alignItems: "center" }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Belum punya akun?{" "}
            <Text style={{ color: "#0ea5e9", fontWeight: "700" }}>Daftar Gratis</Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}
