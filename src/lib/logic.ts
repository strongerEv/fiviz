import type { DB, HargaJasa, Kualitas, OrderServis, Staf, StatusServis, TemplateKey, TipeHp, Toko } from "./types";
import { durasiKisaran, kisaran, normalisasiWa, tanggal, waktu, ymd } from "./format";
import { KUALITAS_LABEL } from "./seed";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function buatToken(n = 12) {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => abc[b % abc.length]).join("");
}

/* ---------- Status ---------- */

export const STATUS_LABEL: Record<StatusServis, string> = {
  diterima: "Diterima",
  pengecekan: "Pengecekan",
  menunggu_persetujuan: "Menunggu Persetujuan",
  menunggu_sparepart: "Menunggu Sparepart",
  dikerjakan: "Dikerjakan",
  uji_coba: "Uji Coba",
  siap_diambil: "Siap Diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const STATUS_WARNA: Record<StatusServis, string> = {
  diterima: "bg-slate-100 text-slate-700",
  pengecekan: "bg-sky-100 text-sky-800",
  menunggu_persetujuan: "bg-amber-100 text-amber-800",
  menunggu_sparepart: "bg-orange-100 text-orange-800",
  dikerjakan: "bg-blue-100 text-blue-800",
  uji_coba: "bg-indigo-100 text-indigo-800",
  siap_diambil: "bg-emerald-100 text-emerald-800",
  selesai: "bg-green-600 text-white",
  dibatalkan: "bg-red-100 text-red-700",
};

export const STATUS_AKTIF: StatusServis[] = ["diterima", "pengecekan", "menunggu_persetujuan", "menunggu_sparepart", "dikerjakan", "uji_coba"];

/** Langkah berikut yang boleh diambil teknisi dengan satu ketukan. Persetujuan & pembayaran punya alur sendiri. */
export function langkahBerikut(o: OrderServis): StatusServis | null {
  const menunggu = o.persetujuan.some((p) => p.status === "menunggu");
  switch (o.status) {
    case "diterima":
      return "pengecekan";
    case "menunggu_sparepart":
      return "dikerjakan";
    case "dikerjakan":
      return "uji_coba";
    case "uji_coba":
      return "siap_diambil";
    case "menunggu_persetujuan":
      return menunggu ? null : "dikerjakan";
    default:
      return null;
  }
}

export function bolehPindah(o: OrderServis, ke: StatusServis): string | null {
  if (o.status === "selesai" || o.status === "dibatalkan") return "Servis sudah ditutup.";
  if (ke === "dibatalkan") return null;
  if (ke === "selesai") return "Tandai Selesai lewat pencatatan pembayaran.";
  const menunggu = o.persetujuan.some((p) => p.status === "menunggu");
  if (["dikerjakan", "uji_coba", "siap_diambil", "menunggu_sparepart"].includes(ke)) {
    if (menunggu) return "Masih menunggu persetujuan biaya pelanggan.";
    const disetujui = o.persetujuan.some((p) => p.status === "setuju");
    const ditolakAwal = o.persetujuan.some((p) => p.jenis === "awal" && p.status === "tolak");
    if (!disetujui && !o.servisAsalId && !(ditolakAwal && ke === "siap_diambil"))
      return "Ajukan diagnosa & biaya dan tunggu persetujuan pelanggan dulu.";
  }
  return null;
}

/* ---------- Katalog & estimasi ---------- */

export function cariTipe(list: TipeHp[], q: string, limit = 8) {
  const s = q.toLowerCase().trim();
  if (!s) return [];
  const kata = s.split(/\s+/);
  return list
    .filter((t) => kata.every((k) => `${t.merek} ${t.tipe} ${t.seri}`.toLowerCase().includes(k)))
    .sort((a, b) => {
      const pa = `${a.merek} ${a.tipe}`.toLowerCase().startsWith(s) || a.tipe.toLowerCase().startsWith(s) ? 0 : 1;
      const pb = `${b.merek} ${b.tipe}`.toLowerCase().startsWith(s) || b.tipe.toLowerCase().startsWith(s) ? 0 : 1;
      return pa - pb || a.tipe.localeCompare(b.tipe);
    })
    .slice(0, limit);
}

