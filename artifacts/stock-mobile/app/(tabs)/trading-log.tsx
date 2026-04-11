import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TradingLogEntry,
  TradingSummary,
  SignalType,
  addTrade,
  calcPnlPct,
  closeTrade,
  deleteTrade,
  getOrCreateDeviceId,
  getTrades,
  getTradingSummary,
  todayIso,
} from "@/services/tradingLogService";

// ─── Colors ──────────────────────────────────────────────────
const C = {
  bg:       "#060e1f",
  card:     "#0b1628",
  summaryBg:"#0f1729",
  border:   "#1e293b",
  text:     "#f1f5f9",
  muted:    "#64748b",
  cyan:     "#00d4ff",
  cyanBg:   "rgba(0,180,255,0.15)",
  cyanBdr:  "#00b4d8",
  green:    "#22c55e",
  red:      "#ef4444",
  amber:    "#f59e0b",
  blue:     "#3b82f6",
};

type FilterTab = "SEMUA" | "OPEN" | "CLOSED";
const FILTER_TABS: FilterTab[] = ["SEMUA", "OPEN", "CLOSED"];

// ─── Helpers ─────────────────────────────────────────────────

function formatPrice(val: string | number): string {
  const n = Number(val);
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(Math.round(n));
}

function pnlColor(pct: number) {
  return pct >= 0 ? C.green : C.red;
}

function holdDays(entryDate: string, exitDate: string | null): number {
  const ms = new Date(entryDate).getTime();
  const end = exitDate ? new Date(exitDate) : new Date();
  return Math.max(0, Math.round((end.getTime() - ms) / 86_400_000));
}

// ─── StatBox ──────────────────────────────────────────────────

function StatBox({ label, value, color = C.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color }}>{value}</Text>
      <Text style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

// ─── SummaryBar ───────────────────────────────────────────────

function SummaryBar({ summary }: { summary: TradingSummary | null }) {
  const pnl = summary?.totalPnl ?? 0;
  return (
    <View style={{
      flexDirection: "row",
      backgroundColor: C.summaryBg,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 12,
      gap: 4,
      borderWidth: 1,
      borderColor: "rgba(0,180,255,0.1)",
    }}>
      <StatBox label="Total Trade" value={String(summary?.totalTrades ?? 0)} />
      <View style={{ width: 1, backgroundColor: C.border }} />
      <StatBox label="Win Rate" value={`${summary?.winRate?.toFixed(1) ?? 0}%`}
        color={(summary?.winRate ?? 0) >= 50 ? C.green : C.red} />
      <View style={{ width: 1, backgroundColor: C.border }} />
      <StatBox
        label="Total P&L"
        value={`${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%`}
        color={pnlColor(pnl)}
      />
      <View style={{ width: 1, backgroundColor: C.border }} />
      <StatBox label="Open" value={String(summary?.openPositions ?? 0)} color={C.amber} />
    </View>
  );
}

// ─── FilterTabs ───────────────────────────────────────────────

