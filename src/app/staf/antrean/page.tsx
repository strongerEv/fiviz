"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useDb } from "@/lib/store";
import { STATUS_LABEL, terlambat } from "@/lib/logic";
import { OrderKartu } from "@/components/OrderKartu";
import { Memuat } from "@/components/ui";
import type { StatusServis } from "@/lib/types";

const KOLOM: StatusServis[] = ["diterima", "pengecekan", "menunggu_persetujuan", "menunggu_sparepart", "dikerjakan", "uji_coba", "siap_diambil"];

/** ANT-01: papan antrean per status, filter teknisi, tanda lewat estimasi. */
function Papan() {
  const { db, staf } = useDb();
  const q = useSearchParams();
  const [teknisi, setTeknisi] = useState(staf?.peran === "teknisi" ? staf.id : "semua");
  const [hanyaTelat, setHanyaTelat] = useState(q.get("telat") === "1");
  const [cari, setCari] = useState("");
  const list = db.order.filter(
    (o) =>
      KOLOM.includes(o.status) &&
      (teknisi === "semua" || (teknisi === "-" ? !o.teknisiId : o.teknisiId === teknisi)) &&
      (!hanyaTelat || terlambat(o)) &&
      (!cari || `${o.nomorServis} ${o.keluhan} ${db.pelanggan.find((p) => p.id === o.pelangganId)?.nama}`.toLowerCase().includes(cari.toLowerCase())),
  );
  const urut = (a: (typeof list)[0], b: (typeof list)[0]) =>
    (b.prioritas === "ekspres" ? 1 : 0) - (a.prioritas === "ekspres" ? 1 : 0) || a.estimasiSelesai.localeCompare(b.estimasiSelesai);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-extrabold tracking-tight">Antrean servis</h1>
        <input className="input w-full sm:w-56" placeholder="Cari nomor / nama / keluhan" value={cari} onChange={(e) => setCari(e.target.value)} />
        <select className="input w-auto" value={teknisi} onChange={(e) => setTeknisi(e.target.value)}>
          <option value="semua">Semua teknisi</option>
          <option value="-">Belum ditugaskan</option>
          {db.staf.filter((s) => s.peran === "teknisi").map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={hanyaTelat} onChange={(e) => setHanyaTelat(e.target.checked)} /> Lewat estimasi
        </label>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        {KOLOM.map((k) => {
          const isi = list.filter((o) => o.status === k).sort(urut);
          return (
            <div key={k} className="w-72 shrink-0 rounded-2xl bg-slate-100/80 p-2.5">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-sm font-bold">{STATUS_LABEL[k]}</p>
                <span className="rounded-full bg-white px-2 text-xs font-semibold text-slate-600">{isi.length}</span>
              </div>
              <div className="space-y-2">
                {isi.map((o) => <OrderKartu key={o.id} db={db} o={o} ringkas />)}
                {!isi.length && <p className="px-1 py-6 text-center text-xs text-slate-400">Kosong</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Halaman() {
  return <Suspense fallback={<Memuat />}><Papan /></Suspense>;
}
