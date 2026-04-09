import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

// ─── Clipboard helper ─────────────────────────────────────────

async function copyText(text: string, label = "Teks") {
  if (Platform.OS === "web") {
    try { await (navigator as any).clipboard.writeText(text); } catch {}
  }
  Alert.alert("Disalin! 📋", `${label}: ${text}`);
}

// ─── Token Input Screen ───────────────────────────────────────

function TokenInputScreen({ onSaved }: { onSaved: () => void }) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
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
    <ScrollView style={{ flex: 1, backgroundColor: "#0f1629" }}
      contentContainerStyle={{ padding: 20, paddingTop: topPad, paddingBottom: insets.bottom + 40 }}>
      <View style={{ flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginBottom: 32 }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>🔐 Login Diperlukan</Text>
        <TouchableOpacity onPress={() => router.back()}
          style={{ backgroundColor: "#1e2433", borderRadius: 20,
            width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#94a3b8", fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: "#1e2433", borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <Text style={{ color: "#94a3b8", fontSize: 13, lineHeight: 22 }}>
          Program Afiliasi memerlukan akun StockBot Pro.{"\n\n"}
          Masukkan API token dari dashboard akun kamu di{" "}
          <Text style={{ color: "#0ea5e9" }}>stockbotpro.replit.app</Text>
          {" "}untuk melanjutkan.
        </Text>
      </View>

      <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>API Token</Text>
      <TextInput
        placeholder="Paste token di sini..."
        placeholderTextColor="#475569"
        value={token}
        onChangeText={setToken}
        style={{ backgroundColor: "#1e2433", borderRadius: 10,
          color: "#fff", fontSize: 13, padding: 14, marginBottom: 20 }}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />

      <TouchableOpacity onPress={handleSave} disabled={saving}
        style={{ backgroundColor: saving ? "#1e293b" : "#0ea5e9",
          borderRadius: 12, paddingVertical: 16, alignItems: "center" }}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Simpan & Lanjutkan</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Referral Code Card ───────────────────────────────────────

function ReferralCodeCard({ code, discountPct }: { code: string; discountPct: number }) {
  async function handleShare() {
    try {
      await Share.share({
        message: `Gunakan kode referral saya ${code} di StockBot Pro dan dapatkan diskon ${discountPct}%! Download di: https://stockbotpro.replit.app`,
      });
    } catch {}
  }

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16,
      backgroundColor: "#1e2433", borderRadius: 14, padding: 20 }}>
      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
        letterSpacing: 1, marginBottom: 10 }}>KODE REFERRAL KAMU</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: "#0ea5e9", fontWeight: "900",
          fontSize: 28, letterSpacing: 3, flex: 1 }}>{code}</Text>
        <TouchableOpacity onPress={() => copyText(code, "Kode")} style={{ marginRight: 14 }}>
          <Text style={{ fontSize: 22 }}>📋</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare}
          style={{ backgroundColor: "#0ea5e9", borderRadius: 8,
            paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Share</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: "#475569", fontSize: 11, marginTop: 10, lineHeight: 16 }}>
        Referred user dapat diskon {discountPct}% · Kamu dapat komisi setiap transaksi
      </Text>
    </View>
  );
}

// ─── Stats Row ────────────────────────────────────────────────

function StatsRow({
  quality, profile, totalReferrals,
}: { quality: AffiliateQuality; profile: AffiliateProfile; totalReferrals: number }) {
  const pendingBalance = parseFloat(profile.totalEarned) - parseFloat(profile.totalPaid);
  const stats = [
    { label: "Total Referral", value: String(totalReferrals),                              unit: "orang" },
    { label: "Aktif",          value: String(quality.activeUsers),                         unit: "orang" },
    { label: "Retention",      value: `${quality.retentionRate}%`,                        unit: "" },
    { label: "Saldo",          value: `Rp ${pendingBalance.toLocaleString("id-ID")}`,     unit: "" },
  ];
  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 16, gap: 8 }}>
      {stats.map(s => (
        <View key={s.label} style={{ flex: 1, backgroundColor: "#1e2433",
          borderRadius: 12, padding: 10, alignItems: "center", gap: 2 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>{s.value}</Text>
          {s.unit ? <Text style={{ color: "#64748b", fontSize: 9 }}>{s.unit}</Text> : null}
          <Text style={{ color: "#475569", fontSize: 9, marginTop: 1, textAlign: "center" }}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Earnings Card ────────────────────────────────────────────

function EarningsCard({ quality }: { quality: AffiliateQuality }) {
  const diff = quality.thisMonthEarnings - quality.lastMonthEarnings;
  const isUp = diff >= 0;
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16,
      backgroundColor: "#1e2433", borderRadius: 14, padding: 16 }}>
      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
        letterSpacing: 1, marginBottom: 10 }}>KOMISI BULAN INI</Text>
      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 24 }}>
        Rp {quality.thisMonthEarnings.toLocaleString("id-ID")}
      </Text>
      <Text style={{ color: isUp ? "#34d399" : "#f87171", fontSize: 12, marginTop: 6 }}>
        {isUp ? "▲" : "▼"} Rp {Math.abs(diff).toLocaleString("id-ID")} vs bulan lalu
      </Text>
      <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
        <View style={{ flex: 1, backgroundColor: "#0f1629", borderRadius: 8, padding: 10 }}>
          <Text style={{ color: "#64748b", fontSize: 10 }}>Total Earned</Text>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13, marginTop: 2 }}>
            Rp {parseFloat(quality.thisMonthEarnings.toString()).toLocaleString("id-ID")}
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#0f1629", borderRadius: 8, padding: 10 }}>
          <Text style={{ color: "#64748b", fontSize: 10 }}>Tier Progress</Text>
          <Text style={{ color: "#0ea5e9", fontWeight: "700", fontSize: 13, marginTop: 2 }}>
            {quality.tierProgress}%
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Referral History ─────────────────────────────────────────

