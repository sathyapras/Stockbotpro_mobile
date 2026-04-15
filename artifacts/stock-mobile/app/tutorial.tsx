import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── CMS Base ─────────────────────────────────────────────────

const BASE = "https://stockbotpro.replit.app";

// ─── Design tokens ────────────────────────────────────────────

const AMBER = "#f5c518";

// Hex colors — proper rgba() opacity support
const STEP_ACCENTS = [
  "#00d4ff", // Cyan
  "#f5c518", // Amber
  "#00d4ff", // Cyan
  "#b87eff", // Purple
  "#33cc66", // Green
  "#44dd44", // Lime
  "#e05252", // Rose
];

function getAccent(idx: number) {
  return STEP_ACCENTS[idx % STEP_ACCENTS.length];
}

// Parse hex → rgba string
function hexRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Home Screen Guide (hardcoded) ───────────────────────────

interface HomeGuideItem {
  icon: string;
  title: string;
  desc: string;
  color: string;
  link?: string;
  linkLabel?: string;
}

const HOME_GUIDE: HomeGuideItem[] = [
  {
    icon: "🏠",
    title: "Header & Status Pasar",
    color: "#00d4ff",
    desc:
      "Bagian teratas menampilkan sapaan harian dan kondisi pasar saat ini: jumlah saham yang naik (Adv) dan turun (Dec), serta arah IHSG hari ini.\n\nAda juga tiga indikator mini:\n• Akumulasi % — persentase saham yang sedang diakumulasi (sinyal beli institusional)\n• Distribusi % — persentase saham yang sedang didistribusi (sinyal jual institusional)\n• Avg Flow SM — rata-rata Flow Score dari seluruh saham (skala 0–100). Makin tinggi = semakin kuat aliran masuk dari smart money.",
    link: "/home",
    linkLabel: "Buka Home",
  },
  {
    icon: "🎛️",
    title: "Command Center",
    color: "#f5c518",
    desc:
      "Empat kartu pintas yang merangkum kondisi market secara real-time:\n\n• 🎯 STOCKPICK — jumlah saham dengan sinyal entry kuat (fase IGNITION). Menampilkan saham terpanas hari ini.\n• ⚡ FLOW — perbandingan saham akumulasi vs distribusi, plus saham dengan Net Buy terbesar.\n• 💎 SMART MONEY — saham dengan Smart Money Score tertinggi hari ini.\n• 📡 RADAR — total saham fase ignition dan saham dengan score broker terkuat.\n\nBaris bawah:\n• 🔄 Sector Rotation — berapa sektor leading vs lagging\n• 🌐 Market Intel — kondisi global dan breadth pasar",
    link: "/(tabs)/stockpick",
    linkLabel: "Buka Stockpick",
  },
  {
    icon: "⚡",
    title: "Signal Snapshot",
    color: "#b87eff",
    desc:
      "Panel ini menampilkan 5 saham terpilih per kategori dalam format tab:\n\n• ⭐ Top Akumulasi — saham dengan Smart Money Score tertinggi yang sedang diakumulasi institusional\n• 🚀 Entry Peluang — saham fase IGNITION (akumulasi kuat + score ≥65) diurutkan dari net buy terbesar\n• ⚠️ Peringatan — saham yang mulai masuk distribusi institusional, perlu waspada\n• ✅ Strong Trend — saham dengan tren naik stabil dan aliran institusional konsisten\n\nTap kartu saham untuk melihat detail teknikal lengkap.",
    link: "/(tabs)/screener",
    linkLabel: "Lihat Screener",
  },
  {
    icon: "📊",
    title: "Phase Distribution",
    color: "#33cc66",
    desc:
      "Bar horizontal yang menampilkan komposisi fase dari seluruh saham di RADAR:\n\n• Hijau tua — IGNITION (akumulasi kuat, potensi entry)\n• Hijau — EARLY_ACC (awal akumulasi institusional)\n• Biru — STRONG_TREND (tren kuat)\n• Oranye — EXHAUSTION (mulai melemah)\n• Merah — DISTRIBUTION (distribusi institusional)\n• Abu — CHURNING (netral/sideways)\n\nDi bawah bar terdapat 3 angka kunci:\n• Avg Flow Score — rata-rata Smart Money Score 0–100\n• Akumulasi % — persen saham fase positif\n• Distribusi % — persen saham fase negatif\n\nSemakin dominan warna hijau = kondisi pasar lebih bullish.",
    link: "/market-intel",
    linkLabel: "Lihat Market Intel",
  },
  {
    icon: "🌍",
    title: "Sentimen Global",
    color: "#00d4ff",
    desc:
      "Kartu ringkasan kondisi global yang mempengaruhi IDX:\n\n• VIX (Fear & Greed Index) — indikator volatilitas pasar global\n  < 20 → NEUTRAL/GREED (kondisi aman)\n  20–25 → zona waspada\n  > 25 → FEAR (waspadai tekanan jual)\n\n• RISK ON / RISK OFF / MIXED — bias aliran dana global saat ini\n\n• USD/IDR — nilai tukar dollar. Rupiah melemah (USD/IDR naik) = tekanan pada saham-saham berbiaya dolar.\n\nTap kartu untuk melihat detail lengkap: indeks dunia, DXY, dan komoditas.",
    link: "/global-sentiment",
    linkLabel: "Buka Sentimen Global",
  },
  {
    icon: "🛡️",
    title: "Market Risk Score",
    color: "#e05252",
    desc:
      "Skor risiko pasar 0–10 yang dihitung dari 4 komponen:\n\n1. Market Breadth — seberapa banyak saham yang turun vs naik (market width)\n2. Institutional Flow — seberapa besar persentase saham dalam fase distribusi\n3. Arah IHSG — apakah IHSG turun signifikan hari ini (< −1.5%)\n4. Avg Flow Score — jika rata-rata Smart Money Score < 30, ada sinyal kelemahan aliran\n\nInterpretasi:\n• 0–3 → LOW RISK (kondisi aman, bisa entry bertahap)\n• 4–5 → MEDIUM RISK (selektif, pilih saham terkuat)\n• 6–7 → MED-HIGH (kurangi exposure)\n• 8–10 → HIGH RISK (hindari entry baru)\n\nTap untuk melihat breakdown tiap komponen.",
  },
  {
    icon: "🚀",
    title: "Top Gainers & Top Losers",
    color: "#f97316",
    desc:
      "Scroll horizontal berisi saham dengan perubahan harga terbesar hari ini dari database Master Stock IDX.\n\n• Top Gainers — saham naik paling tinggi (diurutkan dari % tertinggi)\n• Top Losers — saham turun paling dalam\n\nGunakan ini untuk:\n• Identifikasi saham yang sedang mendapat perhatian pasar\n• Cek apakah kenaikan didukung akumulasi institusional (lihat di Radar / Smart Money)\n• Hindari FOMO — kenaikan besar tanpa dukungan aliran institusional berisiko reversal",
    link: "/(tabs)/stockpick",
    linkLabel: "Buka Stockpick",
  },
];

