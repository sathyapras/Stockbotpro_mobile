# Home Screen — Web API Guide
## Panduan untuk Tim Web App (Backend / API Server)

Dokumen ini menjelaskan perubahan yang direncanakan pada **Home Screen Mobile**, komponen baru yang akan ditambahkan, dan apa yang dibutuhkan dari API server agar mobile bisa menampilkannya dengan benar.

---

## 1. Layout Home Screen Saat Ini vs Rencana Baru

### Kondisi Saat Ini (Aktif)
```
[1] HomeHeader          — Greeting + IHSG snapshot
[2] CommandCenter       — 4-card grid (Stockpick, Flow, Smart Money, Radar)
                          + baris bawah: Sector Rotation + Market Intel
[3] SignalSnapshotSection  — tab akumulasi / entry / warning / strong trend
[4] PhaseDistributionSection — bar chart distribusi phase
[5] SentimenGlobalCard  — VIX + RISK ON/OFF badge, tap → halaman Global
[6] MarketRiskCard      — collapsed, risk score 0-10
[7] Top Gainers / Losers
[8] Daftar saham (FlatList)
```

### Rencana Baru (Menunggu Implementasi)
```
[1] HomeHeader            — sama
[2] TrendingToolsSection  — MENGGANTIKAN CommandCenter
                            6 icon horizontal scroll dengan sublabel dinamis
[3] SignalSnapshotSection — sama
[4] PhaseDistributionSection — sama
[5] AnalisisKonteksSection — MENGGANTIKAN SentimenGlobalCard
                             collapsible, 4 quick indicator + komoditas panas
[6] MarketRiskCard         — sama
[7] Top Gainers / Losers   — sama
[8] Daftar saham           — sama
```

---

## 2. Komponen Baru: TrendingToolsSection

**Fungsi:** Menggantikan CommandCenter (4-card grid) dengan 6 ikon horizontal scroll. Setiap ikon punya sublabel dinamis berdasarkan data live dari RADAR_MARKET.

### Enam Tools & Data Yang Dibutuhkan

| Icon | Label | Sublabel Dinamis | Sumber Data |
|------|-------|-----------------|-------------|
| 💎 | Bandar | `N ACC` (saham dengan phase IGNITION/EARLY_ACC/STRONG_TREND) | RADAR_MARKET |
| 📡 | Radar | `N Saham` (total saham, exclude IDX* dan COMPOSITE) | RADAR_MARKET |
| 🎯 | Stockpick | `N Entry` (saham phase IGNITION) | RADAR_MARKET |
| 🔽 | Screener | `N Top Flow` (saham dengan bandarScore ≥ 65) | RADAR_MARKET |
| 🔄 | Sektor | "Rotasi" (static label) | — |
| 🌐 | Global | "VIX & FX" (static label) | — |

### Logika Phase Derivation dari RADAR_MARKET

Phase diderivasi di sisi mobile dari field `flowState` dan `bandarScore`:

```
flowState.includes("STRONG ACCUMULATION") && bandarScore >= 65  → "IGNITION"
flowState.includes("STRONG ACCUMULATION")                       → "EARLY_ACC"
flowState.includes("ACCUMULATION") && trendScore >= 60          → "STRONG_TREND"
flowState.includes("ACCUMULATION")                              → "EARLY_ACC"
flowState.includes("STRONG DISTRIBUTION")                       → "DISTRIBUTION"
flowState.includes("DISTRIBUTION")                              → "EXHAUSTION"
default                                                         → "CHURNING"
```

### Field RADAR_MARKET Yang Dibutuhkan

Komponen ini sudah menggunakan endpoint proxy `RADAR_MARKET` yang sudah ada. Field yang wajib ada:

| Field | Tipe | Keterangan |
|-------|------|------------|
| `ticker` | string | Kode saham (e.g. "BBCA", "IDX30") |
| `flowState` | string | Dari kolom FlowState — dipakai untuk derivasi phase |
| `bandarScore` | number | 0–100, dari kolom BandarScore |
| `trendScore` | number | 0–100, dari kolom TrendScore |

> **Catatan:** Saham dengan prefix `IDX` dan ticker `COMPOSITE` diexclude dari semua perhitungan statistik.

---

## 3. Komponen Baru: AnalisisKonteksSection

**Fungsi:** Menggantikan `SentimenGlobalCard`. Default collapsed (lipat). Saat collapsed, menampilkan 4 indikator cepat. Saat expand, menampilkan daftar komoditas yang bergerak ≥ 1.5%.

### Endpoint yang Digunakan

```
GET /api/global-sentiment
```

### Field `sentiment` yang Dibutuhkan Mobile

| Field | Tipe | Sumber / Keterangan | Status |
|-------|------|---------------------|--------|
| `vix` | number | Yahoo Finance ^VIX | ✅ Sudah ada |
| `fearLabel` | string | EXTREME_FEAR / FEAR / NEUTRAL / GREED / EXTREME_GREED | ✅ Sudah ada |
| `usdIdr` | number | Yahoo Finance USDIDR=X | ✅ Sudah ada |
| `dxyValue` | number | Yahoo Finance DX-Y.NYB | ✅ Sudah ada |
| `globalBias` | string | RISK_OFF / MIXED / RISK_ON | ✅ Sudah ada |
| **`ihsgAboveMA20`** | **boolean** | **IHSG close > MA20? (perlu dihitung backend)** | ❌ **BELUM ADA** |

