"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useStore } from "@/lib/store";
import { KATEGORI, KUALITAS_LABEL } from "@/lib/seed";
import { hargaTersedia, hitungEstimasi, namaHp, ringkasEstimasi } from "@/lib/logic";
import { durasiKisaran, kisaran } from "@/lib/format";
import { Judul, Memuat, TombolWa } from "@/components/ui";
import { PilihHp } from "@/components/PilihHp";
import type { Kualitas } from "@/lib/types";

const LANGKAH = ["Tipe HP", "Keluhan", "Kualitas", "Hasil"];

function Estimasi() {
  const { db } = useStore();
  const q = useSearchParams();
  const awalJasa = q.get("jasa")?.split(",").filter(Boolean) ?? [];
  const [tipeId, setTipeId] = useState<string | undefined>(q.get("tipe") ?? undefined);
  const [tipeLain, setTipeLain] = useState<string>();
  const [jasa, setJasa] = useState<string[]>(awalJasa);
  const [kualitas, setKualitas] = useState<Record<string, Kualitas>>({});
  const [langkah, setLangkah] = useState(q.get("tipe") ? (awalJasa.length ? 2 : 1) : 0);
  const [nama, setNama] = useState("");

  if (!db) return <Memuat />;
  const jasaAktif = db.jasa.filter((j) => j.aktif);
  const pilihan = jasa.map((j) => ({ jasaId: j, kualitas: kualitas[j] }));
  const est = hitungEstimasi(db, tipeId, pilihan);
  const hp = namaHp(db, tipeId, tipeLain);
  const butuhKualitas = tipeId ? jasa.filter((j) => hargaTersedia(db, tipeId, j).length > 1) : [];
  const keluhanTeks = jasa.map((j) => db.jasa.find((x) => x.id === j)?.nama).join(", ");
  const pesanWa = `Halo Firman Service${nama ? `, saya ${nama}` : ""}.\nHP: ${hp}\nKeluhan: ${keluhanTeks || "-"}\n${est.baris.some((b) => b.harga) ? `\nHasil estimasi di aplikasi:\n${ringkasEstimasi(db, tipeId, pilihan)}` : ""}\n\nMohon info lebih lanjut. Terima kasih.`;
  const qsReservasi = new URLSearchParams({
    ...(tipeId ? { tipe: tipeId } : {}),
    ...(tipeLain && !tipeId ? { lain: tipeLain } : {}),
    jasa: jasa.join(","),
    ...(nama ? { nama } : {}),
  }).toString();

  const lanjut = () => {
    if (langkah === 1 && butuhKualitas.length === 0) setLangkah(3);
    else setLangkah(langkah + 1);
  };
  const kembali = () => {
    if (langkah === 3 && butuhKualitas.length === 0) setLangkah(1);
    else setLangkah(langkah - 1);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Judul kecil="Estimasi biaya mandiri" sub="Empat langkah singkat untuk tahu kisaran biaya, lama pengerjaan, dan masa garansi.">
        Berapa kira-kira biaya servisnya?
      </Judul>

      <ol className="mb-6 grid grid-cols-4 gap-2">
        {LANGKAH.map((l, i) => (
          <li key={l} className="text-center">
            <div className={`mx-auto h-1.5 rounded-full ${i <= langkah ? "bg-brand-600" : "bg-slate-200"}`} />
            <span className={`mt-1.5 block text-xs font-semibold ${i === langkah ? "text-brand-700" : "text-slate-400"}`}>
              {i + 1}. {l}
            </span>
          </li>
        ))}
      </ol>

      <div className="card p-5 sm:p-6">
        {langkah === 0 && (
          <>
            <h2 className="mb-4 font-bold">Pilih merek lalu tipe HP Anda</h2>
            <PilihHp
              tipeHp={db.tipeHp}
              nilai={tipeId}
              tipeLain={tipeLain}
              onPilih={(id, lain) => {
                setTipeId(id);
                setTipeLain(lain);
              }}
            />
            <div className="mt-6 flex justify-end">
              <button className="btn-primary" disabled={!tipeId && !tipeLain} onClick={() => setLangkah(1)}>
                Lanjut
              </button>
            </div>
          </>
        )}

        {langkah === 1 && (
          <>
            <h2 className="mb-1 font-bold">Apa keluhan {hp}?</h2>
            <p className="mb-4 text-sm text-slate-500">Boleh pilih lebih dari satu.</p>
            <div className="space-y-4">
              {KATEGORI.map((k) => {
                const daftar = jasaAktif.filter((j) => j.kategori === k.id);
                if (!daftar.length) return null;
                return (
                  <div key={k.id}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{k.nama}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {daftar.map((j) => {
                        const on = jasa.includes(j.id);
                        return (
                          <button
                            key={j.id}
                            onClick={() => setJasa(on ? jasa.filter((x) => x !== j.id) : [...jasa, j.id])}
                            className={`flex items-center gap-3 rounded-xl p-2.5 text-left ring-1 transition ${on ? "bg-brand-50 ring-2 ring-brand-500" : "ring-slate-200 hover:ring-brand-300"}`}
                          >
                            {j.gambar && <Image src={j.gambar} alt="" width={40} height={40} className="h-10 w-10 object-contain" />}
                            <span className="flex-1 text-sm font-medium">{j.nama}</span>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"}`}>{on && "✓"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-between">
              <button className="btn-ghost" onClick={kembali}>
                Kembali
              </button>
              <button className="btn-primary" disabled={!jasa.length} onClick={lanjut}>
                Lanjut
              </button>
            </div>
          </>
        )}

        {langkah === 2 && tipeId && (
          <>
            <h2 className="mb-1 font-bold">Pilih kualitas sparepart</h2>
            <p className="mb-4 text-sm text-slate-500">Harga dan masa garansi berbeda per kualitas.</p>
            <div className="space-y-5">
              {butuhKualitas.map((j) => {
                const opsi = hargaTersedia(db, tipeId, j);
                const aktif = kualitas[j] ?? opsi[0].kualitas;
                return (
                  <div key={j}>
                    <p className="mb-2 text-sm font-semibold">{db.jasa.find((x) => x.id === j)?.nama}</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {opsi.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => setKualitas({ ...kualitas, [j]: h.kualitas })}
                          className={`rounded-xl p-3 text-left ring-1 transition ${aktif === h.kualitas ? "bg-brand-50 ring-2 ring-brand-500" : "ring-slate-200 hover:ring-brand-300"}`}
                        >
                          <span className="block text-sm font-bold">{KUALITAS_LABEL[h.kualitas]}</span>
                          <span className="block text-sm text-brand-700">{kisaran(h.hargaMin, h.hargaMax)}</span>
                          <span className="block text-xs text-slate-500">Garansi {h.garansiHari} hari</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-between">
              <button className="btn-ghost" onClick={kembali}>
                Kembali
              </button>
              <button className="btn-primary" onClick={lanjut}>
                Lihat hasil
              </button>
            </div>
          </>
        )}

        {langkah === 3 && (
          <>
            <div className="mb-5 flex items-center gap-4">
              <Image src="/img/icons/harga.png" alt="" width={64} height={64} className="h-16 w-16 object-contain" />
              <div>
                <p className="text-sm text-slate-500">Estimasi untuk {hp}</p>
                {est.baris.some((b) => b.harga) ? (
                  <p className="text-3xl font-extrabold tracking-tight text-brand-700">{kisaran(est.min, est.max)}</p>
                ) : (
                  <p className="text-xl font-bold text-amber-700">Belum ada harga</p>
                )}
              </div>
            </div>

            {est.baris.some((b) => b.harga) && (
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Lama pengerjaan</p>
                  <p className="font-bold">{durasiKisaran(est.durMin, est.durMax)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Masa garansi</p>
                  <p className="font-bold">
                    {(() => {
                      const g = est.baris.filter((b) => b.harga).map((b) => b.harga!.garansiHari);
                      const mx = Math.max(...g);
                      return mx ? `s.d. ${mx} hari` : "Tanpa garansi";
                    })()}
                  </p>
                </div>
              </div>
            )}

            <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
              {est.baris.map((b) => (
                <li key={b.jasaId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span>
                    {b.namaJasa}
                    {b.harga && b.harga.kualitas !== "standar" && <span className="ml-1.5 chip bg-slate-100 text-slate-600">{KUALITAS_LABEL[b.harga.kualitas]}</span>}
                  </span>
                  {b.harga ? (
                    <span className="text-right">
                      <span className="block font-semibold">{kisaran(b.harga.hargaMin, b.harga.hargaMax)}</span>
                      <span className="block text-xs text-slate-500">{durasiKisaran(b.harga.durasiMin, b.harga.durasiMax)} · garansi {b.harga.garansiHari} hari</span>
                    </span>
                  ) : (
                    <span className="text-right text-amber-700">Belum ada harga, konsultasikan via WA</span>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
              <b>Catatan:</b> harga final dipastikan setelah pengecekan teknisi.{" "}
              {db.toko.biayaCek > 0
                ? `Pengecekan dikenakan biaya Rp${db.toko.biayaCek.toLocaleString("id-ID")} bila perbaikan tidak dilanjutkan.`
                : "Pengecekan gratis, walaupun perbaikan tidak dilanjutkan."}{" "}
              Tidak ada pekerjaan yang dikerjakan tanpa persetujuan Anda.
            </div>

            <div className="mt-5">
              <label className="label" htmlFor="nama">
                Nama Anda (opsional, untuk pesan WA)
              </label>
              <input id="nama" className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Dinda" />
            </div>

            <div className="mt-5 grid items-start gap-3 sm:grid-cols-2">
              <Link href={`/reservasi?${qsReservasi}`} className="btn-primary py-3">
                Reservasi Jadwal
              </Link>
              <TombolWa pesan={pesanWa} />
            </div>
            <button className="mt-4 text-sm font-semibold text-slate-500" onClick={kembali}>
              ← Ubah pilihan
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Halaman() {
  return (
    <Suspense fallback={<Memuat />}>
      <Estimasi />
    </Suspense>
  );
}
