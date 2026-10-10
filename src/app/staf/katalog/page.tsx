"use client";

import { useRef, useState } from "react";
import { useDb } from "@/lib/store";
import { KATEGORI, KUALITAS_LABEL } from "@/lib/seed";
import { namaHp } from "@/lib/logic";
import { durasiKisaran, kisaran } from "@/lib/format";
import { bacaTabel, unduhExcel } from "@/lib/excel";
import { Izin } from "@/components/StaffShell";
import { PilihHp } from "@/components/PilihHp";
import { Modal } from "@/components/ui";
import type { HargaJasa, Jasa, Kualitas } from "@/lib/types";

const KOLOM = ["jasa_id", "merek", "tipe", "kualitas", "harga_min", "harga_max", "durasi_min_menit", "durasi_max_menit", "garansi_hari"];
const KUALITAS: Kualitas[] = ["original", "oem", "kw", "standar"];

function Katalog() {
  const store = useDb();
  const { db } = store;
  const [tab, setTab] = useState<"jasa" | "harga">("harga");
  const [tipeId, setTipeId] = useState<string>();
  const [editJasa, setEditJasa] = useState<Jasa | null>(null);
  const [editHarga, setEditHarga] = useState<HargaJasa | null>(null);
  const [tipeBaru, setTipeBaru] = useState({ buka: false, merek: "", tipe: "", seri: "" });
  const [hasilImpor, setHasilImpor] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const harga = tipeId ? db.harga.filter((h) => h.tipeHpId === tipeId).sort((a, b) => a.jasaId.localeCompare(b.jasaId)) : [];

  const impor = async (file: File) => {
    setHasilImpor("");
    try {
      const rows = await bacaTabel(file);
      const kepala = rows[0].map((c) => String(c ?? "").trim().toLowerCase());
      const idx = (k: string) => kepala.indexOf(k);
      if (KOLOM.some((k) => idx(k) < 0)) throw new Error(`Kolom wajib: ${KOLOM.join(", ")}`);
      const galat: string[] = [];
      const data = rows.slice(1).flatMap((r, i) => {
        const v = (k: string) => r[idx(k)];
        const jasaId = String(v("jasa_id") ?? "").trim();
        const kualitas = String(v("kualitas") ?? "standar").trim().toLowerCase() as Kualitas;
        if (!db.jasa.some((j) => j.id === jasaId)) { galat.push(`Baris ${i + 2}: jasa_id "${jasaId}" tidak dikenal`); return []; }
        if (!KUALITAS.includes(kualitas)) { galat.push(`Baris ${i + 2}: kualitas "${kualitas}" tidak valid`); return []; }
        const n = (k: string) => Number(String(v(k) ?? "0").replace(/[^\d]/g, ""));
        const hargaMin = n("harga_min");
        return [{ jasaId, merek: String(v("merek")).trim(), tipe: String(v("tipe")).trim(), kualitas, hargaMin, hargaMax: n("harga_max") || hargaMin, durasiMin: n("durasi_min_menit"), durasiMax: n("durasi_max_menit") || n("durasi_min_menit"), garansiHari: n("garansi_hari") }];
      });
      const { baru, diubah } = store.imporHarga(data);
      setHasilImpor(`Impor selesai: ${baru} harga baru, ${diubah} diperbarui.${galat.length ? `\n${galat.length} baris dilewati:\n${galat.slice(0, 8).join("\n")}` : ""}`);
    } catch (e) {
      setHasilImpor(`Gagal membaca file: ${(e as Error).message}`);
    }
  };

  const ekspor = () =>
    unduhExcel(
      [KOLOM, ...db.harga.filter((h) => h.aktif).map((h) => {
        const t = db.tipeHp.find((x) => x.id === h.tipeHpId);
        return [h.jasaId, t?.merek ?? "", t?.tipe ?? "", h.kualitas, h.hargaMin, h.hargaMax, h.durasiMin, h.durasiMax, h.garansiHari];
      })],
      "katalog-harga-firman-service.xlsx",
    );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-extrabold tracking-tight">Katalog & harga</h1>
        <button className="btn-ghost btn-sm" onClick={ekspor}>Ekspor Excel</button>
        <button className="btn-ghost btn-sm" onClick={() => unduhExcel([KOLOM, ["ganti-lcd", "Samsung", "Galaxy A16", "original", 900000, 1100000, 60, 120, 90]], "template-impor-harga.xlsx")}>Template</button>
        <button className="btn-primary btn-sm" onClick={() => fileRef.current?.click()}>Impor Excel/CSV</button>
        <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) impor(f); e.target.value = ""; }} />
      </div>
      {hasilImpor && <pre className="mb-4 whitespace-pre-wrap rounded-xl bg-brand-50 p-3 text-sm text-brand-900">{hasilImpor}</pre>}

      <div className="mb-4 flex rounded-xl bg-slate-100 p-1 text-sm font-semibold sm:w-fit">
        {(["harga", "jasa"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-4 py-1.5 ${tab === t ? "bg-white shadow" : "text-slate-500"}`}>{t === "harga" ? "Harga per tipe HP" : "Daftar jasa"}</button>
        ))}
      </div>

      {tab === "jasa" && (
        <div className="card divide-y divide-slate-100">
          <div className="flex justify-end p-3"><button className="btn-primary btn-sm" onClick={() => setEditJasa({ id: "", kategori: "lainnya", nama: "", deskripsi: "", aktif: true })}>＋ Jasa baru</button></div>
          {db.jasa.map((j) => (
            <div key={j.id} className={`flex flex-wrap items-center gap-3 p-3 ${j.aktif ? "" : "opacity-50"}`}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{j.nama} <span className="text-xs font-normal text-slate-400">({j.id})</span></p>
                <p className="text-xs text-slate-500">{KATEGORI.find((k) => k.id === j.kategori)?.nama} · {db.harga.filter((h) => h.jasaId === j.id && h.aktif).length} harga aktif</p>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => setEditJasa(j)}>Ubah</button>
              <button className="btn-ghost btn-sm" onClick={() => store.simpanJasa({ ...j, aktif: !j.aktif })}>{j.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
            </div>
          ))}
        </div>
      )}

      {tab === "harga" && (
        <>
          <div className="card mb-4 p-4">
            <PilihHp tipeHp={db.tipeHp} nilai={tipeId} onPilih={(id) => setTipeId(id)} izinkanLain={false} />
            <button className="mt-3 text-sm font-semibold text-brand-600" onClick={() => setTipeBaru({ ...tipeBaru, buka: true })}>＋ Tambah tipe HP baru</button>
          </div>
          {tipeId && (
            <div className="card overflow-x-auto">
              <div className="flex items-center justify-between p-3">
                <p className="font-bold">{namaHp(db, tipeId)}</p>
                <button className="btn-primary btn-sm" onClick={() => setEditHarga({ id: "", jasaId: db.jasa[0].id, tipeHpId: tipeId, kualitas: "standar", hargaMin: 0, hargaMax: 0, durasiMin: 60, durasiMax: 60, garansiHari: 0, aktif: true })}>＋ Harga</button>
              </div>
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr><th className="p-3">Jasa</th><th>Kualitas</th><th>Harga</th><th>Durasi</th><th>Garansi</th><th></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {harga.map((h) => (
                    <tr key={h.id} className={h.aktif ? "" : "opacity-40"}>
                      <td className="p-3 font-medium">{db.jasa.find((j) => j.id === h.jasaId)?.nama}</td>
                      <td>{KUALITAS_LABEL[h.kualitas]}</td>
                      <td>{kisaran(h.hargaMin, h.hargaMax)}</td>
                      <td>{durasiKisaran(h.durasiMin, h.durasiMax)}</td>
                      <td>{h.garansiHari} hr</td>
                      <td className="space-x-2 whitespace-nowrap pr-3 text-right">
                        <button className="font-semibold text-brand-600" onClick={() => setEditHarga(h)}>Ubah</button>
                        <button className="text-slate-500" onClick={() => store.simpanHarga({ ...h, aktif: !h.aktif })}>{h.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                      </td>
                    </tr>
                  ))}
                  {!harga.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Belum ada harga untuk tipe ini.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal buka={!!editJasa} tutup={() => setEditJasa(null)} judul={editJasa?.id ? "Ubah jasa" : "Jasa baru"}>
        {editJasa && (
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const id = editJasa.id || editJasa.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            store.simpanJasa({ ...editJasa, id, gambar: editJasa.gambar ?? KATEGORI.find((k) => k.id === editJasa.kategori)?.gambar });
            setEditJasa(null);
          }}>
            <div><label className="label">Nama</label><input required className="input" value={editJasa.nama} onChange={(e) => setEditJasa({ ...editJasa, nama: e.target.value })} /></div>
            <div><label className="label">Kategori</label>
              <select className="input" value={editJasa.kategori} onChange={(e) => setEditJasa({ ...editJasa, kategori: e.target.value })}>{KATEGORI.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</select>
            </div>
            <div><label className="label">Deskripsi</label><textarea className="input" value={editJasa.deskripsi} onChange={(e) => setEditJasa({ ...editJasa, deskripsi: e.target.value })} /></div>
            <button className="btn-primary w-full">Simpan</button>
          </form>
        )}
      </Modal>

      <Modal buka={!!editHarga} tutup={() => setEditHarga(null)} judul="Harga jasa">
        {editHarga && (
          <form className="grid grid-cols-2 gap-3" onSubmit={(e) => {
            e.preventDefault();
            store.simpanHarga({ ...editHarga, id: editHarga.id || `${editHarga.jasaId}__${editHarga.tipeHpId}__${editHarga.kualitas}`, hargaMax: Math.max(editHarga.hargaMax, editHarga.hargaMin), durasiMax: Math.max(editHarga.durasiMax, editHarga.durasiMin) });
            setEditHarga(null);
          }}>
            <div className="col-span-2"><label className="label">Jasa</label>
              <select className="input" disabled={!!editHarga.id} value={editHarga.jasaId} onChange={(e) => setEditHarga({ ...editHarga, jasaId: e.target.value })}>{db.jasa.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}</select>
            </div>
            <div className="col-span-2"><label className="label">Kualitas</label>
              <select className="input" disabled={!!editHarga.id} value={editHarga.kualitas} onChange={(e) => setEditHarga({ ...editHarga, kualitas: e.target.value as Kualitas })}>{KUALITAS.map((k) => <option key={k} value={k}>{KUALITAS_LABEL[k]}</option>)}</select>
            </div>
            {([["hargaMin", "Harga min (Rp)"], ["hargaMax", "Harga max (Rp)"], ["durasiMin", "Durasi min (menit)"], ["durasiMax", "Durasi max (menit)"], ["garansiHari", "Garansi (hari)"]] as const).map(([k, l]) => (
              <div key={k}><label className="label">{l}</label><input type="number" min={0} className="input" value={editHarga[k]} onChange={(e) => setEditHarga({ ...editHarga, [k]: Number(e.target.value) })} /></div>
            ))}
            <p className="col-span-2 text-xs text-slate-500">Isi harga min = max untuk harga pasti.</p>
            <button className="btn-primary col-span-2">Simpan</button>
          </form>
        )}
      </Modal>

      <Modal buka={tipeBaru.buka} tutup={() => setTipeBaru({ ...tipeBaru, buka: false })} judul="Tipe HP baru">
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const id = store.tambahTipe(tipeBaru.merek.trim(), tipeBaru.tipe.trim(), tipeBaru.seri.trim());
          setTipeId(id);
          setTipeBaru({ buka: false, merek: "", tipe: "", seri: "" });
        }}>
          <div><label className="label">Merek</label><input required className="input" list="daftar-merek" value={tipeBaru.merek} onChange={(e) => setTipeBaru({ ...tipeBaru, merek: e.target.value })} /></div>
          <datalist id="daftar-merek">{Array.from(new Set(db.tipeHp.map((t) => t.merek))).map((m) => <option key={m} value={m} />)}</datalist>
          <div><label className="label">Tipe</label><input required className="input" value={tipeBaru.tipe} onChange={(e) => setTipeBaru({ ...tipeBaru, tipe: e.target.value })} /></div>
          <div><label className="label">Seri (opsional)</label><input className="input" value={tipeBaru.seri} onChange={(e) => setTipeBaru({ ...tipeBaru, seri: e.target.value })} /></div>
          <button className="btn-primary w-full">Tambah</button>
        </form>
      </Modal>
    </div>
  );
}

export default function Halaman() {
  return <Izin peran={["pemilik"]}><Katalog /></Izin>;
}
