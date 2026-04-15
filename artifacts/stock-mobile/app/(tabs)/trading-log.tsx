import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────

const TOKEN_KEY = "sbp_auth_token";
const BASE_URL  = "https://stockbotpro.replit.app/api";

const C = {
  bg:        "#060e1f",
  card:      "#0b1628",
  summaryBg: "#0f1729",
  border:    "#1e293b",
  text:      "#f1f5f9",
  muted:     "#64748b",
  mutedDark: "#475569",
  cyan:      "#00d4ff",
  cyanBg:    "rgba(0,180,255,0.15)",
  cyanBdr:   "#00b4d8",
  green:     "#22c55e",
  red:       "#ef4444",
  amber:     "#f59e0b",
};

// ─── Types ────────────────────────────────────────────────────

type SignalFilter = "SEMUA" | "BOS" | "BOW";

interface Stats {
  total:       number;
  wins:        number;
  losses:      number;
  winRate:     number;
  avgPnl:      number;
  totalPnl:    number;
  avgHoldDays: number;
}

interface MonthlyItem {
  month:   string;
  label:   string;
  pnl:     number;
  winRate: number;
  total:   number;
  wins:    number;
}

interface ClosedTrade {
  symbol:     string;
  date:       string;
  signalType: "BOS" | "BOW";
  glPct:      number;
  holdDays:   number;
  entry:      number;
  exitPrice:  number;
  exitReason: string;
  trend:      string;
  win:        boolean;
}

interface OpenTrade {
  symbol:     string;
  date:       string;
  signalType: "BOS" | "BOW";
  signal:     string;
  glPct:      number;
  holdDays:   number;
  entry:      number;
  close:      number;
  stopLoss:   number;
  tp1:        number;
  tp2:        number;
  hold:       string;
  slPhase:    string;
  trend:      string;
}

interface JejakData {
  stats: { combined: Stats; bos: Stats; bow: Stats };
  monthly: MonthlyItem[];
  closed:  ClosedTrade[];
  meta:    { bosUploadedAt: string | null; bowUploadedAt: string | null };
}

// ─── SignalBadge ──────────────────────────────────────────────

function SignalBadge({ type }: { type: "BOW" | "BOS" }) {
  const isBow = type === "BOW";
  return (
    <View style={{
      backgroundColor: isBow ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
    }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: isBow ? C.green : "#3b82f6" }}>
        {type}
      </Text>
    </View>
  );
}

// ─── ScreenHeader ─────────────────────────────────────────────

function ScreenHeader({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>🏆 Jejak Cuan</Text>
        <Text style={styles.headerSub}>Rekam jejak sinyal BOW & BOS</Text>
      </View>
      <Pressable style={styles.refreshBtn} onPress={onRefresh} disabled={loading}>
        <Text style={[styles.refreshIcon, loading && { opacity: 0.3 }]}>🔄</Text>
      </Pressable>
    </View>
  );
}

// ─── FilterTabs ───────────────────────────────────────────────

const TABS: SignalFilter[] = ["SEMUA", "BOS", "BOW"];

