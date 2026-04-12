import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  type QuoteItem,
  fearLabelDisplay,
  fetchGlobalSentiment,
  generateNarrative,
} from "@/services/globalSentimentService";
import {
  fetchRoboCommentary,
  getCommentaryText,
} from "@/services/roboCommentaryService";

// ─── Styles factory ───────────────────────────────────────────

function useStyles() {
  const colors = useColors();
  return useMemo(() => StyleSheet.create({
    header: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingHorizontal: 16, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { padding: 4, marginRight: 4 },
    pageTitle: { color: colors.foreground, fontWeight: "900", fontSize: 20 },

    scroll: { padding: 16, paddingBottom: 40 },

    card: {
      backgroundColor: colors.card, borderRadius: 16,
      padding: 16, marginBottom: 12,
    },
    cardTitle: { color: colors.foreground, fontWeight: "700", fontSize: 14 },

    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },

    fearBadge: {
      borderRadius: 8, borderWidth: 1,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    fearBadgeText: { fontWeight: "700", fontSize: 12 },

    vixValue: { fontWeight: "900", fontSize: 40 },

    statusPill: {
      borderRadius: 6, borderWidth: 1,
      paddingHorizontal: 8, paddingVertical: 3,
      marginBottom: 6, alignSelf: "flex-end",
    },
    statusPillText: { fontSize: 11, fontWeight: "700" },

    noteBox: {
      marginTop: 12, borderLeftWidth: 3,
      paddingLeft: 10, paddingVertical: 4,
    },
    noteText: { fontSize: 12, lineHeight: 18, fontStyle: "italic" },

    gaugeBg: { height: 8, backgroundColor: colors.muted, borderRadius: 4, marginBottom: 4 },
    gaugeFill: { height: 8, borderRadius: 4 },
    gaugeLabels: { flexDirection: "row", justifyContent: "space-between" },
    gaugeLabelText: { color: colors.mutedForeground, fontSize: 9 },

    quoteRow: {
      flexDirection: "row", alignItems: "center",
      paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.muted,
    },
    quoteName:  { color: colors.mutedForeground, fontSize: 13, minWidth: 110 },
    quoteValue: { color: colors.foreground, fontWeight: "700", fontSize: 13, marginRight: 8 },
    quotePctBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
    quotePct:   { fontSize: 11, fontWeight: "700" },
    noData:     { color: colors.mutedForeground, fontSize: 13 },

    biasBanner: {
      borderRadius: 12, borderWidth: 1,
      padding: 14, marginBottom: 12,
      flexDirection: "row", alignItems: "center",
    },
    biasLabel: { fontWeight: "900", fontSize: 14 },
    biasDesc:  { color: colors.mutedForeground, fontSize: 11, lineHeight: 16 },

    narasiParagraph: {
      color: colors.foreground, fontSize: 13, lineHeight: 20,
    },

    dxyBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start" },
    dxyBadgeText: { fontSize: 10, fontWeight: "600" },

    roboBadge: {
      backgroundColor: "#1e40af22", borderRadius: 5,
      paddingHorizontal: 8, paddingVertical: 3,
      alignSelf: "flex-start", borderWidth: 1, borderColor: "#3b82f6",
    },
    roboBadgeText: { color: "#60a5fa", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },

    footerNote: {
      color: colors.mutedForeground, fontSize: 10, textAlign: "center",
      lineHeight: 16, marginTop: 4,
    },
  }), [colors]);
}

// ─── Helpers ──────────────────────────────────────────────────

function fmtValue(v: number | null, symbol?: string): string {
  if (v == null) return "—";
  if (symbol === "USDIDR=X") return v.toLocaleString("id-ID", { maximumFractionDigits: 0 });
  if (symbol === "^JKSE") return v.toLocaleString("id-ID", { maximumFractionDigits: 0 });
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (symbol?.includes("CL=F") || symbol?.includes("BZ=F") || symbol?.includes("GC=F")) {
    return `$${v.toFixed(1)}`;
  }
  return v.toFixed(2);
}

