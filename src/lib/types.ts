// Model data mengikuti bagian "Model Data" pada PRD.

export type Peran = "pemilik" | "admin" | "teknisi";
export type Kualitas = "original" | "oem" | "kw" | "standar";
export type Prioritas = "normal" | "ekspres";

export const STATUS_ORDER = [
  "diterima",
  "pengecekan",
  "menunggu_persetujuan",
  "menunggu_sparepart",
  "dikerjakan",
  "uji_coba",
  "siap_diambil",
  "selesai",
] as const;
export type StatusServis = (typeof STATUS_ORDER)[number] | "dibatalkan";

export interface Toko {
  id: string;
  nama: string;
  alamat: string;
  noWa: string; // format 62xxxxxxxx
  jamBuka: string; // "09:00"
  jamTutup: string; // "21:00"
  hariLibur: number[]; // 0 = Minggu
  slotMenit: number;
  kapasitasSlot: number;
  biayaCek: number; // 0 = pengecekan gratis
  biayaEkspres: number;
  batasSimpanHari: number;
  syaratServis: string;
  template: Record<TemplateKey, string>;
}

export type TemplateKey =
  | "konfirmasiReservasi"
  | "pengingatReservasi"
  | "notaServis"
  | "perubahanStatus"
  | "mintaPersetujuan"
  | "siapDiambil"
  | "pengingatAmbil"
  | "kwitansi"
  | "garansiBerakhir";

export interface Staf {
  id: string;
  cabangId: string;
  nama: string;
  noHp: string;
  peran: Peran;
  keahlian: string[];
  pin: string; // mode demo; di Supabase memakai Auth (password di-hash)
  aktif: boolean;
}

export interface Pelanggan {
  id: string;
  nama: string;
  noWa: string;
  email?: string;
}

export interface TipeHp {
  id: string;
  merek: string;
  tipe: string;
  seri: string;
}

export interface Jasa {
  id: string;
  kategori: string;
  nama: string;
  deskripsi: string;
  gambar?: string;
  aktif: boolean;
}

export interface HargaJasa {
  id: string;
  jasaId: string;
  tipeHpId: string;
  kualitas: Kualitas;
  hargaMin: number;
  hargaMax: number;
  durasiMin: number; // menit
  durasiMax: number; // menit
  garansiHari: number;
  aktif: boolean;
}

export type StatusReservasi = "terjadwal" | "datang" | "batal" | "no_show";

export interface Reservasi {
  id: string;
  token: string;
  pelangganId: string;
  tanggal: string; // YYYY-MM-DD
  slot: string; // HH:mm
  tipeHpId?: string;
  tipeLain?: string;
  keluhan: string;
  jasaIds?: string[];
  catatan?: string;
  foto?: string;
  status: StatusReservasi;
  dibuat: string;
  orderId?: string;
}

export interface KondisiAwal {
  layar: string;
  body: string;
  kamera: string;
  tombol: string;
  menyala: boolean;
  catatan: string;
}

export interface ItemOrder {
  id: string;
  hargaJasaId?: string;
  deskripsi: string;
  hargaFinal: number;
  tambahan: boolean;
  persetujuanId?: string;
  garansiHari: number;
}

export interface RiwayatStatus {
  id: string;
  status: StatusServis;
  catatan?: string;
  foto?: string;
  diubahOleh: string;
  waktu: string;
}

export interface Persetujuan {
  id: string;
  jenis: "awal" | "tambahan";
  diagnosa: string;
  itemIds: string[];
  total: number;
  estimasiSelesai: string;
  status: "menunggu" | "setuju" | "tolak";
  kanal?: "aplikasi" | "telepon";
  keterangan?: string;
  perangkat?: string;
  dibuat: string;
  waktu?: string;
}

export interface Pembayaran {
  id: string;
  nominal: number;
  metode: "tunai" | "transfer" | "qris";
  diskon: number;
  alasanDiskon?: string;
  waktu: string;
  dicatatOleh: string;
}

export interface Garansi {
  id: string;
  mulai: string;
  berakhir: string;
  ketentuan: string;
  cakupan: string[];
  status: "aktif" | "diklaim" | "habis";
  klaim?: { keluhan: string; waktu: string; status: "menunggu" | "diterima" | "ditolak"; orderBaruId?: string; alasan?: string };
}

export interface PerubahanEstimasi {
  dari: string;
  ke: string;
  alasan: string;
  oleh: string;
  waktu: string;
}

export interface OrderServis {
  id: string;
  token: string;
  nomorServis: string;
  cabangId: string;
  pelangganId: string;
  reservasiId?: string;
  tipeHpId?: string;
  tipeLain?: string;
  keluhan: string;
  jasaIdDiminta: string[];
  kondisiAwal: KondisiAwal;
  fotoKondisi: string[];
  kelengkapan: string[];
  kodeKunci?: string; // disandikan; dihapus saat Selesai
  teknisiId?: string;
  prioritas: Prioritas;
  status: StatusServis;
  estimasiSelesai: string;
  riwayatEstimasi: PerubahanEstimasi[];
  ttdPelanggan: string;
  servisAsalId?: string;
  items: ItemOrder[];
  riwayat: RiwayatStatus[];
  persetujuan: Persetujuan[];
  pembayaran?: Pembayaran;
  garansi?: Garansi;
  dibuat: string;
  selesai?: string;
}

export interface Notifikasi {
  id: string;
  orderId?: string;
  reservasiId?: string;
  noWa: string;
  jenis: string;
  isi: string;
  statusKirim: "antri" | "terkirim" | "gagal";
  percobaan: number;
  waktu: string;
}

export interface DB {
  versi: number;
  toko: Toko;
  staf: Staf[];
  pelanggan: Pelanggan[];
  tipeHp: TipeHp[];
  jasa: Jasa[];
  harga: HargaJasa[];
  reservasi: Reservasi[];
  order: OrderServis[];
  notifikasi: Notifikasi[];
}
