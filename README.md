# Kartu Stok Gudang — Enterprise Cloud

Aplikasi inventori gudang berbasis browser untuk mengelola barang, mutasi stok, batch & tanggal kedaluwarsa, stok opname, kartu stok, laporan, dan dokumen cetak. Data tersimpan di perangkat (localStorage) dan dapat disinkronkan ke Supabase.

Versi saat ini: **6.0.0**

## Fitur Utama

- **Dashboard** — KPI stok, nilai persediaan, grafik mutasi dan kategori, aktivitas terbaru, peringatan stok menipis/kedaluwarsa.
- **Master Barang** — CRUD barang, SKU/barcode, kategori, rak, satuan eceran & grosir, konversi, HPP rata-rata, harga jual, margin, stok minimum. Filter, pencarian, pengurutan, ekspor CSV, dan impor CSV.
- **Riwayat Mutasi** — stok masuk/keluar, batch, tanggal kedaluwarsa, biaya, petugas, filter, dan ekspor.
- **Stok Opname** — hitung fisik massal per kategori/rak, selisih otomatis, riwayat audit, dan penyesuaian yang tercatat ke kartu stok.
- **Kartu Stok (Ledger)** — saldo berjalan per barang dengan filter tanggal, ekspor, dan cetak.
- **Laporan & Dokumen** — laporan persediaan/nilai stok, stok menipis, barang kedaluwarsa, rekap mutasi, surat jalan, lembar opname, dan riwayat opname siap cetak.
- **Scan Barcode** — kamera perangkat atau input manual, pencarian barang, lalu langsung catat stok masuk/keluar.
- **Pengaturan** — profil usaha, tema terang/gelap, lisensi, sinkronisasi cloud, backup/restore JSON, dan reset data.
- **Multi-user & lisensi** — role admin/staf, aktivasi serial key per nama toko, dan generator lisensi developer.
- **UI/UX** — desain responsif, sidebar mobile, command palette (`Ctrl+K`), notifikasi, toast, modal konfirmasi, dan tema profesional.

## Akun Bawaan

| Username | Password   | Role  | Akses |
|----------|------------|-------|-------|
| `admin`  | `admin123` | Admin | Semua fitur, termasuk master data, pengaturan, opname, dan reset |
| `staf`   | `staf123`  | Staf  | Lihat dashboard, barang, mutasi, kartu stok, laporan, dan scanner |

> Ganti password bawaan melalui kode konfigurasi sebelum dipakai di lingkungan produksi.

## Menjalankan Aplikasi

Aplikasi tidak memakai bundler atau ES module, sehingga bisa dijalankan sebagai situs statis.

### Opsi 1 — Server lokal (disarankan)

```powershell
cd "D:\WEB PROGRAMING\kartu-stok-app"
python -m http.server 4174
```

Buka `http://127.0.0.1:4174/`. Server lokal diperlukan agar kamera, unduhan, dan Supabase berjalan normal.

### Opsi 2 — Langsung dari file

Buka `index.html` di browser. Mode ini cukup untuk mencoba UI, tetapi kamera dan sinkronisasi cloud bisa dibatasi oleh kebijakan browser.

### Mode offline untuk pengujian

Tambahkan `?offline=1` pada URL:

```text
http://127.0.0.1:4174/index.html?offline=1
```

Atau set flag berikut di console browser:

```js
localStorage.setItem("KARTU_STOK_CLOUD_OFF", "1");
```

Hapus flag dengan:

```js
localStorage.removeItem("KARTU_STOK_CLOUD_OFF");
```

## Struktur Proyek

