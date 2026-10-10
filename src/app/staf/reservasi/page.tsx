"use client";

import Link from "next/link";
import { useState } from "react";
import { linkReservasi, useDb } from "@/lib/store";
import { namaHp, waLink } from "@/lib/logic";
import { tanggal, ymd } from "@/lib/format";
import { Izin } from "@/components/StaffShell";
import { IkonWa, Kosong } from "@/components/ui";

const LABEL = { terjadwal: "Terjadwal", datang: "Datang", batal: "Batal", no_show: "No-show" } as const;
const WARNA = { terjadwal: "bg-brand-100 text-brand-800", datang: "bg-emerald-100 text-emerald-700", batal: "bg-red-100 text-red-700", no_show: "bg-slate-200 text-slate-700" } as const;

/** RSV-06: daftar reservasi hari ini + terima walk-in. */
function Daftar() {
  const { db, statusReservasi } = useDb();
  const [tgl, setTgl] = useState(ymd(new Date()));
  const list = db.reservasi.filter((r) => r.tanggal === tgl).sort((a, b) => a.slot.localeCompare(b.slot));
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-extrabold tracking-tight">Reservasi</h1>
        <input type="date" className="input w-auto" value={tgl} onChange={(e) => setTgl(e.target.value)} />
        <Link href="/staf/order/baru" className="btn-primary">＋ Walk-in</Link>
      </div>
      <p className="mb-3 text-sm text-slate-500">{tanggal(`${tgl}T00:00:00`)} · kapasitas {db.toko.kapasitasSlot} per slot {db.toko.slotMenit} menit</p>
      {list.length === 0 ? (
        <div className="card"><Kosong gambar="/img/icons/jadwal.png" judul="Tidak ada reservasi">Pelanggan tanpa reservasi bisa langsung diterima sebagai walk-in.</Kosong></div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {list.map((r) => {
            const p = db.pelanggan.find((x) => x.id === r.pelangganId)!;
            const order = r.orderId ? db.order.find((o) => o.id === r.orderId) : undefined;
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="rounded-lg bg-brand-600 px-2.5 py-1.5 font-bold text-white">{r.slot}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.nama} <span className={`chip ml-1 ${WARNA[r.status]}`}>{LABEL[r.status]}</span></p>
                  <p className="text-sm text-slate-600">{namaHp(db, r.tipeHpId, r.tipeLain)} · {r.keluhan}</p>
                  {r.catatan && <p className="text-xs text-slate-500">Catatan: {r.catatan}</p>}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.foto && <a href={r.foto} target="_blank" rel="noopener noreferrer"><img src={r.foto} alt="Foto kerusakan" className="h-12 w-12 rounded-lg object-cover" /></a>}
                <div className="flex flex-wrap gap-2">
                  <a className="btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={waLink(p.noWa, `Halo ${p.nama.split(" ")[0]}, kami dari ${db.toko.nama} terkait reservasi Anda pukul ${r.slot}. Detail: ${linkReservasi(r.token)}`)}><IkonWa /> WA</a>
                  {r.status === "terjadwal" && (
                    <>
                      <Link href={`/staf/order/baru?reservasi=${r.id}`} className="btn-primary btn-sm">Terima HP</Link>
                      <button className="btn-ghost btn-sm" onClick={() => statusReservasi(r.id, "no_show")}>No-show</button>
                      <button className="btn-danger btn-sm" onClick={() => confirm("Batalkan reservasi?") && statusReservasi(r.id, "batal")}>Batal</button>
                    </>
                  )}
                  {order && <Link href={`/staf/order/${order.id}`} className="btn-ghost btn-sm">{order.nomorServis}</Link>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Halaman() {
  return <Izin peran={["pemilik", "admin"]}><Daftar /></Izin>;
}