export const namaHp = (db: Pick<DB, "tipeHp">, id?: string, lain?: string) => {
  const t = db.tipeHp.find((x) => x.id === id);
  return t ? `${t.merek} ${t.tipe}` : lain || "HP";
};

export function hargaTersedia(db: Pick<DB, "harga" | "jasa">, tipeHpId: string, jasaId: string) {
  const urut: Kualitas[] = ["original", "oem", "kw", "standar"];
  return db.harga
    .filter((h) => h.aktif && h.tipeHpId === tipeHpId && h.jasaId === jasaId)
    .sort((a, b) => urut.indexOf(a.kualitas) - urut.indexOf(b.kualitas));
}

export interface BarisEstimasi {
  jasaId: string;
  namaJasa: string;
  harga?: HargaJasa;
}

export function hitungEstimasi(db: Pick<DB, "harga" | "jasa">, tipeHpId: string | undefined, pilihan: { jasaId: string; kualitas?: Kualitas }[]) {
  const baris: BarisEstimasi[] = pilihan.map(({ jasaId, kualitas }) => {
    const j = db.jasa.find((x) => x.id === jasaId);
    const opsi = tipeHpId ? hargaTersedia(db, tipeHpId, jasaId) : [];
    const harga = opsi.find((h) => h.kualitas === kualitas) ?? opsi[0];
    return { jasaId, namaJasa: j?.nama ?? jasaId, harga };
  });
  const ada = baris.filter((b) => b.harga);
  const min = ada.reduce((s, b) => s + b.harga!.hargaMin, 0);
  const max = ada.reduce((s, b) => s + b.harga!.hargaMax, 0);
  // Pekerjaan dikerjakan berurutan; durasi dijumlah.
  const durMin = ada.reduce((s, b) => s + b.harga!.durasiMin, 0);
  const durMax = ada.reduce((s, b) => s + b.harga!.durasiMax, 0);
  return { baris, min, max, durMin, durMax, belumAdaHarga: baris.filter((b) => !b.harga), lengkap: ada.length === baris.length && baris.length > 0 };
}

export function ringkasEstimasi(db: Pick<DB, "harga" | "jasa">, tipeHpId: string | undefined, pilihan: { jasaId: string; kualitas?: Kualitas }[]) {
  const e = hitungEstimasi(db, tipeHpId, pilihan);
  if (!e.baris.some((b) => b.harga)) return "";
  const rinci = e.baris
    .map((b) =>
      b.harga
        ? `- ${b.namaJasa}${b.harga.kualitas !== "standar" ? ` (${KUALITAS_LABEL[b.harga.kualitas]})` : ""}: ${kisaran(b.harga.hargaMin, b.harga.hargaMax)}`
        : `- ${b.namaJasa}: belum ada harga`,
    )
    .join("\n");
  return `${rinci}\nEstimasi total: ${kisaran(e.min, e.max)}, lama ${durasiKisaran(e.durMin, e.durMax)}`;
}

/* ---------- Jam kerja, slot, estimasi selesai ---------- */

const keMenit = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const dariMenit = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function slotHari(toko: Toko, tanggalYmd: string) {
  const d = new Date(`${tanggalYmd}T00:00:00`);
  if (toko.hariLibur.includes(d.getDay())) return [];
  const out: string[] = [];
  for (let m = keMenit(toko.jamBuka); m + toko.slotMenit <= keMenit(toko.jamTutup); m += toko.slotMenit) out.push(dariMenit(m));
  return out;
}

export function ketersediaanSlot(db: Pick<DB, "toko" | "reservasi">, tanggalYmd: string, now = new Date(), kecualiId?: string) {
  const terisi: Record<string, number> = {};
  for (const r of db.reservasi)
    if (r.tanggal === tanggalYmd && r.id !== kecualiId && (r.status === "terjadwal" || r.status === "datang")) terisi[r.slot] = (terisi[r.slot] ?? 0) + 1;
  const hariIni = ymd(now) === tanggalYmd;
  const menitSekarang = now.getHours() * 60 + now.getMinutes();
  return slotHari(db.toko, tanggalYmd).map((slot) => {
    const isi = terisi[slot] ?? 0;
    const lewat = hariIni && keMenit(slot) <= menitSekarang + 15;
    return { slot, isi, sisa: Math.max(0, db.toko.kapasitasSlot - isi), bisa: !lewat && isi < db.toko.kapasitasSlot, lewat };
  });
}

