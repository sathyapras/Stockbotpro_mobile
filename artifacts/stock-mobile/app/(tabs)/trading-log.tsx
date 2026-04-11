import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  TradingLogEntry,
  addTrade,
  calcPnlPct,
  closeTrade,
  deleteTrade,
  formatDate,
  getOrCreateDeviceId,
  getTrades,
  getTradingSummary,
  holdDays,
  pnlColor,
  todayIso,
  TradingSummary,
  SignalType,
} from "@/services/tradingLogService";

// ─── Small helpers ────────────────────────────────────────────

function fRp(n: number) {
  return Number(n).toLocaleString("id-ID");
}

function SectionDivider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5,
      backgroundColor: color + "25", alignSelf: "flex-start" }}>
      <Text style={{ color, fontWeight: "700", fontSize: 10 }}>{label}</Text>
    </View>
  );
}

// ─── Summary bar ──────────────────────────────────────────────

function SummaryBar({ summary, colors }: {
  summary: TradingSummary | null;
  colors: ReturnType<typeof useColors>;
}) {
  if (!summary) return null;
  const pnlC = pnlColor(summary.totalPnl);
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 12,
      borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card, padding: 12,
      flexDirection: "row", justifyContent: "space-around" }}>
      <View style={{ alignItems: "center" }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>TOTAL TRADE</Text>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
          {summary.totalTrades}
        </Text>
      </View>
      <View style={{ width: 1, backgroundColor: colors.border }} />
      <View style={{ alignItems: "center" }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>WIN RATE</Text>
        <Text style={{ color: summary.winRate >= 50 ? "#22c55e" : "#ef4444",
          fontWeight: "800", fontSize: 18 }}>
          {summary.winRate.toFixed(1)}%
        </Text>
      </View>
      <View style={{ width: 1, backgroundColor: colors.border }} />
      <View style={{ alignItems: "center" }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>TOTAL P&L</Text>
        <Text style={{ color: pnlC, fontWeight: "800", fontSize: 18 }}>
          {summary.totalPnl >= 0 ? "+" : ""}{summary.totalPnl.toFixed(1)}%
        </Text>
      </View>
      <View style={{ width: 1, backgroundColor: colors.border }} />
      <View style={{ alignItems: "center" }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>OPEN</Text>
        <Text style={{ color: "#60a5fa", fontWeight: "800", fontSize: 18 }}>
          {summary.openPositions}
        </Text>
      </View>
    </View>
  );
}

// ─── Trade card ───────────────────────────────────────────────

function TradeCard({ trade, onClose, onDelete, colors }: {
  trade: TradingLogEntry;
  onClose: (t: TradingLogEntry) => void;
  onDelete: (t: TradingLogEntry) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const entry = parseFloat(trade.entryPrice);
  const exit  = trade.exitPrice ? parseFloat(trade.exitPrice) : null;
  const pnl   = exit !== null ? calcPnlPct(entry, exit) : null;
  const days  = holdDays(trade.entryDate, trade.exitDate);
  const sigColor = trade.signalType === "BOW" ? "#22c55e" : "#a78bfa";
  const isOpen = trade.status === "OPEN";

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 10, borderRadius: 12,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
      padding: 12, borderLeftWidth: 3,
      borderLeftColor: isOpen ? "#60a5fa" : pnl !== null && pnl >= 0 ? "#22c55e" : "#ef4444" }}>

      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 16 }}>
            {trade.ticker}
          </Text>
          <Badge label={trade.signalType} color={sigColor} />
          <Badge label={isOpen ? "OPEN" : "CLOSED"}
            color={isOpen ? "#60a5fa" : pnl !== null && pnl >= 0 ? "#22c55e" : "#ef4444"} />
        </View>
        {pnl !== null && (
          <Text style={{ color: pnlColor(pnl), fontWeight: "800", fontSize: 16 }}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
          </Text>
        )}
      </View>

      {/* Price grid */}
      <View style={{ flexDirection: "row", gap: 16, marginBottom: 6 }}>
        <View>
          <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>ENTRY</Text>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
            {fRp(entry)}
          </Text>
        </View>
        <View>
          <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>SL</Text>
          <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 13 }}>
            {fRp(parseFloat(trade.slPrice))}
          </Text>
        </View>
        <View>
          <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>TP1</Text>
          <Text style={{ color: "#22c55e", fontWeight: "700", fontSize: 13 }}>
            {fRp(parseFloat(trade.tp1Price))}
          </Text>
        </View>
        <View>
          <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>TP2</Text>
          <Text style={{ color: "#22c55e", fontWeight: "700", fontSize: 13 }}>
            {fRp(parseFloat(trade.tp2Price))}
          </Text>
        </View>
        {exit !== null && (
          <View>
            <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>EXIT</Text>
            <Text style={{ color: pnlColor(pnl ?? 0), fontWeight: "700", fontSize: 13 }}>
              {fRp(exit)}
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={{ flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginTop: 4 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
          📅 {formatDate(trade.entryDate)}
          {trade.exitDate ? ` → ${formatDate(trade.exitDate)}` : ""}
          {"  "}·{"  "}{days} hari
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {isOpen && (
            <TouchableOpacity
              onPress={() => onClose(trade)}
              style={{ paddingHorizontal: 12, paddingVertical: 5,
                borderRadius: 7, backgroundColor: "#22c55e20",
                borderWidth: 1, borderColor: "#22c55e40" }}>
              <Text style={{ color: "#22c55e", fontWeight: "700", fontSize: 11 }}>
                Tutup
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onDelete(trade)}
            style={{ paddingHorizontal: 10, paddingVertical: 5,
              borderRadius: 7, backgroundColor: "#ef444420",
              borderWidth: 1, borderColor: "#ef444440" }}>
            <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 11 }}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {trade.notes ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 6,
          fontStyle: "italic" }}>💬 {trade.notes}</Text>
      ) : null}
    </View>
  );
}

