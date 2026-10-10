"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { linkReservasi, useStore } from "@/lib/store";
import { namaHp, ringkasEstimasi } from "@/lib/logic";
import { normalisasiWa, tanggal as fmtTanggal } from "@/lib/format";
import { Judul, Memuat, TombolWa } from "@/components/ui";
import { PilihHp } from "@/components/PilihHp";
import { PilihSlot } from "@/components/PilihSlot";
import { FotoInput } from "@/components/FotoInput";
import type { Reservasi } from "@/lib/types";

function FormReservasi() {
  const store = useStore();
  const { db } = store;
  const q = useSearchParams();
  const jasaAwal = q.get("jasa")?.split(",").filter(Boolean) ?? [];
  const [nama, setNama] = useState(q.get("nama") ?? "");
  const [wa, setWa] = useState("");
  const [tipeId, setTipeId] = useState<string | undefined>(q.get("tipe") ?? undefined);
  const [tipeLain, setTipeLain] = useState<string | undefined>(q.get("lain") ?? undefined);
  const [keluhan, setKeluhan] = useState(() => (db ? jasaAwal.map((j) => db.jasa.find((x) => x.id === j)?.nama).filter(Boolean).join(", ") : ""));
  const [catatan, setCatatan] = useState("");
  const [foto, setFoto] = useState<string[]>([]);
  const [tgl, setTgl] = useState("");
  const [slot, setSlot] = useState("");
  const [hasil, setHasil] = useState<Reservasi>();
  const [galat, setGalat] = useState("");

  const siap = !!db;
  useEffect(() => {
    if (!siap || !jasaAwal.length) return;
    setKeluhan((k) => k || jasaAwal.map((j) => db!.jasa.find((x) => x.id === j)?.nama).filter(Boolean).join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap]);

  if (!db) return <Memuat />;

  if (hasil) {
    const hp = namaHp(db, hasil.tipeHpId, hasil.tipeLain);
    const est = hasil.tipeHpId && jasaAwal.length ? ringkasEstimasi(db, hasil.tipeHpId, jasaAwal.map((jasaId) => ({ jasaId }))) : "";
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <Image src="/img/icons/jadwal.png" alt="" width={120} height={120} className="mx-auto h-28 w-28 object-contain" />
        <h1 className="mt-4 text-2xl font-extrabold">Reservasi tercatat!</h1>
        <p className="mt-2 text-slate-600">
          Sampai jumpa <b>{fmtTanggal(`${hasil.tanggal}T00:00:00`)}</b> pukul <b>{hasil.slot}</b>.
        </p>
        <div className="card mt-6 space-y-1 p-4 text-left text-sm">
          <p><span className="text-slate-500">Nama:</span> {nama}</p>
          <p><span className="text-slate-500">HP:</span> {hp}</p>
          <p><span className="text-slate-500">Keluhan:</span> {hasil.keluhan}</p>
          <p><span className="text-slate-500">Alamat:</span> {db.toko.alamat}</p>
        </div>
        <p className="mt-4 text-sm text-slate-500">Konfirmasi dan pengingat (H-1 & 2 jam sebelum jadwal) dikirim ke WhatsApp {wa}. Anda bisa membatalkan atau menjadwal ulang lewat link di pesan tersebut.</p>
        <div className="mt-6 grid gap-3">
          <Link href={`/reservasi/${hasil.token}`} className="btn-primary py-3">
            Lihat / ubah reservasi
          </Link>
          <TombolWa
            label="Kirim detail ke WA toko"
            pesan={`Halo Firman Service, saya ${nama} sudah reservasi ${fmtTanggal(`${hasil.tanggal}T00:00:00`)} pukul ${hasil.slot}.\nHP: ${hp}\nKeluhan: ${hasil.keluhan}${est ? `\n\nEstimasi dari aplikasi:\n${est}` : ""}\n\nLink reservasi: ${linkReservasi(hasil.token)}`}
          />
        </div>
      </div>
    );
  }

  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    setGalat("");
    if (normalisasiWa(wa).length < 10) return setGalat("Nomor WhatsApp belum valid.");
    if (!tipeId && !tipeLain) return setGalat("Pilih atau ketik tipe HP Anda.");
    if (!tgl || !slot) return setGalat("Pilih tanggal dan jam kedatangan.");
    const r = store.buatReservasi({ nama, noWa: wa, tanggal: tgl, slot, tipeHpId: tipeId, tipeLain: tipeId ? undefined : tipeLain, keluhan, jasaIds: jasaAwal, catatan, foto: foto[0] });
    setHasil(r);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Judul kecil="Reservasi" sub={`Pilih jadwal kedatangan. Toko buka ${db.toko.jamBuka}–${db.toko.jamTutup} WIB.`}>
        Atur jadwal servis
      </Judul>
      <form onSubmit={kirim} className="space-y-5">
        <div className="card p-5">
          <h2 className="mb-3 font-bold">1. Kapan Anda datang?</h2>
          <PilihSlot db={db} tanggal={tgl} slot={slot} onUbah={(t, s) => { setTgl(t); setSlot(s); }} />
          {tgl && slot && <p className="mt-3 text-sm font-medium text-emerald-700">✓ {fmtTanggal(`${tgl}T00:00:00`)}, pukul {slot}</p>}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-bold">2. HP & keluhan</h2>
          <PilihHp tipeHp={db.tipeHp} nilai={tipeId} tipeLain={tipeLain} onPilih={(id, l) => { setTipeId(id); setTipeLain(l); }} />
          <label className="label mt-4" htmlFor="keluhan">Keluhan</label>
          <textarea id="keluhan" required className="input min-h-20" value={keluhan} onChange={(e) => setKeluhan(e.target.value)} placeholder="mis. Layar retak, touchscreen masih berfungsi" />
          <label className="label mt-4" htmlFor="catatan">Catatan (opsional)</label>
          <input id="catatan" className="input" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. Mohon pakai sparepart original" />
          <p className="label mt-4">Foto kerusakan (opsional)</p>
          <FotoInput nilai={foto} onUbah={setFoto} maks={1} label="Foto" />
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-bold">3. Data Anda</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="nama">Nama</label>
              <input id="nama" required className="input" value={nama} onChange={(e) => setNama(e.target.value)} autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="wa">Nomor WhatsApp</label>
              <input id="wa" required inputMode="tel" className="input" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xxxxxxxxxx" autoComplete="tel" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Data Anda hanya dipakai untuk keperluan servis sesuai UU Pelindungan Data Pribadi.</p>
        </div>
        {galat && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{galat}</p>}
        <button className="btn-primary w-full py-3 text-base">Konfirmasi Reservasi</button>
      </form>
    </div>
  );
}

export default function Halaman() {
  return (
    <Suspense fallback={<Memuat />}>
      <FormReservasi />
    </Suspense>
  );
}
