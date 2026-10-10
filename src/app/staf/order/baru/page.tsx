"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useDb } from "@/lib/store";
import { KATEGORI } from "@/lib/seed";
import { durasi, normalisasiWa, waktu } from "@/lib/format";
import { hitungEstimasiSelesai, sarankanTeknisi } from "@/lib/logic";
import { PilihHp } from "@/components/PilihHp";
import { FotoInput } from "@/components/FotoInput";
import { TandaTangan } from "@/components/TandaTangan";
import { Izin } from "@/components/StaffShell";
import { Memuat } from "@/components/ui";
import type { KondisiAwal, Prioritas } from "@/lib/types";

const OPSI_KONDISI: Record<"layar" | "body" | "kamera" | "tombol", string[]> = {
  layar: ["Mulus", "Gores halus", "Retak", "Pecah parah", "Bergaris/blank"],
  body: ["Mulus", "Lecet halus", "Lecet berat", "Penyok", "Retak"],
  kamera: ["Normal", "Kaca retak", "Buram", "Tidak berfungsi", "Tidak dicek"],
  tombol: ["Normal", "Keras", "Tidak berfungsi", "Tidak dicek"],
};
const KELENGKAPAN = ["Charger", "Kabel data", "Case", "SIM card", "Memori", "Dus"];

