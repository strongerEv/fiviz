import type { DB, HargaJasa, Jasa, Kualitas, OrderServis, Pelanggan, Reservasi, Staf, TipeHp, Toko } from "./types";
import { ymd } from "./format";
import { tambahMenitKerja } from "./logic";

export const DB_VERSI = 1;

export const KATEGORI = [
  { id: "layar", nama: "Layar / LCD", gambar: "/img/phones/layar-retak.png" },
  { id: "baterai", nama: "Baterai", gambar: "/img/parts/baterai.png" },
  { id: "konektor", nama: "Konektor Charger", gambar: "/img/phones/charger.png" },
  { id: "kamera", nama: "Kamera", gambar: "/img/phones/kamera.png" },
  { id: "speaker", nama: "Speaker / Mic", gambar: "/img/parts/speaker.png" },
  { id: "tombol", nama: "Tombol", gambar: "/img/parts/alat.png" },
  { id: "mati-total", nama: "Mati Total", gambar: "/img/phones/mati-total.png" },
  { id: "kena-air", nama: "Kena Air", gambar: "/img/phones/kena-air.png" },
  { id: "software", nama: "Software", gambar: "/img/phones/software.png" },
  { id: "lainnya", nama: "Lainnya", gambar: "/img/phones/backdoor.png" },
] as const;

export const KUALITAS_LABEL: Record<Kualitas, string> = {
  original: "Original",
  oem: "OEM",
  kw: "KW",
  standar: "Standar",
};

const TEMPLATE_DEFAULT: Toko["template"] = {
  konfirmasiReservasi:
    "Halo {nama}, reservasi servis Anda di {toko} sudah tercatat.\n📅 {tanggal} pukul {slot}\n📱 {hp}\nKeluhan: {keluhan}\n\nUbah/batalkan jadwal: {link}",
  pengingatReservasi:
    "Halo {nama}, mengingatkan jadwal servis Anda di {toko} {kapan} ({tanggal} pukul {slot}). Alamat: {alamat}. Ubah/batalkan: {link}",
  notaServis:
    "Halo {nama}, HP {hp} sudah kami terima.\nNomor servis: *{nomor}*\nEstimasi selesai: {estimasi}\n\nPantau progres & nota digital: {link}",
  perubahanStatus: "Halo {nama}, status servis *{nomor}* ({hp}) kini: *{status}*.{catatan}\nDetail: {link}",
  mintaPersetujuan:
    "Halo {nama}, hasil pengecekan HP {hp} ({nomor}) sudah keluar.\nDiagnosa: {diagnosa}\nTotal biaya: *{total}*\n\nMohon pilih Setuju / Tolak di sini: {link}\nPekerjaan tidak kami lanjutkan sebelum Anda setuju.",
  siapDiambil: "Halo {nama}, HP {hp} ({nomor}) sudah *SIAP DIAMBIL* di {toko}. Total: {total}. Detail: {link}",
  pengingatAmbil:
    "Halo {nama}, HP {hp} ({nomor}) sudah siap diambil sejak {sejak}. Mohon diambil ya, batas penyimpanan sesuai syarat servis adalah {batas} hari. {link}",
  kwitansi: "Terima kasih {nama}! Pembayaran servis {nomor} sebesar {total} ({metode}) sudah kami terima. Kwitansi & kartu garansi: {link}",
  garansiBerakhir: "Halo {nama}, garansi servis {nomor} ({hp}) akan berakhir pada {berakhir}. Jika ada keluhan, klaim di sini: {link}",
};

export const SYARAT_DEFAULT = `1. Pengecekan dilakukan oleh teknisi Firman Service. Biaya final diinformasikan setelah pengecekan dan baru dikerjakan setelah pelanggan menyetujui.
2. Kerusakan tambahan yang ditemukan saat pengerjaan akan diinformasikan dan wajib disetujui pelanggan sebelum dilanjutkan.
3. Toko tidak mengakses data di dalam HP di luar keperluan pengujian. Pelanggan disarankan mencadangkan data sebelum servis.
4. Kode kunci/pola hanya terlihat oleh teknisi yang ditugaskan dan otomatis dihapus saat servis selesai.
5. HP yang tidak diambil lebih dari 30 hari sejak dinyatakan Siap Diambil di luar tanggung jawab toko.
6. Garansi berlaku sesuai jenis jasa dan kualitas sparepart, tidak berlaku untuk kerusakan akibat jatuh, tekanan, atau kena air setelah servis.
7. Data pribadi pelanggan diproses sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.`;