function ReferralHistory({ referrals }: { referrals: AffiliateReferral[] }) {
  if (!referrals?.length) return (
    <View style={{ marginHorizontal: 16, marginBottom: 16,
      backgroundColor: "#1e2433", borderRadius: 14, padding: 20, alignItems: "center" }}>
      <Text style={{ color: "#475569", fontSize: 13 }}>Belum ada referral masuk</Text>
    </View>
  );
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
        letterSpacing: 1, marginBottom: 8 }}>RIWAYAT KOMISI</Text>
      <View style={{ backgroundColor: "#1e2433", borderRadius: 14, overflow: "hidden" }}>
        {referrals.slice(0, 10).map((r, i) => (
          <View key={r.id} style={{
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 16, paddingVertical: 13,
            borderBottomWidth: i < Math.min(referrals.length, 10) - 1 ? 1 : 0,
            borderBottomColor: "#0f1629",
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                Paket {r.planName?.toUpperCase()} · {r.months} bln
              </Text>
              <Text style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
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

// ─── Payout History ───────────────────────────────────────────

function PayoutHistory({ payouts }: { payouts: AffiliatePayout[] }) {
  if (!payouts?.length) return null;
  const statusColor: Record<string, string> = {
    paid: "#34d399", pending: "#fbbf24", rejected: "#f87171",
  };
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
        letterSpacing: 1, marginBottom: 8 }}>RIWAYAT PENCAIRAN</Text>
      <View style={{ backgroundColor: "#1e2433", borderRadius: 14, overflow: "hidden" }}>
        {payouts.slice(0, 5).map((p, i) => (
          <View key={p.id} style={{
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 16, paddingVertical: 13,
            borderBottomWidth: i < Math.min(payouts.length, 5) - 1 ? 1 : 0,
            borderBottomColor: "#0f1629",
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                {p.bankName} · {p.bankAccount}
              </Text>
              <Text style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                {new Date(p.createdAt).toLocaleDateString("id-ID",
                  { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                Rp {parseFloat(p.amount).toLocaleString("id-ID")}
              </Text>
              <View style={{ backgroundColor: (statusColor[p.status] ?? "#94a3b8") + "22",
                borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: statusColor[p.status] ?? "#94a3b8",
                  fontSize: 9, fontWeight: "700", textTransform: "uppercase" }}>
                  {p.status}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Payout Section ───────────────────────────────────────────

function PayoutSection({
  profile, payouts, onSuccess,
}: { profile: AffiliateProfile; payouts: AffiliatePayout[]; onSuccess: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount]     = useState("");
  const [bank, setBank]         = useState(profile.bankName ?? "");
  const [acct, setAcct]         = useState(profile.bankAccount ?? "");
  const [holder, setHolder]     = useState(profile.bankHolder ?? "");

  const pending = parseFloat(profile.totalEarned) - parseFloat(profile.totalPaid);

  const mutation = useMutation({
    mutationFn: requestPayout,
    onSuccess: () => {
      Alert.alert("✅ Berhasil", "Request payout sudah dikirim. Diproses dalam 1-3 hari kerja.");
      setShowForm(false);
      onSuccess();
    },
    onError: (e: Error) => Alert.alert("Gagal", e.message),
  });

  function handleSubmit() {
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amt || amt < 50000) {
      Alert.alert("Minimal Rp 50.000", "Masukkan jumlah pencairan minimal Rp 50.000.");
      return;
    }
    if (amt > pending) {
      Alert.alert("Saldo tidak cukup", `Saldo tersedia: Rp ${pending.toLocaleString("id-ID")}`);
      return;
    }
    if (!bank || !acct || !holder) {
      Alert.alert("Lengkapi data bank", "Nama bank, nomor rekening, dan nama pemegang wajib diisi.");
      return;
    }
    mutation.mutate({ amount: amt, bankName: bank, bankAccount: acct, bankHolder: holder });
  }

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
      {/* Saldo + request button */}
      <View style={{ backgroundColor: "#1e2433", borderRadius: 14, padding: 16, marginBottom: 10 }}>
        <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
          letterSpacing: 1, marginBottom: 8 }}>SALDO TERSEDIA</Text>
        <Text style={{ color: "#34d399", fontWeight: "900", fontSize: 26 }}>
          Rp {pending.toLocaleString("id-ID")}
        </Text>
        <Text style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
          Total earned: Rp {parseFloat(profile.totalEarned).toLocaleString("id-ID")} ·
          Dibayar: Rp {parseFloat(profile.totalPaid).toLocaleString("id-ID")}
        </Text>
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          disabled={pending < 50000}
          style={{
            backgroundColor: pending < 50000 ? "#1e293b" : "#0ea5e9",
            borderRadius: 10, paddingVertical: 12,
            alignItems: "center", marginTop: 14,
          }}>
          <Text style={{ color: pending < 50000 ? "#475569" : "#fff",
            fontWeight: "700", fontSize: 14 }}>
            {pending < 50000 ? "Minimal Rp 50.000" : "Request Pencairan"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payout form */}
      {showForm && (
        <View style={{ backgroundColor: "#1e2433", borderRadius: 14, padding: 16, marginBottom: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15, marginBottom: 16 }}>
            Form Pencairan
          </Text>

          {[
            { label: "Jumlah (Rp)", val: amount, set: setAmount, hint: "Contoh: 150000", numeric: true },
            { label: "Nama Bank", val: bank, set: setBank, hint: "BCA, BRI, Mandiri, dll" },
            { label: "Nomor Rekening", val: acct, set: setAcct, hint: "1234567890", numeric: true },
            { label: "Nama Pemegang", val: holder, set: setHolder, hint: "Sesuai nama rekening" },
          ].map(f => (
            <View key={f.label} style={{ marginBottom: 12 }}>
              <Text style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>{f.label}</Text>
              <TextInput
                placeholder={f.hint}
                placeholderTextColor="#475569"
                value={f.val}
                onChangeText={f.set}
                keyboardType={f.numeric ? "numeric" : "default"}
                style={{ backgroundColor: "#0f1629", borderRadius: 8,
                  color: "#fff", fontSize: 14, padding: 12 }}
              />
            </View>
          ))}

          <TouchableOpacity onPress={handleSubmit} disabled={mutation.isPending}
            style={{ backgroundColor: mutation.isPending ? "#1e293b" : "#34d399",
              borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 }}>
            {mutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#0f1629", fontWeight: "800", fontSize: 14 }}>
                  Kirim Request Pencairan
                </Text>}
          </TouchableOpacity>
        </View>
      )}

      <PayoutHistory payouts={payouts} />
    </View>
  );
}

// ─── Apply Screen ─────────────────────────────────────────────

function AfiliasiApplyScreen({ onApplied }: { onApplied: () => void }) {
  const [marketReach,   setMarketReach]   = useState("");
  const [preferredCode, setPreferredCode] = useState("");
  const [error,         setError]         = useState("");

  const mutation = useMutation({
    mutationFn: applyAffiliate,
    onSuccess: () => {
      Alert.alert("✅ Aplikasi Dikirim",
        "Kode referral kamu sudah disiapkan. Admin akan mereview dalam 1-2 hari kerja.");
      onApplied();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleApply() {
    if (!marketReach.trim()) {
      setError("Deskripsi pangsa pasar wajib diisi.");
      return;
    }
    setError("");
    mutation.mutate({
      marketReach: marketReach.trim(),
      preferredCode: preferredCode.trim() || undefined,
    });
  }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16 }}>
        {/* Info komisi */}
        <View style={{ backgroundColor: "#0a1a2e", borderRadius: 12,
          padding: 16, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: "#0ea5e9" }}>
          <Text style={{ color: "#60a5fa", fontWeight: "700", fontSize: 14, marginBottom: 8 }}>
            💰 Struktur Komisi
          </Text>
          <Text style={{ color: "#94a3b8", fontSize: 13, lineHeight: 22 }}>
            • Komisi: 20% dari setiap transaksi referral{"\n"}
            • Diskon untuk referral: 20%{"\n"}
            • Pencairan: request manual, diproses 1-3 hari kerja
          </Text>
        </View>

        {/* Form */}
        <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
          Ceritakan pangsa pasar kamu *
        </Text>
        <TextInput
          placeholder="Contoh: Trader aktif, 2.000 follower Instagram, komunitas WA 500 member..."
          placeholderTextColor="#475569"
          value={marketReach}
          onChangeText={setMarketReach}
          multiline
          numberOfLines={4}
          style={{ backgroundColor: "#1e2433", borderRadius: 10,
            color: "#fff", fontSize: 13, padding: 14,
            textAlignVertical: "top", marginBottom: 16, minHeight: 100 }}
        />

        <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
          Kode referral pilihan (opsional)
        </Text>
        <TextInput
          placeholder="Contoh: BUDI2024"
          placeholderTextColor="#475569"
          value={preferredCode}
          onChangeText={t => setPreferredCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          style={{ backgroundColor: "#1e2433", borderRadius: 10,
            color: "#fff", fontSize: 15, padding: 14, letterSpacing: 2, marginBottom: 6 }}
          autoCapitalize="characters"
          maxLength={20}
        />
        <Text style={{ color: "#475569", fontSize: 11, marginBottom: 20 }}>
          Huruf kapital dan angka saja. Kalau kosong, dibuat otomatis.
        </Text>

        {error ? (
          <Text style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>⚠ {error}</Text>
        ) : null}

        <TouchableOpacity onPress={handleApply} disabled={mutation.isPending}
          style={{ backgroundColor: mutation.isPending ? "#1e293b" : "#0ea5e9",
            borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 8 }}>
          {mutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                Kirim Aplikasi
              </Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function AffiliateScreen() {
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const topPad      = Platform.OS === "web" ? 24 : insets.top + 16;
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  // Check token presence on mount
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

  // If query throws UNAUTHORIZED, clear token
  React.useEffect(() => {
    if (isError && (error as Error)?.message === "UNAUTHORIZED") {
      clearAuthToken().then(() => setHasToken(false));
    }
  }, [isError, error]);

  // ── Header ──────────────────────────────────────────────────
  const Header = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: topPad, paddingBottom: 16,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>🎁 Program Afiliasi</Text>
        {data?.profile && (
          <Text style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            Ajak teman — dapat komisi {data.profile.commissionRate}%
          </Text>
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
            style={{ backgroundColor: "#1e2433", borderRadius: 8,
              paddingHorizontal: 8, paddingVertical: 6 }}>
            <Text style={{ color: "#64748b", fontSize: 11 }}>Token</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.back()}
          style={{ backgroundColor: "#1e2433", borderRadius: 20,
            width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#94a3b8", fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── No token ─────────────────────────────────────────────────
  if (hasToken === null) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f1629",
        alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#0ea5e9" />
      </View>
    );
  }

  if (!hasToken) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f1629" }}>
        <TokenInputScreen onSaved={() => setHasToken(true)} />
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f1629" }}>
        <Header />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={{ color: "#64748b", fontSize: 13 }}>Memuat data afiliasi...</Text>
        </View>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────
  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f1629" }}>
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

  // ── Belum daftar ──────────────────────────────────────────────
  if (!data?.hasProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f1629" }}>
        <Header />
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 20,
          paddingHorizontal: 16, marginBottom: 8 }}>Daftar Program Afiliasi</Text>
        <Text style={{ color: "#64748b", fontSize: 13, paddingHorizontal: 16,
          marginBottom: 20, lineHeight: 20 }}>
          Ajak teman berlangganan StockBot Pro dan dapatkan komisi 20% setiap transaksi.
          Referred user juga mendapat diskon 20%.
        </Text>
        <AfiliasiApplyScreen
          onApplied={() => queryClient.invalidateQueries({ queryKey: ["affiliate-me"] })}
        />
      </View>
    );
  }

  const { profile, quality, referrals, payouts, totalReferrals } = data;

  // ── Dashboard ─────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#0f1629" }}>
      <Header />
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* Pending banner */}
        {profile!.status === "pending" && (
          <View style={{ marginHorizontal: 16, backgroundColor: "#1c1a08",
            borderRadius: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: "#eab308",
            marginBottom: 16 }}>
            <Text style={{ color: "#eab308", fontWeight: "700", fontSize: 14 }}>
              ⏳ Menunggu Persetujuan Admin
            </Text>
            <Text style={{ color: "#ca8a04", fontSize: 12, marginTop: 4, lineHeight: 18 }}>
              Kode referral kamu sudah disiapkan. Kami akan review dan mengaktifkan dalam 1-2 hari kerja.
            </Text>
          </View>
        )}

        <ReferralCodeCard code={profile!.code} discountPct={profile!.discountPct} />
        <StatsRow quality={quality!} profile={profile!} totalReferrals={totalReferrals!} />
        <EarningsCard quality={quality!} />
        <ReferralHistory referrals={referrals!} />

        {profile!.status === "active" && (
          <PayoutSection
            profile={profile!}
            payouts={payouts!}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["affiliate-me"] })}
          />
        )}
      </ScrollView>
    </View>
  );
}
