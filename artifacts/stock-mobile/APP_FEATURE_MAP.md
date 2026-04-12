# Stock Insight Mobile — Peta Fitur Lengkap

Dokumen ini mencatat semua menu, tab, dan fitur yang ada di aplikasi.
Digunakan sebagai referensi untuk pembuatan tutorial.

---

## NAVIGASI UTAMA (Footer Tab Bar)

| Tab | Icon | Keterangan |
|---|---|---|
| **Market** | 📊 | Halaman utama — ringkasan pasar + Command Center |
| **Watchlist** | 🔖 | Daftar saham yang diikuti pengguna |
| **Stockpick** | ⭐ | Sinyal BOW & BOS harian |
| **Trade Log** | 📋 | Jurnal trading personal |
| **Stock Tools** | 🔧 | 18 strategi screener |

> Tab tersembunyi (accessible via Command Center):
> - **Smart Money** — Flow broker dominan
> - **Flow / Bandar** — Buy/Sell pressure

---

## 1. MARKET (Halaman Utama)

### Section-section di halaman Market:
1. **Header** — IHSG price, global sentiment badge (Risk On/Off/Mixed)
2. **Sentiment Bar** — kondisi pasar saat ini
3. **Command Center** — 6 shortcut menu utama:
   - 🎯 STOCKPICK (BOW & BOS)
   - ⚡ FLOW (Buy/Sell Pressure)
   - 💎 SMART MONEY (Broker Intel)
   - 📡 RADAR (Market Intel)
   - 🔄 SECTOR ROTATION (Market Breadth)
   - 🔭 MARKET INTEL (Broker + Flow + Radar)
4. **Radar Market Overview** — statistik fase: Ignition/Accumulation/Distribution
5. **Global Sentiment** — kondisi makro (dapat diklik untuk detail)

---

## 2. WATCHLIST

- Tambah saham ke watchlist (tap bintang di halaman saham)
- Hapus dari watchlist
- Tap saham → masuk ke halaman detail saham
- Data: harga, perubahan %, volume

---

## 3. STOCKPICK

- Filter: **BOW** (Buy on Weakness) vs **BOS** (Buy on Strength)
- Card per saham: harga, signal, NBS score, tren
- Tap → halaman detail saham dengan tab Trading Plan aktif
- Sort otomatis berdasarkan sinyal terkuat

---

## 4. TRADE LOG

- **Summary Bar**: Total Trade · Win Rate · Total P&L · Open Positions
- **Filter**: SEMUA / OPEN / CLOSED
- **TradeCard**: Ticker, sinyal (BOW/BOS), badge status, grid harga (Entry/SL/TP1/TP2/Exit), P&L%, hold days, catatan
- **Tambah Trade**: modal form lengkap
- **Tutup Posisi**: modal dengan preview P&L real-time sebelum konfirmasi
- **Hapus Trade**: konfirmasi dialog
- Pull-to-refresh

---

## 5. STOCK TOOLS (Screener Strategi)

Total: **18 strategi** dalam **5 kategori**

### Momentum — Saham dengan tenaga naik kuat
| ID | Nama | Deskripsi |
|---|---|---|
| buy-on-strength | Buy on Strength | Momentum kuat · Close di atas VWAP |
| swing-up | Swing Up | Lonjakan >5% dalam sehari · volume konfirmasi |
| near-52w-high | Near 52W High | Mendekati harga tertinggi 52 minggu |
| volume-spike | Volume Spike | Volume meledak >200% avg50D |

### Reversal — Saham siap berbalik arah naik
| ID | Nama | Deskripsi |
|---|---|---|
| buy-on-weakness | Buy on Weakness | Turun >1% — potensi rebound |
| near-support-bounce | Near Support | Close dekat support — buy saat bounce |
| hl-higher-low | Higher Low | Higher low 3 hari — trend reversal |
| bullish-divergence | Bullish Divergence | Harga LL, RSI HL — reversal bullish |

### Breakout — Saham siap menembus level kunci
| ID | Nama | Deskripsi |
|---|---|---|
| price-vol-breakout | Price+Vol Breakout | Breakout harga + volume — konfirmasi kuat |
| darvas-box | Darvas Box | Breakout box Darvas — setup klasik |
| bb-squeeze | BB Squeeze | Bollinger Band sempit — siap meledak |
| buy-on-retest | Buy on Retest | Retest level breakout — konfirmasi ulang |

### Smart Money — Jejak akumulasi institusi
| ID | Nama | Deskripsi |
|---|---|---|
| nbs-multi-tf | NBS Multi-TF | Net Buy RS outperform — multi timeframe |
| volume-increasing-3d | Volume 3D Rising | Volume naik 3 hari — akumulasi bersih |
| rsi-divergence | RSI Divergence | Divergence RSI tersembunyi — momentum kuat |