export const TOKO_DEFAULT: Toko = {
  id: "cabang-utama",
  nama: "Firman Service",
  alamat: "Jl. Merdeka No. 12, Bandung",
  noWa: "6281234567890",
  jamBuka: "09:00",
  jamTutup: "21:00",
  hariLibur: [],
  slotMenit: 30,
  kapasitasSlot: 2,
  biayaCek: 0,
  biayaEkspres: 50000,
  batasSimpanHari: 30,
  syaratServis: SYARAT_DEFAULT,
  template: TEMPLATE_DEFAULT,
};

// tier: 1 entry, 2 menengah, 3 flagship Android, 4 iPhone
const KATALOG_HP: [string, string, string, number][] = [
  ["Samsung", "Galaxy A05", "Galaxy A", 1],
  ["Samsung", "Galaxy A15", "Galaxy A", 1],
  ["Samsung", "Galaxy A25", "Galaxy A", 2],
  ["Samsung", "Galaxy A35", "Galaxy A", 2],
  ["Samsung", "Galaxy A55", "Galaxy A", 2],
  ["Samsung", "Galaxy S23", "Galaxy S", 3],
  ["Samsung", "Galaxy S24", "Galaxy S", 3],
  ["Samsung", "Galaxy S24 Ultra", "Galaxy S", 3],
  ["Xiaomi", "Redmi 13C", "Redmi", 1],
  ["Xiaomi", "Redmi Note 12", "Redmi Note", 1],
  ["Xiaomi", "Redmi Note 13", "Redmi Note", 2],
  ["Xiaomi", "Redmi Note 13 Pro", "Redmi Note", 2],
  ["Xiaomi", "Poco X6 Pro", "Poco", 2],
  ["Xiaomi", "Xiaomi 14T", "Xiaomi T", 3],
  ["Oppo", "A18", "A", 1],
  ["Oppo", "A58", "A", 1],
  ["Oppo", "A78", "A", 2],
  ["Oppo", "Reno 11", "Reno", 2],
  ["Oppo", "Reno 12 Pro", "Reno", 3],
  ["Vivo", "Y17s", "Y", 1],
  ["Vivo", "Y27", "Y", 1],
  ["Vivo", "Y36", "Y", 2],
  ["Vivo", "V29", "V", 2],
  ["Vivo", "V30 Pro", "V", 3],
  ["Realme", "C53", "C", 1],
  ["Realme", "C67", "C", 1],
  ["Realme", "Realme 12", "Number", 2],
  ["Realme", "Realme 12 Pro+", "Number", 3],
  ["Infinix", "Smart 8", "Smart", 1],
  ["Infinix", "Hot 40", "Hot", 1],
  ["Infinix", "Note 40", "Note", 2],
  ["Apple", "iPhone 11", "iPhone", 4],
  ["Apple", "iPhone 12", "iPhone", 4],
  ["Apple", "iPhone 13", "iPhone", 4],
  ["Apple", "iPhone 14", "iPhone", 4],
  ["Apple", "iPhone 15", "iPhone", 4],
  ["Apple", "iPhone 15 Pro Max", "iPhone", 4],
];

type DefJasa = {
  id: string;
  kategori: string;
  nama: string;
  deskripsi: string;
  gambar: string;
  // harga dasar kualitas tertinggi per tier [min, max]
  harga: Record<1 | 2 | 3 | 4, [number, number]>;
  kualitas: Kualitas[];
  durasi: [number, number];
  garansi: Partial<Record<Kualitas, number>>;
};

