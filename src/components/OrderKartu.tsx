"use client";

import Link from "next/link";
import type { DB, OrderServis } from "@/lib/types";
import { namaHp, terlambat } from "@/lib/logic";
import { waktu } from "@/lib/format";
import { StatusBadge } from "./ui";

export function OrderKartu({ db, o, ringkas = false }: { db: DB; o: OrderServis; ringkas?: boolean }) {
  const p = db.pelanggan.find((x) => x.id === o.pelangganId);
  const tek = db.staf.find((s) => s.id === o.teknisiId);
  const telat = terlambat(o);
  const menunggu = o.persetujuan.some((x) => x.status === "menunggu");
  return (
    <Link href={`/staf/order/${o.id}`} className={`block rounded-xl bg-white p-3 ring-1 transition hover:ring-brand-300 ${telat ? "ring-red-300" : "ring-slate-200"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-brand-700">{o.nomorServis}</p>
          <p className="truncate text-sm font-semibold">{namaHp(db, o.tipeHpId, o.tipeLain)}</p>
        </div>
        {o.prioritas === "ekspres" && <span className="chip bg-accent-500 text-white">Ekspres</span>}
      </div>
      <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{o.keluhan}</p>
      {!ringkas && <div className="mt-2"><StatusBadge status={o.status} /></div>}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
        <span>{p?.nama}</span>
        <span>·</span>
        <span className={tek ? "" : "font-semibold text-amber-600"}>{tek?.nama ?? "Belum ditugaskan"}</span>
        {o.servisAsalId && <span className="chip bg-accent-400/20 text-accent-600">Garansi</span>}
        {menunggu && <span className="chip bg-amber-100 text-amber-800">Menunggu pelanggan</span>}
      </div>
      {o.status !== "selesai" && o.status !== "dibatalkan" && (
        <p className={`mt-1 text-[11px] ${telat ? "font-bold text-red-600" : "text-slate-500"}`}>
          {telat ? "⚠ Lewat estimasi · " : "Est. "}
          {waktu(o.estimasiSelesai)}
        </p>
      )}
    </Link>
  );
}
