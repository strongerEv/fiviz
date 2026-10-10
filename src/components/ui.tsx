"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { STATUS_LABEL, STATUS_WARNA, statusLayanan, waLink } from "@/lib/logic";
import type { StatusServis } from "@/lib/types";

export function Logo({ kecil = false, putih = false }: { kecil?: boolean; putih?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Image src="/img/logo.png" alt="Firman Service" width={kecil ? 32 : 40} height={kecil ? 32 : 40} className="rounded-[10px]" priority />
      <span className="leading-tight">
        <span className={`block font-extrabold tracking-tight ${kecil ? "text-sm" : "text-base"} ${putih ? "text-white" : "text-brand-800"}`}>FIRMAN</span>
        <span className={`block text-[10px] font-semibold tracking-[.3em] ${putih ? "text-brand-100" : "text-slate-500"}`}>SERVICE</span>
      </span>
    </Link>
  );
}

export function StatusBadge({ status }: { status: StatusServis }) {
  return <span className={`chip ${STATUS_WARNA[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function Memuat() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /> Memuat…
    </div>
  );
}

export function Kosong({ gambar = "/img/icons/cek.png", judul, children }: { gambar?: string; judul: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <Image src={gambar} alt="" width={96} height={96} className="mb-3 h-24 w-24 object-contain opacity-90" />
      <p className="font-semibold text-slate-800">{judul}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function IkonWa({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4.9 2.9.8 3.4.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.3c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 12 20.3z" />
    </svg>
  );
}

/** KON-01..03: tombol WA dengan pesan otomatis + info jam layanan. */
export function TombolWa({ pesan, label = "Konsultasi via WA", info = true, className = "" }: { pesan: string; label?: string; info?: boolean; className?: string }) {
  const { db } = useStore();
  if (!db) return null;
  const st = statusLayanan(db.toko);
  return (
    <div className={className}>
      <a href={waLink(db.toko.noWa, pesan)} target="_blank" rel="noopener noreferrer" className="btn-wa w-full">
        <IkonWa /> {label}
      </a>
      {info && (
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <span className={`h-2 w-2 rounded-full ${st.buka ? "bg-emerald-500" : "bg-slate-400"}`} />
          {st.info}
        </p>
      )}
    </div>
  );
}

export function Judul({ kecil, children, sub }: { kecil?: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {kecil && <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent-600">{kecil}</p>}
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{children}</h1>
      {sub && <p className="mt-2 max-w-2xl text-slate-600">{sub}</p>}
    </div>
  );
}

export function Modal({ buka, tutup, judul, children, lebar = "max-w-lg" }: { buka: boolean; tutup: () => void; judul: string; children: React.ReactNode; lebar?: string }) {
  if (!buka) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={tutup}>
      <div className={`card max-h-[92vh] w-full ${lebar} overflow-y-auto rounded-b-none p-5 sm:rounded-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{judul}</h2>
          <button onClick={tutup} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Tutup">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
