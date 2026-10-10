-- Firman Service · skema awal (V1)
-- Mengikuti bagian "Model Data" PRD. cabang_id disiapkan untuk multi-cabang (V3).
-- Pelanggan publik TIDAK mengakses tabel langsung; mereka memakai fungsi RPC berbasis token
-- (lacak_servis, jawab_persetujuan, klaim_garansi, buat_reservasi) agar data pribadi tidak bocor.

create extension if not exists pgcrypto;

-- ---------- Enum ----------
create type peran_staf as enum ('pemilik', 'admin', 'teknisi');
create type kualitas_part as enum ('original', 'oem', 'kw', 'standar');
create type status_servis as enum ('diterima','pengecekan','menunggu_persetujuan','menunggu_sparepart','dikerjakan','uji_coba','siap_diambil','selesai','dibatalkan');
create type status_reservasi as enum ('terjadwal','datang','batal','no_show');
create type status_persetujuan as enum ('menunggu','setuju','tolak');
create type status_garansi as enum ('aktif','diklaim','habis');

-- ---------- Tabel ----------
create table cabang (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  alamat text not null,
  jam_buka time not null default '09:00',
  jam_tutup time not null default '21:00',
  hari_libur smallint[] not null default '{}',
  no_wa text not null,
  syarat_servis text not null default '',
  biaya_cek integer not null default 0,
  biaya_ekspres integer not null default 50000,
  slot_menit smallint not null default 30,
  kapasitas_slot smallint not null default 2,
  batas_simpan_hari smallint not null default 30,
  template_wa jsonb not null default '{}'
);

create table staf (
  id uuid primary key references auth.users(id) on delete cascade, -- password di-hash oleh Supabase Auth
  cabang_id uuid not null references cabang(id),
  nama text not null,
  no_hp text,
  peran peran_staf not null,
  keahlian text[] not null default '{}',
  aktif boolean not null default true
);

create table pelanggan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  no_wa text not null unique,
  email text
);

create table tipe_hp (
  id text primary key,
  merek text not null,
  tipe text not null,
  seri text not null default ''
);
create index tipe_hp_cari on tipe_hp using gin (to_tsvector('simple', merek || ' ' || tipe || ' ' || seri));

create table jasa (
  id text primary key,
  kategori text not null,
  nama text not null,
  deskripsi text not null default '',
  gambar text,
  aktif boolean not null default true
);

create table harga_jasa (
  id text primary key,
  jasa_id text not null references jasa(id),
  tipe_hp_id text not null references tipe_hp(id),
  kualitas kualitas_part not null,
  harga_min integer not null check (harga_min >= 0),
  harga_max integer not null check (harga_max >= harga_min),
  durasi_min integer not null, -- menit
  durasi_max integer not null,
  garansi_hari integer not null default 0,
  aktif boolean not null default true,
  unique (jasa_id, tipe_hp_id, kualitas)
);

create table reservasi (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(9), 'hex'),
  cabang_id uuid not null references cabang(id),
  pelanggan_id uuid not null references pelanggan(id),
  tanggal date not null,
  slot time not null,
  tipe_hp_id text references tipe_hp(id),
  tipe_lain text,
  keluhan text not null,
  jasa_ids text[] not null default '{}',
  catatan text,
  foto text, -- path Storage
  status status_reservasi not null default 'terjadwal',
  dibuat timestamptz not null default now()
);
create index reservasi_tanggal on reservasi (cabang_id, tanggal, slot);

