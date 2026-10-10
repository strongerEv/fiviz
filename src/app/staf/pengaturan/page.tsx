"use client";

import { useState } from "react";
import { useDb } from "@/lib/store";
import { uid } from "@/lib/logic";
import { normalisasiWa } from "@/lib/format";
import { Izin } from "@/components/StaffShell";
import type { Peran, Staf, TemplateKey, Toko } from "@/lib/types";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  konfirmasiReservasi: "Konfirmasi reservasi",
  pengingatReservasi: "Pengingat reservasi (H-1 / 2 jam)",
  notaServis: "Nota servis",
  perubahanStatus: "Perubahan status",
  mintaPersetujuan: "Minta persetujuan biaya",
  siapDiambil: "Siap diambil",
  pengingatAmbil: "Pengingat belum diambil",
  kwitansi: "Kwitansi",
  garansiBerakhir: "Garansi akan berakhir",
};

function Pengaturan() {
  const store = useDb();
  const { db } = store;
  const [toko, setToko] = useState<Toko>(db.toko);
  const [tersimpan, setTersimpan] = useState(false);
  const [staf, setStaf] = useState<Staf | null>(null);
  const ubah = <K extends keyof Toko>(k: K, v: Toko[K]) => { setToko({ ...toko, [k]: v }); setTersimpan(false); };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Pengaturan toko</h1>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); store.simpanToko({ ...toko, noWa: normalisasiWa(toko.noWa) }); setTersimpan(true); }}>
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Profil</h2>
          <div><label className="label">Nama toko</label><input className="input" value={toko.nama} onChange={(e) => ubah("nama", e.target.value)} /></div>
          <div><label className="label">Nomor WhatsApp</label><input className="input" value={toko.noWa} onChange={(e) => ubah("noWa", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label">Alamat</label><input className="input" value={toko.alamat} onChange={(e) => ubah("alamat", e.target.value)} /></div>
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Jam buka & reservasi</h2>
          <div><label className="label">Jam buka</label><input type="time" className="input" value={toko.jamBuka} onChange={(e) => ubah("jamBuka", e.target.value)} /></div>
          <div><label className="label">Jam tutup</label><input type="time" className="input" value={toko.jamTutup} onChange={(e) => ubah("jamTutup", e.target.value)} /></div>
          <div className="sm:col-span-2">
            <p className="label">Hari libur</p>
            <div className="flex flex-wrap gap-2">
              {HARI.map((h, i) => {
                const on = toko.hariLibur.includes(i);
                return <button type="button" key={h} onClick={() => ubah("hariLibur", on ? toko.hariLibur.filter((x) => x !== i) : [...toko.hariLibur, i])} className={`rounded-full px-3 py-1 text-sm ring-1 ${on ? "bg-red-50 text-red-700 ring-red-300" : "ring-slate-200"}`}>{h}</button>;
              })}
            </div>
          </div>
          <div><label className="label">Durasi slot (menit)</label><select className="input" value={toko.slotMenit} onChange={(e) => ubah("slotMenit", Number(e.target.value))}>{[15, 30, 60].map((m) => <option key={m}>{m}</option>)}</select></div>
          <div><label className="label">Kapasitas per slot</label><input type="number" min={1} className="input" value={toko.kapasitasSlot} onChange={(e) => ubah("kapasitasSlot", Math.max(1, Number(e.target.value)))} /></div>
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-3">
          <h2 className="font-bold sm:col-span-3">Kebijakan biaya</h2>
          <div><label className="label">Biaya cek bila ditolak (Rp)</label><input type="number" min={0} step={5000} className="input" value={toko.biayaCek} onChange={(e) => ubah("biayaCek", Number(e.target.value))} /><p className="mt-1 text-xs text-slate-500">0 = pengecekan gratis</p></div>
          <div><label className="label">Biaya ekspres (Rp)</label><input type="number" min={0} step={5000} className="input" value={toko.biayaEkspres} onChange={(e) => ubah("biayaEkspres", Number(e.target.value))} /></div>
          <div><label className="label">Batas simpan HP (hari)</label><input type="number" min={7} className="input" value={toko.batasSimpanHari} onChange={(e) => ubah("batasSimpanHari", Number(e.target.value))} /></div>
          <div className="sm:col-span-3"><label className="label">Syarat servis</label><textarea className="input min-h-48 text-sm" value={toko.syaratServis} onChange={(e) => ubah("syaratServis", e.target.value)} /></div>
        </section>
        <section className="card space-y-4 p-5">
          <div>
            <h2 className="font-bold">Template pesan WhatsApp</h2>
            <p className="text-xs text-slate-500">Variabel: {"{nama} {nomor} {hp} {status} {catatan} {link} {total} {estimasi} {tanggal} {slot} {keluhan} {diagnosa} {toko} {alamat} {metode} {berakhir} {sejak} {batas} {kapan}"}</p>
          </div>
          {(Object.keys(TEMPLATE_LABEL) as TemplateKey[]).map((k) => (
            <div key={k}><label className="label">{TEMPLATE_LABEL[k]}</label><textarea className="input min-h-24 font-mono text-xs" value={toko.template[k]} onChange={(e) => ubah("template", { ...toko.template, [k]: e.target.value })} /></div>
          ))}
        </section>
        <div className="sticky bottom-4 flex items-center justify-end gap-3">
          {tersimpan && <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Tersimpan ✓</span>}
          <button className="btn-primary px-6 py-3 shadow-lg">Simpan pengaturan</button>
        </div>
      </form>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Akun staf</h2>
          <button className="btn-primary btn-sm" onClick={() => setStaf({ id: uid(), cabangId: db.toko.id, nama: "", noHp: "", peran: "teknisi", keahlian: [], pin: "", aktif: true })}>＋ Staf</button>
        </div>
        <ul className="divide-y divide-slate-100">
          {db.staf.map((s) => (
            <li key={s.id} className={`flex items-center gap-3 py-2.5 ${s.aktif ? "" : "opacity-50"}`}>
              <div className="flex-1">
                <p className="font-semibold">{s.nama} <span className="text-xs font-normal capitalize text-slate-500">· {s.peran}</span></p>
                {s.keahlian.length > 0 && <p className="text-xs text-slate-500">{s.keahlian.join(", ")}</p>}
              </div>
              <button className="btn-ghost btn-sm" onClick={() => setStaf(s)}>Ubah</button>
            </li>
          ))}
        </ul>
        {staf && (
          <form className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); store.simpanStaf(staf); setStaf(null); }}>
            <div><label className="label">Nama</label><input required className="input" value={staf.nama} onChange={(e) => setStaf({ ...staf, nama: e.target.value })} /></div>
            <div><label className="label">No HP</label><input className="input" value={staf.noHp} onChange={(e) => setStaf({ ...staf, noHp: e.target.value })} /></div>
            <div><label className="label">Peran</label><select className="input" value={staf.peran} onChange={(e) => setStaf({ ...staf, peran: e.target.value as Peran })}><option value="pemilik">Pemilik</option><option value="admin">Admin / kasir</option><option value="teknisi">Teknisi</option></select></div>
            <div><label className="label">PIN</label><input required minLength={4} className="input" value={staf.pin} onChange={(e) => setStaf({ ...staf, pin: e.target.value.replace(/\D/g, "") })} /></div>
            <div className="sm:col-span-2"><label className="label">Keahlian (pisahkan koma)</label><input className="input" value={staf.keahlian.join(", ")} onChange={(e) => setStaf({ ...staf, keahlian: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} placeholder="iPhone, Android, Mesin/IC, Layar, Software, Kena Air" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={staf.aktif} onChange={(e) => setStaf({ ...staf, aktif: e.target.checked })} /> Aktif</label>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setStaf(null)}>Batal</button><button className="btn-primary">Simpan</button></div>
          </form>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-bold">Data demo</h2>
        <p className="mt-1 text-sm text-slate-500">Mode demo menyimpan data di browser ini. Reset untuk mengembalikan katalog & contoh transaksi awal.</p>
        <button className="btn-danger mt-3" onClick={() => confirm("Hapus semua data dan kembalikan data demo awal?") && store.resetDemo()}>Reset data demo</button>
      </section>
    </div>
  );
}

export default function Halaman() {
  return <Izin peran={["pemilik"]}><Pengaturan /></Izin>;
}