const J = 1000;
const DEF_JASA: DefJasa[] = [
  {
    id: "ganti-lcd", kategori: "layar", nama: "Ganti LCD / Layar", gambar: "/img/parts/lcd.png",
    deskripsi: "Penggantian layar retak, bergaris, blank, atau touchscreen tidak respons.",
    harga: { 1: [550 * J, 750 * J], 2: [900 * J, 1200 * J], 3: [2200 * J, 3500 * J], 4: [1200 * J, 1500 * J] },
    kualitas: ["original", "oem", "kw"], durasi: [60, 120], garansi: { original: 90, oem: 30, kw: 7 },
  },
  {
    id: "tempered-glass", kategori: "layar", nama: "Pasang Tempered Glass", gambar: "/img/parts/tempered.png",
    deskripsi: "Pemasangan tempered glass full cover anti gores.",
    harga: { 1: [35 * J, 35 * J], 2: [50 * J, 50 * J], 3: [75 * J, 75 * J], 4: [75 * J, 75 * J] },
    kualitas: ["standar"], durasi: [10, 15], garansi: { standar: 0 },
  },
  {
    id: "ganti-baterai", kategori: "baterai", nama: "Ganti Baterai", gambar: "/img/parts/baterai.png",
    deskripsi: "Baterai cepat habis, kembung, atau HP mati sendiri.",
    harga: { 1: [180 * J, 180 * J], 2: [250 * J, 250 * J], 3: [450 * J, 450 * J], 4: [550 * J, 550 * J] },
    kualitas: ["original", "oem"], durasi: [30, 60], garansi: { original: 90, oem: 30 },
  },
  {
    id: "ganti-konektor", kategori: "konektor", nama: "Ganti Konektor Charger", gambar: "/img/parts/konektor.png",
    deskripsi: "Tidak bisa mengisi daya, charger longgar, atau pengisian putus-sambung.",
    harga: { 1: [100 * J, 150 * J], 2: [150 * J, 250 * J], 3: [300 * J, 450 * J], 4: [400 * J, 600 * J] },
    kualitas: ["original", "oem"], durasi: [60, 120], garansi: { original: 60, oem: 30 },
  },
  {
    id: "ganti-kamera", kategori: "kamera", nama: "Ganti Kamera Belakang", gambar: "/img/parts/kamera.png",
    deskripsi: "Kamera buram, tidak fokus, bergetar, atau tidak bisa dibuka.",
    harga: { 1: [200 * J, 300 * J], 2: [350 * J, 550 * J], 3: [900 * J, 1500 * J], 4: [800 * J, 1300 * J] },
    kualitas: ["original", "oem"], durasi: [60, 120], garansi: { original: 60, oem: 30 },
  },
  {
    id: "kaca-kamera", kategori: "kamera", nama: "Ganti Kaca Kamera", gambar: "/img/phones/kamera.png",
    deskripsi: "Kaca pelindung lensa kamera retak atau pecah.",
    harga: { 1: [50 * J, 50 * J], 2: [75 * J, 75 * J], 3: [125 * J, 125 * J], 4: [150 * J, 150 * J] },
    kualitas: ["standar"], durasi: [30, 60], garansi: { standar: 7 },
  },
  {
    id: "ganti-speaker", kategori: "speaker", nama: "Ganti Speaker", gambar: "/img/parts/speaker.png",
    deskripsi: "Suara pecah, kecil, atau speaker tidak bunyi.",
    harga: { 1: [100 * J, 150 * J], 2: [150 * J, 200 * J], 3: [250 * J, 350 * J], 4: [300 * J, 450 * J] },
    kualitas: ["original", "oem"], durasi: [45, 90], garansi: { original: 60, oem: 30 },
  },
  {
    id: "perbaikan-mic", kategori: "speaker", nama: "Perbaikan Mic", gambar: "/img/parts/speaker.png",
    deskripsi: "Lawan bicara tidak mendengar suara Anda atau suara rekaman kosong.",
    harga: { 1: [100 * J, 175 * J], 2: [150 * J, 250 * J], 3: [250 * J, 400 * J], 4: [300 * J, 500 * J] },
    kualitas: ["standar"], durasi: [60, 120], garansi: { standar: 30 },
  },
  {
    id: "perbaikan-tombol", kategori: "tombol", nama: "Perbaikan Tombol Power / Volume", gambar: "/img/parts/alat.png",
    deskripsi: "Tombol keras, macet, atau tidak berfungsi.",
    harga: { 1: [75 * J, 150 * J], 2: [100 * J, 200 * J], 3: [200 * J, 350 * J], 4: [250 * J, 450 * J] },
    kualitas: ["standar"], durasi: [60, 180], garansi: { standar: 30 },
  },
  {
    id: "mati-total", kategori: "mati-total", nama: "Servis Mati Total (Mesin / IC)", gambar: "/img/parts/mesin.png",
    deskripsi: "HP tidak menyala sama sekali. Perbaikan di level mesin/IC, biaya tergantung komponen.",
    harga: { 1: [250 * J, 500 * J], 2: [350 * J, 750 * J], 3: [600 * J, 1500 * J], 4: [750 * J, 2000 * J] },
    kualitas: ["standar"], durasi: [1440, 4320], garansi: { standar: 30 },
  },
  {
    id: "kena-air", kategori: "kena-air", nama: "Servis Kena Air", gambar: "/img/phones/kena-air.png",
    deskripsi: "Pembersihan korosi dan pengeringan mesin. Segera matikan HP dan jangan dicas.",
    harga: { 1: [150 * J, 400 * J], 2: [200 * J, 600 * J], 3: [350 * J, 1000 * J], 4: [400 * J, 1200 * J] },
    kualitas: ["standar"], durasi: [2880, 5760], garansi: { standar: 0 },
  },
  {
    id: "flash", kategori: "software", nama: "Flash / Instal Ulang", gambar: "/img/phones/software.png",
    deskripsi: "Bootloop, hang di logo, atau sistem error. Data dapat terhapus.",
    harga: { 1: [100 * J, 100 * J], 2: [125 * J, 125 * J], 3: [175 * J, 175 * J], 4: [200 * J, 200 * J] },
    kualitas: ["standar"], durasi: [60, 120], garansi: { standar: 7 },
  },
  {
    id: "lupa-pola", kategori: "software", nama: "Buka Lupa Pola / PIN", gambar: "/img/phones/software.png",
    deskripsi: "Membuka kunci pola/PIN yang terlupa (data dapat terhapus). Wajib bukti kepemilikan.",
    harga: { 1: [100 * J, 100 * J], 2: [125 * J, 125 * J], 3: [150 * J, 150 * J], 4: [250 * J, 250 * J] },
    kualitas: ["standar"], durasi: [30, 60], garansi: { standar: 0 },
  },
  {
    id: "update-software", kategori: "software", nama: "Update Software", gambar: "/img/phones/software.png",
    deskripsi: "Pembaruan sistem ke versi resmi terbaru beserta pencadangan data.",
    harga: { 1: [50 * J, 50 * J], 2: [75 * J, 75 * J], 3: [100 * J, 100 * J], 4: [100 * J, 100 * J] },
    kualitas: ["standar"], durasi: [30, 60], garansi: { standar: 0 },
  },
  {
    id: "ganti-backdoor", kategori: "lainnya", nama: "Ganti Backdoor / Tutup Belakang", gambar: "/img/phones/backdoor.png",
    deskripsi: "Tutup belakang retak, terkelupas, atau terangkat.",
    harga: { 1: [75 * J, 100 * J], 2: [125 * J, 175 * J], 3: [350 * J, 600 * J], 4: [450 * J, 750 * J] },
    kualitas: ["oem", "kw"], durasi: [30, 60], garansi: { oem: 30, kw: 7 },
  },
];

