"use client";

import Link from "next/link";
import { useDb } from "@/lib/store";
import { bolehPindah, langkahBerikut, namaHp, STATUS_AKTIF, STATUS_LABEL, terlambat } from "@/lib/logic";
import { waktu } from "@/lib/format";
import { Kosong, StatusBadge } from "@/components/ui";

/** ANT-03: teknisi melihat tugasnya & mengubah status dengan satu ketukan. */
export default function Tugas() {
  const { db, staf, ubahStatus } = useDb();
  const tugas = db.order
    .filter((o) => o.teknisiId === staf?.id && (STATUS_AKTIF.includes(o.status) || o.status === "siap_diambil"))
    .sort((a, b) => (b.prioritas === "ekspres" ? 1 : 0) - (a.prioritas === "ekspres" ? 1 : 0) || a.estimasiSelesai.localeCompare(b.estimasiSelesai));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Tugas saya</h1>
      <p className="mb-4 text-sm text-slate-500">{tugas.filter((o) => o.status !== "siap_diambil").length} servis aktif · urut prioritas & estimasi</p>
      {tugas.length === 0 && <Kosong gambar="/img/icons/perbaikan.png" judul="Belum ada tugas">Servis yang ditugaskan ke Anda akan muncul di sini.</Kosong>}
      <div className="space-y-3">
        {tugas.map((o) => {
          const next = langkahBerikut(o);
          const blokir = next ? bolehPindah(o, next) : null;
          const menunggu = o.persetujuan.some((p) => p.status === "menunggu");
          const telat = terlambat(o);
          return (
            <div key={o.id} className={`card p-4 ${telat ? "ring-2 ring-red-300" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <Link href={`/staf/order/${o.id}`} className="min-w-0">
                  <p className="text-xs font-bold text-brand-700">{o.nomorServis} {o.prioritas === "ekspres" && <span className="chip ml-1 bg-accent-500 text-white">Ekspres</span>}</p>
                  <p className="font-semibold">{namaHp(db, o.tipeHpId, o.tipeLain)}</p>
                  <p className="line-clamp-2 text-sm text-slate-600">{o.keluhan}</p>
                </Link>
                <StatusBadge status={o.status} />
              </div>
              <p className={`mt-2 text-xs ${telat ? "font-bold text-red-600" : "text-slate-500"}`}>{telat ? "⚠ Lewat estimasi " : "Estimasi "}{waktu(o.estimasiSelesai)}</p>
              <div className="mt-3 flex gap-2">
                {next && !blokir ? (
                  <button className="btn-primary flex-1 py-3" onClick={() => ubahStatus(o.id, next)}>
                    Tandai {STATUS_LABEL[next]}
                  </button>
                ) : (o.status === "diterima" || o.status === "pengecekan") && !menunggu ? (
                  <Link href={`/staf/order/${o.id}`} className="btn-accent flex-1 py-3">Kirim diagnosa & biaya</Link>
                ) : (
                  <p className="flex-1 rounded-xl bg-slate-50 p-3 text-center text-sm text-slate-500">{menunggu ? "Menunggu persetujuan pelanggan" : blokir ?? "Menunggu diambil pelanggan"}</p>
                )}
                <Link href={`/staf/order/${o.id}`} className="btn-ghost">Detail</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