function FilterTabs({ active, onChange }: { active: SignalFilter; onChange: (t: SignalFilter) => void }) {
  return (
    <View style={styles.tabRow}>
      {TABS.map(tab => (
        <Pressable
          key={tab}
          style={[styles.tab, active === tab && styles.tabActive]}
          onPress={() => onChange(tab)}
        >
          <Text style={[styles.tabText, active === tab && styles.tabTextActive]}>{tab}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── StatsBar ─────────────────────────────────────────────────

function StatBox({ label, value, color = "#e2e8f0" }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatsBar({ stats }: { stats: Stats | null }) {
  const pnl = stats?.avgPnl ?? 0;
  const wr  = stats?.winRate ?? 0;
  return (
    <View style={styles.summaryBar}>
      <StatBox label="Win Rate"     value={`${wr.toFixed(1)}%`}  color={wr  >= 50 ? C.green : C.red} />
      <View style={styles.dividerV} />
      <StatBox label="Total Closed" value={String(stats?.total ?? 0)} />
      <View style={styles.dividerV} />
      <StatBox label="Avg P&L"      value={`${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%`} color={pnl >= 0 ? C.green : C.red} />
      <View style={styles.dividerV} />
      <StatBox label="Avg Hold"     value={stats?.avgHoldDays ? `${stats.avgHoldDays}h` : "—"} />
    </View>
  );
}

// ─── MonthlyMini chart ────────────────────────────────────────

function MonthlyMini({ monthly }: { monthly: MonthlyItem[] }) {
  if (monthly.length === 0) return null;
  const recent = monthly.slice(-6);
  const maxAbs = Math.max(...recent.map(m => Math.abs(m.pnl)), 1);
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>📊 Performa Bulanan</Text>
      {recent.map(m => (
        <View key={m.month} style={styles.monthRow}>
          <Text style={styles.monthLabel}>{m.label}</Text>
          <View style={styles.monthBarWrap}>
            <View style={[
              styles.monthBar,
              {
                width:           `${Math.min((Math.abs(m.pnl) / maxAbs) * 100, 100)}%` as any,
                backgroundColor: m.pnl >= 0 ? C.green : C.red,
              },
            ]} />
          </View>
          <Text style={[styles.monthPnl, { color: m.pnl >= 0 ? C.green : C.red }]}>
            {m.pnl >= 0 ? "+" : ""}{m.pnl.toFixed(1)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── OpenRow ──────────────────────────────────────────────────

function OpenRow({ trade }: { trade: OpenTrade }) {
  const gl         = trade.glPct;
  const isPhaseHit = (trade.slPhase ?? "").toUpperCase().includes("TGT");
  return (
    <View style={styles.tradeRow}>
      <View style={[styles.rowIcon, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
        <Text style={{ fontSize: 13 }}>⚡</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={styles.symbol}>{trade.symbol}</Text>
          <SignalBadge type={trade.signalType} />
          {isPhaseHit && (
            <View style={styles.phaseHitBadge}>
              <Text style={styles.phaseHitText}>🎯 Target Hit</Text>
            </View>
          )}
        </View>
        <Text style={styles.tradeSubText}>
          Entry {trade.entry.toLocaleString("id-ID")} · {trade.hold || `${trade.holdDays} hari`}
        </Text>
      </View>
      <Text style={[styles.pnlText, { color: gl > 0 ? C.green : gl < 0 ? C.red : "#94a3b8" }]}>
        {gl > 0 ? "+" : ""}{gl.toFixed(1)}%
      </Text>
    </View>
  );
}

// ─── ClosedRow ────────────────────────────────────────────────

function ClosedRow({ trade }: { trade: ClosedTrade }) {
  const gl = trade.glPct;
  return (
    <View style={styles.tradeRow}>
      <View style={[
        styles.rowIcon,
        { backgroundColor: trade.win ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" },
      ]}>
        <Text style={{
          fontSize: 13,
          color:    trade.win ? C.green : C.red,
          fontWeight: "800",
        }}>
          {trade.win ? "✓" : "✗"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.symbol}>{trade.symbol}</Text>
          <SignalBadge type={trade.signalType} />
        </View>
        <Text style={styles.tradeSubText}>
          {trade.date}
          {trade.holdDays > 0 ? ` · ${trade.holdDays} hari` : ""}
          {trade.exitReason ? ` · ${trade.exitReason}` : ""}
        </Text>
      </View>
      <Text style={[styles.pnlText, { color: gl > 0 ? C.green : gl < 0 ? C.red : "#94a3b8" }]}>
        {gl > 0 ? "+" : ""}{gl.toFixed(1)}%
      </Text>
    </View>
  );
}

// ─── OpenSection ──────────────────────────────────────────────

function OpenSection({
  open, loading, token, onGoLogin,
}: {
  open: OpenTrade[]; loading: boolean; token: string | null; onGoLogin: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>⚡</Text>
        <Text style={styles.sectionTitle}>Posisi Sedang Berjalan</Text>
        {token && <Text style={styles.sectionCount}>{open.length} posisi</Text>}
      </View>

      {!token ? (
        <View style={styles.authGate}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.authTitle}>Login untuk melihat posisi terbuka</Text>
          <Text style={styles.authDesc}>
            Data posisi aktif hanya tersedia untuk member yang sudah register
          </Text>
          <Pressable style={styles.loginBtn} onPress={onGoLogin}>
            <Text style={styles.loginBtnText}>Login / Daftar →</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator color={C.cyan} style={{ marginVertical: 20 }} />
      ) : open.length === 0 ? (
        <Text style={styles.emptyText}>Tidak ada posisi terbuka saat ini</Text>
      ) : (
        open.map((t, i) => <OpenRow key={i} trade={t} />)
      )}
    </View>
  );
}

// ─── HoldSnapshotSection ──────────────────────────────────────

function HoldCard({ trade }: { trade: OpenTrade }) {
  const gl = trade.glPct;
  const glStr = `${gl > 0 ? "+" : ""}${gl.toFixed(1)}%`;
  const glCol = gl > 0 ? C.green : gl < 0 ? C.red : "#94a3b8";
  return (
    <View style={{
      flexDirection:    "row",
      alignItems:       "center",
      gap:              10,
      paddingVertical:  10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#0f1729",
    }}>
      <View style={[styles.rowIcon, { backgroundColor: "rgba(0,180,255,0.1)" }]}>
        <Text style={{ fontSize: 12 }}>📌</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.symbol}>{trade.symbol}</Text>
          <SignalBadge type={trade.signalType} />
        </View>
        <Text style={styles.tradeSubText}>
          Entry {trade.entry.toLocaleString("id-ID")} · {trade.hold || `${trade.holdDays}h`}
        </Text>
      </View>
      <Text style={[styles.pnlText, { color: glCol }]}>{glStr}</Text>
    </View>
  );
}

function HoldSnapshotSection({
  open, token, onGoLogin,
}: {
  open: OpenTrade[]; token: string | null; onGoLogin: () => void;
}) {
  const bow2 = open.filter(t => t.signalType === "BOW").slice(0, 2);
  const bos2 = open.filter(t => t.signalType === "BOS").slice(0, 2);
  const hasData = bow2.length > 0 || bos2.length > 0;

  return (
    <View style={[styles.section, { marginBottom: 12 }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>📌</Text>
        <Text style={styles.sectionTitle}>Posisi Hold Aktif</Text>
        {token && hasData && (
          <Text style={styles.sectionCount}>{bow2.length + bos2.length} posisi</Text>
        )}
      </View>

      {!token ? (
        <View style={styles.authGate}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.authTitle}>Login untuk melihat posisi hold</Text>
          <Pressable style={styles.loginBtn} onPress={onGoLogin}>
            <Text style={styles.loginBtnText}>Login / Daftar →</Text>
          </Pressable>
        </View>
      ) : !hasData ? (
        <Text style={styles.emptyText}>Tidak ada posisi hold saat ini</Text>
      ) : (
        <>
          {bow2.length > 0 && (
            <View>
              <View style={{
                paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4,
                backgroundColor: "rgba(34,197,94,0.06)",
              }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: C.green, letterSpacing: 0.8 }}>
                  BOW · Buy on Weakness
                </Text>
              </View>
              {bow2.map((t, i) => <HoldCard key={i} trade={t} />)}
            </View>
          )}
          {bos2.length > 0 && (
            <View>
              <View style={{
                paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4,
                backgroundColor: "rgba(59,130,246,0.06)",
              }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#3b82f6", letterSpacing: 0.8 }}>
                  BOS · Buy on Strength
                </Text>
              </View>
              {bos2.map((t, i) => <HoldCard key={i} trade={t} />)}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ─── FooterNote ───────────────────────────────────────────────

function FooterNote({ meta }: { meta: JejakData["meta"] | null }) {
  const bosDate = meta?.bosUploadedAt
    ? new Date(meta.bosUploadedAt).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;
  return (
    <View style={styles.footer}>
      <Text style={styles.footerTitle}>📌 Tentang Jejak Cuan</Text>
      <Text style={styles.footerText}>
        Data diambil otomatis dari sinyal BOS & BOW yang diupload admin setiap hari.
        Semua trade adalah sinyal nyata berdasarkan analisis teknikal — bukan backtest.
      </Text>
      <Text style={styles.footerText}>
        Win = posisi ditutup dengan G/L {">"} 0%. Performa tidak menjamin hasil di masa depan.
      </Text>
      {bosDate && <Text style={styles.footerSub}>BOS update: {bosDate}</Text>}
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyGlobal}>
      <Text style={styles.emptyGlobalIcon}>📊</Text>
      <Text style={styles.emptyGlobalTitle}>Data belum tersedia</Text>
      <Text style={styles.emptyGlobalDesc}>
        Admin belum mengupload sinyal yang memiliki posisi closed.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function JejakCuanScreen() {
  const router = useRouter();

  const [token,       setToken]       = useState<string | null>(null);
  const [data,        setData]        = useState<JejakData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [openData,    setOpenData]    = useState<OpenTrade[]>([]);
  const [openLoading, setOpenLoading] = useState(false);
  const [filter,      setFilter]      = useState<SignalFilter>("SEMUA");

  const stats: Stats | null = useMemo(() => {
    if (!data) return null;
    if (filter === "BOS") return data.stats.bos;
    if (filter === "BOW") return data.stats.bow;
    return data.stats.combined;
  }, [data, filter]);

  const filteredClosed = useMemo(() =>
    (data?.closed ?? []).filter(t => filter === "SEMUA" || t.signalType === filter),
    [data, filter]);

  const filteredOpen = useMemo(() =>
    openData.filter(t => filter === "SEMUA" || t.signalType === filter),
    [openData, filter]);

  const fetchPublic = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${BASE_URL}/jejak-cuan`);
      const json = await res.json();
      if (json.ok) setData(json);
      else throw new Error(json.error ?? "Gagal memuat data");
    } catch (e: any) {
      setError(e.message ?? "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOpen = useCallback(async (t: string) => {
    setOpenLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/jejak-cuan/open`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) { setOpenData([]); return; }
      const json = await res.json();
      if (json.ok) setOpenData(json.open ?? []);
    } catch {
      setOpenData([]);
    } finally {
      setOpenLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublic();
    AsyncStorage.getItem(TOKEN_KEY).then(t => {
      setToken(t);
      if (t) fetchOpen(t);
    });
  }, []);

  const handleRefresh = () => {
    fetchPublic();
    if (token) fetchOpen(token);
  };

  // ── Loading state ──
  if (loading && !data) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator color={C.cyan} size="large" />
        <Text style={styles.loadingText}>Memuat data...</Text>
      </View>
    );
  }

  // ── Error state ──
  if (error && !data) {
    return (
      <View style={styles.fullCenter}>
        <Text style={{ fontSize: 28, marginBottom: 12 }}>⚠️</Text>
        <Text style={styles.errorTitle}>Gagal memuat data</Text>
        <Text style={styles.errorDesc}>{error}</Text>
        <Pressable style={styles.loginBtn} onPress={handleRefresh}>
          <Text style={styles.loginBtnText}>Coba Lagi</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={C.cyan}
          />
        }
      >
        {/* Header */}
        <ScreenHeader onRefresh={handleRefresh} loading={loading} />

        {/* Filter tabs */}
        <FilterTabs active={filter} onChange={setFilter} />

        {/* Stats bar */}
        <StatsBar stats={stats} />

        {/* Monthly chart */}
        <MonthlyMini monthly={data?.monthly ?? []} />

        {/* Open positions (auth-gated) */}
        <OpenSection
          open={filteredOpen}
          loading={openLoading}
          token={token}
          onGoLogin={() => router.push("/login" as any)}
        />

        {/* Closed positions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>✓</Text>
            <Text style={styles.sectionTitle}>Riwayat Posisi Closed</Text>
            <Text style={styles.sectionCount}>{filteredClosed.length} trade</Text>
          </View>
          {filteredClosed.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada trade yang closed</Text>
          ) : (
            filteredClosed.map((t, i) => <ClosedRow key={i} trade={t} />)
          )}
        </View>

        {/* Hold snapshot: 2 BOW + 2 BOS */}
        <HoldSnapshotSection
          open={openData}
          token={token}
          onGoLogin={() => router.push("/login" as any)}
        />

        {/* Global empty state */}
        {!loading && data && data.closed.length === 0 && openData.length === 0 && (
          <EmptyState />
        )}

        {/* Footer */}
        <FooterNote meta={data?.meta ?? null} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection:    "row",
    alignItems:       "center",
    justifyContent:   "space-between",
    paddingHorizontal: 16,
    paddingTop:        16,
    paddingBottom:     8,
  },
  headerTitle: {
    fontSize:      22,
    fontWeight:    "800",
    color:         "#f1f5f9",
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize:  12,
    color:     "#475569",
    marginTop: 2,
  },
  refreshBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: "#0f1729",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "#1e293b",
  },
  refreshIcon: { fontSize: 16 },

  // Filter tabs
  tabRow: {
    flexDirection:    "row",
    gap:              8,
    paddingHorizontal: 16,
    marginBottom:     12,
  },
  tab: {
    flex:            1,
    paddingVertical: 8,
    borderRadius:    20,
    alignItems:      "center",
    backgroundColor: "#0f1729",
    borderWidth:     1,
    borderColor:     "#1e293b",
  },
  tabActive: {
    backgroundColor: "rgba(0,180,255,0.15)",
    borderColor:     "#00b4d8",
  },
  tabText:       { fontSize: 12, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: "#00d4ff" },

  // Stats bar
  summaryBar: {
    flexDirection:    "row",
    backgroundColor:  "#0f1729",
    borderRadius:     12,
    marginHorizontal: 16,
    marginBottom:     12,
    padding:          12,
    gap:              4,
    borderWidth:      1,
    borderColor:      "rgba(0,180,255,0.1)",
  },
  statBox:   { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 15, fontWeight: "700", color: "#e2e8f0" },
  statLabel: { fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 },
  dividerV:  { width: 1, backgroundColor: "#1e293b" },

  // Monthly chart
  chartCard: {
    backgroundColor:  "#0b1628",
    borderRadius:     14,
    marginHorizontal: 16,
    marginBottom:     12,
    padding:          14,
    borderWidth:      1,
    borderColor:      "#1e293b",
  },
  chartTitle:    { fontSize: 13, fontWeight: "700", color: "#94a3b8", marginBottom: 10 },
  monthRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  monthLabel:    { width: 52, fontSize: 11, color: "#64748b" },
  monthBarWrap:  { flex: 1, height: 6, backgroundColor: "#1e293b", borderRadius: 3, overflow: "hidden" },
  monthBar:      { height: 6, borderRadius: 3 },
  monthPnl:      { width: 52, fontSize: 11, fontWeight: "700", textAlign: "right" },

  // Section
  section: {
    backgroundColor:  "#0b1628",
    borderRadius:     14,
    marginHorizontal: 16,
    marginBottom:     12,
    borderWidth:      1,
    borderColor:      "#1e293b",
    overflow:         "hidden",
  },
  sectionHeader: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             8,
    padding:         12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  sectionIcon:  { fontSize: 14 },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: "#e2e8f0" },
  sectionCount: { fontSize: 11, color: "#475569" },

  // Trade rows
  tradeRow: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              10,
    paddingVertical:   10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0f1729",
  },
  rowIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  symbol:        { fontSize: 14, fontWeight: "800", color: "#f1f5f9", letterSpacing: 0.3 },
  tradeSubText:  { fontSize: 11, color: "#475569", marginTop: 1 },
  pnlText:       { fontSize: 14, fontWeight: "800", textAlign: "right", minWidth: 52 },
  phaseHitBadge: { backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  phaseHitText:  { fontSize: 10, color: "#22c55e", fontWeight: "700" },

  // Auth gate
  authGate:  { alignItems: "center", padding: 24, gap: 8 },
  lockIcon:  { fontSize: 28, marginBottom: 4 },
  authTitle: { fontSize: 14, fontWeight: "700", color: "#e2e8f0", textAlign: "center" },
  authDesc:  { fontSize: 12, color: "#475569", textAlign: "center" },
  loginBtn: {
    marginTop:         8,
    backgroundColor:   "rgba(0,180,255,0.2)",
    borderWidth:       1,
    borderColor:       "#00b4d8",
    borderRadius:      10,
    paddingHorizontal: 20,
    paddingVertical:   10,
  },
  loginBtnText: { color: "#00d4ff", fontWeight: "700", fontSize: 13 },

  // Empty / footer
  emptyText:       { textAlign: "center", color: "#475569", fontSize: 13, paddingVertical: 16 },
  emptyGlobal:     { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyGlobalIcon: { fontSize: 36, opacity: 0.4 },
  emptyGlobalTitle:{ fontSize: 15, fontWeight: "700", color: "#64748b" },
  emptyGlobalDesc: { fontSize: 12, color: "#475569", textAlign: "center", paddingHorizontal: 32 },

  footer: {
    marginHorizontal: 16,
    marginBottom:     32,
    backgroundColor:  "#0a1220",
    borderRadius:     12,
    padding:          14,
    gap:              6,
  },
  footerTitle: { fontSize: 12, fontWeight: "700", color: "#94a3b8", marginBottom: 4 },
  footerText:  { fontSize: 11, color: "#475569", lineHeight: 16 },
  footerSub:   { fontSize: 10, color: "#334155", marginTop: 4 },

  // Loading / error
  fullCenter: {
    flex: 1, backgroundColor: "#060e1f",
    justifyContent: "center", alignItems: "center", padding: 32, gap: 8,
  },
  loadingText: { color: "#475569", marginTop: 12, fontSize: 13 },
  errorTitle:  { color: "#ef4444", fontSize: 14, fontWeight: "700", marginBottom: 4, textAlign: "center" },
  errorDesc:   { color: "#475569", fontSize: 12, textAlign: "center", marginBottom: 12 },
});
