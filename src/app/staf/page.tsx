"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDb } from "@/lib/store";
import { namaHp, STATUS_AKTIF, terlambat } from "@/lib/logic";
import { pengingatJatuhTempo } from "@/lib/pengingat";
import { rupiah, tanggal, ymd } from "@/lib/format";
import { OrderKartu } from "@/components/OrderKartu";
import { Kosong } from "@/components/ui";

function Stat({ label, nilai, warna = "text-slate-900", href }: { label: string; nilai: string | number; warna?: string; href?: string }) {
  const isi = (
    <div className="card h-full p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tracking-tight ${warna}`}>{nilai}</p>
    </div>
  );
  return href ? <Link href={href}>{isi}</Link> : isi;
}

export default function Dashboard() {
  const { db, staf, kirimPengingat } = useDb();
  const router = useRouter();
  useEffect(() => {
    if (staf?.peran === "teknisi") router.replace("/staf/tugas");
  }, [staf, router]);
  if (staf?.peran === "teknisi") return null;

  const now = new Date();
  const hariIni = ymd(now);
  const bulanIni = hariIni.slice(0, 7);
  const masuk = db.order.filter((o) => ymd(new Date(o.dibuat)) === hariIni);
  const selesai = db.order.filter((o) => o.selesai && ymd(new Date(o.selesai)) === hariIni);
  const aktif = db.order.filter((o) => STATUS_AKTIF.includes(o.status));
  const telat = aktif.filter((o) => terlambat(o, now));
  const dibayar = db.order.filter((o) => o.pembayaran);
  const pendHari = dibayar.filter((o) => ymd(new Date(o.pembayaran!.waktu)) === hariIni).reduce((s, o) => s + o.pembayaran!.nominal, 0);
  const pendBulan = dibayar.filter((o) => ymd(new Date(o.pembayaran!.waktu)).startsWith(bulanIni)).reduce((s, o) => s + o.pembayaran!.nominal, 0);
  const reservasi = db.reservasi.filter((r) => r.tanggal === hariIni && r.status === "terjadwal").sort((a, b) => a.slot.localeCompare(b.slot));
  const siapAmbil = db.order.filter((o) => o.status === "siap_diambil");
  const pengingat = pengingatJatuhTempo(db, now);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{tanggal(now)}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Halo, {staf?.nama} 👋</h1>
        </div>
        <Link href="/staf/order/baru" className="btn-primary">＋ Terima HP</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Masuk hari ini" nilai={masuk.length} />
        <Stat label="Selesai hari ini" nilai={selesai.length} warna="text-emerald-600" />
        <Stat label="Servis aktif" nilai={aktif.length} warna="text-brand-700" href="/staf/antrean" />
        <Stat label="Lewat estimasi" nilai={telat.length} warna={telat.length ? "text-red-600" : "text-slate-900"} href="/staf/antrean?telat=1" />
        <Stat label="Pendapatan hari ini" nilai={rupiah(pendHari)} />
        <Stat label="Pendapatan bulan ini" nilai={rupiah(pendBulan)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-bold">Perlu perhatian</h2>
          {telat.length + siapAmbil.length === 0 ? (
            <Kosong gambar="/img/icons/selesai.png" judul="Semua aman">Tidak ada servis terlambat atau menunggu diambil.</Kosong>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {telat.map((o) => <OrderKartu key={o.id} db={db} o={o} />)}
              {siapAmbil.map((o) => <OrderKartu key={o.id} db={db} o={o} />)}
            </div>
          )}
        </section>
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Reservasi hari ini</h2>
            <Link href="/staf/reservasi" className="text-sm font-semibold text-brand-600">Semua →</Link>
          </div>
          {reservasi.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada reservasi tersisa hari ini.</p>
          ) : (
            <ul className="space-y-2">
              {reservasi.map((r) => {
                const p = db.pelanggan.find((x) => x.id === r.pelangganId)!;
                return (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                    <span className="rounded-lg bg-brand-600 px-2 py-1 text-sm font-bold text-white">{r.slot}</span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate font-semibold">{p.nama}</p>
                      <p className="truncate text-xs text-slate-500">{namaHp(db, r.tipeHpId, r.tipeLain)} · {r.keluhan}</p>
                    </div>
                    <Link href={`/staf/order/baru?reservasi=${r.id}`} className="btn-primary btn-sm">Terima</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6 p-4">
        <h2 className="mb-1 font-bold">Pengingat otomatis jatuh tempo</h2>
        <p className="mb-3 text-sm text-slate-500">Pengingat reservasi H-1 & 2 jam, HP belum diambil &gt; 7 hari, dan garansi yang akan berakhir.</p>
        {pengingat.length === 0 ? (
          <p className="text-sm text-slate-500">Tidak ada pengingat yang perlu dikirim.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pengingat.map((x) => (
              <li key={x.kunci} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="chip bg-brand-50 text-brand-700">{x.jenis}</span>
                <span className="flex-1 text-sm">{x.untuk}</span>
                <button className="btn-ghost btn-sm" onClick={() => kirimPengingat(x)}>Masukkan antrean WA</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
