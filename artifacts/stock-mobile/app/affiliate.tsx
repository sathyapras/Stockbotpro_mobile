import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AffiliateMe,
  AffiliateProfile,
  AffiliateQuality,
  AffiliateReferral,
  AffiliatePayout,
  applyAffiliate,
  clearAuthToken,
  fetchAffiliateMe,
  getAuthToken,
  requestPayout,
  saveAuthToken,
} from "@/services/affiliateService";
import { useColors } from "@/hooks/useColors";

// ─── Clipboard helper ─────────────────────────────────────────

async function copyText(text: string) {
  if (Platform.OS === "web") {
    try { await (navigator as any).clipboard.writeText(text); } catch {}
  }
  Alert.alert("Disalin! 📋", `Kode: ${text}`);
}

// ─── Token Input Screen ───────────────────────────────────────

function TokenInputScreen({ onSaved }: { onSaved: () => void }) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 24 : insets.top + 16;

  async function handleSave() {
    if (!token.trim()) {
      Alert.alert("Token diperlukan", "Masukkan API token dari akun StockBot Pro kamu.");
      return;
    }
    setSaving(true);
    await saveAuthToken(token.trim());
    setSaving(false);
    onSaved();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingTop: topPad, paddingBottom: insets.bottom + 40 }}>
      <View style={{ flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginBottom: 32 }}>
        <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 22 }}>🔐 Login Diperlukan</Text>
        <TouchableOpacity onPress={() => router.back()}
          style={{ backgroundColor: colors.card, borderRadius: 20,
            width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 22 }}>
          Program Afiliasi memerlukan akun StockBot Pro.{"\n\n"}
          Login terlebih dahulu atau masukkan API token dari dashboard akun kamu.
        </Text>
      </View>

      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 8 }}>API Token</Text>
      <TextInput
        placeholder="Paste token di sini..."
        placeholderTextColor={colors.mutedForeground}
        value={token}
        onChangeText={setToken}
        style={{ backgroundColor: colors.card, borderRadius: 10,
          color: colors.foreground, fontSize: 13, padding: 14, marginBottom: 20 }}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />

      <TouchableOpacity onPress={handleSave} disabled={saving}
        style={{ backgroundColor: saving ? "#1e293b" : "#0ea5e9",
          borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 12 }}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Simpan & Lanjutkan</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/login")}
        style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center",
          borderWidth: 1, borderColor: "#0ea5e9" }}>
        <Text style={{ color: "#0ea5e9", fontWeight: "700", fontSize: 15 }}>Login ke StockBot Pro</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Pilih Tipe ───────────────────────────────────────────────

