"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState } from "react";
import { useStore } from "@/lib/store";
import { namaHp } from "@/lib/logic";
import { tanggal as fmtTanggal } from "@/lib/format";
import { Kosong, Memuat, TombolWa } from "@/components/ui";
import { PilihSlot } from "@/components/PilihSlot";

const LABEL = { terjadwal: "Terjadwal", datang: "Sudah datang", batal: "Dibatalkan", no_show: "Tidak datang" } as const;

/** RSV-05: batal / jadwal ulang lewat link di pesan WA. */
export default function KelolaReservasi({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const store = useStore();
  const { db } = store;
  const [ulang, setUlang] = useState(false);
  const [tgl, setTgl] = useState("");
  const [slot, setSlot] = useState("");
  if (!db) return <Memuat />;
  const r = db.reservasi.find((x) => x.token === token);
  if (!r) return <Kosong judul="Reservasi tidak ditemukan">Periksa kembali link dari pesan WhatsApp Anda.</Kosong>;
  const p = db.pelanggan.find((x) => x.id === r.pelangganId)!;
  const order = r.orderId ? db.order.find((o) => o.id === r.orderId) : undefined;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <Image src="/img/icons/jadwal.png" alt="" width={72} height={72} className="h-16 w-16 object-contain" />
          <div>
            <p className="text-sm text-slate-500">Reservasi a.n. {p.nama}</p>
            <p className="text-lg font-bold">{fmtTanggal(`${r.tanggal}T00:00:00`)}</p>
            <p className="text-brand-700">pukul {r.slot} WIB</p>
          </div>
        </div>
        <span className={`chip mt-4 ${r.status === "terjadwal" ? "bg-brand-100 text-brand-800" : r.status === "batal" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>{LABEL[r.status]}</span>
        <dl className="mt-4 space-y-1 text-sm">
          <div><dt className="inline text-slate-500">HP: </dt><dd className="inline">{namaHp(db, r.tipeHpId, r.tipeLain)}</dd></div>
          <div><dt className="inline text-slate-500">Keluhan: </dt><dd className="inline">{r.keluhan}</dd></div>
          <div><dt className="inline text-slate-500">Alamat: </dt><dd className="inline">{db.toko.alamat}</dd></div>
        </dl>
        {order && (
          <Link href={`/lacak/${order.token}`} className="btn-primary mt-5 w-full">
            Lacak servis {order.nomorServis}
          </Link>
        )}
        {r.status === "terjadwal" && !ulang && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button className="btn-ghost" onClick={() => setUlang(true)}>Jadwal ulang</button>
            <button className="btn-danger" onClick={() => confirm("Batalkan reservasi ini?") && store.statusReservasi(r.id, "batal")}>Batalkan</button>
          </div>
        )}
        {ulang && (
          <div className="mt-6">
            <p className="mb-2 font-semibold">Pilih jadwal baru</p>
            <PilihSlot db={db} tanggal={tgl} slot={slot} kecualiId={r.id} onUbah={(t, s) => { setTgl(t); setSlot(s); }} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="btn-ghost" onClick={() => setUlang(false)}>Batal</button>
              <button className="btn-primary" disabled={!tgl || !slot} onClick={() => { store.jadwalUlang(r.id, tgl, slot); setUlang(false); }}>Simpan jadwal</button>
            </div>
          </div>
        )}
      </div>
      <TombolWa className="mt-5" pesan={`Halo Firman Service, saya ${p.nama} ingin bertanya soal reservasi ${fmtTanggal(`${r.tanggal}T00:00:00`)} pukul ${r.slot}.`} />
    </div>
  );
}