const FAKTOR: Record<Kualitas, number> = { original: 1, oem: 0.72, kw: 0.5, standar: 1 };
const bulat = (n: number) => Math.round(n / 5000) * 5000;

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function buatKatalog() {
  const tipeHp: TipeHp[] = KATALOG_HP.map(([merek, tipe, seri]) => ({ id: slug(`${merek} ${tipe}`), merek, tipe, seri }));
  const jasa: Jasa[] = DEF_JASA.map((d) => ({ id: d.id, kategori: d.kategori, nama: d.nama, deskripsi: d.deskripsi, gambar: d.gambar, aktif: true }));
  const harga: HargaJasa[] = [];
  KATALOG_HP.forEach(([, , , tier], i) => {
    const t = tipeHp[i];
    for (const d of DEF_JASA) {
      // iPhone tidak dilayani flash/lupa pola tingkat lanjut di toko ini
      if (tier === 4 && d.id === "lupa-pola") continue;
      for (const k of d.kualitas) {
        const [mn, mx] = d.harga[tier as 1 | 2 | 3 | 4];
        harga.push({
          id: `${d.id}__${t.id}__${k}`,
          jasaId: d.id,
          tipeHpId: t.id,
          kualitas: k,
          hargaMin: bulat(mn * FAKTOR[k]),
          hargaMax: bulat(mx * FAKTOR[k]),
          durasiMin: d.durasi[0],
          durasiMax: d.durasi[1],
          garansiHari: d.garansi[k] ?? 0,
          aktif: true,
        });
      }
    }
  });
  return { tipeHp, jasa, harga };
}

