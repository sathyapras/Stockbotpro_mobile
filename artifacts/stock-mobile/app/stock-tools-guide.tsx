import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Design tokens ────────────────────────────────────────────

function hexRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Data ─────────────────────────────────────────────────────

interface ToolGuideItem {
  name: string;
  color: string;
  fromStockpick?: boolean;
  desc: string;
}

interface ToolCategoryGuide {
  id: string;
  tagline: string;
  color: string;
  emoji: string;
  howToRead: string;
  tools: ToolGuideItem[];
  link?: string;
  linkLabel?: string;
}

const STOCK_TOOLS_GUIDE: ToolCategoryGuide[] = [
  {
    id: "Momentum",
    tagline: "Saham dengan tenaga naik kuat",
    color: "#f5a623",
    emoji: "🔥",
    howToRead:
      "Saham-saham di kategori ini memiliki momentum naik yang sedang kuat. Cocok untuk swing trade mengikuti trend yang sudah berjalan. Hindari mengejar harga jika sudah naik terlalu jauh — tunggu pullback minor.",
    tools: [
      {
        name: "Buy on Strength (BOS)",
        color: "#34d399",
        fromStockpick: true,
        desc: "Saham dengan momentum kuat dan close di atas VWAP hari ini. Data diambil dari sinyal Stockpick — artinya institusi aktif membeli pada harga tersebut. BOS adalah sinyal masuk terbaik saat market sedang kuat.",
      },
      {
        name: "Swing Up",
        color: "#fbbf24",
        desc: "Saham yang naik lebih dari 5% dalam satu hari dengan konfirmasi volume. Lonjakan besar + volume tinggi menandakan minat beli yang serius. Cek apakah ada katalis atau akumulasi institusional di baliknya.",
      },
      {
        name: "Near 52W High",
        color: "#fb923c",
        desc: "Saham yang mendekati harga tertinggi 52 minggu. Saham yang berada dekat 52W high cenderung sedang dalam tahap distribusi atau persiapan breakout. Sinyal kuat jika didukung volume besar dan Smart Money Score tinggi.",
      },
      {
        name: "Volume Spike",
        color: "#f59e0b",
        desc: "Volume hari ini meledak lebih dari 200% rata-rata 50 hari terakhir. Volume anomali sering mendahului pergerakan harga besar. Bisa sinyal awal akumulasi institusi atau potensi news play.",
      },
    ],
  },
  {
    id: "Reversal",
    tagline: "Saham siap berbalik arah naik",
    color: "#34d399",
    emoji: "💚",
    howToRead:
      "Kategori ini mencari saham yang sedang dalam koreksi atau di area support, dengan sinyal bahwa penurunan akan segera berakhir. Strategi reversal lebih berisiko dari momentum — selalu konfirmasi dengan candle reversal dan volume.",
    tools: [
      {
        name: "Buy on Weakness (BOW)",
        color: "#60a5fa",
        fromStockpick: true,
        desc: "Saham yang turun lebih dari 1% hari ini namun secara institusional masih dalam akumulasi. Data dari Stockpick — BOW adalah peluang beli di harga diskon saat smart money justru sedang tambah posisi.",
      },
      {
        name: "Near Support",
        color: "#22d3ee",
        desc: "Saham yang close mendekati level support kuat. Strategi: tunggu konfirmasi candle bounce (hammer, bullish engulfing) sebelum masuk. Support yang kuat + volume rendah saat penurunan = sinyal reversal lebih valid.",
      },
      {
        name: "HL Higher Low",
        color: "#38bdf8",
        desc: "Saham yang membentuk higher low selama 3 hari berturut-turut. Higher low menandakan tekanan jual berkurang dan pembeli mulai mengambil alih. Sinyal awal pembalikan trend yang reliable untuk swing trade.",
      },
      {
        name: "RSI Divergence",
        color: "#818cf8",
        desc: "Harga mencetak lower low tetapi RSI mencetak higher low (divergence bullish). Kondisi ini artinya momentum penurunan melemah meski harga masih turun. Salah satu sinyal reversal paling andal dalam analisis teknikal.",
      },
    ],
  },
  {
    id: "Breakout",
    tagline: "Saham siap menembus level kunci",
    color: "#a78bfa",
    emoji: "💜",
    howToRead:
      "Fokus pada saham yang berada di fase konsolidasi dan akan segera (atau baru saja) breakout. Breakout yang valid harus disertai volume di atas rata-rata. Hindari false breakout — tunggu close di atas level resistance.",
    tools: [
      {
        name: "Price-Vol Breakout",
        color: "#a78bfa",
        desc: "Breakout harga yang dikonfirmasi oleh volume tinggi — kombinasi terkuat untuk sinyal breakout. Harga menembus resistance dengan volume di atas rata-rata, menandakan komitmen pelaku pasar. Prioritas entry pertama.",
      },
      {
        name: "Darvas Box",
        color: "#e879f9",
        desc: "Breakout dari pola Darvas Box — konsolidasi dalam range sempit yang membentuk 'kotak'. Metode klasik Nicholas Darvas yang terbukti efektif. Saat harga keluar dari atas kotak dengan volume, itu sinyal beli.",
      },
      {
        name: "BB Squeeze",
        color: "#f472b6",
        desc: "Bollinger Band menyempit (squeeze) — tanda volatilitas rendah yang sering mendahului pergerakan besar. Saat band melebar kembali, harga biasanya meledak satu arah. Gunakan sinyal lain untuk konfirmasi arah.",
      },
      {
        name: "Buy on Retest",
        color: "#fb7185",
        desc: "Saham yang sudah breakout dan kini kembali menguji (retest) level resistance lama sebagai support baru. Retest yang berhasil (harga bangkit dari level resistance lama) adalah entry dengan risk/reward terbaik.",
      },
    ],
  },
  {
    id: "Smart Money",
    tagline: "Jejak akumulasi institusi & bandar",
    color: "#38bdf8",
    emoji: "💎",
    howToRead:
      "Kategori ini melacak jejak aliran dana besar (institusional / bandar). Sinyal di sini lebih 'dalam' dari sekedar harga — mencerminkan apakah uang besar sedang masuk atau menambah posisi. Kombinasikan dengan analisis teknikal untuk entry presisi.",
    tools: [
      {
        name: "NBS Multi-TF",
        color: "#38bdf8",
        desc: "Net Buy Score (NBS) positif di multiple timeframe (1D, 5D, 10D) sekaligus — dan RS (Relative Strength) saham outperform IHSG. Sinyal kumulatif bahwa institusi sedang akumulasi konsisten, bukan sehari-dua hari saja.",
      },
      {
        name: "Volume 3D",
        color: "#2dd4bf",
        desc: "Volume meningkat selama 3 hari berturut-turut. Kenaikan volume konsisten tanpa penurunan harga besar = akumulasi bersih. Ini sering terjadi sebelum harga breakout karena institusi 'diam-diam' mengumpulkan saham.",
      },
      {
        name: "RSI Hidden Div",
        color: "#22d3ee",
        desc: "Hidden divergence RSI: harga higher low tapi RSI lower low. Ini sinyal bahwa momentum underlyingnya masih kuat meski ada pullback. Berbeda dari regular divergence — hidden divergence adalah sinyal kelanjutan trend (continuation).",
      },
    ],
  },
  {
    id: "Advanced",
    tagline: "SEPA & VCP — setup kelas institusi",
    color: "#c084fc",
    emoji: "🚀",
    howToRead:
      "Setup tingkat lanjut berbasis metodologi Mark Minervini (SEPA) dan William O'Neil (VCP). Saham dengan setup ini biasanya adalah calon multi-bagger. Perlu kesabaran — tunggu setup sempurna sebelum entry, jangan terburu-buru.",
    tools: [
      {
        name: "SEPA Setup",
        color: "#fde68a",
        desc: "Specific Entry Point Analysis (Minervini): Stage 2 trend (harga di atas MA50 & MA200) + Relative Strength kuat vs IHSG + Breakout dari base. SEPA adalah saringan ketat — saham yang lolos biasanya kandidat runner terkuat.",
      },
      {
        name: "VCP Setup",
        color: "#c084fc",
        desc: "Volatility Contraction Pattern: konsolidasi dengan range yang makin menyempit dan volume yang makin kering. VCP setup terjadi sebelum breakout besar — harga 'mengumpulkan energi'. Masuk saat volume mulai kembali naik.",
      },
      {
        name: "VCP Breakout",
        color: "#a855f7",
        desc: "VCP yang sudah trigger — harga breakout dari pola Volatility Contraction dengan konfirmasi volume. Ini adalah entry signal VCP yang paling agresif. Risk/reward biasanya 1:3 atau lebih baik jika setup terbentuk dengan sempurna.",
      },
    ],
  },
];

