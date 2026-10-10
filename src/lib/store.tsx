"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  DB, Garansi, ItemOrder, Jasa, HargaJasa, KondisiAwal, Notifikasi, OrderServis, Pelanggan, Pembayaran, Prioritas, Reservasi, Staf, StatusServis, TemplateKey, Toko,
} from "./types";
import { buatDbAwal, DB_VERSI } from "./seed";
import {
  buatToken, fmtEstimasi, hitungEstimasiSelesai, itemDitagih, namaHp, nomorServisBaru, pesanTemplate, STATUS_LABEL, totalTagihan, uid,
} from "./logic";
import { normalisasiWa, rupiah, tanggal } from "./format";

const KUNCI = "firman-service-db";
const KUNCI_SESI = "firman-service-sesi";

export const linkLacak = (token: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/lacak/${token}`;
export const linkReservasi = (token: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/reservasi/${token}`;

function muat(): DB {
  try {
    const raw = localStorage.getItem(KUNCI);
    if (raw) {
      const db = JSON.parse(raw) as DB;
      if (db.versi === DB_VERSI) return db;
    }
  } catch {}
  return buatDbAwal();
}

function antriNotif(db: DB, n: Omit<Notifikasi, "id" | "statusKirim" | "percobaan" | "waktu">) {
  db.notifikasi.unshift({ ...n, id: uid(), statusKirim: "antri", percobaan: 0, waktu: new Date().toISOString() });
}

function cariAtauBuatPelanggan(db: DB, nama: string, noWa: string): Pelanggan {
  const wa = normalisasiWa(noWa);
  let p = db.pelanggan.find((x) => x.noWa === wa);
  if (!p) {
    p = { id: uid(), nama: nama.trim(), noWa: wa };
    db.pelanggan.push(p);
  } else if (nama.trim()) p.nama = nama.trim();
  return p;
}

function dataPesanOrder(db: DB, o: OrderServis) {
  const p = db.pelanggan.find((x) => x.id === o.pelangganId)!;
  return { p, data: { nama: p.nama.split(" ")[0], nomor: o.nomorServis, hp: namaHp(db, o.tipeHpId, o.tipeLain), link: linkLacak(o.token) } };
}

function catatStatus(db: DB, o: OrderServis, status: StatusServis, oleh: string, catatan?: string, foto?: string) {
  o.status = status;
  o.riwayat.push({ id: uid(), status, catatan, foto, diubahOleh: oleh, waktu: new Date().toISOString() });
  const { p, data } = dataPesanOrder(db, o);
  // PRG-04: notifikasi tiap perubahan status. Persetujuan punya pesan sendiri.
  if (status === "menunggu_persetujuan") return;
  if (status === "siap_diambil") {
    antriNotif(db, { orderId: o.id, noWa: p.noWa, jenis: "Siap diambil", isi: pesanTemplate(db.toko, "siapDiambil", { ...data, total: rupiah(totalTagihan(o)) }) });
  } else if (status !== "selesai") {
    antriNotif(db, {
      orderId: o.id, noWa: p.noWa, jenis: `Status: ${STATUS_LABEL[status]}`,
      isi: pesanTemplate(db.toko, "perubahanStatus", { ...data, status: STATUS_LABEL[status], catatan: catatan ? `\nCatatan teknisi: ${catatan}` : "" }),
    });
  }
}

export interface InputOrder {
  reservasiId?: string;
  nama: string;
  noWa: string;
  tipeHpId?: string;
  tipeLain?: string;
  keluhan: string;
  jasaIdDiminta: string[];
  kondisiAwal: KondisiAwal;
  fotoKondisi: string[];
  kelengkapan: string[];
  kodeKunci?: string;
  ttdPelanggan: string;
  teknisiId?: string;
  prioritas: Prioritas;
  servisAsalId?: string;
}

export interface Sesi {
  stafId: string;
}

function useStoreInternal() {
  const [db, setDb] = useState<DB | null>(null);
  const [sesi, setSesi] = useState<Sesi | null>(null);
  const dbRef = useRef<DB | null>(null);

  useEffect(() => {
    const d = muat();
    dbRef.current = d;
    setDb(d);
    try {
      const s = localStorage.getItem(KUNCI_SESI);
      if (s) setSesi(JSON.parse(s));
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === KUNCI && e.newValue) {
        const nd = JSON.parse(e.newValue) as DB;
        dbRef.current = nd;
        setDb(nd);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** Semua perubahan lewat sini: salin, ubah, simpan. */
  const ubah = useCallback(<T,>(fn: (d: DB) => T): T => {
    const d = structuredClone(dbRef.current ?? muat());
    const hasil = fn(d);
    dbRef.current = d;
    setDb(d);
    try {
      localStorage.setItem(KUNCI, JSON.stringify(d));
    } catch {
      alert("Penyimpanan browser penuh. Hapus beberapa foto atau reset data demo.");
    }
    return hasil;
  }, []);

  const staf = db && sesi ? db.staf.find((s) => s.id === sesi.stafId && s.aktif) ?? null : null;
  const namaStaf = staf?.nama ?? "Sistem";

  const aksi = useMemo(
    () => ({
      /* ---------- Sesi staf ---------- */
      masuk(stafId: string, pin: string) {
        const s = dbRef.current?.staf.find((x) => x.id === stafId && x.aktif);
        if (!s || s.pin !== pin) return false;
        localStorage.setItem(KUNCI_SESI, JSON.stringify({ stafId }));
        setSesi({ stafId });
        return true;
      },
      keluar() {
        localStorage.removeItem(KUNCI_SESI);
        setSesi(null);
      },

      /* ---------- Reservasi ---------- */
      buatReservasi(input: { nama: string; noWa: string; tanggal: string; slot: string; tipeHpId?: string; tipeLain?: string; keluhan: string; jasaIds?: string[]; catatan?: string; foto?: string }) {
        return ubah((d) => {
          const p = cariAtauBuatPelanggan(d, input.nama, input.noWa);
          const r: Reservasi = {
            id: uid(), token: buatToken(), pelangganId: p.id, tanggal: input.tanggal, slot: input.slot, tipeHpId: input.tipeHpId, tipeLain: input.tipeLain,
            keluhan: input.keluhan, jasaIds: input.jasaIds, catatan: input.catatan, foto: input.foto, status: "terjadwal", dibuat: new Date().toISOString(),
          };
          d.reservasi.push(r);
          antriNotif(d, {
            reservasiId: r.id, noWa: p.noWa, jenis: "Konfirmasi reservasi",
            isi: pesanTemplate(d.toko, "konfirmasiReservasi", { nama: p.nama.split(" ")[0], tanggal: tanggal(`${r.tanggal}T00:00:00`), slot: r.slot, hp: namaHp(d, r.tipeHpId, r.tipeLain), keluhan: r.keluhan, link: linkReservasi(r.token) }),
          });
          return r;
        });
      },
      jadwalUlang(id: string, tgl: string, slot: string) {
        ubah((d) => {
          const r = d.reservasi.find((x) => x.id === id);
          if (!r || r.status !== "terjadwal") return;
          r.tanggal = tgl;
          r.slot = slot;
          const p = d.pelanggan.find((x) => x.id === r.pelangganId)!;
          antriNotif(d, {
            reservasiId: r.id, noWa: p.noWa, jenis: "Jadwal ulang reservasi",
            isi: pesanTemplate(d.toko, "konfirmasiReservasi", { nama: p.nama.split(" ")[0], tanggal: tanggal(`${r.tanggal}T00:00:00`), slot: r.slot, hp: namaHp(d, r.tipeHpId, r.tipeLain), keluhan: r.keluhan, link: linkReservasi(r.token) }),
          });
        });
      },
      statusReservasi(id: string, status: Reservasi["status"]) {
        ubah((d) => {
          const r = d.reservasi.find((x) => x.id === id);
          if (r) r.status = status;
        });
      },

      /* ---------- Penerimaan & order ---------- */
      buatOrder(input: InputOrder) {
        return ubah((d) => {
          const p = cariAtauBuatPelanggan(d, input.nama, input.noWa);
          const now = new Date();
          const items: ItemOrder[] = [];
          if (input.prioritas === "ekspres" && !input.servisAsalId)
            items.push({ id: uid(), deskripsi: "Biaya prioritas ekspres", hargaFinal: d.toko.biayaEkspres, tambahan: false, garansiHari: 0 });
          const o: OrderServis = {
            id: uid(), token: buatToken(), nomorServis: nomorServisBaru(d, now), cabangId: d.toko.id, pelangganId: p.id, reservasiId: input.reservasiId,
            tipeHpId: input.tipeHpId, tipeLain: input.tipeLain, keluhan: input.keluhan, jasaIdDiminta: input.jasaIdDiminta, kondisiAwal: input.kondisiAwal,
            fotoKondisi: input.fotoKondisi, kelengkapan: input.kelengkapan, kodeKunci: input.kodeKunci || undefined, teknisiId: input.teknisiId,
            prioritas: input.prioritas, status: "diterima", estimasiSelesai: "", riwayatEstimasi: [], ttdPelanggan: input.ttdPelanggan,
            servisAsalId: input.servisAsalId, items, riwayat: [], persetujuan: [], dibuat: now.toISOString(),
          };
          o.estimasiSelesai = hitungEstimasiSelesai(d, o, now);
          o.riwayat.push({ id: uid(), status: "diterima", catatan: input.servisAsalId ? "Order klaim garansi" : undefined, diubahOleh: namaStaf, waktu: now.toISOString() });
          d.order.push(o);
          if (input.reservasiId) {
            const r = d.reservasi.find((x) => x.id === input.reservasiId);
            if (r) {
              r.status = "datang";
              r.orderId = o.id;
            }
          }
          const { data } = dataPesanOrder(d, o);
          antriNotif(d, { orderId: o.id, noWa: p.noWa, jenis: "Nota servis", isi: pesanTemplate(d.toko, "notaServis", { ...data, estimasi: fmtEstimasi(o.estimasiSelesai) }) });
          return o;
        });
      },
      ubahStatus(orderId: string, status: StatusServis, catatan?: string, foto?: string) {
        ubah((d) => {
          const o = d.order.find((x) => x.id === orderId);
          if (!o) return;
          catatStatus(d, o, status, namaStaf, catatan, foto);
          if (status === "dibatalkan") o.kodeKunci = undefined;
        });
      },
      tugaskan(orderId: string, teknisiId: string) {
        ubah((d) => {
          const o = d.order.find((x) => x.id === orderId);
          if (!o) return;
          o.teknisiId = teknisiId;
          if (o.status === "diterima" || o.status === "pengecekan") o.estimasiSelesai = hitungEstimasiSelesai(d, o);
        });
      },
      ubahEstimasi(orderId: string, iso: string, alasan: string) {
        ubah((d) => {
          const o = d.order.find((x) => x.id === orderId);
          if (!o) return;
          o.riwayatEstimasi.push({ dari: o.estimasiSelesai, ke: iso, alasan, oleh: namaStaf, waktu: new Date().toISOString() });
          o.estimasiSelesai = iso;
          const { p, data } = dataPesanOrder(d, o);
          antriNotif(d, {
            orderId: o.id, noWa: p.noWa, jenis: "Perubahan estimasi",
            isi: pesanTemplate(d.toko, "perubahanStatus", { ...data, status: STATUS_LABEL[o.status], catatan: `\nEstimasi selesai diperbarui menjadi ${fmtEstimasi(iso)}. Alasan: ${alasan}` }),
          });
        });
      },
      ajukanPersetujuan(orderId: string, input: { jenis: "awal" | "tambahan"; diagnosa: string; items: Omit<ItemOrder, "id" | "persetujuanId" | "tambahan">[]; estimasiSelesai: string }) {
        ubah((d) => {
          const o = d.order.find((x) => x.id === orderId);
          if (!o) return;
          const pid = uid();
          const items = input.items.map((i) => ({ ...i, id: uid(), tambahan: input.jenis === "tambahan", persetujuanId: pid }));
          o.items.push(...items);
          const total = items.reduce((s, i) => s + i.hargaFinal, 0);
          o.persetujuan.push({ id: pid, jenis: input.jenis, diagnosa: input.diagnosa, itemIds: items.map((i) => i.id), total, estimasiSelesai: input.estimasiSelesai, status: "menunggu", dibuat: new Date().toISOString() });
          if (input.estimasiSelesai && input.estimasiSelesai !== o.estimasiSelesai) {
            o.riwayatEstimasi.push({ dari: o.estimasiSelesai, ke: input.estimasiSelesai, alasan: `Hasil diagnosa (${input.jenis === "awal" ? "awal" : "biaya tambahan"})`, oleh: namaStaf, waktu: new Date().toISOString() });
            o.estimasiSelesai = input.estimasiSelesai;
          }
          catatStatus(d, o, "menunggu_persetujuan", namaStaf, input.jenis === "tambahan" ? `Ditemukan kerusakan tambahan: ${input.diagnosa}` : input.diagnosa);
          const { p, data } = dataPesanOrder(d, o);
          antriNotif(d, {
            orderId: o.id, noWa: p.noWa, jenis: input.jenis === "awal" ? "Minta persetujuan biaya" : "Minta persetujuan biaya tambahan",
            isi: pesanTemplate(d.toko, "mintaPersetujuan", { ...data, diagnosa: input.diagnosa, total: rupiah(total) }),
          });
        });
      },
      jawabPersetujuan(orderId: string, persetujuanId: string, setuju: boolean, kanal: "aplikasi" | "telepon", keterangan?: string) {
        ubah((d) => {
          const o = d.order.find((x) => x.id === orderId);
          const ps = o?.persetujuan.find((x) => x.id === persetujuanId);
          if (!o || !ps || ps.status !== "menunggu") return;
          ps.status = setuju ? "setuju" : "tolak";
          ps.kanal = kanal;
          ps.waktu = new Date().toISOString();
          ps.keterangan = kanal === "telepon" ? `${keterangan ?? ""} (dicatat ${namaStaf})`.trim() : keterangan;
          ps.perangkat = kanal === "aplikasi" && typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 160) : undefined;
          const oleh = kanal === "aplikasi" ? "Pelanggan" : namaStaf;
          if (setuju) {
            catatStatus(d, o, "dikerjakan", oleh, `${ps.jenis === "awal" ? "Biaya" : "Biaya tambahan"} ${rupiah(ps.total)} disetujui via ${kanal}`);
          } else if (ps.jenis === "awal") {
            // STJ-02: ditolak → HP dikembalikan dengan biaya cek sesuai kebijakan
            if (d.toko.biayaCek > 0) o.items.push({ id: uid(), deskripsi: "Biaya pengecekan", hargaFinal: d.toko.biayaCek, tambahan: false, garansiHari: 0 });
            catatStatus(d, o, "siap_diambil", oleh, `Perbaikan ditolak pelanggan, HP dikembalikan${d.toko.biayaCek > 0 ? ` dengan biaya cek ${rupiah(d.toko.biayaCek)}` : " tanpa biaya"}.`);
          } else {
            catatStatus(d, o, "dikerjakan", oleh, "Biaya tambahan ditolak; pekerjaan tambahan tidak dikerjakan, lanjut pekerjaan awal.");
          }
        });
      },
      bayar(orderId: string, input: Omit<Pembayaran, "id" | "waktu" | "dicatatOleh" | "nominal">) {
        ubah((d) => {
          const o = d.order.find((x) => x.id === orderId);
          if (!o) return;
          const now = new Date();
          const tagihan = totalTagihan(o);
          o.pembayaran = { ...input, id: uid(), nominal: Math.max(0, tagihan - input.diskon), waktu: now.toISOString(), dicatatOleh: namaStaf };
          o.kodeKunci = undefined; // dihapus otomatis saat Selesai
          o.selesai = now.toISOString();
          const bergaransi = itemDitagih(o).filter((i) => i.garansiHari > 0);
          if (bergaransi.length) {
            const hari = Math.max(...bergaransi.map((i) => i.garansiHari));
            const g: Garansi = {
              id: uid(), mulai: now.toISOString(), berakhir: new Date(now.getTime() + hari * 86400_000).toISOString(),
              ketentuan: "Garansi berlaku untuk jasa & sparepart yang tercantum. Tidak berlaku untuk kerusakan akibat jatuh, tekanan, kena air, atau segel rusak.",
              cakupan: bergaransi.map((i) => `${i.deskripsi} (${i.garansiHari} hari)`), status: "aktif",
            };
            o.garansi = g;
          }
          catatStatus(d, o, "selesai", namaStaf, `Dibayar ${rupiah(o.pembayaran.nominal)} (${input.metode})`);
          const { p, data } = dataPesanOrder(d, o);
          antriNotif(d, { orderId: o.id, noWa: p.noWa, jenis: "Kwitansi", isi: pesanTemplate(d.toko, "kwitansi", { ...data, total: rupiah(o.pembayaran.nominal), metode: input.metode.toUpperCase() }) });
        });
      },

      /* ---------- Garansi ---------- */
      klaimGaransi(orderId: string, keluhan: string) {
        ubah((d) => {
          const o = d.order.find((x) => x.id === orderId);
          if (!o?.garansi || o.garansi.status !== "aktif") return;
          o.garansi.klaim = { keluhan, waktu: new Date().toISOString(), status: "menunggu" };
        });
      },
      prosesKlaim(orderId: string, terima: boolean, alasan: string) {
        return ubah((d) => {
          const o = d.order.find((x) => x.id === orderId);
          if (!o?.garansi?.klaim) return null;
          o.garansi.klaim.status = terima ? "diterima" : "ditolak";
          o.garansi.klaim.alasan = alasan;
          if (terima) o.garansi.status = "diklaim";
          return o;
        });
      },
      tautkanKlaim(orderAsalId: string, orderBaruId: string) {
        ubah((d) => {
          const o = d.order.find((x) => x.id === orderAsalId);
          if (o?.garansi?.klaim) o.garansi.klaim.orderBaruId = orderBaruId;
        });
      },

      /* ---------- Notifikasi WA ---------- */
      tandaiNotif(id: string, status: Notifikasi["statusKirim"]) {
        ubah((d) => {
          const n = d.notifikasi.find((x) => x.id === id);
          if (!n) return;
          n.statusKirim = status;
          n.percobaan += 1;
          n.waktu = new Date().toISOString();
        });
      },
      kirimPengingat(input: { orderId?: string; reservasiId?: string; noWa: string; jenis: string; isi: string }) {
        ubah((d) => antriNotif(d, input));
      },

      /* ---------- Katalog ---------- */
      simpanJasa(j: Jasa) {
        ubah((d) => {
          const i = d.jasa.findIndex((x) => x.id === j.id);
          if (i >= 0) d.jasa[i] = j;
          else d.jasa.push(j);
        });
      },
      simpanHarga(h: HargaJasa) {
        ubah((d) => {
          const i = d.harga.findIndex((x) => x.id === h.id);
          if (i >= 0) d.harga[i] = h;
          else d.harga.push(h);
        });
      },
      tambahTipe(merek: string, tipe: string, seri: string) {
        return ubah((d) => {
          const id = `${merek} ${tipe}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          if (!d.tipeHp.some((t) => t.id === id)) d.tipeHp.push({ id, merek, tipe, seri });
          return id;
        });
      },
      imporHarga(rows: { jasaId: string; merek: string; tipe: string; kualitas: HargaJasa["kualitas"]; hargaMin: number; hargaMax: number; durasiMin: number; durasiMax: number; garansiHari: number }[]) {
        return ubah((d) => {
          let baru = 0, diubah = 0;
          for (const r of rows) {
            const tipeId = `${r.merek} ${r.tipe}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            if (!d.tipeHp.some((t) => t.id === tipeId)) d.tipeHp.push({ id: tipeId, merek: r.merek, tipe: r.tipe, seri: "" });
            const id = `${r.jasaId}__${tipeId}__${r.kualitas}`;
            const h: HargaJasa = { id, jasaId: r.jasaId, tipeHpId: tipeId, kualitas: r.kualitas, hargaMin: r.hargaMin, hargaMax: r.hargaMax, durasiMin: r.durasiMin, durasiMax: r.durasiMax, garansiHari: r.garansiHari, aktif: true };
            const i = d.harga.findIndex((x) => x.id === id);
            if (i >= 0) { d.harga[i] = h; diubah++; } else { d.harga.push(h); baru++; }
          }
          return { baru, diubah };
        });
      },

      /* ---------- Pengaturan ---------- */
      simpanToko(t: Toko) {
        ubah((d) => {
          d.toko = t;
        });
      },
      simpanTemplate(key: TemplateKey, isi: string) {
        ubah((d) => {
          d.toko.template[key] = isi;
        });
      },
      simpanStaf(s: Staf) {
        ubah((d) => {
          const i = d.staf.findIndex((x) => x.id === s.id);
          if (i >= 0) d.staf[i] = s;
          else d.staf.push(s);
        });
      },
      resetDemo() {
        localStorage.removeItem(KUNCI);
        const d = buatDbAwal();
        dbRef.current = d;
        setDb(d);
        localStorage.setItem(KUNCI, JSON.stringify(d));
      },
    }),
    [ubah, namaStaf],
  );

  return { db, staf, siap: db !== null, ...aksi };
}

type Store = ReturnType<typeof useStoreInternal>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const s = useStoreInternal();
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore di luar StoreProvider");
  return s;
}

/** Untuk halaman yang butuh db pasti terisi. */
export function useDb() {
  const s = useStore();
  return { ...s, db: s.db as DB };
}

