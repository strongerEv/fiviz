"use client";

import { useMemo, useState } from "react";
import { cariTipe } from "@/lib/logic";
import type { TipeHp } from "@/lib/types";

/** JSA-05: pilih merek lalu ketik tipe (autocomplete). Tipe di luar daftar boleh diketik bebas. */
export function PilihHp({
  tipeHp, nilai, tipeLain, onPilih, izinkanLain = true,
}: {
  tipeHp: TipeHp[];
  nilai?: string;
  tipeLain?: string;
  onPilih: (tipeHpId: string | undefined, tipeLain?: string) => void;
  izinkanLain?: boolean;
}) {
  const terpilih = tipeHp.find((t) => t.id === nilai);
  const [merek, setMerek] = useState<string | null>(terpilih?.merek ?? null);
  const [q, setQ] = useState(terpilih ? terpilih.tipe : tipeLain ?? "");
  const [fokus, setFokus] = useState(false);
  const daftarMerek = useMemo(() => Array.from(new Set(tipeHp.map((t) => t.merek))), [tipeHp]);
  const sumber = merek ? tipeHp.filter((t) => t.merek === merek) : tipeHp;
  const saran = q ? cariTipe(sumber, q) : sumber.slice(0, 8);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {daftarMerek.map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => {
              setMerek(m === merek ? null : m);
              setQ("");
              onPilih(undefined);
            }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition ${m === merek ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-200 hover:ring-brand-300"}`}
          >
            {m === "Apple" ? "iPhone" : m}
          </button>
        ))}
      </div>
      <div className="relative">
        <input
          className="input"
          placeholder={merek ? `Ketik tipe ${merek === "Apple" ? "iPhone" : merek}…` : "Ketik tipe HP, mis. A35, Redmi Note 13, iPhone 12"}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            onPilih(undefined, izinkanLain && e.target.value ? `${merek ? merek + " " : ""}${e.target.value}` : undefined);
          }}
          onFocus={() => setFokus(true)}
          onBlur={() => setTimeout(() => setFokus(false), 150)}
          role="combobox"
          aria-expanded={fokus}
          aria-controls="daftar-tipe-hp"
          aria-autocomplete="list"
        />
        {fokus && (
          <ul id="daftar-tipe-hp" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200" role="listbox">
            {saran.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQ(t.tipe);
                    setMerek(t.merek);
                    setFokus(false);
                    onPilih(t.id);
                  }}
                >
                  <span className="font-medium">{t.tipe}</span>
                  <span className="text-xs text-slate-400">{t.merek}</span>
                </button>
              </li>
            ))}
            {saran.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Tipe belum ada di daftar{izinkanLain ? " — lanjutkan dengan ketikan Anda." : "."}</li>}
          </ul>
        )}
      </div>
      {terpilih && (
        <p className="mt-2 text-sm text-emerald-700">
          ✓ {terpilih.merek} {terpilih.tipe}
        </p>
      )}
    </div>
  );
}
