"use client";

import { useState } from "react";
import { useDb } from "@/lib/store";
import { itemDitagih, STATUS_AKTIF } from "@/lib/logic";
import { rupiah, tanggalPendek, ymd } from "@/lib/format";
import { unduhExcel } from "@/lib/excel";
import { Izin } from "@/components/StaffShell";
import type { OrderServis } from "@/lib/types";

type Periode = "hari" | "7" | "30" | "bulan" | "custom";

function rentang(p: Periode, dari: string, sampai: string): [string, string] {
  const now = new Date();
  const mundur = (n: number) => ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
  if (p === "hari") return [ymd(now), ymd(now)];
  if (p === "7") return [mundur(6), ymd(now)];
  if (p === "30") return [mundur(29), ymd(now)];
  if (p === "bulan") return [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), ymd(now)];
  return [dari, sampai];
}

/** Grafik batang satu seri: pendapatan per hari, dengan tooltip saat disentuh/hover. */
function GrafikHarian({ data }: { data: { tgl: string; nilai: number }[] }) {
  const [aktif, setAktif] = useState<number | null>(null);
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  const sorot = aktif !== null ? data[aktif] : null;
  return (
    <div>
      <div className="mb-2 h-5 text-sm text-slate-600">
        {sorot ? <><b className="text-slate-900">{rupiah(sorot.nilai)}</b> · {tanggalPendek(`${sorot.tgl}T00:00:00`)}</> : "Sentuh batang untuk melihat nilai"}
      </div>
      <div className="relative flex h-44 items-end gap-[2px] border-b border-slate-200" onMouseLeave={() => setAktif(null)}>
        {[0.5, 1].map((g) => <div key={g} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-100" style={{ bottom: `${g * 100}%` }} />)}
        {data.map((d, i) => (
          <button
            key={d.tgl}
            className="group relative flex h-full flex-1 items-end"
            onMouseEnter={() => setAktif(i)}
            onFocus={() => setAktif(i)}
            onClick={() => setAktif(i)}
            aria-label={`${tanggalPendek(`${d.tgl}T00:00:00`)}: ${rupiah(d.nilai)}`}
          >
            <span
              className={`w-full rounded-t-[4px] transition-colors ${aktif === i ? "bg-brand-700" : "bg-brand-500"}`}
              style={{ height: `${(d.nilai / maks) * 100}%`, minHeight: d.nilai ? 2 : 0 }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{data[0] && tanggalPendek(`${data[0].tgl}T00:00:00`)}</span>
        <span>Puncak {rupiah(maks)}</span>
        <span>{data.at(-1) && tanggalPendek(`${data.at(-1)!.tgl}T00:00:00`)}</span>
      </div>
    </div>
  );
}

function TabelBatang({ judul, baris }: { judul: string; baris: { nama: string; nilai: number; jumlah: number; ekstra?: string }[] }) {
  const maks = Math.max(1, ...baris.map((b) => b.nilai));
  return (
    <section className="card p-5">
      <h2 className="mb-3 font-bold">{judul}</h2>
      <ul className="space-y-2.5">
        {baris.map((b) => (
          <li key={b.nama} className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="truncate">{b.nama}</span>
              <span className="whitespace-nowrap font-semibold">{rupiah(b.nilai)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(b.nilai / maks) * 100}%` }} /></div>
              <span className="w-28 text-right text-xs text-slate-500">{b.jumlah} servis{b.ekstra ? ` · ${b.ekstra}` : ""}</span>
            </div>
          </li>
        ))}
        {!baris.length && <li className="text-sm text-slate-500">Tidak ada data.</li>}
      </ul>
    </section>
  );
}

function Laporan() {
  const { db } = useDb();
  const [periode, setPeriode] = useState<Periode>("30");
  const [dari, setDari] = useState(ymd(new Date(Date.now() - 6 * 86400_000)));
  const [sampai, setSampai] = useState(ymd(new Date()));
  const [a, b] = rentang(periode, dari, sampai);
  const dalam = (iso?: string) => !!iso && ymd(new Date(iso)) >= a && ymd(new Date(iso)) <= b;

  const dibayar = db.order.filter((o) => o.pembayaran && dalam(o.pembayaran.waktu));
  const total = dibayar.reduce((s, o) => s + o.pembayaran!.nominal, 0);
  const diskon = dibayar.reduce((s, o) => s + o.pembayaran!.diskon, 0);
  const masuk = db.order.filter((o) => dalam(o.dibuat)).length;

  // per hari
  const hari: { tgl: string; nilai: number }[] = [];
  for (let d = new Date(`${a}T00:00:00`); ymd(d) <= b; d.setDate(d.getDate() + 1)) {
    const t = ymd(d);
    hari.push({ tgl: t, nilai: dibayar.filter((o) => ymd(new Date(o.pembayaran!.waktu)) === t).reduce((s, o) => s + o.pembayaran!.nominal, 0) });
  }

  // per jasa: item ditagih dikelompokkan per jasa (diskon dibagi proporsional)
  const perJasa = new Map<string, { nilai: number; jumlah: number }>();
  for (const o of dibayar) {
    const items = itemDitagih(o);
    const sub = items.reduce((s, i) => s + i.hargaFinal, 0) || 1;
    for (const i of items) {
      const h = db.harga.find((x) => x.id === i.hargaJasaId);
      const nama = (h && db.jasa.find((j) => j.id === h.jasaId)?.nama) ?? db.jasa.find((j) => o.jasaIdDiminta.includes(j.id))?.nama ?? i.deskripsi;
      const cur = perJasa.get(nama) ?? { nilai: 0, jumlah: 0 };
      cur.nilai += i.hargaFinal * (o.pembayaran!.nominal / sub);
      cur.jumlah += 1;
      perJasa.set(nama, cur);
    }
  }

  // per teknisi + performa (LAP-03)
  const selesai = db.order.filter((o) => o.selesai && dalam(o.selesai));
  const tepat = (o: OrderServis) => {
    const siap = o.riwayat.find((r) => r.status === "siap_diambil")?.waktu ?? o.selesai!;
    return new Date(siap) <= new Date(o.estimasiSelesai);
  };
  const teknisi = db.staf.filter((s) => s.peran === "teknisi").map((s) => {
    const milik = dibayar.filter((o) => o.teknisiId === s.id);
    const sel = selesai.filter((o) => o.teknisiId === s.id);
    const lama = sel.map((o) => (new Date(o.riwayat.find((r) => r.status === "siap_diambil")?.waktu ?? o.selesai!).getTime() - new Date(o.dibuat).getTime()) / 3600_000);
    const klaim = db.order.filter((o) => o.servisAsalId && db.order.find((x) => x.id === o.servisAsalId)?.teknisiId === s.id && dalam(o.dibuat)).length;
    return {
      nama: s.nama,
      nilai: milik.reduce((x, o) => x + o.pembayaran!.nominal, 0),
      jumlah: milik.length,
      rataJam: lama.length ? lama.reduce((x, y) => x + y, 0) / lama.length : 0,
      tepatPersen: sel.length ? Math.round((sel.filter(tepat).length / sel.length) * 100) : 0,
      selesai: sel.length,
      aktif: db.order.filter((o) => o.teknisiId === s.id && STATUS_AKTIF.includes(o.status)).length,
      klaim,
    };
  });

  const ekspor = () =>
    unduhExcel(
      [
        ["Nomor servis", "Tanggal bayar", "Pelanggan", "Teknisi", "Item", "Diskon", "Alasan diskon", "Metode", "Dibayar"],
        ...dibayar.map((o) => [
          o.nomorServis, ymd(new Date(o.pembayaran!.waktu)), db.pelanggan.find((p) => p.id === o.pelangganId)?.nama ?? "",
          db.staf.find((s) => s.id === o.teknisiId)?.nama ?? "", itemDitagih(o).map((i) => i.deskripsi).join("; "),
          o.pembayaran!.diskon, o.pembayaran!.alasanDiskon ?? "", o.pembayaran!.metode, o.pembayaran!.nominal,
        ]),
      ],
      `laporan-pendapatan-${a}_${b}.xlsx`,
    );

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-extrabold tracking-tight">Laporan</h1>
        <select className="input w-auto" value={periode} onChange={(e) => setPeriode(e.target.value as Periode)}>
          <option value="hari">Hari ini</option>
          <option value="7">7 hari terakhir</option>
          <option value="30">30 hari terakhir</option>
          <option value="bulan">Bulan ini</option>
          <option value="custom">Rentang tanggal…</option>
        </select>
        {periode === "custom" && (
          <>
            <input type="date" className="input w-auto" value={dari} onChange={(e) => setDari(e.target.value)} />
            <input type="date" className="input w-auto" value={sampai} onChange={(e) => setSampai(e.target.value)} />
          </>
        )}
        <button className="btn-ghost" onClick={ekspor}>Ekspor Excel</button>
        <button className="btn-ghost" onClick={() => window.print()}>PDF / Cetak</button>
      </div>
      <p className="text-sm text-slate-500">{tanggalPendek(`${a}T00:00:00`)} – {tanggalPendek(`${b}T00:00:00`)}</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Pendapatan", rupiah(total)],
          ["Servis dibayar", dibayar.length],
          ["Servis masuk", masuk],
          ["Total diskon", rupiah(diskon)],
        ].map(([l, v]) => (
          <div key={l} className="card p-4">
            <p className="text-xs text-slate-500">{l}</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">{v}</p>
          </div>
        ))}
      </div>

      {hari.length > 1 && (
        <section className="card p-5">
          <h2 className="mb-1 font-bold">Pendapatan harian</h2>
          <GrafikHarian data={hari} />
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <TabelBatang judul="Per jasa" baris={[...perJasa.entries()].map(([nama, v]) => ({ nama, ...v })).sort((x, y) => y.nilai - x.nilai)} />
        <TabelBatang judul="Per teknisi" baris={teknisi.map((t) => ({ nama: t.nama, nilai: t.nilai, jumlah: t.jumlah }))} />
      </div>

      <section className="card overflow-x-auto p-5">
        <h2 className="mb-3 font-bold">Performa teknisi</h2>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr><th className="pb-2">Teknisi</th><th>Selesai</th><th>Rata-rata pengerjaan</th><th>Tepat estimasi</th><th>Klaim garansi</th><th>Aktif</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teknisi.map((t) => (
              <tr key={t.nama}>
                <td className="py-2 font-semibold">{t.nama}</td>
                <td>{t.selesai}</td>
                <td>{t.selesai ? `${t.rataJam.toFixed(1).replace(".", ",")} jam` : "-"}</td>
                <td>{t.selesai ? `${t.tepatPersen}%` : "-"}</td>
                <td>{t.klaim}</td>
                <td>{t.aktif}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default function Halaman() {
  return <Izin peran={["pemilik"]}><Laporan /></Izin>;
}
