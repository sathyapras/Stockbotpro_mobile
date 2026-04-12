# Score & Metrics — Panduan Lengkap

Dokumen ini menjelaskan semua angka/skor yang ditampilkan di Stock Insight Mobile
agar tidak ada kebingungan antar metrik.

---

## TA SCORE (Ring — Kanan Atas Halaman Saham)

**Sumber:** `verdict.score` — dihitung oleh sistem analisis chart internal  
**Skala:** 0 – 100  
**Tampilan:** Ring lingkaran berwarna di pojok kanan atas halaman detail saham

### Komponen pembentuk TA Score:
| Komponen | Bobot |
|---|---|
| Signal Count screener (×15) | Dinamis |
| Trend (MA20 vs MA50) | +/− poin |
| Momentum (RSI zone) | +/− poin |
| MACD signal | +/− poin |
| Volume relatif | +/− poin |
| Bollinger Band posisi | +/− poin |

### Interpretasi:
| Nilai | Warna | Arti |
|---|---|---|
| 70 – 100 | Hijau | Setup kuat — layak dipertimbangkan |
| 40 – 69 | Kuning/Amber | Netral — tunggu konfirmasi |
| 0 – 39 | Merah | Lemah — hindari masuk |

---

## SIGNAL COUNT (Section Relative Strength & Score)

**Sumber:** `quote.totalScore` — dari data screener radar harian  
**Skala:** 0 – 7 (jumlah sinyal aktif)  
**Tampilan:** Kolom ketiga di section "RELATIVE STRENGTH & SCORE" tab TA & FA

### Perbedaan dengan TA SCORE:
Signal Count **bukan skor**, melainkan **jumlah sinyal teknikal yang aktif** pada hari itu
berdasarkan data screener. Nilainya bisa 0 meski TA Score tinggi karena:
- TA Score dihitung dari data chart real-time (candle historis)
- Signal Count diambil dari snapshot screener harian yang mungkin belum terupdate

### Contoh:
- Signal Count = 0 → Tidak ada sinyal screener aktif hari ini
- Signal Count = 5 → 5 dari 7 kriteria screener terpenuhi (bullish kuat)

---

## RS vs IHSG (Relative Strength)

**Sumber:** Net return saham vs return IHSG dalam periode tertentu  
**Skala:** Rasio (contoh: 1.23 = saham +23% lebih kuat dari IHSG)  
**Acuan:**
- > 1.0 → Saham lebih kuat dari IHSG (outperform) → hijau
- < 1.0 → Saham lebih lemah dari IHSG (underperform) → merah

---

## RS MA (Moving Average Relative Strength)

**Sumber:** Rata-rata bergerak dari RS vs IHSG  
**Kegunaan:** Memperhalus fluktuasi harian RS — tren RS yang lebih stabil  
**Interpretasi:** RS MA > 1 dan naik = tren outperform sedang menguat

---

## Flow Score (Smart Money)

**Sumber:** `bandarScore` dari data radar — dihitung dari aktivitas broker dominan  
**Skala:** 0 – 100  
**Tampilan:** Di SmartMoney tab dan halaman detail → section Broker History 15D

### Komponen:
- Dominansi Prime Flow (SM1)
- Konsistensi akumulasi (accDays vs distDays)
- Momentum net buy/sell 3 hari dan 5 hari
- Delta net value (perubahan intensitas)

---

## VWAP Big Money

**Sumber:** Volume-Weighted Average Price dari transaksi broker dominan  
**Kegunaan:** Harga rata-rata di mana "big money" masuk/keluar  
**Interpretasi:**
- Harga saham di atas VWAP → akumulasi di bawah harga saat ini (bullish)
- Harga saham di bawah VWAP → big money sudah profit, waspada distribusi

---

## Tren Score (Radar Market)

**Sumber:** `trendScore` dari data radar  
**Skala:** 0 – 100  
**Kegunaan:** Dipakai di halaman Stockpick dan Command Center untuk ranking saham  
**Perbedaan dengan TA Score:** Tren Score lebih fokus ke kekuatan tren harga dan volume,
sedangkan TA Score lebih komprehensif (termasuk oscillator dan momentum)

---

*Dokumen ini diperbarui setiap ada penambahan atau perubahan metrik di aplikasi.*
