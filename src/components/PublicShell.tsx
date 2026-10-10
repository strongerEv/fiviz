"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IkonWa, Logo } from "./ui";
import { useStore } from "@/lib/store";
import { statusLayanan, waLink } from "@/lib/logic";

const NAV = [
  { href: "/jasa", label: "Jasa & Harga" },
  { href: "/estimasi", label: "Estimasi Biaya" },
  { href: "/reservasi", label: "Reservasi" },
  { href: "/lacak", label: "Lacak Servis" },
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const { db } = useStore();
  const st = db ? statusLayanan(db.toko) : null;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${path.startsWith(n.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:text-slate-900"}`}>
                {n.label}
              </Link>
            ))}
            <Link href="/staf" className="ml-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-700">
              Staf
            </Link>
          </nav>
          <button className="rounded-lg p-2 md:hidden" onClick={() => setMenu(!menu)} aria-label="Menu">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d={menu ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} /></svg>
          </button>
        </div>
        {menu && (
          <nav className="border-t border-slate-100 px-4 pb-3 md:hidden">
            {[...NAV, { href: "/staf", label: "Masuk Staf" }].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMenu(false)} className="block rounded-lg px-3 py-3 font-medium text-slate-700 hover:bg-slate-50">
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="no-print mt-16 bg-brand-900 text-brand-100">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <Logo putih />
            <p className="mt-3 text-sm text-brand-200">Servis HP cepat, biaya jelas di depan, progres bisa dipantau sendiri.</p>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-white">Kunjungi kami</p>
            <p>{db?.toko.alamat}</p>
            <p className="mt-1">Buka setiap hari {db?.toko.jamBuka}–{db?.toko.jamTutup} WIB</p>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-white">WhatsApp</p>
            {db && (
              <a className="inline-flex items-center gap-2 hover:text-white" href={waLink(db.toko.noWa, "Halo Firman Service, saya mau tanya servis HP.")} target="_blank" rel="noopener noreferrer">
                <IkonWa /> +{db.toko.noWa}
              </a>
            )}
            {st && <p className="mt-1 text-brand-300">{st.buka ? "Sedang online" : st.info}</p>}
          </div>
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs text-brand-300">© {new Date().getFullYear()} Firman Service</p>
      </footer>
    </div>
  );
}