// ─── Screen ───────────────────────────────────────────────────

export default function StockToolsGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 24 : insets.top + 16;
  const [openIdx, setOpenIdx] = useState<number>(-1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 48, paddingTop: topPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🛠️ Panduan Stock Tools</Text>
          <Text style={styles.headerSub}>Cara baca setiap screener & setup teknikal</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={{ color: "#64748b", fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Category Accordions ── */}
      <View style={{ paddingHorizontal: 16 }}>
        {STOCK_TOOLS_GUIDE.map((cat, idx) => {
          const isOpen = openIdx === idx;
          const accent = cat.color;

          return (
            <View
              key={idx}
              style={[
                styles.card,
                {
                  borderColor:     isOpen ? hexRgba(accent, 0.5) : "rgba(255,255,255,0.08)",
                  backgroundColor: isOpen ? hexRgba(accent, 0.07) : "rgba(255,255,255,0.03)",
                },
              ]}
            >
              {/* Header row */}
              <TouchableOpacity
                onPress={() => setOpenIdx(prev => prev === idx ? -1 : idx)}
                style={styles.cardHeader}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconBox,
                  {
                    backgroundColor: isOpen ? hexRgba(accent, 0.25) : hexRgba(accent, 0.12),
                    borderColor:     isOpen ? hexRgba(accent, 0.6)  : hexRgba(accent, 0.3),
                  },
                ]}>
                  <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.catTitle, { color: isOpen ? accent : "#e2e8f0" }]}>
                    {cat.id}
                  </Text>
                  <Text style={{ color: "#475569", fontSize: 11, marginTop: 1 }}>
                    {cat.tagline}
                  </Text>
                </View>

                <Text style={{ color: isOpen ? accent : "#475569", fontSize: 16, marginLeft: 8 }}>
                  {isOpen ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {/* Body */}
              {isOpen && (
                <View style={styles.cardBody}>
                  {/* How to read */}
                  <View style={{
                    backgroundColor: hexRgba(accent, 0.08),
                    borderRadius: 10, padding: 12, marginBottom: 14,
                    borderWidth: 1, borderColor: hexRgba(accent, 0.2),
                  }}>
                    <Text style={{ color: accent, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginBottom: 5 }}>
                      CARA BACA KATEGORI INI
                    </Text>
                    <Text style={{ color: "#94a3b8", fontSize: 12, lineHeight: 18 }}>
                      {cat.howToRead}
                    </Text>
                  </View>

                  {/* Tools */}
                  {cat.tools.map((tool, ti) => (
                    <View
                      key={ti}
                      style={{
                        marginBottom: ti < cat.tools.length - 1 ? 10 : 0,
                        paddingBottom: ti < cat.tools.length - 1 ? 10 : 0,
                        borderBottomWidth: ti < cat.tools.length - 1 ? 1 : 0,
                        borderBottomColor: "rgba(255,255,255,0.05)",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <View style={{
                          backgroundColor: tool.color + "25",
                          borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
                          borderWidth: 1, borderColor: tool.color + "50",
                        }}>
                          <Text style={{ color: tool.color, fontSize: 11, fontWeight: "800" }}>
                            {tool.name}
                          </Text>
                        </View>
                        {tool.fromStockpick && (
                          <View style={{
                            backgroundColor: "#1e40af25",
                            borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                            borderWidth: 1, borderColor: "#3b82f650",
                          }}>
                            <Text style={{ color: "#60a5fa", fontSize: 10, fontWeight: "700" }}>
                              → Stockpick
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: "#94a3b8", fontSize: 12, lineHeight: 18 }}>
                        {tool.desc}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060e1f",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    color: "#e2e8f0",
    fontWeight: "900",
    fontSize: 22,
  },
  headerSub: {
    color: "#475569",
    fontSize: 12,
    marginTop: 4,
  },
  closeBtn: {
    backgroundColor: "#0a1628",
    borderRadius: 20,
    width: 32, height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 40, height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  catTitle: {
    fontWeight: "800",
    fontSize: 15,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
});