function fmtPct(pct: number | null): string {
  if (pct == null) return "";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

// ─── VIX Fear/Greed Gauge ─────────────────────────────────────

function VixGauge({ vix, fearLabel }: { vix: number | null; fearLabel: string }) {
  const colors = useColors();
  const styles = useStyles();
  const info = fearLabelDisplay(fearLabel);
  const gaugeWidth = vix != null ? Math.min(Math.max(vix / 50, 0), 1) * 100 : 50;

  return (
    <View style={[styles.card, { backgroundColor: info.bg }]}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {info.icon} Fear & Greed Index (VIX)
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
            CBOE Volatility Index · {info.range}
          </Text>
        </View>
        <View style={[styles.fearBadge, { borderColor: info.color }]}>
          <Text style={[styles.fearBadgeText, { color: info.color }]}>{info.text}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 10 }}>
        <Text style={[styles.vixValue, { color: info.color, marginBottom: 0 }]}>
          {vix?.toFixed(1) ?? "—"}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: info.color + "22", borderColor: info.color }]}>
          <Text style={[styles.statusPillText, { color: info.color }]}>{info.status}</Text>
        </View>
      </View>

      <View style={styles.gaugeBg}>
        <View style={[styles.gaugeFill, {
          width: `${gaugeWidth}%` as any,
          backgroundColor: info.color,
        }]} />
      </View>
      <View style={styles.gaugeLabels}>
        <Text style={styles.gaugeLabelText}>Extreme Fear</Text>
        <Text style={styles.gaugeLabelText}>Neutral</Text>
        <Text style={styles.gaugeLabelText}>Extreme Greed</Text>
      </View>

      <View style={[styles.noteBox, { borderLeftColor: info.color }]}>
        <Text style={[styles.noteText, { color: info.color + "cc" }]}>{info.note}</Text>
      </View>
    </View>
  );
}

// ─── Quote Row ────────────────────────────────────────────────