```text
kartu-stok-app/
├─ index.html                  # Shell aplikasi: sidebar, topbar, layar login & aktivasi
├─ generator.html              # Generator serial lisensi (khusus developer)
├─ vercel.json                 # Clean URL dan rewrite /generator
├─ assets/
│  ├─ css/
│  │  ├─ base.css              # Design token, tema terang/gelap, reset
│  │  ├─ layout.css            # Sidebar, topbar, footer, responsif
│  │  ├─ components.css        # Tombol, kartu, tabel, modal, toast, form, auth
│  │  └─ print.css             # Gaya dokumen A4 dan mode cetak
│  └─ js/
│     ├─ config.js             # Konfigurasi aplikasi, akun, data awal, Supabase
│     ├─ app.js                # Bootstrap, delegasi event, palette, notifikasi
│     ├─ core/
│     │  ├─ utils.js           # Helper umum, format, CSV, tanggal
│     │  ├─ exports.js         # Ekspor CSV/JSON dan backup
│     │  ├─ store.js           # Persistensi localStorage & selector data
│     │  ├─ ui.js              # Toast, modal, confirm, prompt, tema, halaman
│     │  ├─ auth.js            # Login, logout, lisensi, aktivasi
│     │  ├─ cloud.js           # Sinkronisasi Supabase
│     │  ├─ print.js           # Dokumen cetak resmi
│     │  └─ router.js          # Registry rute, navigasi, refresh
│     └─ modules/
│        ├─ dashboard.js
│        ├─ products.js
│        ├─ reference.js
│        ├─ transactions.js
│        ├─ opname.js
│        ├─ ledger.js
│        ├─ reports.js
│        ├─ settings.js
│        └─ scanner.js
└─ .github/workflows/keep-alive.yml
```

### Pola Pengembangan

- Setiap fitur adalah modul mandiri yang mendaftarkan rute lewat `App.router.register({ id, label, render, mount, ... })`.
- Aksi UI memakai delegasi event melalui atribut `data-action`, `data-input-action`, `data-change-action`, `data-form-action`, dan `data-keydown-action`.
- Handler didaftarkan pada `App.actions`, `App.inputActions`, `App.changeActions`, `App.formActions`, atau `App.keyActions`.
- Semua modul berbagi `window.App`; tidak ada `import/export`, jadi urutan script pada `index.html` harus dijaga.
- Data disimpan di `localStorage` dengan key `KARTU_STOK_PRO_DATA`.

## Format Impor CSV Barang

Impor menerima pemisah koma atau titik koma. Baris pertama adalah header. Header yang didukung (tidak peka huruf besar/kecil, spasi dan tanda baca diabaikan):

| Kolom | Alias yang diterima |
|-------|---------------------|
| Nama barang | `NAMA`, `NAMA BARANG`, `NAME`, `BARANG` |
| SKU | `SKU`, `KODE` |
| Barcode | `BARCODE`, `BAR CODE` |
| Kategori | `KATEGORI`, `CATEGORY` |
| Gudang/Rak | `GUDANG/RAK`, `GUDANG`, `RAK`, `WAREHOUSE` |
| Satuan eceran | `SATUAN ECERAN`, `SATUAN`, `UNIT` |
| Satuan grosir | `SATUAN GROSIR`, `SATUAN DUS`, `SATUAN BESAR` |
| Rasio konversi | `RASIO KONVERSI`, `RASIO` |
| Stok | `STOK FISIK`, `STOK`, `STOCK` |
| Batas minimum | `BATAS MINIMUM`, `MIN STOCK`, `MINIMUM` |
| HPP | `HARGA BELI (HPP)`, `HARGA BELI`, `HPP` |
| Harga jual | `HARGA JUAL`, `SELL PRICE` |

Barang dicocokkan berdasarkan SKU, lalu barcode, lalu nama. Barang baru dengan stok awal akan membuat mutasi `IMPORT CSV: STOK AWAL`; perubahan stok pada barang lama membuat mutasi `IMPORT CSV: PENYESUAIAN STOK`. File CSV hasil ekspor Master Barang dapat langsung diimpor kembali.

Contoh:

```csv
SKU,BARCODE,NAMA BARANG,KATEGORI,GUDANG/RAK,SATUAN ECERAN,SATUAN GROSIR,RASIO KONVERSI,STOK FISIK,BATAS MINIMUM,HARGA BELI (HPP),HARGA JUAL
BRG-100,8990000000001,TEH KOTAK 250ML,MINUMAN,RAK C-01,PCS,KARTON,24,48,12,3500,5000
```

