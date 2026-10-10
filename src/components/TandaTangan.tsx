"use client";

import { useEffect, useRef } from "react";

/** TRM-04: tanda tangan digital di layar. */
export function TandaTangan({ onUbah }: { onUbah: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const gambar = useRef(false);
  const ada = useRef(false);

  useEffect(() => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f2766";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  return (
    <div>
      <canvas
        ref={ref}
        className="h-40 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white"
        onPointerDown={(e) => {
          gambar.current = true;
          ref.current!.setPointerCapture(e.pointerId);
          const ctx = ref.current!.getContext("2d")!;
          const [x, y] = pos(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
        }}
        onPointerMove={(e) => {
          if (!gambar.current) return;
          const ctx = ref.current!.getContext("2d")!;
          const [x, y] = pos(e);
          ctx.lineTo(x, y);
          ctx.stroke();
          ada.current = true;
        }}
        onPointerUp={() => {
          gambar.current = false;
          if (ada.current) onUbah(ref.current!.toDataURL("image/png"));
        }}
      />
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>Tanda tangan pelanggan di area di atas</span>
        <button
          type="button"
          className="font-semibold text-brand-600"
          onClick={() => {
            const c = ref.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            ada.current = false;
            onUbah("");
          }}
        >
          Ulangi
        </button>
      </div>
    </div>
  );
}
