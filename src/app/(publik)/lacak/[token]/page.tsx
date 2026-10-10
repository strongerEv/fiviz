"use client";

import Image from "next/image";
import { use, useState } from "react";
import { useStore } from "@/lib/store";
import { itemDitagih, namaHp, sisaHariGaransi, STATUS_LABEL, terlambat, totalTagihan } from "@/lib/logic";
import { rupiah, samarkanNama, samarkanWa, waktu, tanggal } from "@/lib/format";
import { Kosong, Memuat, Modal, StatusBadge, TombolWa } from "@/components/ui";
import { Nota } from "@/components/Nota";
import { STATUS_ORDER, type OrderServis } from "@/lib/types";

const GAMBAR_STATUS: Record<string, string> = {
  diterima: "/img/icons/terima.png",
  pengecekan: "/img/icons/cek.png",
  menunggu_persetujuan: "/img/icons/harga.png",
  menunggu_sparepart: "/img/icons/ambil.png",
  dikerjakan: "/img/icons/perbaikan.png",
  uji_coba: "/img/icons/selesai.png",
  siap_diambil: "/img/icons/selesai.png",
  selesai: "/img/icons/garansi.png",
  dibatalkan: "/img/icons/cek.png",
};

function Stepper({ o }: { o: OrderServis }) {
  const idx = STATUS_ORDER.indexOf(o.status as (typeof STATUS_ORDER)[number]);
  return (
    <ol className="relative mt-5 grid grid-cols-8 gap-1">
      {STATUS_ORDER.map((s, i) => (
        <li key={s} className="flex flex-col items-center text-center">
          <span className={`h-2 w-full rounded-full ${i <= idx ? "bg-brand-600" : "bg-slate-200"} ${i === idx ? "animate-pulse" : ""}`} />
          <span className={`mt-1.5 hidden text-[10px] font-medium leading-tight sm:block ${i === idx ? "text-brand-700" : "text-slate-400"}`}>{STATUS_LABEL[s]}</span>
        </li>
      ))}
    </ol>
  );
}

