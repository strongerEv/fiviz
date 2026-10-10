"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDb } from "@/lib/store";
import { namaHp, sisaHariGaransi } from "@/lib/logic";
import { tanggal, waktu } from "@/lib/format";
import { Izin } from "@/components/StaffShell";
import { Kosong } from "@/components/ui";

/** GRS-02: verifikasi klaim garansi, buat order garansi yang terhubung ke servis asal. */
function Daftar() {
  const { db, prosesKlaim } = useDb();
  const router = useRouter();
  const klaim = db.order.filter((o) => o.garansi?.klaim).sort((a, b) => b.garansi!.klaim!.waktu.localeCompare(a.garansi!.klaim!.waktu));
  const aktif = db.order.filter((o) => o.garansi?.status === "aktif" && sisaHariGaransi(o.garansi.berakhir) > 0 && !o.garansi.klaim);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Klaim garansi</h1>
      {klaim.length === 0 ? (
        <div className="card"><Kosong gambar="/img/icons/garansi.png" judul="Belum ada klaim">Klaim yang diajukan pelanggan dari halaman lacak akan muncul di sini.</Kosong></div>
      ) : (
        <div className="space-y-3">
          {klaim.map((o) => {
            const k = o.garansi!.klaim!;
            const p = db.pelanggan.find((x) => x.id === o.pelangganId)!;
            const sisa = sisaHariGaransi(o.garansi!.berakhir, new Date(k.waktu));
            const baru = k.orderBaruId ? db.order.find((x) => x.id === k.orderBaruId) : undefined;
            return (
              <div key={o.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/staf/order/${o.id}`} className="font-bold text-brand-700">{o.nomorServis}</Link>
                  <span className="text-sm text-slate-600">{namaHp(db, o.tipeHpId, o.tipeLain)} · {p.nama}</span>
                  <span className={`chip ml-auto ${k.status === "menunggu" ? "bg-amber-100 text-amber-800" : k.status === "diterima" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{k.status}</span>
                </div>
                <p className="mt-2 text-sm">“{k.keluhan}” <span className="text-xs text-slate-500">· {waktu(k.waktu)}</span></p>
                <p className="mt-1 text-xs text-slate-500">
                  Garansi s.d. {tanggal(o.garansi!.berakhir)} ({sisa > 0 ? `masih ${sisa} hari saat klaim` : "sudah habis saat klaim"}) · {o.garansi!.cakupan.join("; ")}
                </p>
                {k.alasan && <p className="mt-1 text-sm text-slate-600">Catatan: {k.alasan}</p>}
                {k.status === "menunggu" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => {
                        prosesKlaim(o.id, true, "Klaim diterima, HP diperiksa ulang tanpa biaya.");
                        router.push(`/staf/order/baru?klaim=${o.id}`);
                      }}
                    >
                      Terima & buat order garansi
                    </button>
                    <button className="btn-danger btn-sm" onClick={() => { const a = prompt("Alasan penolakan (dilihat pelanggan)?"); if (a) prosesKlaim(o.id, false, a); }}>Tolak</button>
                  </div>
                )}
                {k.status === "diterima" && !baru && <Link href={`/staf/order/baru?klaim=${o.id}`} className="btn-primary btn-sm mt-3">Buat order garansi</Link>}
                {baru && <Link href={`/staf/order/${baru.id}`} className="mt-2 inline-block text-sm font-semibold text-brand-600">Order garansi {baru.nomorServis} →</Link>}
              </div>
            );
          })}
        </div>
      )}
      <section>
        <h2 className="mb-2 font-bold">Garansi aktif ({aktif.length})</h2>
        <div className="card divide-y divide-slate-100 text-sm">
          {aktif.map((o) => (
            <Link key={o.id} href={`/staf/order/${o.id}`} className="flex flex-wrap justify-between gap-2 p-3 hover:bg-slate-50">
              <span><b>{o.nomorServis}</b> · {namaHp(db, o.tipeHpId, o.tipeLain)}</span>
              <span className="text-slate-500">sisa {sisaHariGaransi(o.garansi!.berakhir)} hari</span>
            </Link>
          ))}
          {!aktif.length && <p className="p-3 text-slate-500">Tidak ada.</p>}
        </div>
      </section>
    </div>
  );
}

export default function Halaman() {
  return <Izin peran={["pemilik", "admin"]}><Daftar /></Izin>;
}
