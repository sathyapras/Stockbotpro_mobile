import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getAuthToken } from "@/services/affiliateService";
import {
  Plan,
  createSnapTransaction,
  fetchPlans,
  fetchPrice,
} from "@/services/subscribeService";

// ─── Constants ────────────────────────────────────────────────

const DURATIONS = [
  { months: 1,  label: "1 Bulan",  badge: null },
  { months: 3,  label: "3 Bulan",  badge: "Hemat 5%" },
  { months: 6,  label: "6 Bulan",  badge: "Hemat 10%" },
  { months: 12, label: "12 Bulan", badge: "Hemat 15%" },
] as const;

// ─── Subscribe Screen ─────────────────────────────────────────

export default function SubscribeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const topPad  = Platform.OS === "web" ? 24 : insets.top + 16;

  const [selectedPlan,    setSelectedPlan]    = useState("pro");
  const [selectedMonths,  setSelectedMonths]  = useState<1 | 3 | 6 | 12>(1);
  const [calcPrice,       setCalcPrice]       = useState<number | null>(null);
  const [loadingPrice,    setLoadingPrice]    = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error,           setError]           = useState("");

  // Load plans
  const { data: plans = [], isLoading: loadingPlans } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: fetchPlans,
    staleTime: 60 * 60 * 1000,
  });

  // Auto-select first plan once loaded
  useEffect(() => {
    if (plans.length > 0 && !plans.find(p => p.planName === selectedPlan)) {
      setSelectedPlan(plans[0].planName);
    }
  }, [plans]);

  // Recalculate price whenever plan/duration changes
  useEffect(() => {
    if (!selectedPlan) return;
    let cancelled = false;
    setLoadingPrice(true);
    fetchPrice(selectedPlan, selectedMonths)
      .then(amount => { if (!cancelled) setCalcPrice(amount); })
      .catch(() => { if (!cancelled) setCalcPrice(null); })
      .finally(() => { if (!cancelled) setLoadingPrice(false); });
    return () => { cancelled = true; };
  }, [selectedPlan, selectedMonths]);

  async function handleCheckout() {
    const token = await getAuthToken();
    if (!token) {
      Alert.alert(
        "Login Diperlukan",
        "Kamu perlu memasukkan API token akun StockBot Pro sebelum berlangganan. Buka menu → Program Afiliasi untuk input token.",
        [{ text: "OK" }]
      );
      return;
    }
    setLoadingCheckout(true);
    setError("");
    try {
      const snap = await createSnapTransaction(selectedPlan, selectedMonths);
      router.push({
        pathname: "/midtrans-webview",
        params: {
          snapToken:   snap.snapToken,
          orderId:     snap.orderId,
          amount:      String(snap.amount),
          packagePlan: selectedPlan,
          months:      String(selectedMonths),
          isProduction: snap.isProduction ? "1" : "0",
        },
      } as any);
    } catch (e: any) {
      setError(e?.message ?? "Gagal membuat transaksi. Coba lagi.");
    } finally {
      setLoadingCheckout(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0f1629" }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20, paddingTop: topPad, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}>
        <View>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>👑 Subscribe</Text>
          <Text style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
            Pilih paket dan durasi berlangganan
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}
          style={{ backgroundColor: "#1e2433", borderRadius: 20,
            width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#94a3b8", fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* ── Pilih Paket ── */}
        <Text style={{ color: "#475569", fontSize: 11, fontWeight: "700",
          paddingHorizontal: 20, marginBottom: 8, letterSpacing: 1 }}>PAKET</Text>

        {loadingPlans ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ActivityIndicator color="#0ea5e9" />
          </View>
        ) : (
          <View style={{ marginHorizontal: 16, gap: 10, marginBottom: 24 }}>
            {plans.map(plan => {
              const active = selectedPlan === plan.planName;
              return (
                <TouchableOpacity key={plan.planName}
                  onPress={() => setSelectedPlan(plan.planName)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: active ? "#0c2d48" : "#1e2433",
                    borderRadius: 14, padding: 16,
                    borderWidth: 2, borderColor: active ? "#0ea5e9" : "transparent",
                  }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between",
                    alignItems: "center", paddingRight: active ? 28 : 0 }}>
                    <Text style={{ color: "#fff", fontWeight: "700",
                      fontSize: 16, textTransform: "capitalize" }}>
                      {plan.planName}
                    </Text>
                    <Text style={{ color: "#0ea5e9", fontWeight: "700", fontSize: 14 }}>
                      Rp {plan.monthlyPrice.toLocaleString("id-ID")}/bln
                    </Text>
                  </View>
                  {plan.description ? (
                    <Text style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      {plan.description}
                    </Text>
                  ) : null}
                  {active && (
                    <View style={{ position: "absolute", top: 14, right: 14 }}>
                      <Text style={{ color: "#0ea5e9", fontSize: 18 }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Pilih Durasi ── */}
        <Text style={{ color: "#475569", fontSize: 11, fontWeight: "700",
          paddingHorizontal: 20, marginBottom: 8, letterSpacing: 1 }}>DURASI</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 24 }}>
          {DURATIONS.map(d => {
            const active = selectedMonths === d.months;
            return (
              <TouchableOpacity key={d.months}
                onPress={() => setSelectedMonths(d.months)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: active ? "#0c2d48" : "#1e2433",
                  borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
                  borderWidth: 2, borderColor: active ? "#0ea5e9" : "transparent",
                  alignItems: "center", minWidth: 90,
                }}>
                <Text style={{ color: active ? "#0ea5e9" : "#fff",
                  fontWeight: "700", fontSize: 14 }}>
                  {d.label}
                </Text>
                {d.badge && (
                  <Text style={{ color: "#34d399", fontSize: 10, marginTop: 2 }}>
                    {d.badge}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Total Harga ── */}
        <View style={{ marginHorizontal: 16, backgroundColor: "#1e2433",
          borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
            letterSpacing: 1 }}>TOTAL BAYAR</Text>
          {loadingPrice ? (
            <ActivityIndicator color="#0ea5e9" style={{ marginTop: 12, alignSelf: "flex-start" }} />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 28, marginTop: 6 }}>
              Rp {calcPrice?.toLocaleString("id-ID") ?? "—"}
            </Text>
          )}
          <Text style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
            Paket {selectedPlan} · {selectedMonths} bulan
          </Text>
        </View>

        {error ? (
          <Text style={{ color: "#f87171", fontSize: 12,
            marginHorizontal: 16, marginBottom: 12 }}>⚠ {error}</Text>
        ) : null}

        {/* ── CTA ── */}
        <TouchableOpacity
          onPress={handleCheckout}
          disabled={loadingCheckout || loadingPrice || !calcPrice}
          activeOpacity={0.85}
          style={{
            marginHorizontal: 16, marginBottom: 24,
            backgroundColor: (loadingCheckout || loadingPrice || !calcPrice)
              ? "#1e293b" : "#0ea5e9",
            borderRadius: 14, paddingVertical: 18, alignItems: "center",
          }}>
          {loadingCheckout
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Bayar Sekarang
              </Text>}
        </TouchableOpacity>

        {/* Feature highlights */}
        <FeatureHighlights selectedPlan={selectedPlan} />
      </ScrollView>
    </View>
  );
}

// ─── Feature highlights ───────────────────────────────────────

const FEATURES: Record<string, string[]> = {
  pro: [
    "✅ Akses semua fitur analisa",
    "✅ BOW / BOS Signal",
    "✅ Screener saham harian",
    "✅ Radar Market overview",
    "✅ Update real-time",
  ],
  elite: [
    "✅ Semua fitur Pro",
    "✅ Smart Money Flow",
    "✅ Analisa broker premium",
    "✅ Priority support",
    "✅ Master Stock Database",
  ],
  enterprise: [
    "✅ Semua fitur Elite",
    "✅ White Label",
    "✅ Akses API langsung",
    "✅ Dedicated support",
    "✅ Custom integration",
  ],
};

function FeatureHighlights({ selectedPlan }: { selectedPlan: string }) {
  const features = FEATURES[selectedPlan] ?? FEATURES["pro"];
  return (
    <View style={{ marginHorizontal: 16, backgroundColor: "#1e2433",
      borderRadius: 14, padding: 16, marginBottom: 8 }}>
      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
        letterSpacing: 1, marginBottom: 12, textTransform: "capitalize" }}>
        FITUR PAKET {selectedPlan.toUpperCase()}
      </Text>
      {features.map((f, i) => (
        <Text key={i} style={{ color: "#cbd5e1", fontSize: 13,
          lineHeight: 24 }}>{f}</Text>
      ))}
    </View>
  );
}