function FilterTabs({ active, onChange }: { active: FilterTab; onChange: (t: FilterTab) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
      {FILTER_TABS.map(tab => (
        <Pressable
          key={tab}
          onPress={() => onChange(tab)}
          style={{
            flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
            backgroundColor: active === tab ? C.cyanBg : C.summaryBg,
            borderWidth: 1,
            borderColor: active === tab ? C.cyanBdr : C.border,
          }}>
          <Text style={{
            fontSize: 12, fontWeight: "600",
            color: active === tab ? C.cyan : C.muted,
          }}>
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── PriceItem ────────────────────────────────────────────────

function PriceItem({ label, value, color = "#94a3b8" }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color }}>{value}</Text>
      <Text style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

// ─── TradeCard ────────────────────────────────────────────────

function TradeCard({ trade, onClose, onDelete }: {
  trade: TradingLogEntry;
  onClose: (t: TradingLogEntry) => void;
  onDelete: (t: TradingLogEntry) => void;
}) {
  const entry = Number(trade.entryPrice);
  const exit  = trade.exitPrice ? Number(trade.exitPrice) : null;
  const pnlPct = exit != null ? calcPnlPct(entry, exit) : null;
  const isOpen = trade.status === "OPEN";
  const days   = holdDays(trade.entryDate, trade.exitDate);

  const leftBorderColor = isOpen ? "#60a5fa" : pnlPct != null && pnlPct >= 0 ? C.green : C.red;

  return (
    <View style={{
      backgroundColor: C.card, borderRadius: 14, padding: 14,
      marginHorizontal: 16, marginBottom: 10,
      borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 3, borderLeftColor: leftBorderColor,
      gap: 10,
    }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: C.text, letterSpacing: 0.5 }}>
            {trade.ticker}
          </Text>
          <View style={{
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
            backgroundColor: trade.signalType === "BOW"
              ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
          }}>
            <Text style={{
              fontSize: 11, fontWeight: "700",
              color: trade.signalType === "BOW" ? C.green : C.blue,
            }}>
              {trade.signalType}
            </Text>
          </View>
        </View>
        <View style={{
          paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6,
          backgroundColor: isOpen ? "rgba(245,158,11,0.15)" : "rgba(100,116,139,0.15)",
        }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: isOpen ? C.amber : C.muted }}>
            {isOpen ? "OPEN" : "CLOSED"}
          </Text>
        </View>
      </View>

      {/* Price grid */}
      <View style={{
        flexDirection: "row", justifyContent: "space-between",
        backgroundColor: "#060e1f", borderRadius: 8, padding: 10,
      }}>
        <PriceItem label="Entry" value={formatPrice(trade.entryPrice)} />
        <PriceItem label="SL"    value={formatPrice(trade.slPrice)}  color={C.red} />
        <PriceItem label="TP1"   value={formatPrice(trade.tp1Price)} color={C.green} />
        <PriceItem label="TP2"   value={formatPrice(trade.tp2Price)} color={C.green} />
        {exit != null && (
          <PriceItem
            label="Exit"
            value={formatPrice(exit)}
            color={pnlPct != null && pnlPct >= 0 ? C.green : C.red}
          />
        )}
      </View>

      {/* Footer */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center", flex: 1 }}>
          {pnlPct != null && (
            <Text style={{ fontSize: 16, fontWeight: "800", color: pnlColor(pnlPct) }}>
              {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
            </Text>
          )}
          <Text style={{ fontSize: 11, color: "#475569", flexShrink: 1 }}>
            📅 {trade.entryDate.slice(5).replace("-", "/")}
            {trade.exitDate ? ` → ${trade.exitDate.slice(5).replace("-", "/")}` : ""}
            {" · "}{days}h
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {isOpen && (
            <Pressable
              onPress={() => onClose(trade)}
              style={{
                backgroundColor: C.cyanBg, borderWidth: 1, borderColor: C.cyanBdr,
                borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
              }}>
              <Text style={{ color: C.cyan, fontSize: 12, fontWeight: "700" }}>Tutup</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => onDelete(trade)}
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
            }}>
            <Text style={{ fontSize: 14 }}>🗑</Text>
          </Pressable>
        </View>
      </View>

      {trade.notes ? (
        <Text style={{
          fontSize: 12, color: C.muted, fontStyle: "italic",
          paddingTop: 6, borderTopWidth: 1, borderTopColor: C.border,
        }}>
          📝 {trade.notes}
        </Text>
      ) : null}
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterTab }) {
  return (
    <View style={{ alignItems: "center", marginTop: 64, gap: 10, paddingHorizontal: 40 }}>
      <Text style={{ fontSize: 48 }}>📋</Text>
      <Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }}>
        {filter === "OPEN" ? "Tidak ada posisi open" :
         filter === "CLOSED" ? "Belum ada trade tertutup" :
         "Belum ada trade"}
      </Text>
      <Text style={{ color: C.muted, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
        {filter === "SEMUA"
          ? 'Tap "+ Tambah" untuk mencatat sinyal BOW atau BOS pertamamu.'
          : "Ganti filter untuk melihat trade lainnya."}
      </Text>
    </View>
  );
}

// ─── Field Input ──────────────────────────────────────────────

function Field({ label, value, onChangeText, keyboardType = "default", placeholder }: {
  label: string; value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "numeric";
  placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: C.muted, fontSize: 10, marginBottom: 4, fontWeight: "600", letterSpacing: 0.5 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        style={{
          backgroundColor: "#060e1f", borderWidth: 1, borderColor: C.border,
          borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
          color: C.text, fontSize: 14,
        }}
      />
    </View>
  );
}

// ─── Modal Tambah ─────────────────────────────────────────────

function ModalTambah({ visible, deviceId, onClose, onSuccess }: {
  visible: boolean; deviceId: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const [ticker,  setTicker]  = useState("");
  const [signal,  setSignal]  = useState<SignalType>("BOW");
  const [entry,   setEntry]   = useState("");
  const [sl,      setSl]      = useState("");
  const [tp1,     setTp1]     = useState("");
  const [tp2,     setTp2]     = useState("");
  const [date,    setDate]    = useState(todayIso());
  const [notes,   setNotes]   = useState("");
  const [saving,  setSaving]  = useState(false);

  const reset = () => {
    setTicker(""); setSignal("BOW"); setEntry(""); setSl("");
    setTp1(""); setTp2(""); setDate(todayIso()); setNotes("");
  };

  async function handleSave() {
    if (!ticker.trim() || !entry || !sl || !tp1 || !tp2 || !date) {
      Alert.alert("Lengkapi semua field wajib");
      return;
    }
    setSaving(true);
    try {
      await addTrade(deviceId, {
        ticker:      ticker.trim().toUpperCase(),
        signal_type: signal,
        entry_price: Number(entry),
        sl_price:    Number(sl),
        tp1_price:   Number(tp1),
        tp2_price:   Number(tp2),
        entry_date:  date,
        notes:       notes || undefined,
      });
      reset();
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert("Gagal menyimpan", e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          {/* Header */}
          <View style={{
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
          }}>
            <Text style={{ color: C.text, fontWeight: "800", fontSize: 18 }}>+ Tambah Trade</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Text style={{ color: C.muted, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Field label="TICKER *" value={ticker}
              onChangeText={t => setTicker(t.toUpperCase())} placeholder="misal: BBRI" />

            {/* Signal toggle */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: C.muted, fontSize: 10, marginBottom: 6, fontWeight: "600", letterSpacing: 0.5 }}>
                SIGNAL *
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["BOW", "BOS"] as SignalType[]).map(s => {
                  const active = signal === s;
                  const col = s === "BOW" ? C.green : C.blue;
                  return (
                    <TouchableOpacity key={s} onPress={() => setSignal(s)}
                      style={{
                        flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 8,
                        borderWidth: 1,
                        borderColor: active ? col : C.border,
                        backgroundColor: active ? col + "20" : "transparent",
                      }}>
                      <Text style={{ fontWeight: "800", fontSize: 14, color: active ? col : C.muted }}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Field label="ENTRY PRICE *" value={entry} onChangeText={setEntry}
              keyboardType="numeric" placeholder="4200" />
            <Field label="STOP LOSS *" value={sl} onChangeText={setSl}
              keyboardType="numeric" placeholder="3990" />
            <Field label="TARGET PRICE 1 *" value={tp1} onChangeText={setTp1}
              keyboardType="numeric" placeholder="4600" />
            <Field label="TARGET PRICE 2 *" value={tp2} onChangeText={setTp2}
              keyboardType="numeric" placeholder="5000" />
            <Field label="TANGGAL ENTRY * (YYYY-MM-DD)" value={date} onChangeText={setDate} />
            <Field label="CATATAN (opsional)" value={notes} onChangeText={setNotes}
              placeholder="misal: Akumulasi terlihat di broker asing" />

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: C.cyan, borderRadius: 10,
                alignItems: "center", paddingVertical: 14, marginTop: 4,
                opacity: saving ? 0.6 : 1,
              }}>
              <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>
                {saving ? "Menyimpan..." : "SIMPAN TRADE"}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Modal Tutup ──────────────────────────────────────────────

function ModalTutup({ trade, deviceId, onClose, onSuccess }: {
  trade: TradingLogEntry | null; deviceId: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const [exitPrice, setExitPrice] = useState("");
  const [exitDate,  setExitDate]  = useState(todayIso());
  const [notes,     setNotes]     = useState("");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (trade) { setExitPrice(""); setExitDate(todayIso()); setNotes(""); }
  }, [trade]);

  if (!trade) return null;

  const entry   = Number(trade.entryPrice);
  const preview = exitPrice ? calcPnlPct(entry, Number(exitPrice)) : null;

  async function handleSave() {
    if (!exitPrice || !exitDate) {
      Alert.alert("Lengkapi exit price dan tanggal");
      return;
    }
    setSaving(true);
    try {
      await closeTrade(deviceId, trade!.id, {
        exit_price: Number(exitPrice),
        exit_date:  exitDate,
        notes:      notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert("Gagal", e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={!!trade} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={{
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
          }}>
            <Text style={{ color: C.text, fontWeight: "800", fontSize: 18 }}>
              Tutup Posisi · {trade.ticker}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: C.muted, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* P&L preview */}
            {preview !== null && (
              <View style={{
                borderRadius: 12, padding: 16, marginBottom: 16, alignItems: "center",
                backgroundColor: pnlColor(preview) + "15",
                borderWidth: 1, borderColor: pnlColor(preview) + "40",
              }}>
                <Text style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>PREVIEW P&L</Text>
                <Text style={{ color: pnlColor(preview), fontWeight: "900", fontSize: 32 }}>
                  {preview >= 0 ? "+" : ""}{preview.toFixed(2)}%
                </Text>
              </View>
            )}

            {/* Entry reference */}
            <View style={{
              flexDirection: "row", justifyContent: "space-between",
              backgroundColor: C.summaryBg, borderRadius: 8, padding: 10, marginBottom: 16,
            }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: C.muted, fontSize: 9 }}>ENTRY</Text>
                <Text style={{ color: C.text, fontWeight: "700" }}>{formatPrice(trade.entryPrice)}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: C.muted, fontSize: 9 }}>SL</Text>
                <Text style={{ color: C.red, fontWeight: "700" }}>{formatPrice(trade.slPrice)}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: C.muted, fontSize: 9 }}>TP1</Text>
                <Text style={{ color: C.green, fontWeight: "700" }}>{formatPrice(trade.tp1Price)}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: C.muted, fontSize: 9 }}>TP2</Text>
                <Text style={{ color: C.green, fontWeight: "700" }}>{formatPrice(trade.tp2Price)}</Text>
              </View>
            </View>

            <Field label="EXIT PRICE *" value={exitPrice} onChangeText={setExitPrice}
              keyboardType="numeric" placeholder="4650" />
            <Field label="TANGGAL EXIT * (YYYY-MM-DD)" value={exitDate} onChangeText={setExitDate} />
            <Field label="CATATAN (opsional)" value={notes} onChangeText={setNotes}
              placeholder="misal: TP1 tercapai" />

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: C.green, borderRadius: 10,
                alignItems: "center", paddingVertical: 14, marginTop: 4,
                opacity: saving ? 0.6 : 1,
              }}>
              <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>
                {saving ? "Menyimpan..." : "KONFIRMASI TUTUP"}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function TradingLogScreen() {
  const [deviceId,     setDeviceId]     = useState<string>("");
  const [trades,       setTrades]       = useState<TradingLogEntry[]>([]);
  const [summary,      setSummary]      = useState<TradingSummary | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("SEMUA");
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [showTambah,   setShowTambah]   = useState(false);
  const [closingTrade, setClosingTrade] = useState<TradingLogEntry | null>(null);

  useEffect(() => {
    (async () => {
      const id = await getOrCreateDeviceId();
      setDeviceId(id);
      await fetchAll(id);
    })();
  }, []);

  const fetchAll = useCallback(async (id: string) => {
    try {
      const [ts, sm] = await Promise.all([getTrades(id), getTradingSummary(id)]);
      setTrades(ts);
      setSummary(sm);
    } catch {
      // empty state — backend might not be ready
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = () => {
    if (!deviceId) return;
    setRefreshing(true);
    fetchAll(deviceId);
  };

  const handleDelete = (trade: TradingLogEntry) => {
    Alert.alert(
      "Hapus Trade",
      `Hapus trade ${trade.ticker} (${trade.signalType})?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus", style: "destructive",
          onPress: async () => {
            try {
              await deleteTrade(deviceId, trade.id);
              fetchAll(deviceId);
            } catch (e: any) {
              Alert.alert("Gagal", e.message);
            }
          },
        },
      ]
    );
  };

  const filteredTrades = useMemo(() => {
    if (activeFilter === "OPEN")   return trades.filter(t => t.status === "OPEN");
    if (activeFilter === "CLOSED") return trades.filter(t => t.status === "CLOSED");
    return trades;
  }, [trades, activeFilter]);

  const ListHeader = useMemo(() => (
    <>
      <SummaryBar summary={summary} />
      <FilterTabs active={activeFilter} onChange={setActiveFilter} />

      {loading && (
        <View style={{ alignItems: "center", marginTop: 60 }}>
          <Text style={{ color: C.muted, fontSize: 14 }}>Memuat data...</Text>
        </View>
      )}
    </>
  ), [summary, activeFilter, loading]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      {/* Header */}
      <View style={{
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
      }}>
        <View>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 22, letterSpacing: 0.5 }}>
            📊 Trading Log
          </Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Jurnal sinyal BOW & BOS</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowTambah(true)}
          style={{
            backgroundColor: C.cyan, borderRadius: 10,
            paddingHorizontal: 14, paddingVertical: 9,
          }}>
          <Text style={{ color: "#000", fontWeight: "800", fontSize: 13 }}>+ Tambah</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTrades}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <TradeCard
            trade={item}
            onClose={t => setClosingTrade(t)}
            onDelete={handleDelete}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={!loading ? <EmptyState filter={activeFilter} /> : null}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* Modal Tambah */}
      <ModalTambah
        visible={showTambah}
        deviceId={deviceId}
        onClose={() => setShowTambah(false)}
        onSuccess={() => fetchAll(deviceId)}
      />

      {/* Modal Tutup */}
      <ModalTutup
        trade={closingTrade}
        deviceId={deviceId}
        onClose={() => setClosingTrade(null)}
        onSuccess={() => { setClosingTrade(null); fetchAll(deviceId); }}
      />
    </SafeAreaView>
  );
}
