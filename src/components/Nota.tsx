"use client";

import { useState } from "react";
import type { DB, OrderServis } from "@/lib/types";
import { itemDitagih, namaHp, STATUS_LABEL, totalTagihan } from "@/lib/logic";
import { rupiah, samarkanNama, samarkanWa, tanggalPendek, waktu } from "@/lib/format";

/** TRM-05 / BYR-01: nota & kwitansi, siap dicetak di printer thermal 58/80 mm. */
export function Nota({ db, o, lengkap = false }: { db: DB; o: OrderServis; lengkap?: boolean }) {
  const [lebar, setLebar] = useState<"58" | "80">("58");
  const p = db.pelanggan.find((x) => x.id === o.pelangganId)!;
  const tek = db.staf.find((s) => s.id === o.teknisiId);
  const items = itemDitagih(o);
  const garis = <div className="my-1.5 border-t border-dashed border-slate-400" />;

  return (
    <div>
      <div className="no-print mb-3 flex items-center justify-between gap-2">
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
          {(["58", "80"] as const).map((l) => (
            <button key={l} onClick={() => setLebar(l)} className={`rounded-md px-2.5 py-1 ${lebar === l ? "bg-white shadow" : "text-slate-500"}`}>
              {l} mm
            </button>
          ))}
        </div>
        <button
          className="btn-primary btn-sm"
          onClick={() => {
            document.body.classList.add("cetak-nota");
            window.print();
            setTimeout(() => document.body.classList.remove("cetak-nota"), 500);
          }}
        >
          Cetak nota
        </button>
      </div>
      <div className="flex justify-center overflow-x-auto rounded-xl bg-slate-100 p-3">
        <div className={`print-area nota-thermal ${lebar === "80" ? "w80" : ""} bg-white p-3 text-slate-900 shadow`}>
          <div className="text-center">
            <p className="text-sm font-bold">{db.toko.nama.toUpperCase()}</p>
            <p>{db.toko.alamat}</p>
            <p>WA +{db.toko.noWa}</p>
          </div>
          {garis}
          <p className="text-center font-bold">{o.pembayaran ? "KWITANSI" : "TANDA TERIMA SERVIS"}</p>
          <p>No : {o.nomorServis}</p>
          <p>Tgl: {waktu(o.dibuat)}</p>
          <p>Plg: {lengkap ? p.nama : samarkanNama(p.nama)}</p>
          <p>WA : {lengkap ? `+${p.noWa}` : samarkanWa(p.noWa)}</p>
          <p>HP : {namaHp(db, o.tipeHpId, o.tipeLain)}</p>
          <p>Kel: {o.keluhan}</p>
          {tek && <p>Tek: {tek.nama}</p>}
          <p>Sts: {STATUS_LABEL[o.status]}</p>
          {o.status !== "selesai" && <p>Est: {waktu(o.estimasiSelesai)}</p>}
          {garis}
          <p className="font-bold">Kondisi awal</p>
          <p>Layar {o.kondisiAwal.layar}; Body {o.kondisiAwal.body}; Kamera {o.kondisiAwal.kamera}; Tombol {o.kondisiAwal.tombol}; {o.kondisiAwal.menyala ? "Menyala" : "Tidak menyala"}</p>
          {o.kondisiAwal.catatan && <p>{o.kondisiAwal.catatan}</p>}
          <p>Kelengkapan: {o.kelengkapan.length ? o.kelengkapan.join(", ") : "HP saja"}</p>
          {items.length > 0 && (
            <>
              {garis}
              {items.map((i) => (
                <div key={i.id} className="flex justify-between gap-2">
                  <span>{i.deskripsi}</span>
                  <span className="whitespace-nowrap">{rupiah(i.hargaFinal)}</span>
                </div>
              ))}
              {o.pembayaran?.diskon ? (
                <div className="flex justify-between">
                  <span>Diskon</span>
                  <span>-{rupiah(o.pembayaran.diskon)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span>{rupiah(o.pembayaran?.nominal ?? totalTagihan(o))}</span>
              </div>
              {o.pembayaran && <p>Bayar: {o.pembayaran.metode.toUpperCase()} · {waktu(o.pembayaran.waktu)}</p>}
            </>
          )}
          {o.garansi && (
            <>
              {garis}
              <p className="font-bold">GARANSI s.d. {tanggalPendek(o.garansi.berakhir)}</p>
              {o.garansi.cakupan.map((c) => (
                <p key={c}>- {c}</p>
              ))}
            </>
          )}
          {o.ttdPelanggan && (
            <>
              {garis}
              <p>Tanda tangan pelanggan:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.ttdPelanggan} alt="Tanda tangan" className="h-14" />
            </>
          )}
          {garis}
          <p className="text-[9px] leading-snug">Pelanggan menyetujui syarat servis. Toko tidak mengakses data di HP di luar keperluan pengujian. Lacak: {typeof window !== "undefined" ? window.location.host : ""}/lacak/{o.token}</p>
          <p className="mt-1 text-center">Terima kasih 🙏</p>
        </div>
      </div>
    </div>
  );
}