function QuoteRow({ item, prefix }: { item: QuoteItem; prefix?: string }) {
  const styles = useStyles();
  const isUp = (item.changePct ?? 0) >= 0;
  const chgColor = isUp ? "#34d399" : "#f87171";
  const noData = item.value == null || item.value === 0;

  return (
    <View style={styles.quoteRow}>
      <Text style={styles.quoteName}>{item.name}</Text>
      <View style={{ flex: 1 }} />
      {noData ? (
        <Text style={styles.noData}>—</Text>
      ) : (
        <>
          <Text style={styles.quoteValue}>
            {prefix}{fmtValue(item.value, item.symbol)}
          </Text>
          <View style={[styles.quotePctBadge, { backgroundColor: chgColor + "22" }]}>
            <Text style={[styles.quotePct, { color: chgColor }]}>
              {isUp ? "▲" : "▼"} {Math.abs(item.changePct ?? 0).toFixed(2)}%
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Section Card ─────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

// ─── Global Bias Banner ───────────────────────────────────────

function GlobalBiasBanner({ bias }: { bias: string }) {
  const styles = useStyles();
  const map: Record<string, { label: string; color: string; bg: string; icon: string; desc: string }> = {
    RISK_OFF: {
      label: "RISK OFF",
      color: "#f87171",
      bg: "#2d0a0a",
      icon: "🔴",
      desc: "Investor global defensif — hindari saham spekulatif",
    },
    RISK_ON: {
      label: "RISK ON",
      color: "#34d399",
      bg: "#052e16",
      icon: "🟢",
      desc: "Sentimen risk-on membaik — momentum mendukung saham growth",
    },
    MIXED: {
      label: "MIXED",
      color: "#fbbf24",
      bg: "#1c1500",
      icon: "🟡",
      desc: "Sinyal campuran — selektif, prioritaskan saham fundamental kuat",
    },
  };
  const info = map[bias] ?? map.MIXED;

  return (
    <View style={[styles.biasBanner, { backgroundColor: info.bg, borderColor: info.color }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Text style={{ fontSize: 14 }}>{info.icon}</Text>
          <Text style={[styles.biasLabel, { color: info.color }]}>Global Bias: {info.label}</Text>
        </View>
        <Text style={styles.biasDesc}>{info.desc}</Text>
      </View>
    </View>
  );
}

// ─── Narasi Card ──────────────────────────────────────────────

function NarasiCard({ text }: { text: string }) {
  const colors = useColors();
  const styles = useStyles();
  const paragraphs = text.split("\n\n");
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📊 Analisis Makro & Sentimen Pasar</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2, marginBottom: 12 }}>
        Dihasilkan otomatis dari data pasar real-time
      </Text>
      {paragraphs.map((p, i) => (
        <Text key={i} style={[styles.narasiParagraph, i < paragraphs.length - 1 && { marginBottom: 12 }]}>
          {p}
        </Text>
      ))}
    </View>
  );
}

// ─── Robo Commentary Card (Composite) ─────────────────────────

function RoboCompositeCard({ text }: { text: string }) {
  const colors = useColors();
  const styles = useStyles();
  if (!text) return null;

  const BADGE_RE = /^===\s*(.+?)\s*===\s*/;
  const sections: { badge: string | null; body: string }[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    const m = remaining.match(BADGE_RE);
    if (m) {
      remaining = remaining.slice(m[0].length).trim();
      const nextBadge = remaining.search(/===\s*.+?\s*===/);
      const body = nextBadge > -1 ? remaining.slice(0, nextBadge).trim() : remaining.trim();
      if (body) sections.push({ badge: m[1], body });
      remaining = nextBadge > -1 ? remaining.slice(nextBadge) : "";
    } else {
      sections.push({ badge: null, body: remaining.trim() });
      remaining = "";
    }
  }

  if (sections.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🤖 RoboCommentary — Composite</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2, marginBottom: 12 }}>
        AI-powered analysis of the IDX Composite index
      </Text>
      {sections.map((sec, i) => (
        <View key={i} style={i < sections.length - 1 ? { marginBottom: 14 } : {}}>
          {sec.badge && (
            <View style={styles.roboBadge}>
              <Text style={styles.roboBadgeText}>{sec.badge}</Text>
            </View>
          )}
          <Text style={[styles.narasiParagraph, sec.badge ? { marginTop: 6 } : {}]}>
            {sec.body}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── DXY Badge ────────────────────────────────────────────────

function DxyBadge({ bias }: { bias: string }) {
  const styles = useStyles();
  const map: Record<string, { label: string; color: string }> = {
    STRONG_USD: { label: "Strong USD", color: "#f87171" },
    NEUTRAL_USD: { label: "Neutral USD", color: "#94a3b8" },
    WEAK_USD:   { label: "Weak USD",   color: "#34d399" },
  };
  const info = map[bias] ?? { label: bias, color: "#94a3b8" };
  return (
    <View style={[styles.dxyBadge, { backgroundColor: info.color + "22" }]}>
      <Text style={[styles.dxyBadgeText, { color: info.color }]}>{info.label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function GlobalSentimentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useStyles();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["global-sentiment"],
    queryFn: fetchGlobalSentiment,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  const { data: roboMap } = useQuery({
    queryKey: ["robo-commentary"],
    queryFn: fetchRoboCommentary,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  const compositeCommentary = roboMap
    ? (getCommentaryText(roboMap, "COMPOSITE") || getCommentaryText(roboMap, "^JKSE") || getCommentaryText(roboMap, "IHSG"))
    : "";

  const narrative = data ? generateNarrative(data) : null;

  const updatedStr = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: "#60a5fa", fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Sentimen Global</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            {data?.stale && (
              <Text style={{ color: "#f97316", fontSize: 10 }}>⚠ Stale</Text>
            )}
            {updatedStr && (
              <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
                Update {updatedStr} WIB
              </Text>
            )}
          </View>
        </View>
        {isFetching && <ActivityIndicator size="small" color="#60a5fa" />}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Loading global market data...
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, opacity: 0.6 }}>
            Yahoo Finance · VIX · IHSG · Oil · DXY
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#60a5fa"
            />
          }
        >
          {data && (
            <VixGauge
              vix={data.sentiment.vix}
              fearLabel={data.sentiment.fearLabel}
            />
          )}

          {data && <GlobalBiasBanner bias={data.sentiment.globalBias} />}

          {data && (
            <SectionCard title="🌏 Indeks Global + IHSG">
              {[...data.indices, ...data.domestic].map(item => (
                <QuoteRow key={item.symbol} item={item} />
              ))}
            </SectionCard>
          )}

          {data && (
            <SectionCard title="💱 Nilai Tukar">
              {data.currencies.map(item => (
                <View key={item.symbol}>
                  <QuoteRow item={item} />
                  {item.symbol === "DX-Y.NYB" && (
                    <View style={{ marginLeft: "auto", marginTop: -6, marginBottom: 4 }}>
                      <DxyBadge bias={data.sentiment.dxyBias} />
                    </View>
                  )}
                </View>
              ))}
            </SectionCard>
          )}

          {data && (
            <SectionCard title="🛢 Komoditas">
              {data.commodities
                .filter(item => item.value != null && item.value > 0)
                .map(item => (
                  <QuoteRow key={item.symbol} item={item} />
                ))}
            </SectionCard>
          )}

          {narrative && <NarasiCard text={narrative} />}

          {compositeCommentary ? (
            <RoboCompositeCard text={compositeCommentary} />
          ) : null}

          <Text style={styles.footerNote}>
            Pull down to refresh.
            For educational purposes only — not investment advice.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
