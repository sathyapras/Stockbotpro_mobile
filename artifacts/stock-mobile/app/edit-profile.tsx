import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { useColors } from "@/hooks/useColors";
import { patchProfile } from "@/services/userService";

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  const params = useLocalSearchParams<{ name?: string; phone?: string; email?: string }>();

  const [name,  setName]  = useState(params.name  ?? "");
  const [phone, setPhone] = useState(params.phone ?? "");
  const [err,   setErr]   = useState("");

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ name, phone }: { name: string; phone: string }) =>
      patchProfile({ name, phone: phone.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      Alert.alert("✅ Tersimpan", "Profil berhasil diperbarui.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (e: Error) => setErr(e.message),
  });

  function handleSave() {
    if (!name.trim() || name.trim().length < 2) {
      setErr("Nama minimal 2 karakter.");
      return;
    }
    setErr("");
    mutation.mutate({ name: name.trim(), phone: phone.trim() });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>

      {/* ── Header ── */}
      <View style={{ paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: "#1e2433" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 20 }}>
            ✏️ Edit Profil
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        {/* Nama */}
        <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6, fontWeight: "600" }}>
          Nama Lengkap *
        </Text>
        <TextInput
          value={name}
          onChangeText={t => { setName(t); setErr(""); }}
          placeholder="Nama lengkap"
          placeholderTextColor="#475569"
          style={{ backgroundColor: "#1e2433", borderRadius: 10,
            color: "#fff", fontSize: 14, padding: 14, marginBottom: 18 }}
        />

        {/* Nomor HP */}
        <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6, fontWeight: "600" }}>
          Nomor HP{" "}
          <Text style={{ color: "#475569", fontWeight: "400" }}>(opsional)</Text>
        </Text>
        <TextInput
          value={phone}
          onChangeText={t => { setPhone(t); setErr(""); }}
          placeholder="08xxxxxxxxxx"
          placeholderTextColor="#475569"
          keyboardType="phone-pad"
          style={{ backgroundColor: "#1e2433", borderRadius: 10,
            color: "#fff", fontSize: 14, padding: 14, marginBottom: 6 }}
        />

        {/* Email info */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6,
          backgroundColor: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 22,
          borderWidth: 1, borderColor: "#334155" }}>
          <Text style={{ fontSize: 14 }}>📧</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#64748b", fontSize: 11 }}>Email (tidak dapat diubah)</Text>
            <Text style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>
              {params.email ?? "—"}
            </Text>
          </View>
          <View style={{ backgroundColor: "#1e2433", borderRadius: 6,
            paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: "#475569", fontSize: 9, fontWeight: "700" }}>TERKUNCI</Text>
          </View>
        </View>

        {/* Error */}
        {err ? (
          <View style={{ backgroundColor: "#f8717120", borderRadius: 8, padding: 12,
            marginBottom: 16, borderWidth: 1, borderColor: "#f8717140" }}>
            <Text style={{ color: "#f87171", fontSize: 13 }}>⚠ {err}</Text>
          </View>
        ) : null}

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={mutation.isPending}
          style={{ backgroundColor: mutation.isPending ? "#1e293b" : "#0ea5e9",
            borderRadius: 12, paddingVertical: 16, alignItems: "center" }}>
          {mutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                Simpan Perubahan
              </Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