export default function LacakDetail({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const store = useStore();
  const { db } = store;
  const [nota, setNota] = useState(false);
  const [klaim, setKlaim] = useState(false);
  const [keluhanKlaim, setKeluhanKlaim] = useState("");
  if (!db) return <Memuat />;
  const o = db.order.find((x) => x.token === token);
  if (!o) return <Kosong judul="Servis tidak ditemukan">Link tidak valid. Coba lacak dengan nomor servis dan 4 digit nomor WA.</Kosong>;
  const p = db.pelanggan.find((x) => x.id === o.pelangganId)!;
  const hp = namaHp(db, o.tipeHpId, o.tipeLain);
  const menunggu = o.persetujuan.filter((x) => x.status === "menunggu");
  const asal = o.servisAsalId ? db.order.find((x) => x.id === o.servisAsalId) : undefined;
  const telat = terlambat(o);
  const tagihan = totalTagihan(o);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">Nomor servis</p>
              <p className="text-2xl font-extrabold tracking-tight">{o.nomorServis}</p>
              <p className="mt-1 text-brand-100">
                {hp} · {samarkanNama(p.nama)} · {samarkanWa(p.noWa)}
              </p>
              {asal && <p className="mt-1 text-xs text-accent-400">Servis garansi dari {asal.nomorServis}</p>}
            </div>
            <Image src={GAMBAR_STATUS[o.status]} alt="" width={88} height={88} className="h-20 w-20 shrink-0 object-contain" />
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge status={o.status} />
            {o.status !== "selesai" && o.status !== "dibatalkan" && (
              <p className="text-sm">
                <span className="text-slate-500">Estimasi selesai: </span>
                <b>{waktu(o.estimasiSelesai)}</b>
              </p>
            )}
          </div>
          {o.status !== "dibatalkan" && <Stepper o={o} />}
          {telat && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Pengerjaan sedikit melewati estimasi. Teknisi akan memperbarui estimasi beserta alasannya, atau hubungi kami via WA.
            </p>
          )}
          {o.status === "siap_diambil" && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200">
              <p className="font-bold">HP Anda siap diambil 🎉</p>
              <p className="text-sm">
                Total yang perlu dibayar: <b>{rupiah(tagihan)}</b>. Datang ke {db.toko.alamat}, buka {db.toko.jamBuka}–{db.toko.jamTutup}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* STJ-02/03: persetujuan biaya dari HP pelanggan */}
      {menunggu.map((ps) => (
        <div key={ps.id} className="card mt-5 p-5 ring-2 ring-amber-300 sm:p-6">
          <div className="flex items-center gap-3">
            <Image src="/img/icons/harga.png" alt="" width={56} height={56} className="h-14 w-14 object-contain" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{ps.jenis === "awal" ? "Perlu persetujuan Anda" : "Biaya tambahan, perlu persetujuan"}</p>
              <p className="text-lg font-bold">Hasil pengecekan teknisi</p>
            </div>
          </div>
          <p className="mt-3 text-slate-700">{ps.diagnosa}</p>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {o.items.filter((i) => ps.itemIds.includes(i.id)).map((i) => (
              <li key={i.id} className="flex justify-between px-3 py-2 text-sm">
                <span>
                  {i.deskripsi}
                  {i.garansiHari > 0 && <span className="block text-xs text-slate-500">Garansi {i.garansiHari} hari</span>}
                </span>
                <b>{rupiah(i.hargaFinal)}</b>
              </li>
            ))}
            <li className="flex justify-between bg-slate-50 px-3 py-2.5 font-bold">
              <span>Total {ps.jenis === "tambahan" ? "tambahan" : ""}</span>
              <span className="text-brand-700">{rupiah(ps.total)}</span>
            </li>
          </ul>
          <p className="mt-2 text-sm text-slate-500">Estimasi selesai bila disetujui: {waktu(ps.estimasiSelesai)}</p>
          <p className="mt-2 text-xs text-slate-500">
            {ps.jenis === "awal"
              ? db.toko.biayaCek > 0
                ? `Bila ditolak, HP dikembalikan dengan biaya cek ${rupiah(db.toko.biayaCek)}.`
                : "Bila ditolak, HP dikembalikan tanpa biaya."
              : "Bila ditolak, hanya pekerjaan awal yang dilanjutkan."}{" "}
            Persetujuan dicatat dengan waktu dan perangkat Anda sebagai bukti.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="btn-danger py-3" onClick={() => confirm("Tolak biaya ini?") && store.jawabPersetujuan(o.id, ps.id, false, "aplikasi")}>
              Tolak
            </button>
            <button className="btn-primary py-3" onClick={() => confirm(`Setujui biaya ${rupiah(ps.total)}?`) && store.jawabPersetujuan(o.id, ps.id, true, "aplikasi")}>
              Setuju
            </button>
          </div>
        </div>
      ))}

      {o.garansi && (
        <div className="card mt-5 overflow-hidden">
          <div className="flex items-center gap-4 bg-gradient-to-r from-accent-500 to-accent-400 p-5 text-white">
            <Image src="/img/icons/garansi.png" alt="" width={64} height={64} className="h-16 w-16 object-contain" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Kartu garansi digital</p>
              <p className="text-lg font-extrabold">
                {o.garansi.status === "aktif" && sisaHariGaransi(o.garansi.berakhir) > 0
                  ? `Aktif · sisa ${sisaHariGaransi(o.garansi.berakhir)} hari`
                  : o.garansi.status === "diklaim"
                    ? "Sudah diklaim"
                    : "Masa garansi habis"}
              </p>
            </div>
          </div>
          <div className="space-y-2 p-5 text-sm">
            <p><span className="text-slate-500">Berlaku:</span> {tanggal(o.garansi.mulai)} – {tanggal(o.garansi.berakhir)}</p>
            <p className="text-slate-500">Cakupan:</p>
            <ul className="list-inside list-disc">{o.garansi.cakupan.map((c) => <li key={c}>{c}</li>)}</ul>
            <p className="text-xs text-slate-500">{o.garansi.ketentuan}</p>
            {o.garansi.klaim ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="font-semibold">
                  Klaim {o.garansi.klaim.status === "menunggu" ? "sedang diverifikasi" : o.garansi.klaim.status === "diterima" ? "diterima" : "ditolak"}
                </p>
                <p className="text-slate-600">“{o.garansi.klaim.keluhan}”</p>
                {o.garansi.klaim.alasan && <p className="mt-1 text-slate-600">Catatan toko: {o.garansi.klaim.alasan}</p>}
                {o.garansi.klaim.orderBaruId && (() => {
                  const baru = db.order.find((x) => x.id === o.garansi!.klaim!.orderBaruId);
                  return baru ? <a className="mt-2 inline-block font-semibold text-brand-600" href={`/lacak/${baru.token}`}>Lacak servis garansi {baru.nomorServis} →</a> : null;
                })()}
              </div>
            ) : (
              o.garansi.status === "aktif" && sisaHariGaransi(o.garansi.berakhir) > 0 && (
                <button className="btn-accent mt-3" onClick={() => setKlaim(true)}>Klaim Garansi</button>
              )
            )}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-5">
        <div className="card p-5 md:col-span-3">
          <h2 className="mb-4 font-bold">Riwayat progres</h2>
          <ol className="relative space-y-5 border-l-2 border-slate-100 pl-5">
            {[...o.riwayat].reverse().map((r, i) => (
              <li key={r.id} className="relative">
                <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${i === 0 ? "bg-brand-600" : "bg-slate-300"}`} />
                <p className="text-sm font-semibold">{STATUS_LABEL[r.status]}</p>
                <p className="text-xs text-slate-500">{waktu(r.waktu)} · {r.diubahOleh}</p>
                {r.catatan && <p className="mt-1 text-sm text-slate-700">{r.catatan}</p>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.foto && <img src={r.foto} alt="Foto progres" className="mt-2 h-28 rounded-lg object-cover" />}
              </li>
            ))}
          </ol>
          {o.riwayatEstimasi.length > 0 && (
            <div className="mt-6 rounded-xl bg-slate-50 p-3 text-sm">
              <p className="mb-1 font-semibold">Perubahan estimasi</p>
              {o.riwayatEstimasi.map((e, i) => (
                <p key={i} className="text-slate-600">
                  {waktu(e.dari)} → <b>{waktu(e.ke)}</b> · {e.alasan}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-4 md:col-span-2">
          <div className="card p-5 text-sm">
            <h2 className="mb-3 font-bold">Rincian biaya</h2>
            {itemDitagih(o).length ? (
              <ul className="space-y-1.5">
                {itemDitagih(o).map((i) => (
                  <li key={i.id} className="flex justify-between gap-2">
                    <span>{i.deskripsi}</span>
                    <span className="font-medium">{rupiah(i.hargaFinal)}</span>
                  </li>
                ))}
                {o.pembayaran?.diskon ? (
                  <li className="flex justify-between text-emerald-700">
                    <span>Diskon</span>
                    <span>−{rupiah(o.pembayaran.diskon)}</span>
                  </li>
                ) : null}
                <li className="flex justify-between border-t border-slate-100 pt-2 font-bold">
                  <span>{o.pembayaran ? "Dibayar" : "Total"}</span>
                  <span>{rupiah(o.pembayaran?.nominal ?? tagihan)}</span>
                </li>
              </ul>
            ) : (
              <p className="text-slate-500">Biaya final muncul setelah pengecekan teknisi.</p>
            )}
            <button className="btn-ghost mt-4 w-full" onClick={() => setNota(true)}>
              Lihat nota digital
            </button>
          </div>
          <TombolWa pesan={`Halo Firman Service, saya mau tanya servis nomor ${o.nomorServis} (${hp}).`} />
        </div>
      </div>

      <Modal buka={nota} tutup={() => setNota(false)} judul="Nota digital" lebar="max-w-md">
        <Nota db={db} o={o} />
      </Modal>
      <Modal buka={klaim} tutup={() => setKlaim(false)} judul="Klaim garansi">
        <p className="mb-3 text-sm text-slate-600">Jelaskan keluhan Anda. Admin akan memeriksa masa garansi dan ketentuannya, lalu menghubungi Anda.</p>
        <textarea className="input min-h-28" value={keluhanKlaim} onChange={(e) => setKeluhanKlaim(e.target.value)} placeholder="mis. Layar kembali bergaris di sisi kiri" />
        <button
          className="btn-accent mt-4 w-full"
          disabled={keluhanKlaim.trim().length < 5}
          onClick={() => {
            store.klaimGaransi(o.id, keluhanKlaim.trim());
            setKlaim(false);
          }}
        >
          Kirim klaim
        </button>
      </Modal>
    </div>
  );
}