create table order_servis (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(9), 'hex'),
  nomor_servis text not null unique, -- FS-YYMMDD-NNN
  cabang_id uuid not null references cabang(id),
  pelanggan_id uuid not null references pelanggan(id),
  reservasi_id uuid references reservasi(id),
  tipe_hp_id text references tipe_hp(id),
  tipe_lain text,
  keluhan text not null,
  jasa_id_diminta text[] not null default '{}',
  kondisi_awal jsonb not null,
  foto_kondisi text[] not null check (array_length(foto_kondisi, 1) >= 2),
  kelengkapan text[] not null default '{}',
  kode_kunci bytea, -- pgp_sym_encrypt, kunci di Vault; dihapus saat selesai
  teknisi_id uuid references staf(id),
  prioritas text not null default 'normal' check (prioritas in ('normal','ekspres')),
  status status_servis not null default 'diterima',
  estimasi_selesai timestamptz not null,
  ttd_pelanggan text not null,
  servis_asal_id uuid references order_servis(id),
  dibuat timestamptz not null default now(),
  selesai timestamptz
);
create index order_aktif on order_servis (cabang_id, status, teknisi_id);

create table perubahan_estimasi (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references order_servis(id) on delete cascade,
  dari timestamptz not null,
  ke timestamptz not null,
  alasan text not null check (length(alasan) >= 5),
  oleh uuid references staf(id),
  waktu timestamptz not null default now()
);

create table persetujuan (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references order_servis(id) on delete cascade,
  jenis text not null check (jenis in ('awal','tambahan')),
  diagnosa text not null,
  total integer not null,
  estimasi_selesai timestamptz,
  status status_persetujuan not null default 'menunggu',
  kanal text check (kanal in ('aplikasi','telepon')),
  keterangan text,
  perangkat text,
  dibuat timestamptz not null default now(),
  waktu timestamptz
);

create table item_order (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references order_servis(id) on delete cascade,
  harga_jasa_id text references harga_jasa(id),
  persetujuan_id uuid references persetujuan(id),
  deskripsi text not null,
  harga_final integer not null check (harga_final >= 0),
  tambahan boolean not null default false,
  garansi_hari integer not null default 0
);

create table riwayat_status (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references order_servis(id) on delete cascade,
  status status_servis not null,
  catatan text,
  foto text,
  diubah_oleh text not null,
  waktu timestamptz not null default now()
);

create table pembayaran (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references order_servis(id),
  nominal integer not null,
  metode text not null check (metode in ('tunai','transfer','qris')),
  diskon integer not null default 0,
  alasan_diskon text,
  waktu timestamptz not null default now(),
  dicatat_oleh uuid not null references staf(id),
  check (diskon = 0 or alasan_diskon is not null)
);

create table garansi (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references order_servis(id),
  mulai timestamptz not null,
  berakhir timestamptz not null,
  ketentuan text not null,
  cakupan text[] not null,
  status status_garansi not null default 'aktif',
  klaim_keluhan text,
  klaim_waktu timestamptz,
  klaim_status text check (klaim_status in ('menunggu','diterima','ditolak')),
  klaim_alasan text,
  order_klaim_id uuid references order_servis(id)
);

create table notifikasi (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references order_servis(id),
  reservasi_id uuid references reservasi(id),
  no_wa text not null,
  jenis text not null,
  isi text not null,
  status_kirim text not null default 'antri' check (status_kirim in ('antri','terkirim','gagal')),
  percobaan smallint not null default 0,
  waktu timestamptz not null default now()
);

-- ---------- Helper peran ----------
create or replace function peran_saya() returns peran_staf language sql stable security definer set search_path = public as
  $$ select peran from staf where id = auth.uid() and aktif $$;
create or replace function cabang_saya() returns uuid language sql stable security definer set search_path = public as
  $$ select cabang_id from staf where id = auth.uid() and aktif $$;

-- ---------- Row Level Security ----------
alter table cabang enable row level security;
alter table staf enable row level security;
alter table pelanggan enable row level security;
alter table tipe_hp enable row level security;
alter table jasa enable row level security;
alter table harga_jasa enable row level security;
alter table reservasi enable row level security;
alter table order_servis enable row level security;
alter table perubahan_estimasi enable row level security;
alter table persetujuan enable row level security;
alter table item_order enable row level security;
alter table riwayat_status enable row level security;
alter table pembayaran enable row level security;
alter table garansi enable row level security;
alter table notifikasi enable row level security;

