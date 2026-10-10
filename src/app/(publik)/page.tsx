"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KATEGORI } from "@/lib/seed";
import { TombolWa } from "@/components/ui";

const LANGKAH = [
  { img: "/img/icons/harga.png", judul: "Cek kisaran biaya", isi: "Pilih tipe HP & keluhan, langsung tahu perkiraan biaya dan lama pengerjaan." },
  { img: "/img/icons/jadwal.png", judul: "Reservasi jadwal", isi: "Pilih tanggal & jam datang. Konfirmasi dan pengingat dikirim via WhatsApp." },
  { img: "/img/icons/terima.png", judul: "Serah terima tercatat", isi: "Kondisi HP difoto & dicatat, Anda tanda tangan nota digital di layar." },
  { img: "/img/icons/cek.png", judul: "Pengecekan teknisi", isi: "Teknisi mendiagnosa dan mengirim rincian biaya final ke WhatsApp Anda." },
  { img: "/img/icons/perbaikan.png", judul: "Dikerjakan setelah Anda setuju", isi: "Tidak ada biaya tambahan tanpa persetujuan Anda — termasuk kerusakan baru." },
  { img: "/img/icons/selesai.png", judul: "Uji coba & siap diambil", isi: "Pantau progres kapan saja. Notifikasi masuk saat HP siap diambil." },
  { img: "/img/icons/garansi.png", judul: "Garansi digital", isi: "Kartu garansi otomatis terbit, klaim cukup dari halaman lacak servis." },
  { img: "/img/icons/ambil.png", judul: "Ambil & bayar", isi: "Bayar tunai, transfer, atau QRIS. Kwitansi langsung masuk WhatsApp." },
];

export default function Beranda() {
  const router = useRouter();
  const [nomor, setNomor] = useState("");
  return (
    <>
      <section className="relative overflow-hidden bg-brand-900">
        <Image src="/img/hero.jpg" alt="Teknisi Firman Service memperbaiki HP" fill priority className="object-cover object-right opacity-90" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900 via-brand-900/85 to-brand-900/10" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 ring-1 ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> Biaya jelas di depan · Garansi digital
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Servis HP tanpa
              <br />
              <span className="text-accent-400">tebak-tebakan.</span>
            </h1>
            <p className="mt-4 text-lg text-brand-100">
              Cek kisaran biaya sebelum datang, setujui biaya dari HP Anda, dan pantau progres servis kapan saja tanpa perlu bertanya.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/estimasi" className="btn-accent px-6 py-3 text-base">
                Cek Estimasi Biaya
              </Link>
              <Link href="/reservasi" className="btn bg-white/10 px-6 py-3 text-base text-white ring-1 ring-white/30 hover:bg-white/20">
                Reservasi Jadwal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 max-w-6xl px-4">
        <form
          className="card relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/lacak?nomor=${encodeURIComponent(nomor.trim().toUpperCase())}`);
          }}
        >
          <div className="flex items-center gap-3 sm:w-64">
            <Image src="/img/icons/cek.png" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
            <div>
              <p className="font-bold">Lacak servis Anda</p>
              <p className="text-xs text-slate-500">Tanpa login, cukup nomor servis</p>
            </div>
          </div>
          <input className="input flex-1" placeholder="Nomor servis, mis. FS-251011-007" value={nomor} onChange={(e) => setNomor(e.target.value)} />
          <button className="btn-primary">Lacak</button>
        </form>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent-600">Layanan</p>
            <h2 className="text-2xl font-extrabold tracking-tight">Keluhan HP Anda apa?</h2>
          </div>
          <Link href="/jasa" className="text-sm font-semibold text-brand-600">
            Semua jasa →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {KATEGORI.map((k) => (
            <Link key={k.id} href={`/jasa#${k.id}`} className="card group flex flex-col items-center p-4 text-center transition hover:-translate-y-0.5 hover:ring-brand-300">
              <div className="mb-2 flex h-24 w-full items-center justify-center rounded-xl bg-gradient-to-b from-brand-50 to-white">
                <Image src={k.gambar} alt="" width={120} height={96} className="h-20 w-auto object-contain transition group-hover:scale-105" />
              </div>
              <span className="text-sm font-semibold">{k.nama}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent-600">Alur servis</p>
        <h2 className="mb-6 text-2xl font-extrabold tracking-tight">Transparan dari awal sampai garansi</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LANGKAH.map((l, i) => (
            <div key={l.judul} className="card p-5">
              <div className="flex items-start justify-between">
                <Image src={l.img} alt="" width={72} height={72} className="h-16 w-16 object-contain" />
                <span className="text-3xl font-extrabold text-brand-100">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="mt-3 font-bold">{l.judul}</p>
              <p className="mt-1 text-sm text-slate-600">{l.isi}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-6xl items-center gap-8 px-4 lg:grid-cols-2">
        <div className="relative aspect-[16/10] overflow-hidden rounded-3xl">
          <Image src="/img/teknisi.jpg" alt="Teknisi bekerja di meja servis" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent-600">Kenapa Firman Service</p>
          <h2 className="text-2xl font-extrabold tracking-tight">Data Anda aman, biaya tidak berubah diam-diam.</h2>
          <ul className="mt-5 space-y-3 text-slate-700">
            {[
              "Kondisi HP difoto saat diterima — tidak ada sengketa lecet atau retak.",
              "Kode kunci hanya terlihat teknisi yang ditugaskan dan dihapus otomatis saat selesai.",
              "Setiap biaya, termasuk kerusakan tambahan, wajib Anda setujui dulu dari HP.",
              "Estimasi selesai diperbarui dengan alasan yang jelas bila ada perubahan.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">✓</span>
                {t}
              </li>
            ))}
          </ul>
          <TombolWa className="mt-6 max-w-sm" pesan="Halo Firman Service, saya mau konsultasi servis HP." />
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-brand-700">
          <Image src="/img/serah-terima.jpg" alt="" fill className="object-cover opacity-25" sizes="100vw" />
          <div className="relative flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
            <div>
              <h2 className="text-2xl font-extrabold text-white">Datang tanpa antre lama.</h2>
              <p className="mt-1 text-brand-100">Pilih slot jam yang masih kosong, kami siapkan teknisinya.</p>
            </div>
            <Link href="/reservasi" className="btn-accent px-6 py-3 text-base">
              Pilih Jadwal
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
