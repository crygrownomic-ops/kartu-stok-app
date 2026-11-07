/* =========================================================
   Kartu Stok — Printing & Official Documents
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const P = {};

  let pageStyleEl = null;

  function profile() {
    return App.store.profile() || {};
  }

  function ensurePageStyle() {
    if (pageStyleEl && pageStyleEl.parentNode) return pageStyleEl;
    pageStyleEl = document.createElement("style");
    pageStyleEl.id = "printPageStyle";
    document.head.appendChild(pageStyleEl);
    return pageStyleEl;
  }

  function render(html, options) {
    const opts = options || {};
    const area = U.$("#printArea");
    if (!area) {
      window.print();
      return;
    }
    area.innerHTML = html;
    const style = ensurePageStyle();
    style.textContent = opts.page || "@page { size: A4 portrait; margin: 12mm; }";

    let cleared = false;
    function cleanup() {
      if (cleared) return;
      cleared = true;
      style.textContent = "";
      window.removeEventListener("afterprint", cleanup);
      area.innerHTML = "";
    }
    window.addEventListener("afterprint", cleanup);
    // Fallback for browsers that do not fire afterprint reliably.
    setTimeout(cleanup, 60000);

    setTimeout(function () {
      window.print();
    }, opts.delay == null ? 80 : opts.delay);
  }

  /* ---------------------------------------------------------
     Building blocks
     --------------------------------------------------------- */
  function companyBlock() {
    const prof = profile();
    return '<div class="doc-brand">' +
      '<div class="doc-logo">KS</div>' +
      '<div>' +
        '<div class="doc-company-name">' + U.esc(prof.storeName || "NAMA PERUSAHAAN") + '</div>' +
        '<div class="doc-company-meta">' +
          U.esc(prof.address || "-") + '<br>' +
          U.esc(prof.city || "") + (prof.phone ? " · Telp " + U.esc(prof.phone) : "") +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function docHeader(kicker, title, subtitle, metaRight) {
    return '<div class="doc-header">' +
      companyBlock() +
      '<div class="doc-meta">' +
        '<span class="doc-kicker">' + U.esc(kicker) + '</span>' +
        '<div class="doc-date">' + (metaRight || ("Dicetak: <strong>" + U.esc(U.formatLongDate(new Date())) + "</strong>")) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="doc-title-block">' +
      '<div class="doc-title">' + U.esc(title) + '</div>' +
      (subtitle ? '<div class="doc-subtitle">' + U.esc(subtitle) + '</div>' : "") +
    '</div>';
  }

  function docFooter() {
    const prof = profile();
    return '<div class="doc-footer">' +
      '<span>' + U.esc(App.config.appName) + ' · ' + U.esc(App.config.version) + '</span>' +
      '<span>' + U.esc(prof.storeName || "") + '</span>' +
    '</div>';
  }

  function signs(labels) {
    const list = labels || ["Dibuat Oleh", "Diperiksa Oleh", "Disetujui Oleh"];
    return '<div class="doc-signs">' + list.map(function (label) {
      return '<div class="doc-sign">' +
        '<div class="doc-sign-label">' + U.esc(label) + '</div>' +
        '<div class="doc-sign-space"></div>' +
        '<div class="doc-sign-line">( _________________________ )</div>' +
      '</div>';
    }).join("") + '</div>';
  }

  function infoGrid(cells) {
    return '<div class="doc-info-grid">' + (cells || []).map(function (cell) {
      return '<div class="doc-info-cell">' +
        '<div class="doc-info-label">' + U.esc(cell.label) + '</div>' +
        '<div class="doc-info-value">' + U.esc(cell.value == null || cell.value === "" ? "-" : cell.value) + '</div>' +
      '</div>';
    }).join("") + '</div>';
  }

  /* ---------------------------------------------------------
     Thermal receipt
     --------------------------------------------------------- */
  P.receipt = function (mutation) {
    const m = mutation;
    if (!m) return;
    const prof = profile();
    const product = App.store.productById(m.productId);
    const unit = product ? U.unitInfo(product).base : (m.txUnit || "PCS");
    const qty = Number(m.inputQty != null ? m.inputQty : m.qty) || 0;
    const cost = Number(m.unitCost) || 0;

    const html = '<div class="receipt">' +
      '<div class="receipt-center">' +
        '<div class="receipt-store">' + U.esc(prof.storeName || "NAMA TOKO") + '</div>' +
        '<div class="receipt-meta">' + U.esc(prof.address || "") + '</div>' +
        '<div class="receipt-meta">TELP: ' + U.esc(prof.phone || "-") + '</div>' +
      '</div>' +
      '<div class="receipt-line"></div>' +
      '<div class="receipt-row"><span>NO. BUKTI</span><span>' + U.esc(m.id) + '</span></div>' +
      '<div class="receipt-row"><span>TANGGAL</span><span>' + U.esc(U.formatDateTime(m.date)) + '</span></div>' +
      '<div class="receipt-row"><span>TIPE</span><span>' + (m.type === "IN" ? "STOK MASUK" : "STOK KELUAR") + '</span></div>' +
      '<div class="receipt-line"></div>' +
      '<div class="receipt-row"><span style="font-weight:700">' + U.esc(m.name) + '</span><span></span></div>' +
      '<div class="receipt-row"><span>' + U.formatNumber(qty, 2) + ' ' + U.esc(m.txUnit || unit) + ' x ' + U.formatCurrency(cost) + '</span>' +
        '<span>' + U.formatCurrency(qty * cost) + '</span></div>' +
      '<div class="receipt-line"></div>' +
      '<div class="receipt-row"><span>BATCH</span><span>' + U.esc(m.batchNo || "-") + '</span></div>' +
      '<div class="receipt-row"><span>EXPIRED</span><span>' + U.esc(m.expireDate || "-") + '</span></div>' +
      '<div class="receipt-row"><span>CATATAN</span><span>' + U.esc(m.notes || "-") + '</span></div>' +
      '<div class="receipt-row"><span>PETUGAS</span><span>' + U.esc(m.user || "-") + '</span></div>' +
      '<div class="receipt-line"></div>' +
      '<div class="receipt-center" style="margin-top:6px">TERIMA KASIH</div>' +
      '<div class="receipt-center receipt-meta">Barang yang sudah dibeli tidak dapat ditukar tanpa bukti.</div>' +
    '</div>';

    render(html, { page: "@page { size: 58mm auto; margin: 2mm; }" });
  };

  /* ---------------------------------------------------------
     Surat jalan
     --------------------------------------------------------- */
  P.suratJalan = function (items, meta) {
    const opts = meta || {};
    const rows = (items || []).map(function (item, index) {
      const product = item.product || item;
      const qty = item.qty == null ? "__________" : U.formatNumber(item.qty, 2);
      const unit = item.unit || (product.satuan || "PCS");
      return '<tr>' +
        '<td class="center">' + (index + 1) + '</td>' +
        '<td>' + U.esc(product.sku || "-") + '</td>' +
        '<td class="doc-strong">' + U.esc(product.name) + '</td>' +
        '<td class="num">' + qty + ' ' + U.esc(unit) + '</td>' +
        '<td>' + U.esc(item.notes || "Pengiriman barang") + '</td>' +
      '</tr>';
    }).join("");

    const html = '<div class="doc">' +
      docHeader("Dokumen Pengiriman", "Surat Jalan / Serah Terima",
        "No. SJ: " + (opts.number || ("SJ/" + String(Date.now()).slice(-6))),
        'Tanggal: <strong>' + U.esc(U.formatLongDate(opts.date || new Date())) + '</strong>') +
      infoGrid([
        { label: "Pengirim (Gudang)", value: profile().storeName || "GUDANG UTAMA" },
        { label: "Penerima / Tujuan", value: opts.recipient || "_______________________________" },
        { label: "Alamat Tujuan", value: opts.recipientAddress || "_______________________________" },
        { label: "Kendaraan / Kurir", value: opts.driver || "_______________________________" }
      ]) +
      '<table class="doc-table">' +
        '<thead><tr>' +
          '<th class="center" style="width:38px">NO</th>' +
          '<th style="width:100px">SKU</th>' +
          '<th>NAMA BARANG</th>' +
          '<th class="num" style="width:120px">QTY KELUAR</th>' +
          '<th style="width:150px">KETERANGAN</th>' +
        '</tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="5" class="center">Tidak ada barang</td></tr>') + '</tbody>' +
      '</table>' +
      '<div class="doc-note">Barang telah diterima dalam keadaan baik dan jumlah sesuai dengan dokumen ini. ' +
        'Segala kerusakan atau kekurangan setelah dokumen ditandatangani menjadi tanggung jawab penerima.</div>' +
      signs(["Pengirim / Gudang", "Sopir / Kurir", "Penerima Barang"]) +
      docFooter() +
    '</div>';

    render(html);
  };

  /* ---------------------------------------------------------
     Opname
     --------------------------------------------------------- */
  P.opnameSheet = function (products, meta) {
    const opts = meta || {};
    const rows = (products || []).map(function (p, index) {
      return '<tr>' +
        '<td class="center">' + (index + 1) + '</td>' +
        '<td>' + U.esc(p.sku || "-") + ' / ' + U.esc(p.warehouse || "-") + '</td>' +
        '<td class="doc-strong">' + U.esc(p.name) + '</td>' +
        '<td>' + U.esc(p.satuan || "PCS") + '</td>' +
        '<td class="num">' + U.formatNumber(p.stock, 2) + '</td>' +
        '<td class="center">[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</td>' +
        '<td>______________________</td>' +
      '</tr>';
    }).join("");

    const html = '<div class="doc">' +
      docHeader("Lembar Kerja", "Lembar Audit Hitung Fisik (Stok Opname)",
        opts.subtitle || "Formulir penghitungan stok fisik gudang") +
      infoGrid([
        { label: "Tanggal Audit", value: U.formatLongDate(opts.date || new Date()) },
        { label: "Petugas", value: opts.officer || "_______________________" },
        { label: "Lokasi / Gudang", value: opts.warehouse || "SEMUA LOKASI" },
        { label: "Jumlah Item", value: (products || []).length + " item" }
      ]) +
      '<table class="doc-table">' +
        '<thead><tr>' +
          '<th class="center" style="width:36px">NO</th>' +
          '<th style="width:130px">SKU / RAK</th>' +
          '<th>NAMA BARANG</th>' +
          '<th style="width:70px">SATUAN</th>' +
          '<th class="num" style="width:80px">STOK SISTEM</th>' +
          '<th class="center" style="width:130px">HITUNG FISIK</th>' +
          '<th style="width:140px">CATATAN</th>' +
        '</tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="7" class="center">Tidak ada barang</td></tr>') + '</tbody>' +
      '</table>' +
      '<div class="doc-note">Tuliskan hasil hitung fisik dengan jelas pada kolom yang tersedia. ' +
        'Selisih wajib disertai keterangan dan diverifikasi oleh supervisor sebelum data dimasukkan ke sistem.</div>' +
      signs(["Auditor / Petugas Gudang", "Mengetahui / Supervisor"]) +
      docFooter() +
    '</div>';

    render(html);
  };

  P.opnameHistory = function (records, meta) {
    const opts = meta || {};
    const rows = (records || []).map(function (o, index) {
      const diff = Number(o.diffQty) || 0;
      return '<tr>' +
        '<td class="center">' + (index + 1) + '</td>' +
        '<td>' + U.esc(o.date || "-") + '</td>' +
        '<td class="doc-strong">' + U.esc(o.name) + '</td>' +
        '<td class="num">' + U.formatNumber(o.systemQty, 2) + '</td>' +
        '<td class="num">' + U.formatNumber(o.actualQty, 2) + '</td>' +
        '<td class="num">' + (diff > 0 ? "+" : "") + U.formatNumber(diff, 2) + '</td>' +
        '<td>' + U.esc(o.reason || "-") + '</td>' +
        '<td class="center">[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</td>' +
      '</tr>';
    }).join("");

    const html = '<div class="doc">' +
      docHeader("Laporan Audit", "Laporan Selisih & Audit Stok Opname",
        opts.subtitle || "Riwayat penyesuaian stok hasil hitung fisik") +
      infoGrid([
        { label: "Jumlah Catatan", value: (records || []).length + " catatan" },
        { label: "Total Selisih", value: U.formatNumber(U.sum(records, function (o) { return o.diffQty; }), 2) },
        { label: "Periode", value: opts.period || "SEMUA PERIODE" },
        { label: "Dicetak Oleh", value: App.store.user() ? App.store.user().name : "SYSTEM" }
      ]) +
      '<table class="doc-table">' +
        '<thead><tr>' +
          '<th class="center" style="width:34px">NO</th>' +
          '<th style="width:90px">TANGGAL</th>' +
          '<th>NAMA BARANG</th>' +
          '<th class="num" style="width:80px">SISTEM</th>' +
          '<th class="num" style="width:80px">FISIK</th>' +
          '<th class="num" style="width:75px">SELISIH</th>' +
          '<th style="width:150px">ALASAN</th>' +
          '<th class="center" style="width:72px">PARAF</th>' +
        '</tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="8" class="center">Belum ada catatan selisih</td></tr>') + '</tbody>' +
      '</table>' +
      signs(["Checker / Petugas Lapangan", "Kepala Gudang / Supervisor"]) +
      docFooter() +
    '</div>';

    render(html);
  };

  /* ---------------------------------------------------------
     Valuation & stock reports
     --------------------------------------------------------- */
  P.valuation = function (products, meta) {
    const opts = meta || {};
    const list = products || [];
    const totalHpp = U.sum(list, function (p) { return (Number(p.stock) || 0) * (Number(p.avgHpp) || 0); });
    const totalSell = U.sum(list, function (p) { return (Number(p.stock) || 0) * (Number(p.sellPrice) || 0); });

    const rows = list.map(function (p, index) {
      const asset = (Number(p.stock) || 0) * (Number(p.avgHpp) || 0);
      return '<tr>' +
        '<td class="center">' + (index + 1) + '</td>' +
        '<td>' + U.esc(p.sku || "-") + '</td>' +
        '<td class="doc-strong">' + U.esc(p.name) + '</td>' +
        '<td>' + U.esc(p.category || "-") + '</td>' +
        '<td class="num">' + U.formatNumber(p.stock, 2) + ' ' + U.esc(p.satuan || "PCS") + '</td>' +
        '<td class="num">' + U.formatCurrency(p.avgHpp) + '</td>' +
        '<td class="num">' + U.formatCurrency(p.sellPrice) + '</td>' +
        '<td class="num">' + U.formatCurrency(asset) + '</td>' +
      '</tr>';
    }).join("");

    const html = '<div class="doc">' +
      docHeader("Laporan Manajemen", "Laporan Rekapitulasi & Valuasi Stok",
        opts.subtitle || "Rekapitulasi nilai persediaan berdasarkan HPP dan harga jual") +
      '<div class="doc-summary">' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Jenis Barang</div><div class="doc-summary-value">' + list.length + ' item</div></div>' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Total Qty</div><div class="doc-summary-value">' + U.formatNumber(U.sum(list, function (p) { return p.stock; }), 2) + '</div></div>' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Valuasi HPP</div><div class="doc-summary-value">' + U.formatCurrency(totalHpp) + '</div></div>' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Potensi Omset</div><div class="doc-summary-value">' + U.formatCurrency(totalSell) + '</div></div>' +
      '</div>' +
      '<table class="doc-table">' +
        '<thead><tr>' +
          '<th class="center" style="width:34px">NO</th>' +
          '<th style="width:95px">SKU</th>' +
          '<th>NAMA BARANG</th>' +
          '<th style="width:110px">KATEGORI</th>' +
          '<th class="num" style="width:100px">STOK</th>' +
          '<th class="num" style="width:90px">HPP</th>' +
          '<th class="num" style="width:90px">JUAL</th>' +
          '<th class="num" style="width:110px">NILAI ASET</th>' +
        '</tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="8" class="center">Belum ada data barang</td></tr>') + '</tbody>' +
        '<tfoot><tr class="doc-total-row">' +
          '<td colspan="7" class="num">TOTAL VALUASI HPP</td>' +
          '<td class="num">' + U.formatCurrency(totalHpp) + '</td>' +
        '</tr></tfoot>' +
      '</table>' +
      '<div class="doc-note">Nilai aset dihitung dari stok sistem dikalikan HPP rata-rata tertimbang. ' +
        'Potensi omset dihitung dari stok sistem dikalikan harga jual. Angka dapat berbeda dengan nilai realisasi.</div>' +
      signs(["Dibuat Oleh", "Diperiksa Oleh", "Disetujui Oleh"]) +
      docFooter() +
    '</div>';

    render(html, { page: "@page { size: A4 landscape; margin: 10mm; }" });
  };

  P.lowStock = function (products, meta) {
    const opts = meta || {};
    const rows = (products || []).map(function (p, index) {
      const shortage = Math.max(0, (Number(p.minStock) || 0) - (Number(p.stock) || 0));
      return '<tr>' +
        '<td class="center">' + (index + 1) + '</td>' +
        '<td>' + U.esc(p.sku || "-") + '</td>' +
        '<td class="doc-strong">' + U.esc(p.name) + '</td>' +
        '<td>' + U.esc(p.category || "-") + '</td>' +
        '<td>' + U.esc(p.warehouse || "-") + '</td>' +
        '<td class="num">' + U.formatNumber(p.stock, 2) + ' ' + U.esc(p.satuan || "PCS") + '</td>' +
        '<td class="num">' + U.formatNumber(p.minStock, 2) + '</td>' +
        '<td class="num">' + U.formatNumber(shortage, 2) + '</td>' +
      '</tr>';
    }).join("");

    const html = '<div class="doc">' +
      docHeader("Peringatan Stok", "Laporan Stok Menipis & Habis",
        opts.subtitle || "Daftar barang yang perlu segera dilakukan pengadaan ulang") +
      '<table class="doc-table">' +
        '<thead><tr>' +
          '<th class="center" style="width:34px">NO</th>' +
          '<th style="width:95px">SKU</th>' +
          '<th>NAMA BARANG</th>' +
          '<th style="width:110px">KATEGORI</th>' +
          '<th style="width:90px">RAK</th>' +
          '<th class="num" style="width:100px">STOK</th>' +
          '<th class="num" style="width:90px">MINIMUM</th>' +
          '<th class="num" style="width:90px">KEKURANGAN</th>' +
        '</tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="8" class="center">Semua stok dalam batas aman</td></tr>') + '</tbody>' +
      '</table>' +
      '<div class="doc-note">Barang dengan stok di bawah batas minimum perlu segera dipesan agar tidak mengganggu operasional. ' +
        'Laporan ini diurutkan dari rasio stok terendah terhadap batas minimum.</div>' +
      signs(["Petugas Gudang", "Kepala Gudang / Supervisor"]) +
      docFooter() +
    '</div>';

    render(html);
  };

  P.expiring = function (batches, meta) {
    const opts = meta || {};
    const rows = (batches || []).map(function (b, index) {
      return '<tr>' +
        '<td class="center">' + (index + 1) + '</td>' +
        '<td class="doc-strong">' + U.esc(b.name) + '</td>' +
        '<td>' + U.esc(b.batchNo || "-") + '</td>' +
        '<td class="center">' + U.esc(U.formatDate(b.expireDate)) + '</td>' +
        '<td class="center">' + U.esc(b.info ? b.info.label : "-") + '</td>' +
        '<td class="num">' + U.formatNumber(b.qty, 2) + ' ' + U.esc(b.unit || "") + '</td>' +
      '</tr>';
    }).join("");

    const html = '<div class="doc">' +
      docHeader("Kontrol Kualitas", "Laporan Batch Mendekati / Melewati Expired",
        opts.subtitle || "Daftar batch dengan masa simpan kritis (30 hari ke depan)") +
      infoGrid([
        { label: "Total Batch", value: (batches || []).length + " batch" },
        { label: "Sudah Expired", value: (batches || []).filter(function (b) { return b.info && (b.info.status === "expired" || b.info.status === "today"); }).length + " batch" },
        { label: "Akan Expired", value: (batches || []).filter(function (b) { return b.info && b.info.status === "soon"; }).length + " batch" },
        { label: "Batas Peringatan", value: opts.limit || "30 hari" }
      ]) +
      '<table class="doc-table">' +
        '<thead><tr>' +
          '<th class="center" style="width:34px">NO</th>' +
          '<th>NAMA BARANG</th>' +
          '<th style="width:130px">NO BATCH</th>' +
          '<th class="center" style="width:100px">EXPIRED</th>' +
          '<th class="center" style="width:110px">SISA WAKTU</th>' +
          '<th class="num" style="width:100px">QTY BATCH</th>' +
        '</tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="6" class="center">Tidak ada batch mendekati expired</td></tr>') + '</tbody>' +
      '</table>' +
      '<div class="doc-note">Batch mendekati expired sebaiknya diprioritaskan keluar (FEFO). ' +
        'Lakukan pemisahan barang dan koordinasi dengan supplier untuk retur bila diperlukan.</div>' +
      signs(["QC / Petugas Gudang", "Kepala Gudang / Supervisor"]) +
      docFooter() +
    '</div>';

    render(html);
  };

  P.mutations = function (mutations, meta) {
    const opts = meta || {};
    const list = mutations || [];
    const totalIn = U.sum(list.filter(function (m) { return m.type === "IN"; }), function (m) { return m.qty; });
    const totalOut = U.sum(list.filter(function (m) { return m.type === "OUT"; }), function (m) { return m.qty; });

    const rows = list.map(function (m, index) {
      return '<tr>' +
        '<td class="center">' + (index + 1) + '</td>' +
        '<td>' + U.esc(U.formatDateTime(m.date)) + '</td>' +
        '<td class="center">' + (m.type === "IN" ? "MASUK" : "KELUAR") + '</td>' +
        '<td class="doc-strong">' + U.esc(m.name) + '</td>' +
        '<td class="num">' + U.formatNumber(m.inputQty != null ? m.inputQty : m.qty, 2) + ' ' + U.esc(m.txUnit || "PCS") + '</td>' +
        '<td class="num">' + U.formatNumber(m.qty, 2) + '</td>' +
        '<td>' + U.esc(m.batchNo || "-") + '</td>' +
        '<td>' + U.esc(m.notes || "-") + '</td>' +
        '<td>' + U.esc(m.user || "-") + '</td>' +
      '</tr>';
    }).join("");

    const html = '<div class="doc">' +
      docHeader("Laporan Mutasi", "Rekapitulasi Riwayat Mutasi Stok",
        opts.subtitle || "Seluruh transaksi stok masuk dan keluar") +
      '<div class="doc-summary">' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Jumlah Transaksi</div><div class="doc-summary-value">' + list.length + '</div></div>' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Total Masuk</div><div class="doc-summary-value">' + U.formatNumber(totalIn, 2) + '</div></div>' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Total Keluar</div><div class="doc-summary-value">' + U.formatNumber(totalOut, 2) + '</div></div>' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Selisih</div><div class="doc-summary-value">' + U.formatNumber(totalIn - totalOut, 2) + '</div></div>' +
      '</div>' +
      '<table class="doc-table">' +
        '<thead><tr>' +
          '<th class="center" style="width:32px">NO</th>' +
          '<th style="width:110px">WAKTU</th>' +
          '<th class="center" style="width:60px">TIPE</th>' +
          '<th>NAMA BARANG</th>' +
          '<th class="num" style="width:90px">QTY INPUT</th>' +
          '<th class="num" style="width:80px">QTY DASAR</th>' +
          '<th style="width:110px">BATCH</th>' +
          '<th style="width:120px">KETERANGAN</th>' +
          '<th style="width:90px">PETUGAS</th>' +
        '</tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="9" class="center">Belum ada mutasi</td></tr>') + '</tbody>' +
      '</table>' +
      docFooter() +
    '</div>';

    render(html, { page: "@page { size: A4 landscape; margin: 9mm; }" });
  };

  P.ledger = function (product, ledger) {
    if (!product || !ledger) return;
    const u = U.unitInfo(product);
    const entries = (ledger.entries || []).slice().reverse();

    const rows = entries.map(function (entry, index) {
      const m = entry.mutation;
      return '<tr>' +
        '<td class="center">' + (index + 1) + '</td>' +
        '<td>' + U.esc(U.formatDateTime(m.date)) + '</td>' +
        '<td>' + U.esc(m.notes || "-") + '</td>' +
        '<td>' + U.esc(m.batchNo || "-") + '</td>' +
        '<td class="num">' + (m.type === "IN" ? U.formatNumber(m.qty, 2) + " " + u.base : "-") + '</td>' +
        '<td class="num">' + (m.type === "OUT" ? U.formatNumber(m.qty, 2) + " " + u.base : "-") + '</td>' +
        '<td class="num">' + U.formatNumber(entry.balanceAfter, 2) + ' ' + u.base + '</td>' +
      '</tr>';
    }).join("");

    const html = '<div class="doc">' +
      docHeader("Kartu Stok", "Kartu Stok Ledger Barang",
        (product.sku || "-") + " — " + product.name + " (" + u.base + ")", null) +
      infoGrid([
        { label: "SKU", value: product.sku || "-" },
        { label: "Nama Barang", value: product.name },
        { label: "Kategori", value: product.category || "-" },
        { label: "Lokasi Rak", value: product.warehouse || "-" },
        { label: "Saldo Awal Periode", value: U.formatNumber(ledger.opening, 2) + " " + u.base },
        { label: "Saldo Akhir Periode", value: U.formatNumber(ledger.closing, 2) + " " + u.base }
      ]) +
      '<div class="doc-summary">' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Total Masuk</div><div class="doc-summary-value">' + U.formatNumber(ledger.totalIn, 2) + ' ' + u.base + '</div></div>' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Total Keluar</div><div class="doc-summary-value">' + U.formatNumber(ledger.totalOut, 2) + ' ' + u.base + '</div></div>' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Stok Sistem</div><div class="doc-summary-value">' + U.formatNumber(ledger.systemStock, 2) + ' ' + u.base + '</div></div>' +
        '<div class="doc-summary-item"><div class="doc-summary-label">Status</div><div class="doc-summary-value">' + (ledger.mismatch ? "SELISIH" : "SESUAI") + '</div></div>' +
      '</div>' +
      '<table class="doc-table">' +
        '<thead><tr>' +
          '<th class="center" style="width:34px">NO</th>' +
          '<th style="width:120px">WAKTU</th>' +
          '<th>KETERANGAN / TRANSAKSI</th>' +
          '<th style="width:120px">NO BATCH</th>' +
          '<th class="num" style="width:100px">MASUK</th>' +
          '<th class="num" style="width:100px">KELUAR</th>' +
          '<th class="num" style="width:110px">SALDO</th>' +
        '</tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="7" class="center">Belum ada mutasi pada periode ini</td></tr>') + '</tbody>' +
      '</table>' +
      (ledger.mismatch
        ? '<div class="doc-note">Perhatian: saldo akhir kartu stok (mutasi) tidak sama dengan stok sistem. Selisih: ' +
          U.formatNumber(ledger.closing - ledger.systemStock, 2) + ' ' + u.base + '. Lakukan opname untuk menyelaraskan data.</div>'
        : "") +
      signs(["Petugas Gudang", "Kepala Gudang / Supervisor"]) +
      docFooter() +
    '</div>';

    render(html);
  };

  P.custom = function (title, htmlBody, options) {
    const html = '<div class="doc">' +
      docHeader("Dokumen", title, (options || {}).subtitle || "") +
      htmlBody +
      docFooter() +
    '</div>';
    render(html, options);
  };

  App.print = P;
})(window.App);