function PilihTipeScreen({ onPilih }: { onPilih: (tipe: "percentage" | "one_time") => void }) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 24 : insets.top + 16;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingTop: topPad, paddingBottom: insets.bottom + 40 }}>
      <View style={{ flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 22 }}>🎁 Program Afiliasi</Text>
        <TouchableOpacity onPress={() => router.back()}
          style={{ backgroundColor: colors.card, borderRadius: 20,
            width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 28 }}>
        Pilih tipe yang sesuai dengan profil Anda
      </Text>

      {/* Tipe 1 — Community Leader */}
      <TouchableOpacity
        onPress={() => onPilih("percentage")}
        style={{ backgroundColor: "#0a1a2e", borderRadius: 16, padding: 20, marginBottom: 16,
          borderWidth: 2, borderColor: "#f59e0b" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <View style={{ backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 8,
            paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: "#f59e0b", fontWeight: "800", fontSize: 12 }}>👑 COMMUNITY LEADER</Text>
          </View>
          <Text style={{ color: "#f59e0b", fontWeight: "900", fontSize: 20 }}>30% / bln</Text>
        </View>
        <Text style={{ color: "#94a3b8", fontSize: 13, lineHeight: 20, marginBottom: 14 }}>
          Untuk pengelola komunitas aktif (Telegram, WA, YouTube, dll) dengan minimal 50 member.
          Komisi recurring setiap bulan selama member tetap subscribe.
        </Text>
        {[
          "Min 50 member komunitas saat apply",
          "Wajib lampirkan link/bukti group",
          "Min 30 subscriber aktif agar komisi cair",
          "Aktif edukasi pasar keuangan di komunitas",
        ].map(s => (
          <Text key={s} style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>✅ {s}</Text>
        ))}
        <View style={{ backgroundColor: "#f59e0b", borderRadius: 10,
          paddingVertical: 12, alignItems: "center", marginTop: 16 }}>
          <Text style={{ color: "#000", fontWeight: "800", fontSize: 14 }}>Pilih Community Leader</Text>
        </View>
      </TouchableOpacity>

      {/* Tipe 2 — One Time */}
      <TouchableOpacity
        onPress={() => onPilih("one_time")}
        style={{ backgroundColor: "#0a1a2e", borderRadius: 16, padding: 20,
          borderWidth: 1, borderColor: "#3b82f6" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <View style={{ backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 8,
            paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: "#3b82f6", fontWeight: "800", fontSize: 12 }}>⚡ ONE TIME</Text>
          </View>
          <Text style={{ color: "#3b82f6", fontWeight: "900", fontSize: 20 }}>40% sekali</Text>
        </View>
        <Text style={{ color: "#94a3b8", fontSize: 13, lineHeight: 20, marginBottom: 14 }}>
          Komisi 40% dari transaksi pertama setiap referral. Tidak ada syarat minimum subscriber.
        </Text>
        {[
          "Tidak ada syarat minimum",
          "Komisi lebih besar di transaksi pertama",
        ].map(s => (
          <Text key={s} style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>✅ {s}</Text>
        ))}
        <Text style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>⚠️ Hanya untuk transaksi pertama per referral</Text>
        <View style={{ backgroundColor: "#3b82f6", borderRadius: 10,
          paddingVertical: 12, alignItems: "center", marginTop: 16 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Pilih One Time</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Form Apply ───────────────────────────────────────────────

function FormApplyScreen({
  tipe,
  onBack,
  onSuccess,
}: {
  tipe: "percentage" | "one_time";
  onBack: () => void;
  onSuccess: () => void;
}) {
  const colors = useColors();
  const isType1 = tipe === "percentage";
  const [marketReach,   setMarketReach]   = useState("");
  const [groupProof,    setGroupProof]    = useState("");
  const [preferredCode, setPreferredCode] = useState("");
  const [error,         setError]         = useState("");

  const mutation = useMutation({
    mutationFn: applyAffiliate,
    onSuccess: () => {
      Alert.alert(
        "✅ Aplikasi Dikirim",
        "Kode referral kamu sudah disiapkan. Admin akan mereview dalam 1-2 hari kerja.",
      );
      onSuccess();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleApply() {
    if (!marketReach.trim()) { setError("Deskripsi pangsa pasar wajib diisi."); return; }
    if (isType1 && !groupProof.trim()) { setError("Link/bukti komunitas wajib untuk Community Leader."); return; }
    setError("");
    mutation.mutate({
      marketReach:    marketReach.trim(),
      commissionType: tipe,
      groupProof:     isType1 ? groupProof.trim() : undefined,
      preferredCode:  preferredCode.trim() || undefined,
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

      {/* Back + badge tipe */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 }}>
        <TouchableOpacity onPress={onBack}
          style={{ backgroundColor: colors.card, borderRadius: 10,
            paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>← Kembali</Text>
        </TouchableOpacity>
        <View style={{ backgroundColor: isType1 ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.15)",
          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: isType1 ? "#f59e0b" : "#3b82f6", fontWeight: "700", fontSize: 12 }}>
            {isType1 ? "👑 Community Leader — 30% Recurring" : "⚡ One Time — 40%"}
          </Text>
        </View>
      </View>

      {/* Deskripsi pangsa pasar */}
      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 8 }}>
        Deskripsi Pangsa Pasar *
      </Text>
      <TextInput
        placeholder="Contoh: Saya mengelola grup Telegram saham IDX dengan 500+ member aktif..."
        placeholderTextColor={colors.mutedForeground}
        value={marketReach}
        onChangeText={setMarketReach}
        multiline
        numberOfLines={4}
        style={{ backgroundColor: colors.card, borderRadius: 10,
          color: colors.foreground, fontSize: 13, padding: 14,
          textAlignVertical: "top", marginBottom: 16, minHeight: 100 }}
      />

      {/* Bukti komunitas — hanya Type 1 */}
      {isType1 && (
        <>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 8 }}>
            Link / Bukti Komunitas *
          </Text>
          <TextInput
            placeholder="https://t.me/nama_group atau link YouTube/WA..."
            placeholderTextColor={colors.mutedForeground}
            value={groupProof}
            onChangeText={setGroupProof}
            style={{ backgroundColor: colors.card, borderRadius: 10,
              color: colors.foreground, fontSize: 13, padding: 14, marginBottom: 6 }}
            autoCapitalize="none"
          />
          <Text style={{ color: "#475569", fontSize: 11, marginBottom: 16 }}>
            Link grup Telegram, channel YouTube, atau screenshot komunitas.
          </Text>
        </>
      )}

      {/* Kode afiliasi pilihan */}
      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 8 }}>
        Kode Afiliasi Pilihan (opsional)
      </Text>
      <TextInput
        placeholder="Contoh: BUDI2024"
        placeholderTextColor={colors.mutedForeground}
        value={preferredCode}
        onChangeText={t => setPreferredCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        style={{ backgroundColor: colors.card, borderRadius: 10,
          color: colors.foreground, fontSize: 15, padding: 14,
          letterSpacing: 2, marginBottom: 6 }}
        autoCapitalize="characters"
        maxLength={20}
      />
      <Text style={{ color: "#475569", fontSize: 11, marginBottom: 24 }}>
        Huruf kapital & angka. Kosong = dibuat otomatis dari username.
      </Text>

      {error ? (
        <Text style={{ color: "#f87171", fontSize: 12, marginBottom: 16 }}>⚠ {error}</Text>
      ) : null}

      <TouchableOpacity onPress={handleApply} disabled={mutation.isPending}
        style={{ backgroundColor: mutation.isPending ? "#1e293b" : "#0ea5e9",
          borderRadius: 12, paddingVertical: 16, alignItems: "center" }}>
        {mutation.isPending
          ? <ActivityIndicator color="#fff" />
          : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Kirim Aplikasi</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Pending Banner ───────────────────────────────────────────

function PendingBanner() {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14,
      backgroundColor: "rgba(251,191,36,0.1)", borderRadius: 12,
      padding: 14, borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" }}>
      <Text style={{ color: "#fbbf24", fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
        ⏳ Aplikasi Dalam Review
      </Text>
      <Text style={{ color: "#94a3b8", fontSize: 12, lineHeight: 18 }}>
        Tim kami sedang mereview aplikasi afiliasi Anda. Proses 1-2 hari kerja.
        Anda akan dihubungi melalui email setelah disetujui.
      </Text>
    </View>
  );
}

// ─── Threshold Bar (Type 1) ───────────────────────────────────

function ThresholdBar({
  activeUsers,
  threshold,
  frozen,
}: {
  activeUsers: number;
  threshold: number;
  frozen: boolean;
}) {
  const pct = Math.min((activeUsers / threshold) * 100, 100);
  const met = activeUsers >= threshold;

  return (
    <View style={{ backgroundColor: "#0f1729", borderRadius: 14,
      padding: 16, marginHorizontal: 16, marginBottom: 14,
      borderWidth: 1, borderColor: "#1e293b" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10 }}>
        <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "700",
          textTransform: "uppercase", letterSpacing: 0.5 }}>
          Subscriber Aktif
        </Text>
        <View style={{ backgroundColor: met
          ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ color: met ? "#22c55e" : "#ef4444",
            fontSize: 11, fontWeight: "700" }}>
            {met ? "✓ KOMISI AKTIF" : "✗ KOMISI BEKU"}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ height: 8, backgroundColor: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
        <View style={{ height: "100%", borderRadius: 4,
          width: `${pct}%` as any,
          backgroundColor: met ? "#22c55e" : "#f59e0b" }} />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        <Text style={{ color: "#94a3b8", fontSize: 12 }}>
          <Text style={{ color: met ? "#22c55e" : "#f59e0b",
            fontWeight: "800", fontSize: 16 }}>{activeUsers}</Text>
          {" "}dari{" "}
          <Text style={{ fontWeight: "700", color: "#e2e8f0" }}>{threshold}</Text>
          {" "}subscriber aktif
        </Text>
        <Text style={{ color: "#64748b", fontSize: 11 }}>
          {threshold - activeUsers > 0
            ? `Butuh ${threshold - activeUsers} lagi`
            : "Threshold tercapai"}
        </Text>
      </View>

      {frozen && (
        <View style={{ backgroundColor: "rgba(251,191,36,0.1)", borderRadius: 8,
          padding: 10, marginTop: 10, borderWidth: 1,
          borderColor: "rgba(251,191,36,0.25)" }}>
          <Text style={{ color: "#fbbf24", fontSize: 12 }}>
            ⚠ Komisi dibekukan sementara. Tambah subscriber atau hubungi admin untuk review.
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Referral Code Card ───────────────────────────────────────

function ReferralCodeCard({ code, discountPct }: { code: string; discountPct: number }) {
  async function handleShare() {
    try {
      await Share.share({
        message: `Gunakan kode referral saya *${code}* di StockBot Pro dan dapatkan diskon ${discountPct}%!\n\nDownload: https://stockbotpro.replit.app`,
      });
    } catch {}
  }

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14,
      backgroundColor: "#0f1729", borderRadius: 14, padding: 18,
      borderWidth: 1, borderColor: "rgba(0,180,255,0.15)" }}>
      <Text style={{ color: "#64748b", fontSize: 11, marginBottom: 8,
        textTransform: "uppercase", letterSpacing: 0.5 }}>
        Kode Referral Kamu
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: "#00d4ff", fontWeight: "900",
          fontSize: 28, letterSpacing: 4, flex: 1 }}>{code}</Text>
        <TouchableOpacity onPress={() => copyText(code)} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 22 }}>📋</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare}
          style={{ backgroundColor: "#00b4d8", borderRadius: 8,
            paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Share</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: "#475569", fontSize: 11, marginTop: 8 }}>
        Referred user dapat diskon {discountPct}% · Kamu dapat komisi setiap transaksi
      </Text>
    </View>
  );
}

// ─── Stats Row ────────────────────────────────────────────────

function StatsRow({
  quality,
  profile,
  totalReferrals,
}: {
  quality: AffiliateQuality;
  profile: AffiliateProfile;
  totalReferrals: number;
}) {
  const colors = useColors();
  const pending = parseFloat(profile.pendingBalance ?? "0");
  const stats = [
    { label: "Total Referral", value: String(totalReferrals),                           unit: "orang" },
    { label: "Aktif",          value: String(quality.activeUsers),                      unit: "orang" },
    { label: "Retention",      value: `${quality.retentionRate}%`,                     unit: "" },
    { label: "Saldo",          value: `Rp ${pending.toLocaleString("id-ID")}`,         unit: "" },
  ];
  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 14, gap: 8 }}>
      {stats.map(s => (
        <View key={s.label} style={{ flex: 1, backgroundColor: colors.card,
          borderRadius: 12, padding: 10, alignItems: "center", gap: 2 }}>
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 14 }}>{s.value}</Text>
          {s.unit ? <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>{s.unit}</Text> : null}
          <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 1, textAlign: "center" }}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Earnings Card ────────────────────────────────────────────

function EarningsCard({
  quality,
  frozen,
}: {
  quality: AffiliateQuality;
  frozen: boolean;
}) {
  const colors = useColors();
  const diff = quality.thisMonthEarnings - quality.lastMonthEarnings;
  const isUp = diff >= 0;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14,
      backgroundColor: colors.card, borderRadius: 14, padding: 16 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700",
        letterSpacing: 1, marginBottom: 10 }}>KOMISI BULAN INI</Text>
      {frozen ? (
        <Text style={{ color: "#f59e0b", fontWeight: "900", fontSize: 22 }}>
          Dibekukan ⚠
        </Text>
      ) : (
        <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 24 }}>
          Rp {quality.thisMonthEarnings.toLocaleString("id-ID")}
        </Text>
      )}
      <Text style={{ color: isUp ? "#34d399" : "#f87171", fontSize: 12, marginTop: 6 }}>
        {isUp ? "▲" : "▼"} Rp {Math.abs(diff).toLocaleString("id-ID")} vs bulan lalu
      </Text>
    </View>
  );
}

