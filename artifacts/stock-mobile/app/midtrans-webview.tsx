import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Snap URL helper ──────────────────────────────────────────

function snapUrl(token: string, isProd: boolean): string {
  const base = isProd
    ? "https://app.midtrans.com/snap/v4/redirection"
    : "https://app.sandbox.midtrans.com/snap/v4/redirection";
  return `${base}/${token}`;
}

// ─── Midtrans WebView ─────────────────────────────────────────

export default function MidtransWebViewScreen() {
  const router       = useRouter();
  const qc           = useQueryClient();
  const params       = useLocalSearchParams<{
    snapToken: string;
    orderId: string;
    amount: string;
    packagePlan: string;
    months: string;
    isProduction: string;
  }>();

  const { snapToken, orderId, amount, packagePlan, months, isProduction } = params;
  const isProd  = isProduction === "1";
  const SNAP    = snapUrl(snapToken ?? "", isProd);
  const handled = useRef(false);

  const [loading, setLoading] = useState(true);

  function handlePaymentFinish(result: "success" | "pending" | "cancel") {
    if (handled.current) return;
    handled.current = true;
    qc.invalidateQueries({ queryKey: ["me"] });
    if (result === "success") {
      router.replace({
        pathname: "/payment-success",
        params: { orderId, amount, packagePlan, months },
      } as any);
    } else if (result === "pending") {
      router.replace({
        pathname: "/payment-pending",
        params: { orderId },
      } as any);
    } else {
      router.back();
    }
  }

  // ── Web fallback (iframe can't intercept redirects) ───────────
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f1629" }}>
        <WebHeader
          amount={parseInt(amount ?? "0", 10)}
          onClose={() => {
            Alert.alert("Batalkan Pembayaran?", "Transaksi akan dibatalkan.", [
              { text: "Lanjut Bayar", style: "cancel" },
              { text: "Batalkan", style: "destructive", onPress: () => router.back() },
            ]);
          }}
        />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center",
          padding: 32, gap: 16 }}>
          <Text style={{ fontSize: 40 }}>💳</Text>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16,
            textAlign: "center" }}>
            Lanjutkan di Browser
          </Text>
          <Text style={{ color: "#64748b", fontSize: 13, textAlign: "center",
            lineHeight: 20 }}>
            Halaman pembayaran Midtrans hanya tersedia di aplikasi mobile.
            Gunakan Expo Go atau build APK untuk membayar.
          </Text>
          <TouchableOpacity
            onPress={() => handlePaymentFinish("success")}
            style={{ backgroundColor: "#34d399", borderRadius: 10,
              paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: "#0f1629", fontWeight: "700" }}>
              Simulasi Sukses (Dev)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: "#64748b", fontSize: 13 }}>Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Native: use react-native-webview ─────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WebView } = require("react-native-webview");

  return (
    <View style={{ flex: 1, backgroundColor: "#0f1629" }}>
      <WebHeader
        amount={parseInt(amount ?? "0", 10)}
        onClose={() => {
          Alert.alert("Batalkan Pembayaran?", "Transaksi akan dibatalkan.", [
            { text: "Lanjut Bayar", style: "cancel" },
            { text: "Batalkan", style: "destructive", onPress: () => handlePaymentFinish("cancel") },
          ]);
        }}
      />

      <WebView
        source={{ uri: SNAP }}
        onNavigationStateChange={(navState: { url?: string }) => {
          const url = navState.url ?? "";
          if (url.includes("payment-confirm") || url.includes("finish")) {
            handlePaymentFinish("success");
          } else if (url.includes("unfinish")) {
            handlePaymentFinish("pending");
          } else if (url.includes("/error") || url.includes("cancel")) {
            handlePaymentFinish("cancel");
          }
        }}
        startInLoadingState
        onLoad={() => setLoading(false)}
        renderLoading={() => (
          <View style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            alignItems: "center", justifyContent: "center",
            backgroundColor: "#0f1629",
          }}>
            <ActivityIndicator color="#0ea5e9" size="large" />
            <Text style={{ color: "#64748b", marginTop: 12 }}>
              Memuat halaman pembayaran...
            </Text>
          </View>
        )}
        style={{ flex: 1 }}
      />
    </View>
  );
}

// ─── Shared header component ──────────────────────────────────

function WebHeader({ amount, onClose }: { amount: number; onClose: () => void }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
      backgroundColor: "#1e2433",
    }}>
      <TouchableOpacity onPress={onClose} style={{ marginRight: 16 }}>
        <Text style={{ color: "#0ea5e9", fontSize: 16 }}>✕ Batal</Text>
      </TouchableOpacity>
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, flex: 1 }}>
        Pembayaran
      </Text>
      <Text style={{ color: "#64748b", fontSize: 12 }}>
        Rp {amount.toLocaleString("id-ID")}
      </Text>
    </View>
  );
}