-- Katalog dibaca publik (tanpa login), dikelola pemilik.
create policy katalog_baca_tipe on tipe_hp for select using (true);
create policy katalog_baca_jasa on jasa for select using (aktif or peran_saya() is not null);
create policy katalog_baca_harga on harga_jasa for select using (aktif or peran_saya() is not null);
create policy katalog_kelola_tipe on tipe_hp for all using (peran_saya() = 'pemilik') with check (peran_saya() = 'pemilik');
create policy katalog_kelola_jasa on jasa for all using (peran_saya() = 'pemilik') with check (peran_saya() = 'pemilik');
create policy katalog_kelola_harga on harga_jasa for all using (peran_saya() = 'pemilik') with check (peran_saya() = 'pemilik');

create policy cabang_baca on cabang for select using (true);
create policy cabang_kelola on cabang for update using (peran_saya() = 'pemilik' and id = cabang_saya());

create policy staf_baca on staf for select using (cabang_id = cabang_saya());
create policy staf_kelola on staf for all using (peran_saya() = 'pemilik' and cabang_id = cabang_saya()) with check (peran_saya() = 'pemilik' and cabang_id = cabang_saya());

-- Staf melihat semua data operasional cabangnya; admin/pemilik mengubah; teknisi hanya order yang ditugaskan.
create policy pelanggan_staf on pelanggan for all using (peran_saya() is not null) with check (peran_saya() in ('pemilik','admin'));
create policy reservasi_staf on reservasi for all using (cabang_id = cabang_saya()) with check (cabang_id = cabang_saya() and peran_saya() in ('pemilik','admin'));
create policy order_baca on order_servis for select using (cabang_id = cabang_saya());
create policy order_buat on order_servis for insert with check (cabang_id = cabang_saya() and peran_saya() in ('pemilik','admin'));
create policy order_ubah on order_servis for update using (
  cabang_id = cabang_saya() and (peran_saya() in ('pemilik','admin') or teknisi_id = auth.uid())
);

create policy anak_order_baca_riwayat on riwayat_status for select using (exists (select 1 from order_servis o where o.id = order_id and o.cabang_id = cabang_saya()));
create policy anak_order_tulis_riwayat on riwayat_status for insert with check (exists (select 1 from order_servis o where o.id = order_id and o.cabang_id = cabang_saya() and (peran_saya() in ('pemilik','admin') or o.teknisi_id = auth.uid())));
create policy anak_order_item on item_order for all using (exists (select 1 from order_servis o where o.id = order_id and o.cabang_id = cabang_saya() and (peran_saya() in ('pemilik','admin') or o.teknisi_id = auth.uid())));
create policy anak_order_persetujuan on persetujuan for all using (exists (select 1 from order_servis o where o.id = order_id and o.cabang_id = cabang_saya() and (peran_saya() in ('pemilik','admin') or o.teknisi_id = auth.uid())));
create policy anak_order_estimasi on perubahan_estimasi for all using (exists (select 1 from order_servis o where o.id = order_id and o.cabang_id = cabang_saya() and (peran_saya() in ('pemilik','admin') or o.teknisi_id = auth.uid())));
create policy bayar_kasir on pembayaran for all using (peran_saya() in ('pemilik','admin'));
create policy garansi_staf on garansi for all using (peran_saya() in ('pemilik','admin'));
create policy notif_staf on notifikasi for all using (peran_saya() in ('pemilik','admin'));

-- Kode kunci: hanya teknisi yang ditugaskan.
-- Hak kolom: cabut SELECT tingkat tabel, lalu beri per kolom kecuali kode_kunci.
revoke select on order_servis from authenticated, anon;
grant select (id, token, nomor_servis, cabang_id, pelanggan_id, reservasi_id, tipe_hp_id, tipe_lain, keluhan, jasa_id_diminta,
  kondisi_awal, foto_kondisi, kelengkapan, teknisi_id, prioritas, status, estimasi_selesai, ttd_pelanggan, servis_asal_id, dibuat, selesai)
  on order_servis to authenticated;