### Advanced — SEPA & VCP — setup kelas institusi
| ID | Nama | Deskripsi |
|---|---|---|
| sepa | SEPA Setup | Stage 2 Trend + RS Strong + Breakout — Minervini |
| vcp-setup | VCP Setup | Volatility Contraction — range kecil, volume dry |
| vcp-breakout | VCP Breakout | VCP trigger — breakout dengan volume konfirmasi |

### Dalam halaman hasil strategi:
- Sort: Kekuatan / Perubahan / Volume / Harga / RS
- Filter: semua saham vs hasil filter
- Card: ticker, harga, % change, volume, RS score
- Tap → halaman detail saham

---

## 6. SMART MONEY (via Command Center)

- List saham terurut by Flow Score
- Phase: IGNITION / EARLY_ACC / STRONG_TREND / EXHAUSTION / DISTRIBUTION / CHURNING
- Per card: Ticker · Phase badge · avg3d flow · Flow Score
- Label: Prime / Alpha / Echo (SM1/SM3/SM5)
- Filter: phase, score
- Info tooltip: cara baca Prime/Alpha/Echo Flow
- Pull-to-refresh

---

## 7. HALAMAN DETAIL SAHAM (`/stock/[code]`)

### Tab-tab di halaman saham:
| Tab | Isi |
|---|---|
| **Trading Plan** | Signal BOW/BOS, Entry/SL/TP1/TP2, verdict, Robo Commentary |
| **Chart** | Candlestick historis 1/3/6 bulan & 1 tahun, MA10/MA20, Support & Resistance |
| **TA & FA** | Fundamental (PB/PEG/EPS/ROE), narasi FA, Support/Resistance, RS, Signal Count |
| **Smart Money** | Broker History 15D, Prime/Alpha/Echo Flow, VWAP, B/S bar, sparkline |

### Info di header saham:
- Harga + perubahan %
- TA SCORE ring (0–100)
- Trend 20/50, 52W High, Volume
- Badge: COMPUTED / WATCH / BOW / BOS

---

## 8. GLOBAL SENTIMENT (`/global-sentiment`)

### Data yang ditampilkan:
- **Status Global**: RISK ON / RISK OFF / MIXED + narasi AI
- **Indeks Global + IHSG**: S&P500, DJI, Nasdaq, Nikkei, IHSG (% change)
- **Nilai Tukar**: USD/IDR, perubahan
- **Komoditas**: Gold, Crude Oil, Coal (% change)
- **Analisis Naratif**: ringkasan kondisi makro dari AI (teks)

---

## 9. MARKET INTEL (`/market-intel`)

### Data yang ditampilkan:
- **SM Pulse Bar**: Akumulasi vs Distribusi (% saham)
- **Avg Flow Score**: rata-rata skor broker seluruh pasar
- **NBS Multi-TF**: 1D/5D/10D net buy/sell summary
- **Phase Distribution**: chart jumlah saham per fase (Ignition, Early Acc, dll)
- **Market Signal**: Konfirmasi Bullish / Bearish / Distribusi Tersembunyi / Buyer Trap
- **Top Saham**: rangking tertinggi per fase

---

## 10. SECTOR ROTATION (`/sector-rotation`)

- Phase per sektor: Leading / Lagging / Weakening / Recovering
- Tabel semua sektor IDX + status
- Color coding per fase

---

## 11. MENU / PROFIL (via hamburger ≡)

- Profil pengguna (jika login)
- Edit Profil
- Ganti Password
- Subscribe / Upgrade paket
- Afiliasi
- Pengaturan (Notifikasi, Tema)
- Tentang Aplikasi
- Hubungi Kami
- Logout

---

## 12. AUTH FLOW

| Layar | Fungsi |
|---|---|
| Splash | Loading awal, cek token |
| Login | Email + password, lupa password |
| Sign Up | Daftar akun baru |
| Forgot Password | Reset via email |
| Subscribe | Pilih paket Pro/Elite/Enterprise + durasi 1/3/6/12 bulan |
| Payment (Midtrans) | WebView checkout |
| Payment Success | Konfirmasi + ringkasan fitur |

---

## TERMINOLOGI KUNCI

| Istilah | Arti |
|---|---|
| BOW | Buy on Weakness — sinyal beli saat harga tertekan |
| BOS | Buy on Strength — sinyal beli saat momentum kuat |
| Prime Flow | SM1 — broker #1 terbesar (pelaku inti) |
| Alpha Flow | SM3 — top 3 broker (institusi + big players) |
| Echo Flow | SM5 — top 5 broker (crowd effect) |
| NBS | Net Buy Side — selisih volume beli vs jual broker |
| Ignition | Fase akumulasi tersembunyi — Smart Money entry |
| TA SCORE | Skor teknikal gabungan 0–100 (dari chart) |
| Signal Count | Jumlah sinyal screener aktif 0–7 |
| Flow Score | Skor aktivitas broker dominan 0–100 |
| VWAP Big Money | Rata-rata harga entry big money |

---

*Diperbarui: April 2026 — untuk kebutuhan pembuatan tutorial lengkap.*
