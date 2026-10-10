const rp = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export const rupiah = (n: number) => rp.format(Math.round(n)).replace(/\s/g, "");

/** Rp1,2–1,5 jt untuk kisaran, Rp150.000 untuk harga pasti. */
export function kisaran(min: number, max: number) {
  if (min === max) return rupiah(min);
  if (min >= 1_000_000) {
    const f = (n: number) => (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 });
    return `Rp${f(min)}–${f(max)} jt`;
  }
  return `${rupiah(min)}–${rupiah(max).replace("Rp", "")}`;
}

export function durasi(menit: number) {
  if (menit < 60) return `${menit} menit`;
  if (menit < 60 * 24) return `${Math.round((menit / 60) * 10) / 10} jam`.replace(".", ",");
  return `${Math.round(menit / (60 * 24))} hari`;
}

export function durasiKisaran(min: number, max: number) {
  if (min === max) return durasi(min);
  if (max < 60 * 24) {
    const u = max < 60 ? "menit" : "jam";
    const k = (m: number) => (u === "jam" ? Math.round((m / 60) * 10) / 10 : m).toString().replace(".", ",");
    if (min < 60 && u === "jam") return `${durasi(min)}–${durasi(max)}`;
    return `${k(min)}–${k(max)} ${u}`;
  }
  if (min >= 60 * 24) return `${Math.round(min / 1440)}–${Math.round(max / 1440)} hari`;
  return `${durasi(min)}–${durasi(max)}`;
}

export const tanggal = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const tanggalPendek = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export const jam = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");

export const waktu = (iso: string | Date) => `${tanggalPendek(iso)}, ${jam(iso)}`;

export function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function normalisasiWa(no: string) {
  let d = no.replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
}

export function samarkanWa(no: string) {
  const d = normalisasiWa(no);
  return `+${d.slice(0, 4)}••••${d.slice(-4)}`;
}

export function samarkanNama(nama: string) {
  return nama
    .split(" ")
    .map((w, i) => (i === 0 ? w : w[0] + "."))
    .join(" ");
}
