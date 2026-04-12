# Smart Money Flow — Terminologi & Narasi

## Konsep Dasar
Smart Money Flow mengukur aktivitas broker dominan berdasarkan volume transaksi kumulatif.
Makin besar volume yang dikuasai kelompok broker, makin kuat sinyal yang ditampilkan.

---

## Tiga Lapisan Smart Money

### Prime Flow (SM1) — Pelaku Inti
> **"Smart Money entry tahap awal"**

- Representasi: Broker #1 terbesar berdasarkan net volume di saham tersebut
- Makna: Ini adalah pemain paling dominan — biasanya institusi besar atau reksa dana besar
- Sinyal kuat: Jika Prime Flow = "Big Acc", artinya satu broker dominan sedang akumulasi besar-besaran
- Warna UI: Ungu (`#a78bfa`)

### Alpha Flow (SM3) — Pemain Aktif
> **"Institusi dan big players mengikuti"**

- Representasi: Agregat net volume top 3 broker terbesar
- Makna: Mengukur konsensus antara beberapa pemain besar — jika SM1 dan SM3 sama-sama "Big Acc", konfirmasi lebih kuat
- Sinyal kuat: Ketika Alpha Flow searah dengan Prime Flow, momentum lebih terpercaya
- Warna UI: Biru (`#60a5fa`)

### Echo Flow (SM5) — Jejak Pasar
> **"Crowd effect — market mulai mengikuti"**

- Representasi: Agregat net volume top 5 broker terbesar
- Makna: Mencerminkan seberapa luas partisipasi pemain besar — ketika SM5 juga positif, artinya crowd besar sudah masuk
- Peringatan: Echo Flow bisa jadi lagging indicator — jika SM1 mulai distribusi tapi SM5 masih acc, waspadai jebakan
- Warna UI: Hijau (`#34d399`)

---

## Label Interpretasi

| Label | Arti |
|---|---|
| Big Acc | Akumulasi besar — net beli signifikan |
| Mild Acc | Akumulasi ringan — beli moderat |
| Neutral | Seimbang — tidak ada dominasi jelas |
| Mild Dist | Distribusi ringan — jual moderat |
| Big Dist | Distribusi besar — net jual signifikan |

---

## Cara Baca Kombinasi

| Prime | Alpha | Echo | Sinyal |
|---|---|---|---|
| Big Acc | Big Acc | Big Acc | ✅ Sangat kuat — semua level akumulasi |
| Big Acc | Big Acc | Neutral | ✅ Kuat — institusi masuk, crowd belum |
| Big Acc | Neutral | Mild Dist | ⚠️ Mixed — hanya satu pemain dominan |
| Neutral | Neutral | Big Acc | 🔴 Hati-hati — bisa jebakan retail |
| Big Dist | Big Dist | Big Dist | 🔴 Distribusi masif — hindari masuk |

---

*Narasi ini digunakan untuk tutorial dan onboarding pengguna Stock Insight Mobile.*
