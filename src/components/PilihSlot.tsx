"use client";

import { useMemo } from "react";
import type { DB } from "@/lib/types";
import { ketersediaanSlot, slotHari } from "@/lib/logic";
import { ymd } from "@/lib/format";

/** RSV-01/02: tanggal + slot jam sesuai jam buka; slot penuh tidak bisa dipilih. */
export function PilihSlot({ db, tanggal, slot, onUbah, kecualiId }: { db: DB; tanggal: string; slot: string; onUbah: (tanggal: string, slot: string) => void; kecualiId?: string }) {
  const hari = useMemo(() => {
    const out: Date[] = [];
    const d = new Date();
    for (let i = 0; out.length < 14 && i < 30; i++) {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      if (slotHari(db.toko, ymd(x)).length) out.push(x);
    }
    return out;
  }, [db.toko]);
  const slots = tanggal ? ketersediaanSlot(db, tanggal, new Date(), kecualiId) : [];
  const hariIni = ymd(new Date());

  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {hari.map((d) => {
          const v = ymd(d);
          const penuh = ketersediaanSlot(db, v, new Date(), kecualiId).every((s) => !s.bisa);
          return (
            <button
              type="button"
              key={v}
              disabled={penuh}
              onClick={() => onUbah(v, "")}
              className={`flex w-16 shrink-0 flex-col items-center rounded-xl py-2 ring-1 transition disabled:opacity-40 ${tanggal === v ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-200 hover:ring-brand-300"}`}
            >
              <span className="text-[11px] font-medium opacity-80">{v === hariIni ? "Hari ini" : d.toLocaleDateString("id-ID", { weekday: "short" })}</span>
              <span className="text-lg font-bold">{d.getDate()}</span>
              <span className="text-[11px] opacity-80">{d.toLocaleDateString("id-ID", { month: "short" })}</span>
            </button>
          );
        })}
      </div>
      {tanggal && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {slots.map((s) => (
            <button
              type="button"
              key={s.slot}
              disabled={!s.bisa}
              onClick={() => onUbah(tanggal, s.slot)}
              title={s.lewat ? "Sudah lewat" : s.sisa === 0 ? "Penuh" : `Sisa ${s.sisa}`}
              className={`rounded-lg py-2 text-sm font-semibold ring-1 transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 disabled:line-through ${slot === s.slot ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-200 hover:ring-brand-300"}`}
            >
              {s.slot}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