export function statusLayanan(toko: Toko, now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes();
  const libur = toko.hariLibur.includes(now.getDay());
  const buka = !libur && m >= keMenit(toko.jamBuka) && m < keMenit(toko.jamTutup);
  if (buka) return { buka, info: `Online sekarang · balasan biasanya < 15 menit (sampai ${toko.jamTutup})` };
  // cari hari buka berikutnya
  const next = new Date(now);
  if (libur || m >= keMenit(toko.jamTutup)) next.setDate(next.getDate() + 1);
  for (let i = 0; i < 7 && toko.hariLibur.includes(next.getDay()); i++) next.setDate(next.getDate() + 1);
  const sama = ymd(next) === ymd(now);
  return {
    buka,
    info: `Di luar jam layanan. Pesan Anda dibalas ${sama ? "hari ini" : ymd(next) === ymd(new Date(now.getTime() + 86400_000)) ? "besok" : tanggal(next)} mulai pukul ${toko.jamBuka}.`,
  };
}

/** Tambah menit kerja dengan melewati jam tutup dan hari libur. */
export function tambahMenitKerja(toko: Toko, mulai: Date, menit: number) {
  // Pekerjaan berhari-hari (kena air, mati total) dihitung kalender, bukan jam kerja.
  if (menit >= 1440) {
    const d = new Date(mulai.getTime() + menit * 60_000);
    const tutup = keMenit(toko.jamTutup);
    const m = d.getHours() * 60 + d.getMinutes();
    if (m > tutup || m < keMenit(toko.jamBuka)) d.setHours(Math.floor(tutup / 60) - 1, 0, 0, 0);
    return d;
  }
  const buka = keMenit(toko.jamBuka);
  const tutup = keMenit(toko.jamTutup);
  const d = new Date(mulai);
  let sisa = menit;
  for (let guard = 0; guard < 60 && sisa > 0; guard++) {
    const m = d.getHours() * 60 + d.getMinutes();
    if (toko.hariLibur.includes(d.getDay()) || m >= tutup) {
      d.setDate(d.getDate() + 1);
      d.setHours(Math.floor(buka / 60), buka % 60, 0, 0);
      continue;
    }
    if (m < buka) d.setHours(Math.floor(buka / 60), buka % 60, 0, 0);
    const now = d.getHours() * 60 + d.getMinutes();
    const pakai = Math.min(sisa, tutup - now);
    d.setTime(d.getTime() + pakai * 60_000);
    sisa -= pakai;
  }
  return d;
}

export function durasiOrder(db: Pick<DB, "harga">, o: Pick<OrderServis, "items" | "jasaIdDiminta" | "tipeHpId">) {
  const dariItem = o.items.map((i) => db.harga.find((h) => h.id === i.hargaJasaId)?.durasiMax ?? 0).reduce((a, b) => a + b, 0);
  if (dariItem) return dariItem;
  const dariJasa = o.jasaIdDiminta
    .map((j) => db.harga.find((h) => h.jasaId === j && h.tipeHpId === o.tipeHpId)?.durasiMax ?? db.harga.find((h) => h.jasaId === j)?.durasiMax ?? 0)
    .reduce((a, b) => a + b, 0);
  return dariJasa || 120;
}

/** Sisa beban antrean teknisi dalam menit kerja (PRG-03). */
export function bebanTeknisi(db: Pick<DB, "order" | "harga">, teknisiId: string, kecualiId?: string) {
  return db.order
    .filter((o) => o.teknisiId === teknisiId && o.id !== kecualiId && STATUS_AKTIF.includes(o.status) && o.status !== "menunggu_sparepart")
    .reduce((s, o) => s + Math.min(durasiOrder(db, o), 480), 0);
}

