"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { KATEGORI, KUALITAS_LABEL } from "@/lib/seed";
import { hargaTersedia, namaHp } from "@/lib/logic";
import { durasiKisaran, kisaran, rupiah } from "@/lib/format";
import { Judul, Memuat, TombolWa } from "@/components/ui";
import { PilihHp } from "@/components/PilihHp";

export default function HalamanJasa() {
  const { db } = useStore();
  const [tipeId, setTipeId] = useState<string>();
  if (!db) return <Memuat />;
  const jasaAktif = db.jasa.filter((j) => j.aktif);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Judul kecil="Katalog" sub="Harga bisa pasti atau berupa kisaran tergantung tipe HP dan kualitas sparepart. Harga final dipastikan setelah pengecekan teknisi.">
        Jasa & Harga Servis
      </Judul>

      <div className="card mb-8 p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold">Tampilkan harga untuk tipe HP Anda</p>
        <PilihHp tipeHp={db.tipeHp} nilai={tipeId} onPilih={(id) => setTipeId(id)} izinkanLain={false} />
      </div>

      <div className="space-y-10">
        {KATEGORI.map((k) => {
          const daftar = jasaAktif.filter((j) => j.kategori === k.id);
          if (!daftar.length) return null;
          return (
            <section key={k.id} id={k.id} className="scroll-mt-24">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <Image src={k.gambar} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
                {k.nama}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {daftar.map((j) => {
                  const semua = db.harga.filter((h) => h.aktif && h.jasaId === j.id);
                  const opsi = tipeId ? hargaTersedia(db, tipeId, j.id) : [];
                  const min = Math.min(...semua.map((h) => h.hargaMin));
                  const durMin = Math.min(...semua.map((h) => h.durasiMin));
                  const durMax = Math.max(...semua.map((h) => h.durasiMax));
                  const kualitas = Array.from(new Set(semua.map((h) => h.kualitas)));
                  return (
                    <div key={j.id} className="card flex gap-4 p-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                        {j.gambar && <Image src={j.gambar} alt="" width={88} height={88} className="h-20 w-20 object-contain" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{j.nama}</p>
                        <p className="mt-0.5 text-sm text-slate-600">{j.deskripsi}</p>
                        {tipeId ? (
                          opsi.length ? (
                            <ul className="mt-2 space-y-1 text-sm">
                              {opsi.map((h) => (
                                <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-x-2 rounded-lg bg-brand-50/60 px-2.5 py-1.5">
                                  <span className="font-medium">{h.kualitas === "standar" ? "Harga" : KUALITAS_LABEL[h.kualitas]}</span>
                                  <span className="font-bold text-brand-700">{kisaran(h.hargaMin, h.hargaMax)}</span>
                                  <span className="w-full text-xs text-slate-500">
                                    {durasiKisaran(h.durasiMin, h.durasiMax)} · {h.garansiHari ? `garansi ${h.garansiHari} hari` : "tanpa garansi"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm text-amber-700">Belum ada harga untuk {namaHp(db, tipeId)}, konsultasikan via WA.</p>
                          )
                        ) : (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                            {isFinite(min) && <span className="font-bold text-brand-700">mulai {rupiah(min)}</span>}
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600">{durasiKisaran(durMin, durMax)}</span>
                            {kualitas.filter((q) => q !== "standar").map((q) => (
                              <span key={q} className="chip bg-slate-100 text-slate-600">{KUALITAS_LABEL[q]}</span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link href={`/estimasi?jasa=${j.id}${tipeId ? `&tipe=${tipeId}` : ""}`} className="btn-ghost btn-sm">
                            Hitung estimasi
                          </Link>
                          <Link href={`/reservasi?jasa=${j.id}${tipeId ? `&tipe=${tipeId}` : ""}`} className="btn-ghost btn-sm">
                            Reservasi
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="card mt-10 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <Image src="/img/icons/harga.png" alt="" width={80} height={80} className="h-20 w-20 object-contain" />
        <div className="flex-1">
          <p className="font-bold">Keluhan atau tipe HP Anda tidak ada di daftar?</p>
          <p className="text-sm text-slate-600">Ceritakan keluhannya, kami bantu cek kemungkinan biayanya.</p>
        </div>
        <TombolWa
          className="w-full sm:w-64"
          pesan={`Halo Firman Service, saya mau tanya harga servis.${tipeId ? `\nHP: ${namaHp(db, tipeId)}` : ""}\nKeluhan: `}
        />
      </div>
    </div>
  );
}
