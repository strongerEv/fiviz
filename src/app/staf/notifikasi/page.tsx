"use client";

import Link from "next/link";
import { useState } from "react";
import { useDb } from "@/lib/store";
import { waLink } from "@/lib/logic";
import { waktu } from "@/lib/format";
import { Izin } from "@/components/StaffShell";
import { IkonWa, Kosong } from "@/components/ui";

/**
 * Antrean notifikasi WA. Tanpa WhatsApp Business API, admin mengirim tiap pesan lewat wa.me (satu klik).
 * Setelah API terpasang, pesan berstatus "antri" dikirim otomatis oleh server dan ditandai terkirim/gagal.
 */
function Daftar() {
  const { db, tandaiNotif } = useDb();
  const [filter, setFilter] = useState<"belum" | "semua">("belum");
  const list = db.notifikasi.filter((n) => filter === "semua" || n.statusKirim !== "terkirim");
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-extrabold tracking-tight">Notifikasi WhatsApp</h1>
        <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          {(["belum", "semua"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 ${filter === f ? "bg-white shadow" : "text-slate-500"}`}>{f === "belum" ? "Belum terkirim" : "Semua"}</button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-500">Pesan dibuat otomatis tiap perubahan status, persetujuan, pengingat, dan kwitansi. Tekan Kirim untuk membuka WhatsApp dengan pesan terisi.</p>
      {list.length === 0 ? (
        <div className="card"><Kosong gambar="/img/icons/selesai.png" judul="Semua pesan terkirim" /></div>
      ) : (
        <div className="space-y-3">
          {list.map((n) => {
            const o = n.orderId ? db.order.find((x) => x.id === n.orderId) : undefined;
            return (
              <div key={n.id} className={`card p-4 ${n.statusKirim === "gagal" ? "ring-2 ring-red-300" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`chip ${n.statusKirim === "terkirim" ? "bg-emerald-100 text-emerald-700" : n.statusKirim === "gagal" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {n.statusKirim === "antri" ? "Antri" : n.statusKirim === "gagal" ? `Gagal kirim (${n.percobaan}x)` : "Terkirim"}
                  </span>
                  <span className="font-semibold">{n.jenis}</span>
                  {o && <Link href={`/staf/order/${o.id}`} className="text-sm text-brand-600">{o.nomorServis}</Link>}
                  <span className="ml-auto text-xs text-slate-500">+{n.noWa} · {waktu(n.waktu)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line rounded-xl bg-[#e7f8ee] p-3 text-sm text-slate-800">{n.isi}</p>
                {n.statusKirim !== "terkirim" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a className="btn-wa btn-sm" target="_blank" rel="noopener noreferrer" href={waLink(n.noWa, n.isi)} onClick={() => tandaiNotif(n.id, "terkirim")}><IkonWa /> {n.statusKirim === "gagal" ? "Coba kirim ulang" : "Kirim"}</a>
                    <button className="btn-ghost btn-sm" onClick={() => tandaiNotif(n.id, "gagal")}>Tandai gagal</button>
                    <button className="btn-ghost btn-sm" onClick={() => tandaiNotif(n.id, "terkirim")}>Sudah terkirim</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Halaman() {
  return <Izin peran={["pemilik", "admin"]}><Daftar /></Izin>;
}
