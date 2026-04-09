import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiBase } from "@/services/subscribeService";

// ─── Contact link row ─────────────────────────────────────────

function ContactLink({
  icon, label, onPress, isLast = false,
}: { icon: string; label: string; onPress: () => void; isLast?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress}
      style={{
        flexDirection: "row", alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: "#0f1629",
      }}>
      <Text style={{ fontSize: 18, marginRight: 12 }}>{icon}</Text>
      <Text style={{ color: "#94a3b8", fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: "#334155", fontSize: 16 }}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function ContactUsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 24 : insets.top + 16;

  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSend() {
    if (!name.trim() || !message.trim()) {
      setError("Nama dan pesan wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase()}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:    name.trim(),
          email:   email.trim() || undefined,
          subject: subject.trim() || undefined,
          message: message.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Gagal mengirim pesan.");
        return;
      }
      Alert.alert(
        "Pesan Terkirim ✓",
        "Tim kami akan merespons dalam 1-2 hari kerja. Terima kasih!",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0f1629" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>

      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingTop: topPad, paddingBottom: 14,
        justifyContent: "space-between",
      }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 20 }}>✉️ Contact Us</Text>
        <TouchableOpacity onPress={() => router.back()}
          style={{ backgroundColor: "#1e2433", borderRadius: 20,
            width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#94a3b8", fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Info box */}
        <View style={{ backgroundColor: "#0a1a2e", borderRadius: 12,
          padding: 16, marginBottom: 24,
          borderLeftWidth: 3, borderLeftColor: "#0ea5e9" }}>
          <Text style={{ color: "#60a5fa", fontWeight: "700", marginBottom: 6 }}>
            💬 Hubungi Tim Kami
          </Text>
          <Text style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
            Ada pertanyaan, laporan bug, atau saran fitur? Isi form di bawah dan kami akan balas melalui email.
          </Text>
        </View>

        {/* Nama */}
        <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>Nama *</Text>
        <TextInput
          placeholder="Nama lengkap kamu"
          placeholderTextColor="#475569"
          value={name}
          onChangeText={setName}
          style={{ backgroundColor: "#1e2433", borderRadius: 10,
            color: "#fff", fontSize: 14, padding: 14, marginBottom: 14 }}
        />

        {/* Email */}
        <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>
          Email (opsional — untuk balasan)
        </Text>
        <TextInput
          placeholder="email@kamu.com"
          placeholderTextColor="#475569"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ backgroundColor: "#1e2433", borderRadius: 10,
            color: "#fff", fontSize: 14, padding: 14, marginBottom: 14 }}
        />

        {/* Subjek */}
        <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>
          Subjek (opsional)
        </Text>
        <TextInput
          placeholder="Contoh: Tanya fitur Smart Money"
          placeholderTextColor="#475569"
          value={subject}
          onChangeText={setSubject}
          style={{ backgroundColor: "#1e2433", borderRadius: 10,
            color: "#fff", fontSize: 14, padding: 14, marginBottom: 14 }}
        />

        {/* Pesan */}
        <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>Pesan *</Text>
        <TextInput
          placeholder="Tulis pesan kamu di sini..."
          placeholderTextColor="#475569"
          value={message}
          onChangeText={t => setMessage(t.slice(0, 2000))}
          multiline
          numberOfLines={6}
          style={{ backgroundColor: "#1e2433", borderRadius: 10,
            color: "#fff", fontSize: 14, padding: 14,
            textAlignVertical: "top", minHeight: 140, marginBottom: 6 }}
        />
        <Text style={{ color: "#334155", fontSize: 11, marginBottom: 20 }}>
          {message.length} / 2000 karakter
        </Text>

        {/* Error */}
        {error ? (
          <Text style={{ color: "#f87171", fontSize: 13, marginBottom: 14 }}>
            ⚠ {error}
          </Text>
        ) : null}

        {/* Tombol Kirim */}
        <TouchableOpacity onPress={handleSend} disabled={loading}
          style={{ backgroundColor: loading ? "#1e293b" : "#0ea5e9",
            borderRadius: 12, paddingVertical: 16, alignItems: "center",
            marginBottom: 32 }}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Kirim Pesan
              </Text>}
        </TouchableOpacity>

        {/* Alternatif kontak */}
        <View style={{ backgroundColor: "#1e2433", borderRadius: 12, padding: 16 }}>
          <Text style={{ color: "#64748b", fontSize: 11,
            fontWeight: "700", letterSpacing: 1, marginBottom: 8 }}>
            ATAU HUBUNGI LANGSUNG
          </Text>
          <ContactLink icon="✈️" label="Grup Telegram"
            onPress={() => Linking.openURL("https://t.me/stockbotpro")} />
          <ContactLink icon="💬" label="WhatsApp"
            onPress={() => Linking.openURL("https://wa.me/628xxxxxxxxxx")} />
          <ContactLink icon="✉️" label="support@stockbotpro.com"
            onPress={() => Linking.openURL("mailto:support@stockbotpro.com")}
            isLast />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