## Sinkronisasi Supabase

Konfigurasi ada di `assets/js/config.js`:

```js
cloud: {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  enabled: !cloudDisabledByFlag,
  tables: {
    products: "products",
    mutations: "mutasi",
    opname: "opname",
    profile: "profile"
  }
}
```

Perilaku sinkronisasi:

1. Saat aplikasi dibuka, data cloud diambil lebih dulu.
2. Jika cloud belum memiliki produk, data lokal diunggah.
3. Setelah penyimpanan lokal, push ke cloud dijadwalkan otomatis (debounce ±1,4 detik).
4. Tombol **Sinkronkan** pada Pengaturan melakukan push lalu pull.
5. Upsert dilakukan bertahap 400 baris per permintaan.

Tabel yang dibutuhkan beserta kolom utamanya:

- `products` — `id`, `sku`, `name`, `category`, `warehouse`, `satuan`, `satuan_besar`, `rasio_konversi`, `min_stock`, `stock`, `avg_hpp`, `sell_price`, `barcode`
- `mutasi` — `id`, `date`, `type`, `product_id`, `name`, `qty`, `tx_unit`, `input_qty`, `unit_cost`, `batch_no`, `expire_date`, `notes`, `user_name`
- `opname` — `id`, `date`, `product_id`, `name`, `system_qty`, `actual_qty`, `diff_qty`, `reason`, `user_name`
- `profile` — `id` (tetap `1`), `store_name`, `address`, `city`, `phone`, `license_key`

Aktifkan Row Level Security dan kebijakan akses sesuai kebutuhan. Jangan menaruh service role key di sisi klien.

## Lisensi & Aktivasi

- Serial key dihitung dari nama toko menggunakan algoritma di `assets/js/core/auth.js`.
- Halaman `generator.html` dipakai developer untuk membuat serial key; halaman ini tidak ditautkan dari aplikasi.
- Profil bawaan sudah memiliki lisensi master agar aplikasi dapat langsung dicoba.
- Jika lisensi tidak valid, aplikasi menampilkan layar aktivasi dan pengguna harus memasukkan serial yang sesuai dengan nama toko.

## Deploy

### Vercel

1. Hubungkan repository ke Vercel.
2. Framework preset: **Other** (situs statis).
3. Deploy. `vercel.json` sudah mengatur clean URL dan rewrite `/generator` ke `generator.html`.
4. Buka domain hasil deploy, lalu sesuaikan URL Supabase bila memakai project lain.

### GitHub Pages / hosting statis lain

Unggah seluruh isi repository. Tidak ada proses build. Pastikan `index.html` berada di root dan folder `assets/` ikut terunggah.

Workflow `.github/workflows/keep-alive.yml` melakukan ping REST Supabase secara berkala agar project gratis tidak tertidur. Isi secret repository `SUPABASE_URL` dan `SUPABASE_ANON_KEY` agar workflow berjalan.

## Catatan Operasional

- **Backup rutin**: Pengaturan → Backup JSON sebelum reset atau pergantian perangkat.
- **Kamera**: hanya aktif pada `https://` atau `localhost`/`127.0.0.1` dan setelah izin kamera diberikan.
- **Cetak**: gunakan dialog cetak browser; pilih “Save as PDF” untuk arsip digital.
- **Stok opname**: hasil penyesuaian tidak dapat dibatalkan otomatis; gunakan backup bila perlu mengembalikan data.
- **Data lokal dan cloud**: bila cloud aktif dan berisi produk, data cloud akan menggantikan data lokal saat aplikasi dibuka. Lakukan sinkronisasi dengan hati-hati saat berpindah perangkat.

## Pengembang

Urai Ikhsan Fadhilah — Kartu Stok Gudang Enterprise Cloud v6.0.0 (2026).