function FormTerima() {
  const store = useDb();
  const { db } = store;
  const router = useRouter();
  const q = useSearchParams();
  const rsv = db.reservasi.find((r) => r.id === q.get("reservasi"));
  const asal = db.order.find((o) => o.id === q.get("klaim"));
  const plgAwal = db.pelanggan.find((p) => p.id === (rsv?.pelangganId ?? asal?.pelangganId));

  const [nama, setNama] = useState(plgAwal?.nama ?? "");
  const [wa, setWa] = useState(plgAwal ? `0${plgAwal.noWa.slice(2)}` : "");
  const [tipeId, setTipeId] = useState(rsv?.tipeHpId ?? asal?.tipeHpId);
  const [tipeLain, setTipeLain] = useState(rsv?.tipeLain ?? asal?.tipeLain);
  const [keluhan, setKeluhan] = useState(asal?.garansi?.klaim?.keluhan ?? rsv?.keluhan ?? "");
  const [jasa, setJasa] = useState<string[]>(asal?.jasaIdDiminta ?? rsv?.jasaIds ?? []);
  const [kondisi, setKondisi] = useState<KondisiAwal>({ layar: "Mulus", body: "Mulus", kamera: "Normal", tombol: "Normal", menyala: true, catatan: "" });
  const [foto, setFoto] = useState<string[]>(rsv?.foto ? [rsv.foto] : []);
  const [kelengkapan, setKelengkapan] = useState<string[]>([]);
  const [jenisKunci, setJenisKunci] = useState("Tidak ada");
  const [kode, setKode] = useState("");
  const [prioritas, setPrioritas] = useState<Prioritas>("normal");
  const [teknisiId, setTeknisiId] = useState<string>();
  const [setujuSyarat, setSetujuSyarat] = useState(false);
  const [ttd, setTtd] = useState("");
  const [galat, setGalat] = useState("");

  const saran = sarankanTeknisi(db, tipeId, jasa);
  useEffect(() => {
    if (!teknisiId && saran[0]) setTeknisiId(saran[0].staf.id);
  }, [saran, teknisiId]);

  const pelangganLama = db.pelanggan.find((p) => p.noWa === normalisasiWa(wa) && wa.length >= 10);
  const est = hitungEstimasiSelesai(db, { items: [], jasaIdDiminta: jasa, tipeHpId: tipeId, teknisiId, prioritas });

  const simpan = (e: React.FormEvent) => {
    e.preventDefault();
    setGalat("");
    if (normalisasiWa(wa).length < 10) return setGalat("Nomor WA belum valid.");
    if (!tipeId && !tipeLain) return setGalat("Isi tipe HP.");
    if (foto.length < 2) return setGalat("Minimal 2 foto kondisi HP.");
    if (!setujuSyarat || !ttd) return setGalat("Pelanggan perlu menyetujui syarat servis dan tanda tangan.");
    const o = store.buatOrder({
      reservasiId: rsv?.id, nama: nama || pelangganLama?.nama || "Pelanggan", noWa: wa, tipeHpId: tipeId, tipeLain: tipeId ? undefined : tipeLain, keluhan,
      jasaIdDiminta: jasa, kondisiAwal: kondisi, fotoKondisi: foto, kelengkapan,
      kodeKunci: jenisKunci !== "Tidak ada" && kode ? `${jenisKunci}: ${kode}` : undefined,
      ttdPelanggan: ttd, teknisiId, prioritas, servisAsalId: asal?.id,
    });
    if (asal) store.tautkanKlaim(asal.id, o.id);
    router.push(`/staf/order/${o.id}?baru=1`);
  };

  return (
    <form onSubmit={simpan} className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{asal ? "Order servis garansi" : "Terima HP"}</h1>
        <p className="text-sm text-slate-500">
          {rsv ? `Dari reservasi ${rsv.slot} · ` : asal ? `Klaim garansi dari ${asal.nomorServis} · biaya Rp0 · ` : "Walk-in · "}
          nomor servis dibuat otomatis
        </p>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">Pelanggan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="wa">Nomor WhatsApp</label>
            <input id="wa" required inputMode="tel" className="input" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xxxxxxxxxx" />
            {pelangganLama && !plgAwal && <p className="mt-1 text-xs text-emerald-700">Pelanggan lama: {pelangganLama.nama}</p>}
          </div>
          <div>
            <label className="label" htmlFor="nama">Nama</label>
            <input id="nama" className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder={pelangganLama?.nama} />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">HP & keluhan</h2>
        <PilihHp tipeHp={db.tipeHp} nilai={tipeId} tipeLain={tipeLain} onPilih={(id, l) => { setTipeId(id); setTipeLain(l); }} />
        <label className="label mt-4" htmlFor="keluhan">Keluhan</label>
        <textarea id="keluhan" required className="input min-h-16" value={keluhan} onChange={(e) => setKeluhan(e.target.value)} />
        <p className="label mt-4">Perkiraan jasa (untuk estimasi selesai)</p>
        <div className="flex flex-wrap gap-2">
          {db.jasa.filter((j) => j.aktif).map((j) => {
            const on = jasa.includes(j.id);
            return (
              <button type="button" key={j.id} onClick={() => setJasa(on ? jasa.filter((x) => x !== j.id) : [...jasa, j.id])}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${on ? "bg-brand-600 text-white ring-brand-600" : "ring-slate-200"}`}
                title={KATEGORI.find((k) => k.id === j.kategori)?.nama}>
                {j.nama}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">Kondisi awal</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(OPSI_KONDISI) as (keyof typeof OPSI_KONDISI)[]).map((k) => (
            <div key={k}>
              <label className="label capitalize" htmlFor={k}>{k}</label>
              <select id={k} className="input" value={kondisi[k]} onChange={(e) => setKondisi({ ...kondisi, [k]: e.target.value })}>
                {OPSI_KONDISI[k].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4" checked={kondisi.menyala} onChange={(e) => setKondisi({ ...kondisi, menyala: e.target.checked })} />
          HP bisa menyala
        </label>
        <label className="label mt-4" htmlFor="catk">Catatan kondisi</label>
        <input id="catk" className="input" value={kondisi.catatan} onChange={(e) => setKondisi({ ...kondisi, catatan: e.target.value })} placeholder="mis. retak pojok kanan atas, lecet di frame bawah" />
        <p className="label mt-4">Foto kondisi HP (minimal 2: depan & belakang)</p>
        <FotoInput nilai={foto} onUbah={setFoto} maks={6} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">Kelengkapan & kode kunci</h2>
        <div className="flex flex-wrap gap-2">
          {KELENGKAPAN.map((k) => {
            const on = kelengkapan.includes(k);
            return (
              <button type="button" key={k} onClick={() => setKelengkapan(on ? kelengkapan.filter((x) => x !== k) : [...kelengkapan, k])}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${on ? "bg-brand-600 text-white ring-brand-600" : "ring-slate-200"}`}>
                {on ? "✓ " : ""}{k}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="jk">Kunci layar</label>
            <select id="jk" className="input" value={jenisKunci} onChange={(e) => setJenisKunci(e.target.value)}>
              {["Tidak ada", "PIN", "Pola", "Password", "Tidak diberikan"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          {["PIN", "Pola", "Password"].includes(jenisKunci) && (
            <div className="sm:col-span-2">
              <label className="label" htmlFor="kode">Kode {jenisKunci.toLowerCase()} {jenisKunci === "Pola" && "(urutan titik 1–9, mis. 1-4-7-8-9)"}</label>
              <input id="kode" className="input" value={kode} onChange={(e) => setKode(e.target.value)} autoComplete="off" />
              <p className="mt-1 text-xs text-slate-500">Hanya terlihat oleh teknisi yang ditugaskan & dihapus otomatis saat servis selesai.</p>
            </div>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">Prioritas & teknisi</h2>
        <div className="grid grid-cols-2 gap-2">
          {(["normal", "ekspres"] as const).map((p) => (
            <button type="button" key={p} onClick={() => setPrioritas(p)} className={`rounded-xl p-3 text-left ring-1 ${prioritas === p ? "bg-brand-50 ring-2 ring-brand-500" : "ring-slate-200"}`}>
              <span className="block font-semibold capitalize">{p}</span>
              <span className="text-xs text-slate-500">{p === "normal" ? "Sesuai antrean" : asal ? "Didahulukan" : `Didahulukan · +Rp${db.toko.biayaEkspres.toLocaleString("id-ID")}`}</span>
            </button>
          ))}
        </div>
        <p className="label mt-4">Tugaskan ke teknisi <span className="font-normal text-slate-500">(urut: keahlian sesuai & antrean paling sedikit)</span></p>
        <div className="grid gap-2 sm:grid-cols-2">
          {saran.map((s, i) => (
            <button type="button" key={s.staf.id} onClick={() => setTeknisiId(s.staf.id)} className={`rounded-xl p-3 text-left ring-1 ${teknisiId === s.staf.id ? "bg-brand-50 ring-2 ring-brand-500" : "ring-slate-200"}`}>
              <span className="flex items-center justify-between">
                <span className="font-semibold">{s.staf.nama}</span>
                {i === 0 && <span className="chip bg-emerald-100 text-emerald-700">Disarankan</span>}
              </span>
              <span className="block text-xs text-slate-500">{s.aktif} servis aktif · antrean ±{durasi(s.beban)}</span>
              <span className="block text-xs text-slate-500">{s.staf.keahlian.join(", ")}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">Estimasi selesai otomatis: <b>{waktu(est)}</b></p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">Syarat servis & tanda tangan</h2>
        <div className="max-h-40 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{db.toko.syaratServis}</div>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={setujuSyarat} onChange={(e) => setSetujuSyarat(e.target.checked)} />
          Pelanggan telah membaca dan menyetujui syarat servis.
        </label>
        <div className="mt-3"><TandaTangan onUbah={setTtd} /></div>
      </section>

      {galat && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{galat}</p>}
      <button className="btn-primary w-full py-3 text-base">Simpan & buat nota</button>
    </form>
  );
}

export default function Halaman() {
  return (
    <Izin peran={["pemilik", "admin"]}>
      <Suspense fallback={<Memuat />}>
        <FormTerima />
      </Suspense>
    </Izin>
  );
}
