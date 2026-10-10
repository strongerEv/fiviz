"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, use, useState } from "react";
import { linkLacak, useDb } from "@/lib/store";
import { KUALITAS_LABEL } from "@/lib/seed";
import {
  bolehPindah, hargaTersedia, hitungEstimasiSelesai, itemDitagih, langkahBerikut, namaHp, STATUS_LABEL, terlambat, totalTagihan, waLink,
} from "@/lib/logic";
import { rupiah, waktu } from "@/lib/format";
import { Kosong, IkonWa, Memuat, Modal, StatusBadge } from "@/components/ui";
import { Nota } from "@/components/Nota";
import { FotoInput } from "@/components/FotoInput";
import { type ItemOrder, type OrderServis, type Pembayaran, type StatusServis } from "@/lib/types";

const keInputLokal = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

type BarisItem = { deskripsi: string; hargaFinal: number; garansiHari: number; hargaJasaId?: string };

function FormDiagnosa({ o, jenis, tutup }: { o: OrderServis; jenis: "awal" | "tambahan"; tutup: () => void }) {
  const store = useDb();
  const { db } = store;
  const garansiOrder = !!o.servisAsalId;
  const [diagnosa, setDiagnosa] = useState("");
  const [items, setItems] = useState<BarisItem[]>(() =>
    jenis === "awal" && o.tipeHpId
      ? o.jasaIdDiminta.flatMap((j) => {
          const h = hargaTersedia(db, o.tipeHpId!, j)[0];
          const nama = db.jasa.find((x) => x.id === j)?.nama ?? j;
          return h ? [{ deskripsi: `${nama}${h.kualitas !== "standar" ? ` ${KUALITAS_LABEL[h.kualitas]}` : ""}`, hargaFinal: garansiOrder ? 0 : h.hargaMax, garansiHari: h.garansiHari, hargaJasaId: h.id }] : [];
        })
      : [],
  );
  const durasiItem = items.reduce((s, i) => s + (db.harga.find((h) => h.id === i.hargaJasaId)?.durasiMax ?? 60), 0);
  const [est, setEst] = useState(() =>
    keInputLokal(hitungEstimasiSelesai(db, { ...o, items: [], jasaIdDiminta: o.jasaIdDiminta }, new Date())),
  );
  const [pilihJasa, setPilihJasa] = useState("");
  const opsiHarga = o.tipeHpId ? db.harga.filter((h) => h.tipeHpId === o.tipeHpId && h.aktif) : [];
  const total = items.reduce((s, i) => s + i.hargaFinal, 0);

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="dg">Diagnosa {jenis === "tambahan" && "kerusakan tambahan"}</label>
        <textarea id="dg" className="input min-h-20" value={diagnosa} onChange={(e) => setDiagnosa(e.target.value)} placeholder="Jelaskan temuan dengan bahasa yang mudah dipahami pelanggan" />
      </div>
      <div>
        <p className="label">Rincian jasa & sparepart</p>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input className="input col-span-12 sm:col-span-6" value={it.deskripsi} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, deskripsi: e.target.value } : x)))} />
              <input className="input col-span-5 sm:col-span-3" type="number" min={0} step={5000} value={it.hargaFinal} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, hargaFinal: Number(e.target.value) } : x)))} aria-label="Harga" />
              <input className="input col-span-4 sm:col-span-2" type="number" min={0} value={it.garansiHari} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, garansiHari: Number(e.target.value) } : x)))} aria-label="Garansi (hari)" title="Garansi (hari)" />
              <button type="button" className="btn-danger col-span-3 sm:col-span-1" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">Kolom: deskripsi · harga final (Rp) · garansi (hari)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {opsiHarga.length > 0 && (
            <select
              className="input flex-1"
              value={pilihJasa}
              onChange={(e) => {
                const h = db.harga.find((x) => x.id === e.target.value);
                if (h) {
                  const nama = db.jasa.find((x) => x.id === h.jasaId)?.nama;
                  setItems([...items, { deskripsi: `${nama}${h.kualitas !== "standar" ? ` ${KUALITAS_LABEL[h.kualitas]}` : ""}`, hargaFinal: garansiOrder ? 0 : h.hargaMax, garansiHari: h.garansiHari, hargaJasaId: h.id }]);
                }
                setPilihJasa("");
              }}
            >
              <option value="">＋ Tambah dari katalog…</option>
              {opsiHarga.map((h) => (
                <option key={h.id} value={h.id}>
                  {db.jasa.find((x) => x.id === h.jasaId)?.nama} {h.kualitas !== "standar" ? `(${KUALITAS_LABEL[h.kualitas]})` : ""} · {rupiah(h.hargaMin)}–{rupiah(h.hargaMax)}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn-ghost" onClick={() => setItems([...items, { deskripsi: "", hargaFinal: 0, garansiHari: 0 }])}>＋ Item manual</button>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="est">Estimasi selesai bila disetujui</label>
        <input id="est" type="datetime-local" className="input" value={est} onChange={(e) => setEst(e.target.value)} />
        <p className="mt-1 text-xs text-slate-500">Saran sistem dari durasi jasa ±{Math.round(durasiItem / 60)} jam & antrean teknisi.</p>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
        <span className="text-sm">Total {jenis === "tambahan" ? "tambahan" : ""}</span>
        <span className="text-lg font-bold text-brand-700">{rupiah(total)}</span>
      </div>
      <button
        className="btn-primary w-full"
        disabled={!diagnosa.trim() || !items.length || items.some((i) => !i.deskripsi.trim())}
        onClick={() => {
          store.ajukanPersetujuan(o.id, { jenis, diagnosa: diagnosa.trim(), items, estimasiSelesai: new Date(est).toISOString() });
          tutup();
        }}
      >
        Kirim ke pelanggan untuk disetujui
      </button>
      <p className="text-xs text-slate-500">Status berubah ke Menunggu Persetujuan dan pekerjaan {jenis === "tambahan" ? "tambahan " : ""}tidak boleh dilanjutkan sebelum pelanggan setuju.</p>
    </div>
  );
}

function Detail({ id }: { id: string }) {
  const store = useDb();
  const { db, staf } = store;
  const q = useSearchParams();
  const [modal, setModal] = useState<null | "nota" | "awal" | "tambahan" | "estimasi" | "bayar" | "telepon" | "status">(null);
  const [catatan, setCatatan] = useState("");
  const [fotoProgres, setFotoProgres] = useState<string[]>([]);
  const [estBaru, setEstBaru] = useState("");
  const [alasan, setAlasan] = useState("");
  const [bayar, setBayar] = useState<{ metode: Pembayaran["metode"]; diskon: number; alasanDiskon: string }>({ metode: "tunai", diskon: 0, alasanDiskon: "" });
  const [telp, setTelp] = useState({ setuju: true, ket: "" });
  const [statusManual, setStatusManual] = useState<StatusServis>("menunggu_sparepart");
  const [lihatKode, setLihatKode] = useState(false);

  const o = db.order.find((x) => x.id === id);
  if (!o) return <Kosong judul="Order tidak ditemukan" />;
  const p = db.pelanggan.find((x) => x.id === o.pelangganId)!;
  const hp = namaHp(db, o.tipeHpId, o.tipeLain);
  const peran = staf!.peran;
  const kasir = peran === "admin" || peran === "pemilik";
  const ditugaskan = o.teknisiId === staf!.id;
  const bolehKerja = ditugaskan || kasir;
  const berikut = langkahBerikut(o);
  const menunggu = o.persetujuan.find((x) => x.status === "menunggu");
  const tagihan = totalTagihan(o);
  const tutup = o.status === "selesai" || o.status === "dibatalkan";
  const notifOrder = db.notifikasi.filter((n) => n.orderId === o.id);
  const notaNotif = notifOrder.find((n) => n.jenis === "Nota servis");
  const asal = o.servisAsalId ? db.order.find((x) => x.id === o.servisAsalId) : undefined;
  const tutupModal = () => { setModal(null); setCatatan(""); setFotoProgres([]); };

  return (
    <div className="space-y-5">
      {q.get("baru") && notaNotif && (
        <div className="card flex flex-wrap items-center gap-3 bg-emerald-50 p-4 ring-emerald-200">
          <p className="flex-1 text-sm text-emerald-900"><b>Order {o.nomorServis} dibuat.</b> Kirim nota digital & link lacak ke WhatsApp pelanggan.</p>
          <a className="btn-wa btn-sm" target="_blank" rel="noopener noreferrer" href={waLink(p.noWa, notaNotif.isi)} onClick={() => store.tandaiNotif(notaNotif.id, "terkirim")}>
            <IkonWa /> Kirim nota via WA
          </a>
          <button className="btn-ghost btn-sm" onClick={() => setModal("nota")}>Cetak nota</button>
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/staf/antrean" className="text-xs font-semibold text-slate-400">← Antrean</Link>
            <h1 className="text-2xl font-extrabold tracking-tight">{o.nomorServis}</h1>
            <p className="text-slate-600">{hp} · {p.nama} · <a className="text-brand-600" href={`https://wa.me/${p.noWa}`} target="_blank" rel="noopener noreferrer">+{p.noWa}</a></p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={o.status} />
              {o.prioritas === "ekspres" && <span className="chip bg-accent-500 text-white">Ekspres</span>}
              {asal && <Link href={`/staf/order/${asal.id}`} className="chip bg-accent-400/20 text-accent-600">Garansi dari {asal.nomorServis}</Link>}
              {terlambat(o) && <span className="chip bg-red-100 text-red-700">⚠ Lewat estimasi</span>}
            </div>
          </div>
          <div className="text-sm sm:text-right">
            {!tutup && <p><span className="text-slate-500">Estimasi selesai:</span> <b>{waktu(o.estimasiSelesai)}</b></p>}
            <p className="mt-1">
              <span className="text-slate-500">Teknisi: </span>
              {kasir && !tutup ? (
                <select className="rounded-lg border border-slate-300 px-2 py-1 text-sm" value={o.teknisiId ?? ""} onChange={(e) => store.tugaskan(o.id, e.target.value)}>
                  <option value="" disabled>Pilih…</option>
                  {db.staf.filter((s) => s.peran === "teknisi" && s.aktif).map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              ) : (
                <b>{db.staf.find((s) => s.id === o.teknisiId)?.nama ?? "-"}</b>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
              <button className="btn-ghost btn-sm" onClick={() => setModal("nota")}>Nota</button>
              <a className="btn-ghost btn-sm" href={linkLacak(o.token)} target="_blank" rel="noopener noreferrer">Halaman lacak ↗</a>
            </div>
          </div>
        </div>

        {/* Aksi utama */}
        {!tutup && bolehKerja && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {berikut && (
              <button className="btn-primary" onClick={() => { setStatusManual(berikut); setModal("status"); }} disabled={!!bolehPindah(o, berikut)}>
                → {STATUS_LABEL[berikut]}
              </button>
            )}
            {(o.status === "diterima" || o.status === "pengecekan") && !menunggu && (
              <button className="btn-accent" onClick={() => setModal("awal")}>Kirim diagnosa & biaya</button>
            )}
            {(o.status === "dikerjakan" || o.status === "uji_coba" || o.status === "menunggu_sparepart") && (
              <button className="btn-ghost" onClick={() => setModal("tambahan")}>＋ Biaya tambahan</button>
            )}
            {o.status === "dikerjakan" && (
              <button className="btn-ghost" onClick={() => { setStatusManual("menunggu_sparepart"); setModal("status"); }}>Menunggu sparepart</button>
            )}
            <button className="btn-ghost" onClick={() => { setEstBaru(keInputLokal(o.estimasiSelesai)); setModal("estimasi"); }}>Ubah estimasi</button>
            {kasir && menunggu && <button className="btn-ghost" onClick={() => setModal("telepon")}>Catat persetujuan telepon</button>}
            {kasir && o.status === "siap_diambil" && <button className="btn-primary" onClick={() => setModal("bayar")}>Terima pembayaran & serahkan</button>}
            {kasir && (
              <button className="btn-danger ml-auto" onClick={() => { const a = prompt("Alasan pembatalan?"); if (a) store.ubahStatus(o.id, "dibatalkan", a); }}>
                Batalkan
              </button>
            )}
          </div>
        )}
        {menunggu && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Menunggu pelanggan menyetujui {menunggu.jenis === "awal" ? "biaya" : "biaya tambahan"} <b>{rupiah(menunggu.total)}</b> (dikirim {waktu(menunggu.dibuat)}). Jangan lanjutkan pekerjaan sebelum disetujui.
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 font-bold">Biaya & persetujuan</h2>
            {o.persetujuan.length === 0 && o.items.length === 0 && <p className="text-sm text-slate-500">Belum ada diagnosa.</p>}
            <div className="space-y-3">
              {o.persetujuan.map((ps) => (
                <div key={ps.id} className="rounded-xl p-3 ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{ps.jenis === "awal" ? "Diagnosa awal" : "Biaya tambahan"}</p>
                    <span className={`chip ${ps.status === "setuju" ? "bg-emerald-100 text-emerald-700" : ps.status === "tolak" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                      {ps.status === "menunggu" ? "Menunggu" : ps.status === "setuju" ? "Disetujui" : "Ditolak"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{ps.diagnosa}</p>
                  <ul className="mt-2 text-sm">
                    {o.items.filter((i) => ps.itemIds.includes(i.id)).map((i) => (
                      <li key={i.id} className="flex justify-between"><span>{i.deskripsi} {i.garansiHari ? <span className="text-xs text-slate-400">· {i.garansiHari} hr</span> : null}</span><span>{rupiah(i.hargaFinal)}</span></li>
                    ))}
                  </ul>
                  {ps.waktu && (
                    <p className="mt-2 text-xs text-slate-500">
                      Bukti: {ps.status} via {ps.kanal} · {waktu(ps.waktu)}{ps.keterangan ? ` · ${ps.keterangan}` : ""}{ps.perangkat ? ` · ${ps.perangkat.slice(0, 60)}…` : ""}
                    </p>
                  )}
                </div>
              ))}
              {o.items.filter((i) => !i.persetujuanId).map((i: ItemOrder) => (
                <div key={i.id} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{i.deskripsi}</span><span>{rupiah(i.hargaFinal)}</span></div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 font-bold">
              <span>Total tagihan (disetujui)</span>
              <span className="text-brand-700">{rupiah(tagihan)}</span>
            </div>
            {o.pembayaran && (
              <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
                Dibayar {rupiah(o.pembayaran.nominal)} via {o.pembayaran.metode.toUpperCase()} · {waktu(o.pembayaran.waktu)} · dicatat {o.pembayaran.dicatatOleh}
                {o.pembayaran.diskon > 0 && ` · diskon ${rupiah(o.pembayaran.diskon)} (${o.pembayaran.alasanDiskon})`}
              </p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-bold">Riwayat status</h2>
            <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
              {[...o.riwayat].reverse().map((r) => (
                <li key={r.id} className="text-sm">
                  <p><b>{STATUS_LABEL[r.status]}</b> <span className="text-xs text-slate-500">· {waktu(r.waktu)} · {r.diubahOleh}</span></p>
                  {r.catatan && <p className="text-slate-600">{r.catatan}</p>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.foto && <img src={r.foto} alt="" className="mt-1 h-20 rounded-lg" />}
                </li>
              ))}
            </ol>
            {o.riwayatEstimasi.length > 0 && (
              <div className="mt-4 text-sm">
                <p className="font-semibold">Perubahan estimasi</p>
                {o.riwayatEstimasi.map((e, i) => <p key={i} className="text-slate-600">{waktu(e.dari)} → {waktu(e.ke)} · {e.alasan} ({e.oleh})</p>)}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-bold">Penerimaan</h2>
            <p className="text-slate-600">{o.keluhan}</p>
            <dl className="mt-3 grid grid-cols-2 gap-y-1">
              <dt className="text-slate-500">Layar</dt><dd>{o.kondisiAwal.layar}</dd>
              <dt className="text-slate-500">Body</dt><dd>{o.kondisiAwal.body}</dd>
              <dt className="text-slate-500">Kamera</dt><dd>{o.kondisiAwal.kamera}</dd>
              <dt className="text-slate-500">Tombol</dt><dd>{o.kondisiAwal.tombol}</dd>
              <dt className="text-slate-500">Menyala</dt><dd>{o.kondisiAwal.menyala ? "Ya" : "Tidak"}</dd>
              <dt className="text-slate-500">Kelengkapan</dt><dd>{o.kelengkapan.join(", ") || "HP saja"}</dd>
            </dl>
            {o.kondisiAwal.catatan && <p className="mt-2 text-slate-600">{o.kondisiAwal.catatan}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {o.fotoKondisi.map((f, i) => (
                <a key={i} href={f} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f} alt={`Kondisi ${i + 1}`} className="h-16 w-16 rounded-lg bg-slate-50 object-contain ring-1 ring-slate-200" />
                </a>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Kode kunci</p>
              {!o.kodeKunci ? (
                <p className="text-slate-600">{tutup ? "Sudah dihapus otomatis" : "Tidak ada / tidak diberikan"}</p>
              ) : ditugaskan ? (
                lihatKode ? <p className="font-mono font-bold">{o.kodeKunci}</p> : <button className="font-semibold text-brand-600" onClick={() => setLihatKode(true)}>Tampilkan kode</button>
              ) : (
                <p className="text-slate-600">🔒 Hanya terlihat oleh teknisi yang ditugaskan</p>
              )}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {o.ttdPelanggan && <img src={o.ttdPelanggan} alt="Tanda tangan pelanggan" className="mt-3 h-14" />}
          </section>

          {kasir && (
            <section className="card p-5 text-sm">
              <h2 className="mb-3 font-bold">Notifikasi WA</h2>
              {notifOrder.length === 0 && <p className="text-slate-500">Belum ada.</p>}
              <ul className="space-y-2">
                {notifOrder.map((n) => (
                  <li key={n.id} className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${n.statusKirim === "terkirim" ? "bg-emerald-500" : n.statusKirim === "gagal" ? "bg-red-500" : "bg-amber-400"}`} title={n.statusKirim} />
                    <span className="flex-1">{n.jenis}{n.statusKirim === "gagal" && <span className="ml-1 text-xs font-semibold text-red-600">gagal kirim</span>}</span>
                    {n.statusKirim !== "terkirim" && (
                      <a className="text-xs font-semibold text-[#178a43]" target="_blank" rel="noopener noreferrer" href={waLink(n.noWa, n.isi)} onClick={() => store.tandaiNotif(n.id, "terkirim")}>Kirim</a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal buka={modal === "nota"} tutup={tutupModal} judul="Nota" lebar="max-w-md"><Nota db={db} o={o} lengkap /></Modal>
      <Modal buka={modal === "awal"} tutup={tutupModal} judul="Diagnosa & biaya final" lebar="max-w-2xl"><FormDiagnosa o={o} jenis="awal" tutup={tutupModal} /></Modal>
      <Modal buka={modal === "tambahan"} tutup={tutupModal} judul="Biaya tambahan" lebar="max-w-2xl"><FormDiagnosa o={o} jenis="tambahan" tutup={tutupModal} /></Modal>
      <Modal buka={modal === "status"} tutup={tutupModal} judul={`Ubah status → ${STATUS_LABEL[statusManual]}`}>
        {(() => {
          const target = statusManual;
          const alasanTolak = bolehPindah(o, target);
          return (
            <div className="space-y-3">
              {o.status === "dikerjakan" && (
                <div className="flex gap-2">
                  {(["uji_coba", "menunggu_sparepart"] as const).map((s) => (
                    <button key={s} className={`chip px-3 py-1.5 ring-1 ${target === s ? "bg-brand-600 text-white ring-brand-600" : "ring-slate-200"}`} onClick={() => setStatusManual(s)}>{STATUS_LABEL[s]}</button>
                  ))}
                </div>
              )}
              <textarea className="input min-h-20" placeholder={target === "menunggu_sparepart" ? "Sparepart apa & perkiraan datang (wajib perbarui estimasi bila mundur)" : "Catatan untuk pelanggan (opsional)"} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
              <FotoInput nilai={fotoProgres} onUbah={setFotoProgres} maks={1} label="Foto" />
              {alasanTolak && <p className="text-sm text-red-600">{alasanTolak}</p>}
              <button className="btn-primary w-full" disabled={!!alasanTolak} onClick={() => { store.ubahStatus(o.id, target, catatan || undefined, fotoProgres[0]); tutupModal(); }}>
                Simpan & kirim notifikasi
              </button>
            </div>
          );
        })()}
      </Modal>
      <Modal buka={modal === "estimasi"} tutup={tutupModal} judul="Ubah estimasi selesai">
        <input type="datetime-local" className="input" value={estBaru} onChange={(e) => setEstBaru(e.target.value)} />
        <textarea className="input mt-3 min-h-20" placeholder="Alasan perubahan (wajib, akan dilihat pelanggan)" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
        <button className="btn-primary mt-3 w-full" disabled={!estBaru || alasan.trim().length < 5} onClick={() => { store.ubahEstimasi(o.id, new Date(estBaru).toISOString(), alasan.trim()); setAlasan(""); tutupModal(); }}>Simpan</button>
      </Modal>
      <Modal buka={modal === "telepon"} tutup={tutupModal} judul="Catat persetujuan via telepon">
        {menunggu && (
          <div className="space-y-3">
            <p className="text-sm">Total {rupiah(menunggu.total)} · {menunggu.diagnosa}</p>
            <div className="grid grid-cols-2 gap-2">
              <button className={`rounded-xl p-3 ring-1 ${telp.setuju ? "bg-emerald-50 ring-2 ring-emerald-500" : "ring-slate-200"}`} onClick={() => setTelp({ ...telp, setuju: true })}>Setuju</button>
              <button className={`rounded-xl p-3 ring-1 ${!telp.setuju ? "bg-red-50 ring-2 ring-red-500" : "ring-slate-200"}`} onClick={() => setTelp({ ...telp, setuju: false })}>Tolak</button>
            </div>
            <input className="input" placeholder="Keterangan (mis. ditelepon 14:05, bicara dengan pemilik HP)" value={telp.ket} onChange={(e) => setTelp({ ...telp, ket: e.target.value })} />
            <button className="btn-primary w-full" disabled={telp.ket.trim().length < 3} onClick={() => { store.jawabPersetujuan(o.id, menunggu.id, telp.setuju, "telepon", telp.ket.trim()); tutupModal(); }}>Simpan</button>
          </div>
        )}
      </Modal>
      <Modal buka={modal === "bayar"} tutup={tutupModal} judul="Pembayaran & pengambilan">
        <div className="space-y-3 text-sm">
          <ul className="space-y-1">
            {itemDitagih(o).map((i) => <li key={i.id} className="flex justify-between"><span>{i.deskripsi}</span><span>{rupiah(i.hargaFinal)}</span></li>)}
          </ul>
          <div className="grid grid-cols-3 gap-2">
            {(["tunai", "transfer", "qris"] as const).map((m) => (
              <button key={m} className={`rounded-xl p-2.5 font-semibold uppercase ring-1 ${bayar.metode === m ? "bg-brand-50 ring-2 ring-brand-500" : "ring-slate-200"}`} onClick={() => setBayar({ ...bayar, metode: m })}>{m}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="disk">Diskon (Rp)</label>
              <input id="disk" type="number" min={0} max={tagihan} step={5000} className="input" value={bayar.diskon} onChange={(e) => setBayar({ ...bayar, diskon: Math.min(tagihan, Number(e.target.value)) })} />
            </div>
            <div>
              <label className="label" htmlFor="ald">Alasan diskon</label>
              <input id="ald" className="input" value={bayar.alasanDiskon} onChange={(e) => setBayar({ ...bayar, alasanDiskon: e.target.value })} disabled={!bayar.diskon} />
            </div>
          </div>
          <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-base font-bold"><span>Dibayar</span><span>{rupiah(tagihan - bayar.diskon)}</span></div>
          <p className="text-xs text-slate-500">Menandai Selesai akan menerbitkan kartu garansi, menghapus kode kunci, dan mengantrekan kwitansi ke WA pelanggan.</p>
          <button className="btn-primary w-full" disabled={bayar.diskon > 0 && !bayar.alasanDiskon.trim()} onClick={() => { store.bayar(o.id, { metode: bayar.metode, diskon: bayar.diskon, alasanDiskon: bayar.alasanDiskon || undefined }); tutupModal(); }}>
            Tandai Selesai
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function Halaman({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<Memuat />}>
      <Detail id={id} />
    </Suspense>
  );
}