export function hitungEstimasiSelesai(
  db: Pick<DB, "order" | "harga" | "toko">,
  o: Pick<OrderServis, "items" | "jasaIdDiminta" | "tipeHpId" | "teknisiId" | "prioritas"> & { id?: string },
  now = new Date(),
) {
  const antre = o.prioritas === "ekspres" || !o.teknisiId ? 0 : bebanTeknisi(db, o.teknisiId, o.id);
  const cek = 30; // waktu pengecekan
  return tambahMenitKerja(db.toko, now, antre + cek + durasiOrder(db, o)).toISOString();
}

export function sarankanTeknisi(db: Pick<DB, "staf" | "order" | "harga" | "tipeHp" | "jasa">, tipeHpId?: string, jasaIds: string[] = []) {
  const merek = db.tipeHp.find((t) => t.id === tipeHpId)?.merek;
  const kategori = jasaIds.map((j) => db.jasa.find((x) => x.id === j)?.kategori);
  const cocok = (s: Staf) => {
    let skor = 0;
    if (merek === "Apple" && s.keahlian.includes("iPhone")) skor += 2;
    if (merek && merek !== "Apple" && s.keahlian.includes("Android")) skor += 1;
    if (kategori.includes("layar") && s.keahlian.includes("Layar")) skor += 1;
    if (kategori.includes("mati-total") && s.keahlian.includes("Mesin/IC")) skor += 2;
    if (kategori.includes("kena-air") && s.keahlian.includes("Kena Air")) skor += 2;
    if (kategori.includes("software") && s.keahlian.includes("Software")) skor += 1;
    return skor;
  };
  return db.staf
    .filter((s) => s.aktif && s.peran === "teknisi")
    .map((s) => {
      const aktif = db.order.filter((o) => o.teknisiId === s.id && STATUS_AKTIF.includes(o.status)).length;
      return { staf: s, aktif, beban: bebanTeknisi(db, s.id), keahlian: cocok(s) };
    })
    .sort((a, b) => b.keahlian * 120 - b.beban - (a.keahlian * 120 - a.beban));
}

export const terlambat = (o: OrderServis, now = new Date()) => STATUS_AKTIF.includes(o.status) && new Date(o.estimasiSelesai) < now;

/* ---------- Nomor servis & biaya ---------- */

export function nomorServisBaru(db: Pick<DB, "order">, now = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  const prefix = `FS-${String(now.getFullYear()).slice(2)}${p(now.getMonth() + 1)}${p(now.getDate())}-`;
  const max = db.order.filter((o) => o.nomorServis.startsWith(prefix)).reduce((m, o) => Math.max(m, Number(o.nomorServis.slice(prefix.length)) || 0), 0);
  return prefix + String(max + 1).padStart(3, "0");
}

/** Item yang ditagihkan: item tanpa persetujuan (biaya ekspres/cek) atau yang persetujuannya disetujui. */
export function itemDitagih(o: OrderServis) {
  return o.items.filter((i) => {
    if (!i.persetujuanId) return true;
    return o.persetujuan.find((p) => p.id === i.persetujuanId)?.status === "setuju";
  });
}

export function totalTagihan(o: OrderServis) {
  return itemDitagih(o).reduce((s, i) => s + i.hargaFinal, 0);
}

export const sisaHariGaransi = (berakhir: string, now = new Date()) => Math.ceil((new Date(berakhir).getTime() - now.getTime()) / 86400_000);

/* ---------- WhatsApp ---------- */

export function isiTemplate(t: string, data: Record<string, string | number | undefined>) {
  return t.replace(/\{(\w+)\}/g, (_, k) => (data[k] ?? "").toString());
}

export const waLink = (no: string, teks: string) => `https://wa.me/${normalisasiWa(no)}?text=${encodeURIComponent(teks)}`;

export function pesanTemplate(toko: Toko, key: TemplateKey, data: Record<string, string | number | undefined>) {
  return isiTemplate(toko.template[key], { toko: toko.nama, alamat: toko.alamat, ...data });
}

export const fmtEstimasi = (iso: string) => waktu(iso);