create or replace function lihat_kode_kunci(p_order uuid, p_kunci text) returns text
language sql security definer set search_path = public as $$
  select pgp_sym_decrypt(kode_kunci, p_kunci) from order_servis
  where id = p_order and teknisi_id = auth.uid() and status not in ('selesai','dibatalkan')
$$;

-- Hapus kode kunci otomatis saat Selesai / Dibatalkan.
create or replace function hapus_kode_saat_tutup() returns trigger language plpgsql as $$
begin
  if new.status in ('selesai','dibatalkan') then new.kode_kunci := null; end if;
  return new;
end $$;
create trigger t_hapus_kode before update of status on order_servis for each row execute function hapus_kode_saat_tutup();

-- ---------- RPC publik (tanpa login) ----------
-- PRG-05: lacak via token atau nomor servis + 4 digit terakhir WA; nama & WA disamarkan.
create or replace function lacak_servis(p_token text default null, p_nomor text default null, p_4digit text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nomor_servis', o.nomor_servis, 'status', o.status, 'estimasi_selesai', o.estimasi_selesai,
    'pelanggan', split_part(p.nama, ' ', 1), 'wa', '••••' || right(p.no_wa, 4),
    'riwayat', (select jsonb_agg(r order by r.waktu) from (select status, catatan, foto, waktu from riwayat_status where order_id = o.id) r),
    'persetujuan', (select jsonb_agg(x) from persetujuan x where x.order_id = o.id),
    'item', (select jsonb_agg(i) from item_order i where i.order_id = o.id),
    'garansi', (select to_jsonb(g) from garansi g where g.order_id = o.id)
  )
  from order_servis o join pelanggan p on p.id = o.pelanggan_id
  where (p_token is not null and o.token = p_token)
     or (p_nomor is not null and upper(o.nomor_servis) = upper(p_nomor) and length(p_4digit) = 4 and right(p.no_wa, 4) = p_4digit)
  limit 1
$$;

-- STJ-02/04: pelanggan setuju/tolak dari link; dicatat waktu & perangkat.
create or replace function jawab_persetujuan(p_token text, p_persetujuan uuid, p_setuju boolean, p_perangkat text)
returns void language plpgsql security definer set search_path = public as $$
declare v_order uuid;
begin
  select id into v_order from order_servis where token = p_token;
  if v_order is null then raise exception 'token tidak valid'; end if;
  update persetujuan set status = case when p_setuju then 'setuju' else 'tolak' end::status_persetujuan,
    kanal = 'aplikasi', perangkat = left(p_perangkat, 200), waktu = now()
  where id = p_persetujuan and order_id = v_order and status = 'menunggu';
  if not found then raise exception 'persetujuan tidak menunggu'; end if;
  -- perpindahan status & notifikasi WA ditangani Edge Function "persetujuan-dijawab" (trigger DB webhook)
end $$;

create or replace function klaim_garansi(p_token text, p_keluhan text) returns void
language sql security definer set search_path = public as $$
  update garansi g set klaim_keluhan = p_keluhan, klaim_waktu = now(), klaim_status = 'menunggu'
  from order_servis o where o.id = g.order_id and o.token = p_token and g.status = 'aktif' and g.berakhir > now() and g.klaim_status is null
$$;

grant execute on function lacak_servis, jawab_persetujuan, klaim_garansi to anon, authenticated;

-- Storage: bucket privat "foto-servis" (foto kondisi, progres, tanda tangan) diakses lewat signed URL.
insert into storage.buckets (id, name, public) values ('foto-servis', 'foto-servis', false) on conflict do nothing;