> **⚠️ Action Required:** Field `ihsgAboveMA20` **belum ada** di response `/api/global-sentiment`. Mobile menggunakan field ini untuk menampilkan status IHSG vs MA20 (▲ MA20 hijau / ▼ MA20 merah) pada panel 4 indikator.

### Field `commodities[]` yang Dibutuhkan Mobile

| Field | Tipe | Keterangan |
|-------|------|------------|
| `name` | string | Nama komoditas |
| `changePct` | number | Perubahan % hari ini |

Mobile hanya menampilkan komoditas yang `value > 0 AND abs(changePct) >= 1.5%` sebagai "komoditas panas".

> **⚠️ Catatan penting:** Nickel, Tin, dan CPO Palm Oil kadang return `value: 0` dari Yahoo Finance (terutama LME instruments). Selalu filter `value > 0` terlebih dahulu sebelum cek `changePct`, agar item tanpa data tidak ikut ditampilkan.
>
> ```typescript
> const komoditasPanas = (data.commodities ?? [])
>   .filter(c => c.value != null && c.value > 0 && Math.abs(c.changePct ?? 0) >= 1.5)
>   .sort((a, b) => Math.abs(b.changePct!) - Math.abs(a.changePct!));
> ```

Response saat ini sudah menyertakan:
- `WTI Crude Oil` (CL=F)
- `Brent Crude Oil` (BZ=F)
- `Gold` (GC=F)

> **Rekomendasi Tambahan (opsional):** Tambah komoditas lain seperti Nickel, Coal, CPO, Silver agar panel "Komoditas Panas" lebih informatif untuk konteks IDX. Ini tidak wajib untuk launch.

---

## 4. Ringkasan Action Required untuk Web App

### Wajib (Blocking untuk Launch Fitur Baru)

| # | Perubahan | Endpoint | Detail |
|---|-----------|----------|--------|
| 1 | **Tambah field `ihsgAboveMA20`** | `GET /api/global-sentiment` | Boolean — true jika IHSG close > MA20 (simple moving average 20 hari). Gunakan data Yahoo Finance ^JKSE yang sudah difetch. |

### Cara Kalkulasi `ihsgAboveMA20`

```typescript
// Pseudocode — di file globalSentiment.ts

// Data IHSG sudah difetch via Yahoo Finance ^JKSE
// Perlu fetch historical close 20 hari terakhir untuk kalkulasi MA20
// Alternatif sederhana: fetch data dari stockbotpro.replit.app
//   yang sudah punya IHSG history

const ihsgClose = ihsgQ.value;       // harga close hari ini
const ihsgMA20  = /* rata-rata close 20 hari */ ;
const ihsgAboveMA20 = ihsgClose > ihsgMA20;

// Tambahkan ke response sentiment:
sentiment: {
  vix,
  fearLabel,
  usdIdr,
  dxyValue,
  dxyBias,
  globalBias,
  ihsgAboveMA20,   // ← tambahkan ini
}
```

### Opsional (Tidak Blocking)

| # | Perubahan | Detail |
|---|-----------|--------|
| 2 | Tambah komoditas ke `commodities[]` | Nickel, Coal, CPO, Silver, dll — agar "Komoditas Panas" lebih kaya |

---

## 5. Field RADAR_MARKET — Referensi Lengkap

Berikut field RADAR_MARKET yang digunakan oleh komponen-komponen Home Screen. Semua sudah tersedia via proxy `/api/proxy/RADAR_MARKET`:

| Field Mobile | Kolom Raw | Digunakan oleh |
|-------------|-----------|----------------|
| `ticker` | `Ticker` | Semua komponen |
| `flowState` | `FlowState` | Phase derivation (TrendingTools, CommandCenter, SignalSnapshot, PhaseDistribution) |
| `bandarScore` | `BandarScore` | Phase derivation, Smart Money stats, Market Risk Score |
| `trendScore` | `TrendScore` | Phase derivation |
| `nbs1d` | `NBS1D` | Flow stats (Net Buy/Sell 1 day) |
| `chgPct` | `Chg_Pct` | Market Risk Score (IHSG direction) |
| `close` | `Close` | Gainers/Losers, detail saham |
| `signal1d` | Field derivasi internal | Market Risk Score (Distribution count) |
| `phase` | `Phase` | Display phase label |

---

## 6. Tampilan Indikator di AnalisisKonteksSection

Berikut tampilan 4 indikator yang akan selalu terlihat (collapsed state):

```
┌─────────────────────────────────────────────────────┐
│ 🌐 Analisis Konteks IDX  [Global: RISK ON]    ↻  ▼ │
│                                                      │
│  VIX        USD/IDR      DXY       IHSG              │
│  18.2        16,250      103.1    ▲ MA20             │
│  NEUTRAL     (gray)     (gray)   (green/red)         │
└─────────────────────────────────────────────────────┘
```

- **VIX**: warna merah jika ≥ 25, kuning jika ≥ 20, hijau jika < 20
- **USD/IDR**: abu (tidak ada threshold warna)
- **DXY**: abu (tidak ada threshold warna)
- **IHSG**: hijau "▲ MA20" jika `ihsgAboveMA20 = true`, merah "▼ MA20" jika false

---

*Dokumen ini dibuat: 12 April 2026*
*Mobile version: Stock Insight Mobile (Expo)*
*API server: stockbotpro.replit.app/api*
