"use client";

import { useRef } from "react";

/** Kompres foto di browser agar hemat penyimpanan & cepat dikirim. */
export async function kompresFoto(file: File, maks = 900, kualitas = 0.7): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const s = Math.min(1, maks / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", kualitas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FotoInput({ nilai, onUbah, maks = 6, label = "Tambah foto" }: { nilai: string[]; onUbah: (v: string[]) => void; maks?: number; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap gap-2">
      {nilai.map((f, i) => (
        <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
          <button type="button" onClick={() => onUbah(nilai.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white" aria-label="Hapus foto">
            ✕
          </button>
        </div>
      ))}
      {nilai.length < maks && (
        <button type="button" onClick={() => ref.current?.click()} className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-brand-400 hover:text-brand-600">
          <span className="text-xl">＋</span>
          {label}
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []).slice(0, maks - nilai.length);
          const hasil = await Promise.all(files.map((f) => kompresFoto(f)));
          onUbah([...nilai, ...hasil]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