// ─── Referral History ─────────────────────────────────────────

function ReferralHistory({ referrals }: { referrals: AffiliateReferral[] }) {
  const colors = useColors();
  if (!referrals?.length) return (
    <View style={{ marginHorizontal: 16, marginBottom: 14,
      backgroundColor: colors.card, borderRadius: 14, padding: 20, alignItems: "center" }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Belum ada referral masuk</Text>
    </View>
  );
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
        letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Riwayat Komisi</Text>
      <View style={{ backgroundColor: colors.card, borderRadius: 14, overflow: "hidden" }}>
        {referrals.slice(0, 10).map((r, i) => (
          <View key={r.id} style={{
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 16, paddingVertical: 13,
            borderBottomWidth: i < Math.min(referrals.length, 10) - 1 ? 1 : 0,
            borderBottomColor: colors.border,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
                Paket {r.planName?.toUpperCase()} · {r.months} bln
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
                {new Date(r.createdAt).toLocaleDateString("id-ID",
                  { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            <Text style={{ color: "#34d399", fontWeight: "700", fontSize: 14 }}>
              +Rp {parseFloat(r.commissionEarned).toLocaleString("id-ID")}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Modal Payout ─────────────────────────────────────────────

function ModalPayout({
  visible,
  pendingBalance,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  pendingBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const colors = useColors();
  const [amount,  setAmount]  = useState("");
  const [bank,    setBank]    = useState("");
  const [accNum,  setAccNum]  = useState("");
  const [accName, setAccName] = useState("");

  const mutation = useMutation({
    mutationFn: requestPayout,
    onSuccess: (data) => {
      Alert.alert("✅ Berhasil", data.message ?? "Request payout dikirim. Diproses 1-3 hari kerja.");
      setAmount(""); setBank(""); setAccNum(""); setAccName("");
      onClose();
      onSuccess();
    },
    onError: (e: Error) => Alert.alert("Gagal", e.message),
  });

  function submit() {
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amt || amt < 50000) { Alert.alert("Minimum Rp 50.000"); return; }
    if (amt > pendingBalance) {
      Alert.alert("Saldo tidak cukup", `Saldo tersedia: Rp ${pendingBalance.toLocaleString("id-ID")}`);
      return;
    }
    if (!bank || !accNum || !accName) {
      Alert.alert("Lengkapi semua field bank.");
      return;
    }
    mutation.mutate({ amount: amt, bankName: bank.trim(),
      accountNumber: accNum.trim(), accountName: accName.trim() });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#0f1729", borderTopLeftRadius: 24,
          borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <Text style={{ color: "#e2e8f0", fontWeight: "800", fontSize: 18, marginBottom: 20 }}>
            Request Pencairan
          </Text>

          {[
            { label: "Jumlah (Rp)", val: amount, set: setAmount,
              hint: "Contoh: 150000", numeric: true },
            { label: "Nama Bank", val: bank, set: setBank, hint: "BCA, BRI, Mandiri, dll" },
            { label: "Nomor Rekening", val: accNum, set: setAccNum,
              hint: "1234567890", numeric: true },
            { label: "Nama Pemilik Rekening", val: accName, set: setAccName,
              hint: "Sesuai nama rekening" },
          ].map(f => (
            <View key={f.label} style={{ marginBottom: 14 }}>
              <Text style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{f.label}</Text>
              <TextInput
                placeholder={f.hint}
                placeholderTextColor="#475569"
                value={f.val}
                onChangeText={f.set}
                keyboardType={f.numeric ? "numeric" : "default"}
                style={{ backgroundColor: "#1e293b", borderRadius: 10,
                  color: "#e2e8f0", fontSize: 14, padding: 12 }}
              />
            </View>
          ))}

          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <TouchableOpacity onPress={onClose}
              style={{ flex: 1, borderRadius: 12, paddingVertical: 14,
                alignItems: "center", backgroundColor: "#1e293b" }}>
              <Text style={{ color: "#94a3b8", fontWeight: "700" }}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={mutation.isPending}
              style={{ flex: 2, borderRadius: 12, paddingVertical: 14,
                alignItems: "center",
                backgroundColor: mutation.isPending ? "#1e293b" : "#22c55e" }}>
              {mutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: "#000", fontWeight: "800" }}>Konfirmasi</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Payout Section ───────────────────────────────────────────

function PayoutSection({
  profile,
  payouts,
  frozen,
  onSuccess,
}: {
  profile: AffiliateProfile;
  payouts: AffiliatePayout[];
  frozen: boolean;
  onSuccess: () => void;
}) {
  const colors = useColors();
  const [showModal, setShowModal] = useState(false);
  const pending = parseFloat(profile.pendingBalance ?? "0");
  const statusColor: Record<string, string> = {
    paid: "#22c55e", pending: "#fbbf24", rejected: "#f87171",
  };

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 32 }}>
      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
        letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Pencairan Komisi</Text>

      {/* Saldo */}
      <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 10 }}>
        <Text style={{ color: "#64748b", fontSize: 11 }}>SALDO TERSEDIA</Text>
        <Text style={{ color: "#22c55e", fontWeight: "900", fontSize: 26, marginTop: 4 }}>
          Rp {pending.toLocaleString("id-ID")}
        </Text>
        <Text style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
          Min. penarikan Rp 50.000 · Proses 1-3 hari kerja
        </Text>
      </View>

      {/* Frozen warning */}
      {frozen ? (
        <View style={{ backgroundColor: "rgba(251,191,36,0.1)", borderRadius: 10,
          padding: 12, marginBottom: 10, borderWidth: 1,
          borderColor: "rgba(251,191,36,0.25)" }}>
          <Text style={{ color: "#fbbf24", fontSize: 12 }}>
            ⚠ Pencairan tidak tersedia saat komisi dibekukan. Hubungi admin.
          </Text>
        </View>
      ) : pending >= 50000 ? (
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={{ backgroundColor: "#22c55e", borderRadius: 12,
            paddingVertical: 14, alignItems: "center", marginBottom: 10 }}>
          <Text style={{ color: "#000", fontWeight: "800", fontSize: 14 }}>Request Pencairan</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ backgroundColor: colors.card, borderRadius: 12,
          paddingVertical: 14, alignItems: "center", marginBottom: 10 }}>
          <Text style={{ color: "#475569", fontSize: 13 }}>Minimal Rp 50.000 untuk mencairkan</Text>
        </View>
      )}

      {/* Riwayat payout */}
      {payouts?.length > 0 && (
        <>
          <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
            letterSpacing: 1, marginTop: 6, marginBottom: 8, textTransform: "uppercase" }}>
            Riwayat Pencairan
          </Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 14, overflow: "hidden" }}>
            {payouts.slice(0, 5).map((p, i) => (
              <View key={p.id} style={{
                flexDirection: "row", alignItems: "center",
                paddingHorizontal: 16, paddingVertical: 13,
                borderBottomWidth: i < Math.min(payouts.length, 5) - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>
                    Rp {parseFloat(p.amount).toLocaleString("id-ID")}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
                    {p.bankName} · {new Date(p.createdAt).toLocaleDateString("id-ID",
                      { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                </View>
                <View style={{ backgroundColor: (statusColor[p.status] ?? "#94a3b8") + "22",
                  borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: statusColor[p.status] ?? "#94a3b8",
                    fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>
                    {p.status === "paid" ? "Cair" : p.status === "rejected" ? "Ditolak" : "Proses"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <ModalPayout
        visible={showModal}
        pendingBalance={pending}
        onClose={() => setShowModal(false)}
        onSuccess={onSuccess}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function AffiliateScreen() {
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const colors      = useColors();
  const topPad      = Platform.OS === "web" ? 24 : insets.top + 16;
  const queryClient = useQueryClient();
  const [hasToken,   setHasToken]   = useState<boolean | null>(null);
  const [applyStep,  setApplyStep]  = useState<"none" | "pilih" | { tipe: "percentage" | "one_time" }>("none");

  React.useEffect(() => {
    getAuthToken().then(t => setHasToken(!!t));
  }, []);

  const { data, isLoading, isError, error, refetch } = useQuery<AffiliateMe>({
    queryKey: ["affiliate-me"],
    queryFn: fetchAffiliateMe,
    enabled: hasToken === true,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (isError && (error as Error)?.message === "UNAUTHORIZED") {
      clearAuthToken().then(() => setHasToken(false));
    }
  }, [isError, error]);

  const Header = ({ subtitle }: { subtitle?: string }) => (
    <View style={{ paddingHorizontal: 16, paddingTop: topPad, paddingBottom: 16,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View>
        <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 22 }}>🎁 Program Afiliasi</Text>
        {subtitle && (
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>{subtitle}</Text>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        {hasToken && (
          <TouchableOpacity
            onPress={() => Alert.alert("Logout", "Hapus token yang tersimpan?", [
              { text: "Batal", style: "cancel" },
              { text: "Hapus", style: "destructive",
                onPress: () => clearAuthToken().then(() => setHasToken(false)) },
            ])}
            style={{ backgroundColor: colors.card, borderRadius: 8,
              paddingHorizontal: 8, paddingVertical: 6 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Token</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.back()}
          style={{ backgroundColor: colors.card, borderRadius: 20,
            width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── No token ─────────────────────────────────────────────────
  if (hasToken === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background,
        alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#0ea5e9" />
      </View>
    );
  }

  if (!hasToken) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TokenInputScreen onSaved={() => setHasToken(true)} />
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Memuat data afiliasi...</Text>
        </View>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────
  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center",
          padding: 32, gap: 12 }}>
          <Text style={{ fontSize: 36 }}>⚠️</Text>
          <Text style={{ color: "#f87171", fontSize: 14, textAlign: "center" }}>
            {(error as Error)?.message ?? "Gagal memuat data"}
          </Text>
          <TouchableOpacity onPress={() => refetch()}
            style={{ backgroundColor: "#0ea5e9", borderRadius: 10,
              paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Belum punya profil → pilih tipe / form apply ─────────────
  if (!data?.hasProfile) {
    if (applyStep === "none") {
      return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <PilihTipeScreen onPilih={(tipe) => setApplyStep({ tipe })} />
        </View>
      );
    }
    if (applyStep === "pilih" || typeof applyStep === "object") {
      const tipe = (applyStep as { tipe: "percentage" | "one_time" }).tipe ?? "one_time";
      return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Header />
          <FormApplyScreen
            tipe={tipe}
            onBack={() => setApplyStep("none")}
            onSuccess={() => {
              setApplyStep("none");
              queryClient.invalidateQueries({ queryKey: ["affiliate-me"] });
            }}
          />
        </View>
      );
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────
  const profile  = data!.profile!;
  const quality  = data!.quality!;
  const referrals = data!.referrals ?? [];
  const payouts  = data!.payouts ?? [];
  const totalRef = data!.totalReferrals ?? 0;
  const isType1  = profile.commissionType === "percentage";
  const frozen   = quality.commissionFrozen;

  const subtitleType = isType1 ? "👑 Community Leader" : "⚡ One Time";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header subtitle={`${subtitleType} · ${profile.commissionRate}% komisi`} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Pending banner */}
        {profile.status === "pending" && <PendingBanner />}

        {/* Threshold bar — hanya Type 1 aktif */}
        {isType1 && profile.status === "active" && quality.thresholdRequired && (
          <ThresholdBar
            activeUsers={quality.activeUsers}
            threshold={quality.thresholdRequired}
            frozen={frozen}
          />
        )}

        {/* Kode referral */}
        {profile.status === "active" && (
          <ReferralCodeCard code={profile.code} discountPct={profile.discountPct} />
        )}

        {/* Stats */}
        <StatsRow quality={quality} profile={profile} totalReferrals={totalRef} />

        {/* Komisi bulan ini */}
        <EarningsCard quality={quality} frozen={isType1 && frozen} />

        {/* Riwayat komisi */}
        <ReferralHistory referrals={referrals} />

        {/* Payout */}
        {profile.status === "active" && (
          <PayoutSection
            profile={profile}
            payouts={payouts}
            frozen={isType1 && frozen}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["affiliate-me"] })}
          />
        )}
      </ScrollView>
    </View>
  );
}
