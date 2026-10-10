"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Peran } from "@/lib/types";
import { Logo, Memuat } from "./ui";

const NAV: { href: string; label: string; ikon: string; peran: Peran[] }[] = [
  { href: "/staf", label: "Dashboard", ikon: "▦", peran: ["pemilik", "admin"] },
  { href: "/staf/tugas", label: "Tugas Saya", ikon: "✓", peran: ["teknisi"] },
  { href: "/staf/antrean", label: "Antrean", ikon: "☰", peran: ["pemilik", "admin", "teknisi"] },
  { href: "/staf/reservasi", label: "Reservasi", ikon: "◷", peran: ["pemilik", "admin"] },
  { href: "/staf/order/baru", label: "Terima HP", ikon: "＋", peran: ["pemilik", "admin"] },
  { href: "/staf/notifikasi", label: "Notifikasi WA", ikon: "✉", peran: ["pemilik", "admin"] },
  { href: "/staf/garansi", label: "Klaim Garansi", ikon: "⛨", peran: ["pemilik", "admin"] },
  { href: "/staf/katalog", label: "Katalog & Harga", ikon: "₨", peran: ["pemilik"] },
  { href: "/staf/laporan", label: "Laporan", ikon: "▤", peran: ["pemilik"] },
  { href: "/staf/pengaturan", label: "Pengaturan", ikon: "⚙", peran: ["pemilik"] },
];

const PERAN_LABEL: Record<Peran, string> = { pemilik: "Pemilik", admin: "Admin / Kasir", teknisi: "Teknisi" };

function Masuk() {
  const { db, masuk } = useStore();
  const [stafId, setStafId] = useState("");
  const [pin, setPin] = useState("");
  const [galat, setGalat] = useState("");
  if (!db) return <Memuat />;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-900 p-4">
      <form
        className="card w-full max-w-sm p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!masuk(stafId, pin)) setGalat("PIN salah.");
        }}
      >
        <div className="mb-5 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-4 text-center text-lg font-bold">Masuk staf</h1>
        <div className="grid grid-cols-2 gap-2">
          {db.staf.filter((s) => s.aktif).map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => { setStafId(s.id); setGalat(""); }}
              className={`rounded-xl p-3 text-left ring-1 transition ${stafId === s.id ? "bg-brand-50 ring-2 ring-brand-500" : "ring-slate-200 hover:ring-brand-300"}`}
            >
              <span className="block font-semibold">{s.nama}</span>
              <span className="block text-xs text-slate-500">{PERAN_LABEL[s.peran]}</span>
            </button>
          ))}
        </div>
        <label className="label mt-4" htmlFor="pin">PIN</label>
        <input id="pin" type="password" inputMode="numeric" className="input tracking-[.5em]" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6} />
        {galat && <p className="mt-2 text-sm text-red-600">{galat}</p>}
        <button className="btn-primary mt-4 w-full" disabled={!stafId || !pin}>Masuk</button>
        <p className="mt-4 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
          Mode demo · PIN: Firman 1111, Rina 2222, Budi 3333, Andi 4444
        </p>
        <Link href="/" className="mt-3 block text-center text-sm text-slate-500">← Kembali ke situs</Link>
      </form>
    </div>
  );
}

export function StaffShell({ children }: { children: React.ReactNode }) {
  const { db, staf, keluar } = useStore();
  const path = usePathname();
  const [buka, setBuka] = useState(false);
  if (!db) return <Memuat />;
  if (!staf) return <Masuk />;
  const nav = NAV.filter((n) => n.peran.includes(staf.peran));
  const antriWa = db.notifikasi.filter((n) => n.statusKirim !== "terkirim").length;
  const klaim = db.order.filter((o) => o.garansi?.klaim?.status === "menunggu").length;
  const badge: Record<string, number> = { "/staf/notifikasi": antriWa, "/staf/garansi": klaim };
  const aktif = (h: string) => (h === "/staf" ? path === "/staf" : path.startsWith(h));

  const daftar = (
    <nav className="space-y-0.5">
      {nav.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setBuka(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${aktif(n.href) ? "bg-white/15 text-white" : "text-brand-100 hover:bg-white/10"}`}
        >
          <span className="w-5 text-center">{n.ikon}</span>
          <span className="flex-1">{n.label}</span>
          {badge[n.href] ? <span className="rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">{badge[n.href]}</span> : null}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 flex-col bg-brand-900 p-4 lg:flex">
        <div className="mb-6 px-2 pt-1"><Logo putih /></div>
        {daftar}
        <div className="mt-auto rounded-xl bg-white/10 p-3 text-sm text-brand-100">
          <p className="font-semibold text-white">{staf.nama}</p>
          <p className="text-xs">{PERAN_LABEL[staf.peran]}</p>
          <button onClick={keluar} className="mt-2 text-xs font-semibold text-accent-400">Keluar</button>
        </div>
      </aside>
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Logo kecil />
        <button onClick={() => setBuka(true)} className="rounded-lg p-2" aria-label="Menu">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </header>
      {buka && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 lg:hidden" onClick={() => setBuka(false)}>
          <div className="flex h-full w-72 flex-col bg-brand-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center gap-2 px-2">
              <Image src="/img/logo.png" alt="" width={32} height={32} className="rounded-lg" />
              <div className="text-sm text-white">
                <p className="font-semibold">{staf.nama}</p>
                <p className="text-xs text-brand-200">{PERAN_LABEL[staf.peran]}</p>
              </div>
            </div>
            {daftar}
            <button onClick={keluar} className="mt-auto rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-accent-400">Keluar</button>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}

/** Batasi halaman per peran (mirror RLS di sisi server). */
export function Izin({ peran, children }: { peran: Peran[]; children: React.ReactNode }) {
  const { staf } = useStore();
  if (!staf || !peran.includes(staf.peran)) return <p className="card p-6 text-sm text-slate-600">Halaman ini tidak tersedia untuk peran Anda.</p>;
  return <>{children}</>;
}
