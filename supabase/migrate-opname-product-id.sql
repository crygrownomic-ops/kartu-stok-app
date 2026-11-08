-- =========================================================
-- Kartu Stok — Migrasi skema Supabase
-- Menambahkan kolom yang dipakai aplikasi v6.0 tetapi belum
-- ada pada tabel yang dibuat dari versi aplikasi lama.
--
-- Cara pakai:
-- 1. Buka Supabase Dashboard > SQL Editor.
-- 2. Tempel seluruh isi berkas ini, lalu klik Run.
-- 3. Pastikan hasil verifikasi menampilkan product_id.
-- =========================================================

alter table public.opname
  add column if not exists product_id text;

-- Minta PostgREST memuat ulang cache skema.
notify pgrst, 'reload schema';

-- Verifikasi kolom tabel opname.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'opname'
order by ordinal_position;
