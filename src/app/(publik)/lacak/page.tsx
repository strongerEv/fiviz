"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useStore } from "@/lib/store";
import { Judul, Memuat } from "@/components/ui";

/** PRG-05: lacak dengan nomor servis + 4 digit terakhir nomor WA, tanpa login. */
function Lacak() {
  const { db } = useStore();
  const router = useRouter();
  const q = useSearchParams();
  const [nomor, setNomor] = useState(q.get("nomor") ?? "");
  const [digit, setDigit] = useState("");
  const [galat, setGalat] = useState("");
  if (!db) return <Memuat />;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Image src="/img/icons/cek.png" alt="" width={120} height={120} className="mx-auto mb-4 h-28 w-28 object-contain" />
      <Judul kecil="Lacak servis" sub="Masukkan nomor servis di nota dan 4 digit terakhir nomor WhatsApp Anda.">
        HP saya sudah sampai mana?
      </Judul>
      <form
        className="card space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const o = db.order.find((x) => x.nomorServis.toUpperCase() === nomor.trim().toUpperCase());
          const p = o && db.pelanggan.find((x) => x.id === o.pelangganId);
          if (!o || !p || !p.noWa.endsWith(digit.trim()) || digit.trim().length !== 4) {
            setGalat("Nomor servis atau 4 digit nomor WA tidak cocok.");
            return;
          }
          router.push(`/lacak/${o.token}`);
        }}
      >
        <div>
          <label className="label" htmlFor="nomor">Nomor servis</label>
          <input id="nomor" className="input uppercase" required value={nomor} onChange={(e) => setNomor(e.target.value)} placeholder="FS-251011-007" />
        </div>
        <div>
          <label className="label" htmlFor="digit">4 digit terakhir nomor WA</label>
          <input id="digit" className="input tracking-[.5em]" required inputMode="numeric" maxLength={4} value={digit} onChange={(e) => setDigit(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
        </div>
        {galat && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{galat}</p>}
        <button className="btn-primary w-full py-3">Lacak Servis</button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-500">
        Coba demo: nomor <b>{db.order.find((o) => o.id === "ord-dinda")?.nomorServis ?? "-"}</b> dengan 4 digit <b>1234</b>.
      </p>
    </div>
  );
}

export default function Halaman() {
  return (
    <Suspense fallback={<Memuat />}>
      <Lacak />
    </Suspense>
  );
}