// ─── Input field helper ───────────────────────────────────────

function Field({ label, value, onChangeText, keyboardType = "default", placeholder, colors }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "numeric";
  placeholder?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 10, marginBottom: 4 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={{ backgroundColor: colors.background, borderWidth: 1,
          borderColor: colors.border, borderRadius: 8,
          paddingHorizontal: 12, paddingVertical: 8,
          color: colors.foreground, fontSize: 14 }}
      />
    </View>
  );
}

// ─── Add Trade Modal ──────────────────────────────────────────

function AddTradeModal({ visible, onClose, onSaved, deviceId, colors }: {
  visible:  boolean;
  onClose:  () => void;
  onSaved:  () => void;
  deviceId: string;
  colors:   ReturnType<typeof useColors>;
}) {
  const [ticker,     setTicker]     = useState("");
  const [signal,     setSignal]     = useState<SignalType>("BOW");
  const [entry,      setEntry]      = useState("");
  const [sl,         setSl]         = useState("");
  const [tp1,        setTp1]        = useState("");
  const [tp2,        setTp2]        = useState("");
  const [date,       setDate]       = useState(todayIso());
  const [notes,      setNotes]      = useState("");
  const [saving,     setSaving]     = useState(false);

  const reset = () => {
    setTicker(""); setSignal("BOW"); setEntry(""); setSl("");
    setTp1(""); setTp2(""); setDate(todayIso()); setNotes("");
  };

  const save = async () => {
    if (!ticker || !entry || !sl || !tp1 || !tp2 || !date) {
      Alert.alert("Lengkapi semua field wajib");
      return;
    }
    setSaving(true);
    try {
      await addTrade(deviceId, {
        ticker:      ticker.toUpperCase().trim(),
        signal_type: signal,
        entry_price: parseFloat(entry),
        sl_price:    parseFloat(sl),
        tp1_price:   parseFloat(tp1),
        tp2_price:   parseFloat(tp2),
        entry_date:  date,
        notes:       notes || undefined,
      });
      reset();
      onSaved();
    } catch (e: any) {
      Alert.alert("Gagal", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between",
            alignItems: "center", padding: 16, borderBottomWidth: 1,
            borderBottomColor: colors.border }}>
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
              + Tambah Trade
            </Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Field label="TICKER *" value={ticker} onChangeText={t => setTicker(t.toUpperCase())}
              placeholder="misal: BBRI" colors={colors} />

            {/* Signal toggle */}
            <View style={{ marginBottom: 10 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, marginBottom: 4 }}>
                SIGNAL *
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["BOW", "BOS"] as SignalType[]).map(s => (
                  <TouchableOpacity key={s} onPress={() => setSignal(s)}
                    style={{ flex: 1, alignItems: "center", paddingVertical: 10,
                      borderRadius: 8, borderWidth: 1,
                      borderColor: signal === s ? (s === "BOW" ? "#22c55e" : "#a78bfa") : colors.border,
                      backgroundColor: signal === s
                        ? (s === "BOW" ? "#22c55e20" : "#a78bfa20")
                        : "transparent" }}>
                    <Text style={{ fontWeight: "800", fontSize: 14,
                      color: signal === s ? (s === "BOW" ? "#22c55e" : "#a78bfa") : colors.mutedForeground }}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Field label="ENTRY PRICE *" value={entry} onChangeText={setEntry}
              keyboardType="numeric" placeholder="4200" colors={colors} />
            <Field label="STOP LOSS *" value={sl} onChangeText={setSl}
              keyboardType="numeric" placeholder="3990" colors={colors} />
            <Field label="TARGET PRICE 1 *" value={tp1} onChangeText={setTp1}
              keyboardType="numeric" placeholder="4600" colors={colors} />
            <Field label="TARGET PRICE 2 *" value={tp2} onChangeText={setTp2}
              keyboardType="numeric" placeholder="5000" colors={colors} />
            <Field label="TANGGAL ENTRY * (YYYY-MM-DD)" value={date}
              onChangeText={setDate} colors={colors} />
            <Field label="CATATAN (opsional)" value={notes} onChangeText={setNotes}
              placeholder="misal: Akumulasi terlihat di SM" colors={colors} />

            <TouchableOpacity
              onPress={save}
              disabled={saving}
              style={{ backgroundColor: colors.primary, borderRadius: 10,
                alignItems: "center", paddingVertical: 14, marginTop: 8,
                opacity: saving ? 0.6 : 1 }}>
              <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>
                {saving ? "Menyimpan..." : "SIMPAN TRADE"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Close Trade Modal ────────────────────────────────────────

function CloseTradeModal({ trade, deviceId, onClose, onSaved, colors }: {
  trade:    TradingLogEntry | null;
  deviceId: string;
  onClose:  () => void;
  onSaved:  () => void;
  colors:   ReturnType<typeof useColors>;
}) {
  const [exitPrice, setExitPrice] = useState("");
  const [exitDate,  setExitDate]  = useState(todayIso());
  const [notes,     setNotes]     = useState("");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (trade) { setExitPrice(""); setExitDate(todayIso()); setNotes(""); }
  }, [trade]);

  if (!trade) return null;

  const entry = parseFloat(trade.entryPrice);
  const preview = exitPrice ? calcPnlPct(entry, parseFloat(exitPrice)) : null;

  const save = async () => {
    if (!exitPrice || !exitDate) {
      Alert.alert("Lengkapi exit price dan tanggal");
      return;
    }
    setSaving(true);
    try {
      await closeTrade(deviceId, trade.id, {
        exit_price: parseFloat(exitPrice),
        exit_date:  exitDate,
        notes:      notes || undefined,
      });
      onSaved();
    } catch (e: any) {
      Alert.alert("Gagal", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!trade} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between",
            alignItems: "center", padding: 16, borderBottomWidth: 1,
            borderBottomColor: colors.border }}>
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
              Tutup Posisi {trade.ticker}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* Preview P&L */}
            {preview !== null && (
              <View style={{ borderRadius: 10, padding: 12, marginBottom: 16,
                backgroundColor: pnlColor(preview) + "15",
                borderWidth: 1, borderColor: pnlColor(preview) + "40",
                alignItems: "center" }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>PREVIEW P&L</Text>
                <Text style={{ color: pnlColor(preview), fontWeight: "900", fontSize: 28 }}>
                  {preview >= 0 ? "+" : ""}{preview.toFixed(2)}%
                </Text>
              </View>
            )}

            <Field label="EXIT PRICE *" value={exitPrice} onChangeText={setExitPrice}
              keyboardType="numeric" placeholder="4650" colors={colors} />
            <Field label="TANGGAL EXIT * (YYYY-MM-DD)" value={exitDate}
              onChangeText={setExitDate} colors={colors} />
            <Field label="CATATAN (opsional)" value={notes} onChangeText={setNotes}
              placeholder="misal: TP1 tercapai" colors={colors} />

            <TouchableOpacity
              onPress={save}
              disabled={saving}
              style={{ backgroundColor: "#22c55e", borderRadius: 10,
                alignItems: "center", paddingVertical: 14, marginTop: 8,
                opacity: saving ? 0.6 : 1 }}>
              <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>
                {saving ? "Menyimpan..." : "KONFIRMASI TUTUP"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function TradingLogScreen() {
  const colors   = useColors();
  const [deviceId,  setDeviceId]  = useState<string | null>(null);
  const [trades,    setTrades]    = useState<TradingLogEntry[]>([]);
  const [summary,   setSummary]   = useState<TradingSummary | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [closingTrade, setClosingTrade] = useState<TradingLogEntry | null>(null);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");

  // Init device ID once
  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  const load = useCallback(async (did: string) => {
    try {
      const [ts, sm] = await Promise.all([getTrades(did), getTradingSummary(did)]);
      setTrades(ts);
      setSummary(sm);
    } catch {
      // silent — server may not be ready yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (deviceId) { setLoading(true); load(deviceId); }
  }, [deviceId, load]);

  const refresh = () => {
    if (!deviceId) return;
    setRefreshing(true);
    load(deviceId);
  };

  const handleDelete = (trade: TradingLogEntry) => {
    Alert.alert(
      "Hapus Trade",
      `Hapus trade ${trade.ticker} ${trade.signalType}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus", style: "destructive",
          onPress: async () => {
            try {
              await deleteTrade(deviceId!, trade.id);
              load(deviceId!);
            } catch (e: any) {
              Alert.alert("Gagal", e.message);
            }
          },
        },
      ]
    );
  };

  const filtered = useMemo(() =>
    filter === "ALL" ? trades : trades.filter(t => t.status === filter),
    [trades, filter]
  );

  const openCount   = trades.filter(t => t.status === "OPEN").length;
  const closedCount = trades.filter(t => t.status === "CLOSED").length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
        <View>
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 22 }}>
            📊 Trading Log
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            Jurnal sinyal BOW & BOS
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          style={{ backgroundColor: colors.primary, borderRadius: 10,
            paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: "#000", fontWeight: "800", fontSize: 13 }}>+ Tambah</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh}
          tintColor={colors.primary} />}
      >
        {/* Summary */}
        <SummaryBar summary={summary} colors={colors} />

        {/* Filter tabs */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 12,
          borderRadius: 10, borderWidth: 1, borderColor: colors.border,
          backgroundColor: colors.card, overflow: "hidden" }}>
          {([
            { key: "ALL",    label: `Semua (${trades.length})` },
            { key: "OPEN",   label: `Open (${openCount})` },
            { key: "CLOSED", label: `Closed (${closedCount})` },
          ] as const).map(f => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 8,
                backgroundColor: filter === f.key ? colors.primary + "25" : "transparent" }}>
              <Text style={{ fontWeight: "700", fontSize: 11,
                color: filter === f.key ? colors.primary : colors.mutedForeground }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading */}
        {loading && (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Memuat data...</Text>
          </View>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <View style={{ alignItems: "center", marginTop: 60, gap: 8, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 40 }}>📋</Text>
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 16 }}>
              Belum ada trade
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center" }}>
              Tap "+ Tambah" untuk mencatat sinyal BOW atau BOS pertamamu.
            </Text>
          </View>
        )}

        {/* Trade list */}
        {filtered.map(trade => (
          <TradeCard
            key={trade.id}
            trade={trade}
            onClose={setClosingTrade}
            onDelete={handleDelete}
            colors={colors}
          />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add modal */}
      {deviceId && (
        <AddTradeModal
          visible={showAdd}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(deviceId); }}
          deviceId={deviceId}
          colors={colors}
        />
      )}

      {/* Close modal */}
      {deviceId && (
        <CloseTradeModal
          trade={closingTrade}
          deviceId={deviceId}
          onClose={() => setClosingTrade(null)}
          onSaved={() => { setClosingTrade(null); load(deviceId); }}
          colors={colors}
        />
      )}
    </SafeAreaView>
  );
}