const STAF: Staf[] = [
  { id: "staf-firman", cabangId: "cabang-utama", nama: "Firman", noHp: "081234567890", peran: "pemilik", keahlian: ["iPhone", "Mesin/IC"], pin: "1111", aktif: true },
  { id: "staf-rina", cabangId: "cabang-utama", nama: "Rina", noHp: "081234567891", peran: "admin", keahlian: [], pin: "2222", aktif: true },
  { id: "staf-budi", cabangId: "cabang-utama", nama: "Budi", noHp: "081234567892", peran: "teknisi", keahlian: ["Android", "Mesin/IC", "Kena Air"], pin: "3333", aktif: true },
  { id: "staf-andi", cabangId: "cabang-utama", nama: "Andi", noHp: "081234567893", peran: "teknisi", keahlian: ["iPhone", "Layar", "Software"], pin: "4444", aktif: true },
];

const KONDISI_OK = { layar: "Mulus", body: "Lecet halus", kamera: "Normal", tombol: "Normal", menyala: true, catatan: "" };

/** Data contoh agar papan antrean, laporan, dan halaman lacak langsung terisi. */
function contohTransaksi(now: Date) {
  const jamLalu = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
  const jamLagi = (h: number) => tambahMenitKerja(TOKO_DEFAULT, now, h * 60).toISOString();
  const pelanggan: Pelanggan[] = [
    { id: "plg-dinda", nama: "Dinda Pratiwi", noWa: "6281311221234" },
    { id: "plg-agus", nama: "Agus Setiawan", noWa: "6285722334455" },
    { id: "plg-maya", nama: "Maya Sari", noWa: "6281988776655" },
    { id: "plg-rudi", nama: "Rudi Hartono", noWa: "6287811223344" },
    { id: "plg-lina", nama: "Lina Marlina", noWa: "6281277665544" },
  ];
  const d = (iso: string) => {
    const x = new Date(iso);
    return `${String(x.getFullYear()).slice(2)}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`;
  };
  const base = (o: Partial<OrderServis> & Pick<OrderServis, "id" | "nomorServis" | "pelangganId" | "status" | "dibuat">): OrderServis => ({
    token: o.id.replace("ord-", "demo"),
    cabangId: "cabang-utama",
    keluhan: "",
    jasaIdDiminta: [],
    kondisiAwal: KONDISI_OK,
    fotoKondisi: ["/img/phones/normal.png", "/img/phones/layar-retak.png"],
    kelengkapan: [],
    prioritas: "normal",
    estimasiSelesai: jamLagi(4),
    riwayatEstimasi: [],
    ttdPelanggan: "",
    items: [],
    riwayat: [],
    persetujuan: [],
    ...o,
  });

  const order: OrderServis[] = [
    base({
      id: "ord-dinda", nomorServis: `FS-${d(jamLalu(3))}-001`, pelangganId: "plg-dinda", tipeHpId: "samsung-galaxy-a35",
      keluhan: "Layar retak setelah jatuh, touchscreen masih bisa", jasaIdDiminta: ["ganti-lcd"], status: "menunggu_persetujuan",
      teknisiId: "staf-budi", dibuat: jamLalu(3), estimasiSelesai: jamLagi(3), kelengkapan: ["Case", "SIM"],
      kondisiAwal: { ...KONDISI_OK, layar: "Retak", catatan: "Retak dari pojok kanan atas" },
      items: [{ id: "it-d1", hargaJasaId: "ganti-lcd__samsung-galaxy-a35__original", deskripsi: "Ganti LCD Original Samsung Galaxy A35", hargaFinal: 1150000, tambahan: false, persetujuanId: "pst-d1", garansiHari: 90 }],
      persetujuan: [{ id: "pst-d1", jenis: "awal", diagnosa: "LCD retak, frame aman. Perlu ganti LCD original.", itemIds: ["it-d1"], total: 1150000, estimasiSelesai: jamLagi(3), status: "menunggu", dibuat: jamLalu(1) }],
      riwayat: [
        { id: "r1", status: "diterima", diubahOleh: "Rina", waktu: jamLalu(3) },
        { id: "r2", status: "pengecekan", diubahOleh: "Budi", waktu: jamLalu(2) },
        { id: "r3", status: "menunggu_persetujuan", catatan: "LCD retak, frame aman. Perlu ganti LCD original.", diubahOleh: "Budi", waktu: jamLalu(1) },
      ],
    }),
    base({
      id: "ord-agus", nomorServis: `FS-${d(jamLalu(5))}-002`, pelangganId: "plg-agus", tipeHpId: "apple-iphone-12",
      keluhan: "Baterai cepat habis", jasaIdDiminta: ["ganti-baterai"], status: "dikerjakan", teknisiId: "staf-andi",
      dibuat: jamLalu(5), estimasiSelesai: jamLagi(1),
      items: [{ id: "it-a1", hargaJasaId: "ganti-baterai__apple-iphone-12__original", deskripsi: "Ganti Baterai Original iPhone 12", hargaFinal: 550000, tambahan: false, persetujuanId: "pst-a1", garansiHari: 90 }],
      persetujuan: [{ id: "pst-a1", jenis: "awal", diagnosa: "Battery health 71%, perlu ganti baterai.", itemIds: ["it-a1"], total: 550000, estimasiSelesai: jamLagi(1), status: "setuju", kanal: "aplikasi", dibuat: jamLalu(4), waktu: jamLalu(4) }],
      riwayat: [
        { id: "r1", status: "diterima", diubahOleh: "Rina", waktu: jamLalu(5) },
        { id: "r2", status: "pengecekan", diubahOleh: "Andi", waktu: jamLalu(4.5) },
        { id: "r3", status: "menunggu_persetujuan", diubahOleh: "Andi", waktu: jamLalu(4.2) },
        { id: "r4", status: "dikerjakan", catatan: "Disetujui pelanggan via aplikasi", diubahOleh: "Sistem", waktu: jamLalu(4) },
      ],
    }),
    base({
      id: "ord-maya", nomorServis: `FS-${d(jamLalu(30))}-001`, pelangganId: "plg-maya", tipeHpId: "xiaomi-redmi-note-13",
      keluhan: "Tidak bisa dicas", jasaIdDiminta: ["ganti-konektor"], status: "siap_diambil", teknisiId: "staf-budi",
      dibuat: jamLalu(30), estimasiSelesai: jamLalu(6), kelengkapan: ["Charger"],
      items: [{ id: "it-m1", hargaJasaId: "ganti-konektor__xiaomi-redmi-note-13__original", deskripsi: "Ganti Konektor Charger Original", hargaFinal: 200000, tambahan: false, persetujuanId: "pst-m1", garansiHari: 60 }],
      persetujuan: [{ id: "pst-m1", jenis: "awal", diagnosa: "Port USB-C aus dan berkarat.", itemIds: ["it-m1"], total: 200000, estimasiSelesai: jamLalu(6), status: "setuju", kanal: "telepon", keterangan: "Disetujui lewat telepon, diterima Rina", dibuat: jamLalu(28), waktu: jamLalu(27) }],
      riwayat: [
        { id: "r1", status: "diterima", diubahOleh: "Rina", waktu: jamLalu(30) },
        { id: "r2", status: "pengecekan", diubahOleh: "Budi", waktu: jamLalu(29) },
        { id: "r3", status: "menunggu_persetujuan", diubahOleh: "Budi", waktu: jamLalu(28) },
        { id: "r4", status: "dikerjakan", diubahOleh: "Budi", waktu: jamLalu(27) },
        { id: "r5", status: "uji_coba", catatan: "Pengisian normal 18W", diubahOleh: "Budi", waktu: jamLalu(8) },
        { id: "r6", status: "siap_diambil", diubahOleh: "Budi", waktu: jamLalu(6) },
      ],
    }),
    base({
      id: "ord-rudi", nomorServis: `FS-${d(jamLalu(1))}-003`, pelangganId: "plg-rudi", tipeHpId: "oppo-a78",
      keluhan: "Mati total setelah update", jasaIdDiminta: ["mati-total"], status: "pengecekan", teknisiId: "staf-budi",
      prioritas: "ekspres", dibuat: jamLalu(1), estimasiSelesai: jamLalu(0.2),
      kondisiAwal: { ...KONDISI_OK, menyala: false },
      items: [{ id: "it-r0", deskripsi: "Biaya prioritas ekspres", hargaFinal: 50000, tambahan: false, garansiHari: 0 }],
      riwayat: [
        { id: "r1", status: "diterima", diubahOleh: "Rina", waktu: jamLalu(1) },
        { id: "r2", status: "pengecekan", diubahOleh: "Budi", waktu: jamLalu(0.8) },
      ],
    }),
    base({
      id: "ord-lina", nomorServis: `FS-${d(jamLalu(24 * 12))}-002`, pelangganId: "plg-lina", tipeHpId: "vivo-y27",
      keluhan: "Layar bergaris", jasaIdDiminta: ["ganti-lcd"], status: "selesai", teknisiId: "staf-andi",
      dibuat: jamLalu(24 * 12), estimasiSelesai: jamLalu(24 * 11.8), selesai: jamLalu(24 * 11.5),
      items: [{ id: "it-l1", hargaJasaId: "ganti-lcd__vivo-y27__oem", deskripsi: "Ganti LCD OEM Vivo Y27", hargaFinal: 450000, tambahan: false, persetujuanId: "pst-l1", garansiHari: 30 }],
      persetujuan: [{ id: "pst-l1", jenis: "awal", diagnosa: "LCD bergaris, ganti LCD OEM.", itemIds: ["it-l1"], total: 450000, estimasiSelesai: jamLalu(24 * 11.8), status: "setuju", kanal: "aplikasi", dibuat: jamLalu(24 * 12), waktu: jamLalu(24 * 12) }],
      pembayaran: { id: "byr-l1", nominal: 425000, metode: "qris", diskon: 25000, alasanDiskon: "Pelanggan langganan", waktu: jamLalu(24 * 11.5), dicatatOleh: "Rina" },
      garansi: { id: "grs-l1", mulai: jamLalu(24 * 11.5), berakhir: new Date(now.getTime() + (30 - 11.5) * 86400_000).toISOString(), ketentuan: "Garansi tidak berlaku untuk kerusakan akibat jatuh, tekanan, atau kena air.", cakupan: ["Ganti LCD OEM Vivo Y27 (30 hari)"], status: "aktif" },
      riwayat: [
        { id: "r1", status: "diterima", diubahOleh: "Rina", waktu: jamLalu(24 * 12) },
        { id: "r2", status: "dikerjakan", diubahOleh: "Andi", waktu: jamLalu(24 * 12 - 1) },
        { id: "r3", status: "siap_diambil", diubahOleh: "Andi", waktu: jamLalu(24 * 11.8) },
        { id: "r4", status: "selesai", diubahOleh: "Rina", waktu: jamLalu(24 * 11.5) },
      ],
    }),
  ];

  // Riwayat pendapatan beberapa hari terakhir untuk laporan
  const jasaContoh: [string, string, number, string][] = [
    ["ganti-baterai", "Ganti Baterai Original", 250000, "staf-budi"],
    ["ganti-lcd", "Ganti LCD OEM", 650000, "staf-andi"],
    ["flash", "Flash / Instal Ulang", 125000, "staf-andi"],
    ["ganti-konektor", "Ganti Konektor Charger OEM", 110000, "staf-budi"],
    ["tempered-glass", "Pasang Tempered Glass", 50000, "staf-andi"],
    ["ganti-speaker", "Ganti Speaker Original", 175000, "staf-budi"],
  ];
  for (let i = 0; i < 18; i++) {
    const [jasaId, desk, hrg, tek] = jasaContoh[i % jasaContoh.length];
    const hari = 2 + Math.floor(i * 1.5);
    const t0 = jamLalu(24 * hari + 6);
    const t1 = jamLalu(24 * hari + (i % 3 === 0 ? 0 : 3));
    const est = jamLalu(24 * hari + 2);
    order.push(
      base({
        id: `ord-h${i}`, nomorServis: `FS-${d(t0)}-${String(10 + i).padStart(3, "0")}`, pelangganId: pelanggan[i % 5].id,
        tipeHpId: ["samsung-galaxy-a15", "xiaomi-redmi-13c", "oppo-a58", "realme-c67", "infinix-hot-40"][i % 5],
        keluhan: desk, jasaIdDiminta: [jasaId], status: "selesai", teknisiId: tek, dibuat: t0, estimasiSelesai: est, selesai: t1,
        items: [{ id: `it-h${i}`, deskripsi: desk, hargaFinal: hrg, tambahan: false, hargaJasaId: undefined, garansiHari: 30 }],
        pembayaran: { id: `byr-h${i}`, nominal: hrg, metode: (["tunai", "transfer", "qris"] as const)[i % 3], diskon: 0, waktu: t1, dicatatOleh: "Rina" },
        riwayat: [
          { id: "r1", status: "diterima", diubahOleh: "Rina", waktu: t0 },
          { id: "r2", status: "selesai", diubahOleh: "Rina", waktu: t1 },
        ],
      }),
    );
  }

  const besok = new Date(now.getTime() + 86400_000);
  const reservasi: Reservasi[] = [
    { id: "rsv-1", token: "rsvdemo1", pelangganId: "plg-agus", tanggal: ymd(now), slot: "15:00", tipeHpId: "samsung-galaxy-s23", keluhan: "Kamera belakang buram", status: "terjadwal", dibuat: jamLalu(20) },
    { id: "rsv-2", token: "rsvdemo2", pelangganId: "plg-maya", tanggal: ymd(now), slot: "16:30", tipeHpId: "apple-iphone-13", keluhan: "Ganti baterai", status: "terjadwal", dibuat: jamLalu(10) },
    { id: "rsv-3", token: "rsvdemo3", pelangganId: "plg-rudi", tanggal: ymd(besok), slot: "10:00", tipeHpId: "vivo-v29", keluhan: "Speaker sember", status: "terjadwal", dibuat: jamLalu(2) },
  ];
  return { pelanggan, order, reservasi };
}

export function buatDbAwal(now = new Date()): DB {
  const { tipeHp, jasa, harga } = buatKatalog();
  const { pelanggan, order, reservasi } = contohTransaksi(now);
  return {
    versi: DB_VERSI,
    toko: TOKO_DEFAULT,
    staf: STAF,
    pelanggan,
    tipeHp,
    jasa,
    harga,
    reservasi,
    order,
    notifikasi: [],
  };
}
