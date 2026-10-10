import { linkLacak, linkReservasi } from "./store";
import { namaHp, pesanTemplate, sisaHariGaransi } from "./logic";
import { tanggal, tanggalPendek, ymd } from "./format";
import type { DB } from "./types";

/** Pengingat otomatis yang jatuh tempo (RSV-04, PRG-06, GRS-03). */
export function pengingatJatuhTempo(db: DB, now = new Date()) {
  const out: { kunci: string; jenis: string; untuk: string; noWa: string; isi: string; orderId?: string; reservasiId?: string }[] = [];
  const sudah = new Set(db.notifikasi.map((n) => `${n.jenis}|${n.orderId ?? n.reservasiId}`));
  const besok = ymd(new Date(now.getTime() + 86400_000));
  for (const r of db.reservasi.filter((x) => x.status === "terjadwal")) {
    const p = db.pelanggan.find((x) => x.id === r.pelangganId)!;
    const jadwal = new Date(`${r.tanggal}T${r.slot}:00`);
    const selisihJam = (jadwal.getTime() - now.getTime()) / 3600_000;
    const data = { nama: p.nama.split(" ")[0], tanggal: tanggal(jadwal), slot: r.slot, link: linkReservasi(r.token) };
    if (r.tanggal === besok && !sudah.has(`Pengingat H-1|${r.id}`))
      out.push({ kunci: `h1-${r.id}`, jenis: "Pengingat H-1", untuk: p.nama, noWa: p.noWa, reservasiId: r.id, isi: pesanTemplate(db.toko, "pengingatReservasi", { ...data, kapan: "besok" }) });
    if (selisihJam > 0 && selisihJam <= 2 && !sudah.has(`Pengingat 2 jam|${r.id}`))
      out.push({ kunci: `h2-${r.id}`, jenis: "Pengingat 2 jam", untuk: p.nama, noWa: p.noWa, reservasiId: r.id, isi: pesanTemplate(db.toko, "pengingatReservasi", { ...data, kapan: "2 jam lagi" }) });
  }
  for (const o of db.order) {
    const p = db.pelanggan.find((x) => x.id === o.pelangganId)!;
    const data = { nama: p.nama.split(" ")[0], nomor: o.nomorServis, hp: namaHp(db, o.tipeHpId, o.tipeLain), link: linkLacak(o.token) };
    if (o.status === "siap_diambil") {
      const sejak = [...o.riwayat].reverse().find((r) => r.status === "siap_diambil")?.waktu ?? o.dibuat;
      if (now.getTime() - new Date(sejak).getTime() > 7 * 86400_000 && !sudah.has(`Pengingat ambil|${o.id}`))
        out.push({ kunci: `ambil-${o.id}`, jenis: "Pengingat ambil", untuk: p.nama, noWa: p.noWa, orderId: o.id, isi: pesanTemplate(db.toko, "pengingatAmbil", { ...data, sejak: tanggalPendek(sejak), batas: db.toko.batasSimpanHari }) });
    }
    if (o.garansi?.status === "aktif") {
      const sisa = sisaHariGaransi(o.garansi.berakhir, now);
      if (sisa > 0 && sisa <= 7 && !sudah.has(`Garansi akan berakhir|${o.id}`))
        out.push({ kunci: `grs-${o.id}`, jenis: "Garansi akan berakhir", untuk: p.nama, noWa: p.noWa, orderId: o.id, isi: pesanTemplate(db.toko, "garansiBerakhir", { ...data, berakhir: tanggal(o.garansi.berakhir) }) });
    }
  }
  return out;
}

