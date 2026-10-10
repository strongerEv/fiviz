# Fiviz — Firman Service

Aplikasi web (responsif & bisa dipasang sebagai PWA) untuk jasa servis HP **Firman Service**, dibangun dari PRD V1.

## Fitur V1

**Pelanggan (tanpa login)**
- **Katalog jasa & harga** per kategori kerusakan, harga pasti/kisaran per tipe HP & kualitas sparepart (Original/OEM/KW), cari tipe HP dengan autocomplete — `/jasa`
- **Estimasi biaya mandiri**: merek → tipe → keluhan (multi) → kualitas → total kisaran, lama pengerjaan, garansi, disclaimer; lanjut ke Reservasi/WA dengan data terisi — `/estimasi`
- **Konsultasi WhatsApp** dengan pesan otomatis & info jam layanan (di halaman jasa, estimasi, lacak)
- **Reservasi** tanggal + slot jam sesuai jam buka & kapasitas; link kelola untuk batal/jadwal ulang — `/reservasi`
- **Lacak servis** via link unik atau nomor servis + 4 digit WA; progres, riwayat & catatan teknisi, estimasi selesai beserta alasan perubahan, nota digital — `/lacak`
- **Persetujuan biaya** (awal & tambahan) Setuju/Tolak dari HP, tercatat waktu & perangkat
- **Kartu garansi digital** & klaim garansi

**Staf** (`/staf`)
- Dashboard: servis masuk/selesai/aktif/terlambat, pendapatan hari & bulan ini, reservasi hari ini, pengingat jatuh tempo (H-1, 2 jam, belum diambil 7 hari, garansi hampir habis)
- Terima HP (dari reservasi/walk-in): nomor servis `FS-YYMMDD-NNN`, checklist kondisi, min. 2 foto, kelengkapan, kode kunci, tanda tangan digital, saran teknisi (keahlian & antrean), estimasi selesai otomatis, prioritas ekspres
- Papan antrean (kanban) + filter teknisi & tanda lewat estimasi; "Tugas Saya" teknisi dengan ubah status satu ketukan
- Diagnosa & biaya → persetujuan pelanggan (pekerjaan diblokir sampai disetujui), biaya tambahan, catat persetujuan telepon, ubah estimasi wajib beralasan
- Pembayaran (tunai/transfer/QRIS manual, diskon wajib beralasan) → garansi terbit otomatis, kode kunci terhapus
- Nota thermal 58/80 mm (cetak), antrean notifikasi WA, verifikasi klaim garansi → order garansi terhubung (Rp0)
- Katalog & harga (tambah/ubah/nonaktifkan, impor & ekspor Excel/CSV), laporan pendapatan per periode/jasa/teknisi + performa (ekspor Excel, cetak PDF), pengaturan toko, template WA, akun staf

Akses per peran: **Pemilik** (semua), **Admin/kasir**, **Teknisi**.

## Menjalankan

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

### Mode demo
Versi ini berjalan **langsung tanpa backend**: data disimpan di `localStorage` browser dan sudah terisi katalog (37 tipe HP × 15 jasa) serta contoh transaksi.

- Login staf: **Firman 1111** (pemilik), **Rina 2222** (admin), **Budi 3333** & **Andi 4444** (teknisi)
- Lacak demo: buka `/lacak/demodinda`, atau nomor servis contoh + 4 digit `1234`
- Reset data: Staf → Pengaturan → Reset data demo

Batasan mode demo: data hanya ada di browser yang sama (halaman lacak dari HP lain tidak akan menemukan order), PIN staf disimpan apa adanya, dan notifikasi WA dikirim manual lewat tombol **Kirim** (wa.me) dari antrean Notifikasi WA.

## Menuju produksi (Supabase + Vercel)

Skema database lengkap dengan RLS ada di `supabase/migrations/0001_init.sql`:
tabel sesuai Model Data PRD, `cabang_id` untuk multi-cabang, RLS per peran, kode kunci terenkripsi (`pgcrypto`) yang hanya bisa dibuka teknisi yang ditugaskan dan terhapus otomatis lewat trigger, serta RPC publik `lacak_servis`, `jawab_persetujuan`, `klaim_garansi` agar pelanggan tak menyentuh tabel langsung.

Langkah berikutnya:
1. Buat proyek Supabase khusus Firman Service, jalankan migrasi, buat akun staf di Supabase Auth.
2. Ganti lapisan data `src/lib/store.tsx` (semua aksi sudah terpusat di sana) dengan panggilan Supabase; foto ke bucket `foto-servis`.
3. Pasang penyedia WhatsApp Business API: kirim baris `notifikasi` berstatus `antri` dari Edge Function/cron, coba ulang bila gagal; pengingat H-1/2 jam/7 hari/garansi dijadwalkan dengan `pg_cron`.
4. Deploy ke Vercel.

## Struktur

```
src/lib/types.ts      model data
src/lib/seed.ts       katalog awal, syarat servis, template WA, data contoh
src/lib/logic.ts      aturan bisnis: status, estimasi, slot, nomor servis, tagihan, WA
src/lib/store.tsx     state + semua aksi (pengganti backend di mode demo)
src/app/(publik)/     halaman pelanggan
src/app/staf/         panel staf
supabase/migrations/  skema Postgres + RLS
```