// ─── Stock Tools Guide (hardcoded) ───────────────────────────

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
    link: "/(tabs)/screener",
    linkLabel: "Buka Stock Tools",
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
    link: "/(tabs)/screener",
    linkLabel: "Buka Stock Tools",
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
    link: "/(tabs)/screener",
    linkLabel: "Buka Stock Tools",
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
    link: "/(tabs)/screener",
    linkLabel: "Buka Stock Tools",
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
    link: "/(tabs)/screener",
    linkLabel: "Buka Stock Tools",
  },
];

// ─── Stock Tools Guide Component ─────────────────────────────

function StockToolsGuide() {
  const router = useRouter();
  const [openIdx, setOpenIdx] = useState<number>(-1);

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      {/* Section header */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 8,
        marginBottom: 12, paddingBottom: 10,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
      }}>
        <Text style={{ fontSize: 18 }}>🛠️</Text>
        <View>
          <Text style={{ color: "#e2e8f0", fontWeight: "800", fontSize: 15 }}>
            Panduan Stock Tools
          </Text>
          <Text style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
            Cara baca setiap screener & setup teknikal
          </Text>
        </View>
      </View>

      {STOCK_TOOLS_GUIDE.map((cat, idx) => {
        const isOpen = openIdx === idx;
        const accent = cat.color;

        return (
          <View
            key={idx}
            style={[
              styles.stepCard,
              {
                borderColor:     isOpen ? hexRgba(accent, 0.5) : "rgba(255,255,255,0.08)",
                backgroundColor: isOpen ? hexRgba(accent, 0.07) : "rgba(255,255,255,0.03)",
              },
            ]}
          >
            {/* Header row */}
            <TouchableOpacity
              onPress={() => setOpenIdx(prev => prev === idx ? -1 : idx)}
              style={styles.stepHeader}
              activeOpacity={0.7}
            >
              <View style={[
                styles.stepNumBox,
                {
                  backgroundColor: isOpen ? hexRgba(accent, 0.25) : hexRgba(accent, 0.12),
                  borderColor:     isOpen ? hexRgba(accent, 0.6)  : hexRgba(accent, 0.3),
                },
              ]}>
                <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: isOpen ? accent : "#e2e8f0" }]}>
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

            {/* Expandable body */}
            {isOpen && (
              <View style={styles.stepBody}>
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

                {/* Individual tools */}
                {cat.tools.map((tool, ti) => (
                  <View
                    key={ti}
                    style={{
                      marginBottom: ti < cat.tools.length - 1 ? 10 : 14,
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

                {/* Link button */}
                {cat.link && (
                  <TouchableOpacity
                    onPress={() => router.push(cat.link as any)}
                    style={[styles.stepLinkBtn, { borderColor: hexRgba(accent, 0.4) }]}
                  >
                    <Text style={[styles.stepLinkText, { color: accent }]}>
                      {cat.linkLabel ?? "Buka"} →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Tips (hardcoded) ─────────────────────────────────────────

const TIPS = [
  "Gunakan Market Radar setiap pagi sebelum masuk posisi",
  "Konfirmasi sinyal Smart Money Flow dengan volume yang tinggi",
  "Jangan masuk semua posisi sekaligus — averaging bertahap lebih aman",
  "Patuhi stop loss 3–5% per posisi tanpa pengecualian",
  "Cek Sector Rotation untuk tahu sektor mana yang sedang leading",
  "Watchlist berguna untuk pantau saham kandidat sebelum beli",
];

// ─── Types ────────────────────────────────────────────────────

interface StepRow {
  id: number;
  title: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
}

interface StepData {
  desc: string;
  link: string;
  linkLabel: string;
}

function parseStep(raw: string): StepData {
  try {
    return JSON.parse(raw);
  } catch {
    return { desc: raw, link: "", linkLabel: "" };
  }
}

// ─── Link → Expo route mapping ────────────────────────────────

const LINK_TO_ROUTE: Record<string, string> = {
  "/home":            "/(tabs)/",
  "/market-analysis": "/(tabs)/smartmoney",
  "/bandar-detector": "/(tabs)/bandar",
  "/stockpick":       "/(tabs)/stockpick",
  "/screener":        "/(tabs)/screener",
  "/watchlist":       "/(tabs)/watchlist",
  "/trading-log":     "/(tabs)/trading-log",
  "/sector-rotation": "/sector-rotation",
  "/market-intel":    "/market-intel",
  "/global-sentiment":"/global-sentiment",
};

function routeFromLink(link: string): string {
  return LINK_TO_ROUTE[link] ?? "/(tabs)/";
}

// ─── Home Screen Guide Component ─────────────────────────────

function HomeScreenGuide() {
  const router = useRouter();
  const [openIdx, setOpenIdx] = useState<number>(-1);

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      {/* Section header */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 8,
        marginBottom: 12, paddingBottom: 10,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
      }}>
        <Text style={{ fontSize: 18 }}>🏠</Text>
        <View>
          <Text style={{ color: "#e2e8f0", fontWeight: "800", fontSize: 15 }}>
            Panduan Home Screen
          </Text>
          <Text style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
            Penjelasan setiap bagian halaman utama
          </Text>
        </View>
      </View>

      {HOME_GUIDE.map((item, idx) => {
        const isOpen = openIdx === idx;
        const accent = item.color;

        return (
          <View
            key={idx}
            style={[
              styles.stepCard,
              {
                borderColor:     isOpen ? hexRgba(accent, 0.5) : "rgba(255,255,255,0.08)",
                backgroundColor: isOpen ? hexRgba(accent, 0.07) : "rgba(255,255,255,0.03)",
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setOpenIdx(prev => prev === idx ? -1 : idx)}
              style={styles.stepHeader}
              activeOpacity={0.7}
            >
              <View style={[
                styles.stepNumBox,
                {
                  backgroundColor: isOpen ? hexRgba(accent, 0.25) : hexRgba(accent, 0.12),
                  borderColor:     isOpen ? hexRgba(accent, 0.6)  : hexRgba(accent, 0.3),
                },
              ]}>
                <Text style={{ fontSize: 14 }}>{item.icon}</Text>
              </View>

              <Text
                style={[styles.stepTitle, { color: isOpen ? accent : "#e2e8f0" }]}
                numberOfLines={isOpen ? undefined : 1}
              >
                {item.title}
              </Text>

              <Text style={{ color: isOpen ? accent : "#475569", fontSize: 16, marginLeft: 8 }}>
                {isOpen ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.stepBody}>
                <Text style={styles.stepDesc}>{item.desc}</Text>
                {item.link && (
                  <TouchableOpacity
                    onPress={() => router.push(item.link as any)}
                    style={[styles.stepLinkBtn, { borderColor: hexRgba(accent, 0.4) }]}
                  >
                    <Text style={[styles.stepLinkText, { color: accent }]}>
                      {item.linkLabel ?? "Buka"} →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function TutorialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 24 : insets.top + 16;

  const [steps,   setSteps]   = useState<StepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIdx, setOpenIdx] = useState<number>(0);

  useEffect(() => {
    fetch(`${BASE}/api/cms/content/tutorial_steps`)
      .then(r => r.ok ? r.json() : [])
      .then((rows: StepRow[]) => {
        setSteps(rows.filter(r => r.isActive));
      })
      .catch(() => setSteps([]))
      .finally(() => setLoading(false));
  }, []);

  function toggleStep(idx: number) {
    setOpenIdx(prev => prev === idx ? -1 : idx);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 48, paddingTop: topPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📖 Tutorial Penggunaan</Text>
          <Text style={styles.headerSub}>Home screen · Stock Tools · langkah penggunaan</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={{ color: "#64748b", fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Home Screen Guide ── */}
      <HomeScreenGuide />

      {/* ── Stock Tools Guide ── */}
      <StockToolsGuide />

      {/* ── Divider: Tutorial Langkah-Langkah ── */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12, marginTop: 4 }}>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 8,
          paddingBottom: 10,
          borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
        }}>
          <Text style={{ fontSize: 18 }}>📋</Text>
          <View>
            <Text style={{ color: "#e2e8f0", fontWeight: "800", fontSize: 15 }}>
              Langkah Penggunaan
            </Text>
            <Text style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
              Panduan step-by-step dari admin
            </Text>
          </View>
        </View>
      </View>

      {/* ── Loading ── */}
      {loading && (
        <View style={{ padding: 40, alignItems: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#00d4ff" />
          <Text style={{ color: "#475569", fontSize: 13 }}>Memuat tutorial...</Text>
        </View>
      )}

      {/* ── Empty state ── */}
      {!loading && steps.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>📚</Text>
          <Text style={styles.emptyText}>Tutorial belum tersedia</Text>
          <Text style={styles.emptySub}>Cek kembali nanti</Text>
        </View>
      )}

      {/* ── Accordion Steps ── */}
      {!loading && steps.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          {steps.map((step, idx) => {
            const isOpen  = openIdx === idx;
            const accent  = getAccent(idx);
            const parsed  = parseStep(step.content);
            const stepNum = String(idx + 1).padStart(2, "0");

            return (
              <View
                key={step.id}
                style={[
                  styles.stepCard,
                  {
                    borderColor:     isOpen ? hexRgba(accent, 0.5) : "rgba(255,255,255,0.08)",
                    backgroundColor: isOpen ? hexRgba(accent, 0.07) : "rgba(255,255,255,0.03)",
                  },
                ]}
              >
                {/* Header row */}
                <TouchableOpacity
                  onPress={() => toggleStep(idx)}
                  style={styles.stepHeader}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.stepNumBox,
                      {
                        backgroundColor: isOpen ? hexRgba(accent, 0.25) : hexRgba(accent, 0.12),
                        borderColor:     isOpen ? hexRgba(accent, 0.6)  : hexRgba(accent, 0.3),
                      },
                    ]}
                  >
                    <Text style={[styles.stepNum, { color: accent }]}>{stepNum}</Text>
                  </View>

                  <Text
                    style={[styles.stepTitle, { color: isOpen ? accent : "#e2e8f0" }]}
                    numberOfLines={isOpen ? undefined : 1}
                  >
                    {step.title}
                  </Text>

                  <Text style={{ color: isOpen ? accent : "#475569", fontSize: 16, marginLeft: 8 }}>
                    {isOpen ? "▲" : "▼"}
                  </Text>
                </TouchableOpacity>

                {/* Expandable body */}
                {isOpen && (
                  <View style={styles.stepBody}>
                    <Text style={styles.stepDesc}>{parsed.desc}</Text>

                    {parsed.link ? (
                      <TouchableOpacity
                        onPress={() => router.push(routeFromLink(parsed.link) as any)}
                        style={[styles.stepLinkBtn, { borderColor: hexRgba(accent, 0.4) }]}
                      >
                        <Text style={[styles.stepLinkText, { color: accent }]}>
                          {parsed.linkLabel || "Buka"} →
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── Tips Pro Trader ── */}
      <View style={[styles.tipsCard, { marginHorizontal: 16 }]}>
        <View style={styles.tipsHeader}>
          <Text style={{ fontSize: 18 }}>▶</Text>
          <Text style={styles.tipsTitle}>Tips Pro Trader</Text>
        </View>
        {TIPS.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={styles.tipNumBox}>
              <Text style={styles.tipNum}>{i + 1}</Text>
            </View>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
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
  emptyState: {
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySub: {
    color: "#334155",
    fontSize: 12,
  },
  stepCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  stepNumBox: {
    width: 36, height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNum: {
    fontWeight: "900",
    fontSize: 13,
  },
  stepTitle: {
    flex: 1,
    fontWeight: "700",
    fontSize: 14,
  },
  stepBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  stepDesc: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 12,
  },
  stepLinkBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  stepLinkText: {
    fontWeight: "700",
    fontSize: 13,
  },
  tipsCard: {
    backgroundColor: "#0a1628",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  tipsTitle: {
    color: AMBER,
    fontWeight: "800",
    fontSize: 15,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  tipNumBox: {
    width: 22, height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(255,199,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,199,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  tipNum: {
    color: AMBER,
    fontSize: 11,
    fontWeight: "800",
  },
  tipText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
});
