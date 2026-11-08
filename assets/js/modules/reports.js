/* =========================================================
   Kartu Stok — Laporan, Rekap & Dokumen Resmi
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const store = App.store;

  function firstOfMonth() {
    const now = new Date();
    return U.dateOnly(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  const state = {
    tab: "inventory",
    from: firstOfMonth(),
    to: U.todayISO(),
    type: "",
    productId: "",
    page: 1,
    movementPage: 1,
    docProductId: ""
  };

  function pageSize() { return App.config.pageSize; }

  /* ---------------------------------------------------------
     Filters & summaries
     --------------------------------------------------------- */
  function filteredMutations() {
    const from = state.from || "";
    const to = state.to || "";
    const type = state.type || "";
    const productId = state.productId || "";
    return store.mutationChronological().slice().reverse().filter(function (m) {
      const key = String(m.date || "").slice(0, 10);
      if (from && key < from) return false;
      if (to && key > to) return false;
      if (type && m.type !== type) return false;
      if (productId && String(m.productId) !== String(productId)) return false;
      return true;
    });
  }

  function movementSummary(list) {
    const totalIn = U.sum(list.filter(function (m) { return m.type === "IN"; }), function (m) { return m.qty; });
    const totalOut = U.sum(list.filter(function (m) { return m.type === "OUT"; }), function (m) { return m.qty; });
    const valueIn = U.sum(list.filter(function (m) { return m.type === "IN"; }), function (m) { return (Number(m.qty) || 0) * (Number(m.unitCost) || 0); });
    return {
      count: list.length,
      totalIn: totalIn,
      totalOut: totalOut,
      net: totalIn - totalOut,
      valueIn: valueIn
    };
  }

  function periodLabel() {
    if (!state.from && !state.to) return "SEMUA PERIODE";
    return (state.from || "AWAL") + " s/d " + (state.to || "SEKARANG");
  }

  function productOptions(selectedId, withAll) {
    return (withAll ? '<option value="">Semua barang</option>' : "") + store.products().map(function (p) {
      return '<option value="' + U.escapeAttr(p.id) + '"' + (String(p.id) === String(selectedId) ? " selected" : "") + '>' +
        U.esc(p.sku || "-") + ' — ' + U.esc(p.name) +
      '</option>';
    }).join("");
  }

  function tabButton(id, label, icon) {
    return '<button type="button" class="tab' + (state.tab === id ? " active" : "") + '" data-action="reports:tab" data-tab="' + U.escapeAttr(id) + '">' +
      '<i class="fa-solid ' + U.escapeAttr(icon) + '" style="margin-right:6px"></i>' + U.esc(label) +
    '</button>';
  }

  /* ---------------------------------------------------------
     Inventory reports
     --------------------------------------------------------- */
  function renderInventory() {
    const stats = store.stats();
    const categories = store.categoryBreakdown().slice(0, 5);
    const low = stats.lowStockItems.slice(0, 6);
    const batches = stats.expiringBatches.slice(0, 8);

    const categoryRows = categories.length
      ? '<div class="mini-list">' + categories.map(function (row) {
        return '<div class="mini-list-item">' +
          '<div style="display:flex;align-items:center;gap:9px;min-width:0">' +
            '<span class="badge badge-neutral">' + U.esc(row.category) + '</span>' +
            '<span class="meta">' + row.count + ' barang</span>' +
          '</div>' +
          '<div style="text-align:right"><div class="name mono">' + U.formatCurrency(row.value) + '</div>' +
            '<div class="meta">' + U.formatNumber(row.qty, 2) + ' qty</div></div>' +
        '</div>';
      }).join("") + '</div>'
      : App.ui.emptyState({ icon: "fa-chart-pie", title: "Belum ada kategori", text: "Tambahkan barang untuk melihat komposisi nilai persediaan." });

    const lowRows = low.length
      ? '<div class="mini-list">' + low.map(function (p) {
        const shortage = Math.max(0, (Number(p.minStock) || 0) - (Number(p.stock) || 0));
        return '<div class="mini-list-item">' +
          '<div style="display:flex;align-items:center;gap:9px;min-width:0">' +
            '<span class="badge ' + (U.isOutOfStock(p) ? "badge-danger" : "badge-warning") + '">' + (U.isOutOfStock(p) ? "HABIS" : "MENIPIS") + '</span>' +
            '<div style="min-width:0"><div class="name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">' + U.esc(p.name) + '</div>' +
              '<div class="meta">' + U.esc(p.sku || "-") + ' · min ' + U.formatNumber(p.minStock, 2) + ' ' + U.esc(p.satuan || "PCS") + '</div></div>' +
          '</div>' +
          '<div style="text-align:right"><div class="name text-danger">' + U.formatNumber(p.stock, 2) + ' ' + U.esc(p.satuan || "PCS") + '</div>' +
            '<div class="meta">kurang ' + U.formatNumber(shortage, 2) + '</div></div>' +
        '</div>';
      }).join("") + '</div>'
      : App.ui.emptyState({ icon: "fa-circle-check", title: "Stok aman", text: "Semua barang berada di atas batas minimum." });

    const batchRows = batches.length
      ? '<div class="mini-list">' + batches.map(function (b) {
        return '<div class="mini-list-item">' +
          '<div style="display:flex;align-items:center;gap:9px;min-width:0">' +
            '<span class="badge ' + b.info.badge + '">' + U.esc(b.info.label) + '</span>' +
            '<div style="min-width:0"><div class="name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:250px">' + U.esc(b.name) + '</div>' +
              '<div class="meta">' + U.esc(b.batchNo || "-") + ' · ' + U.esc(U.formatDate(b.expireDate)) + '</div></div>' +
          '</div>' +
          '<div class="name mono">' + U.formatNumber(b.qty, 2) + ' ' + U.esc(b.unit || "") + '</div>' +
        '</div>';
      }).join("") + '</div>'
      : App.ui.emptyState({ icon: "fa-hourglass-half", title: "Tidak ada batch kritis", text: "Tidak ada batch yang mendekati atau melewati tanggal expired." });

    return '<div class="page-stack">' +
      '<div class="stat-grid">' +
        '<div class="stat-card">' +
          '<div class="stat-top"><div class="stat-label">Nilai Persediaan (HPP)</div><div class="stat-icon"><i class="fa-solid fa-sack-dollar"></i></div></div>' +
          '<div class="stat-value currency">' + U.formatCurrency(stats.totalHpp) + '</div>' +
          '<div class="stat-foot">' + stats.itemCount + ' jenis barang</div>' +
        '</div>' +
        '<div class="stat-card accent-success">' +
          '<div class="stat-top"><div class="stat-label">Potensi Omset</div><div class="stat-icon success"><i class="fa-solid fa-chart-line"></i></div></div>' +
          '<div class="stat-value currency">' + U.formatCurrency(stats.totalSell) + '</div>' +
          '<div class="stat-foot">margin ' + U.formatNumber(stats.marginPercent, 1) + '%</div>' +
        '</div>' +
        '<div class="stat-card accent-warning">' +
          '<div class="stat-top"><div class="stat-label">Stok Menipis</div><div class="stat-icon warning"><i class="fa-solid fa-triangle-exclamation"></i></div></div>' +
          '<div class="stat-value">' + stats.lowStockCount + '</div>' +
          '<div class="stat-foot">' + stats.outOfStockCount + ' barang habis</div>' +
        '</div>' +
        '<div class="stat-card accent-danger">' +
          '<div class="stat-top"><div class="stat-label">Batch Kritis</div><div class="stat-icon danger"><i class="fa-solid fa-hourglass-half"></i></div></div>' +
          '<div class="stat-value">' + stats.expiringCount + '</div>' +
          '<div class="stat-foot">' + stats.expiredCount + ' expired · ' + stats.soonCount + ' segera</div>' +
        '</div>' +
      '</div>' +

      '<div class="section-grid">' +
        '<div class="card">' +
          '<div class="card-head has-border">' +
            '<div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-file-invoice-dollar"></i> Laporan Valuasi Stok</div>' +
              '<div class="card-sub">Rekapitulasi nilai persediaan berdasarkan HPP dan harga jual</div></div>' +
            '<div class="card-actions">' +
              '<button type="button" class="btn btn-sm btn-secondary" data-action="reports:export-products"><i class="fa-solid fa-file-export"></i> CSV</button>' +
              '<button type="button" class="btn btn-sm btn-primary" data-action="reports:print-valuation"><i class="fa-solid fa-print"></i> Cetak</button>' +
            '</div>' +
          '</div>' +
          '<div class="card-body pad">' +
            '<div class="metric-inline">' +
              '<div class="mi"><div class="mi-label">Total Qty</div><div class="mi-value">' + U.formatNumber(stats.totalQty, 2) + '</div></div>' +
              '<div class="mi"><div class="mi-label">Nilai HPP</div><div class="mi-value">' + U.formatCurrency(stats.totalHpp) + '</div></div>' +
              '<div class="mi"><div class="mi-label">Nilai Jual</div><div class="mi-value">' + U.formatCurrency(stats.totalSell) + '</div></div>' +
              '<div class="mi"><div class="mi-label">Potensi Margin</div><div class="mi-value text-success">' + U.formatCurrency(stats.potentialProfit) + '</div></div>' +
            '</div>' +
            '<div class="divider"></div>' +
            '<div class="fs-10 fw-700 muted" style="letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">Nilai aset per kategori</div>' +
            categoryRows +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head has-border">' +
            '<div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-triangle-exclamation"></i> Stok Menipis & Habis</div>' +
              '<div class="card-sub">Barang yang perlu segera dilakukan pengadaan ulang</div></div>' +
            '<div class="card-actions">' +
              '<button type="button" class="btn btn-sm btn-secondary" data-action="reports:export-low"><i class="fa-solid fa-file-export"></i> CSV</button>' +
              '<button type="button" class="btn btn-sm btn-primary" data-action="reports:print-low"><i class="fa-solid fa-print"></i> Cetak</button>' +
            '</div>' +
          '</div>' +
          '<div class="card-body pad">' + lowRows + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="section-grid">' +
        '<div class="card">' +
          '<div class="card-head has-border">' +
            '<div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-hourglass-half"></i> Batch Mendekati / Melewati Expired</div>' +
              '<div class="card-sub">Prioritaskan pengeluaran batch (FEFO) dalam 30 hari ke depan</div></div>' +
            '<div class="card-actions">' +
              '<button type="button" class="btn btn-sm btn-secondary" data-action="reports:export-expiring"><i class="fa-solid fa-file-export"></i> CSV</button>' +
              '<button type="button" class="btn btn-sm btn-primary" data-action="reports:print-expiring"><i class="fa-solid fa-print"></i> Cetak</button>' +
            '</div>' +
          '</div>' +
          '<div class="card-body pad">' + batchRows + '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head has-border">' +
            '<div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-database"></i> Ekspor Data & Cadangan</div>' +
              '<div class="card-sub">Unduh data mentah untuk Excel atau arsip digital</div></div>' +
          '</div>' +
          '<div class="card-body pad">' +
            '<div class="settings-stack" style="gap:10px">' +
              '<button type="button" class="quick-tile" data-action="reports:export-products"><div class="qt-icon success"><i class="fa-solid fa-boxes-stacked"></i></div><div class="qt-copy"><div class="qt-title">Master Data Barang (.csv)</div><div class="qt-sub">Seluruh field barang, harga, dan stok</div></div></button>' +
              '<button type="button" class="quick-tile" data-action="reports:export-mutations"><div class="qt-icon"><i class="fa-solid fa-right-left"></i></div><div class="qt-copy"><div class="qt-title">Riwayat Mutasi (.csv)</div><div class="qt-sub">Semua transaksi stok masuk dan keluar</div></div></button>' +
              '<button type="button" class="quick-tile" data-action="reports:export-opname-template"><div class="qt-icon warning"><i class="fa-solid fa-clipboard-list"></i></div><div class="qt-copy"><div class="qt-title">Template Opname (.csv)</div><div class="qt-sub">Lembar hitung fisik untuk lapangan</div></div></button>' +
              '<button type="button" class="quick-tile" data-action="reports:backup"><div class="qt-icon danger"><i class="fa-solid fa-shield-halved"></i></div><div class="qt-copy"><div class="qt-title">Cadangan JSON (.json)</div><div class="qt-sub">Seluruh data aplikasi untuk restore</div></div></button>' +
            '</div>' +
            '<div class="info-banner" style="margin-top:12px"><i class="fa-solid fa-circle-info"></i><div>Simpan cadangan JSON secara berkala ke folder aman. File cadangan dapat dipulihkan melalui menu Pengaturan.</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------------------------------------------------------
     Movement recap
     --------------------------------------------------------- */
  function renderMovement() {
    const list = filteredMutations();
    const summary = movementSummary(list);
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / pageSize()));
    if (state.movementPage > pages) state.movementPage = pages;
    if (state.movementPage < 1) state.movementPage = 1;
    const start = (state.movementPage - 1) * pageSize();
    const paged = list.slice(start, start + pageSize());

    const rows = paged.map(function (m) {
      const product = store.productById(m.productId);
      const baseUnit = product ? U.unitInfo(product).base : (m.txUnit || "PCS");
      const isIn = m.type === "IN";
      return '<tr>' +
        '<td><div class="cell-mono">' + U.esc(U.formatDateTime(m.date)) + '</div><div class="cell-sub mono">' + U.esc(m.id) + '</div></td>' +
        '<td><span class="badge ' + (isIn ? "badge-success" : "badge-danger") + '">' + (isIn ? "MASUK" : "KELUAR") + '</span></td>' +
        '<td><div class="cell-main">' + U.esc(m.name) + '</div><div class="cell-sub">' + U.esc(product ? product.sku || "-" : "-") + '</div></td>' +
        '<td class="qty"><span class="' + (isIn ? "text-success" : "text-danger") + ' fw-700">' + (isIn ? "+" : "−") + U.formatNumber(m.inputQty != null ? m.inputQty : m.qty, 2) + ' ' + U.esc(m.txUnit || baseUnit) + '</span>' +
          '<div class="cell-sub">' + U.formatNumber(m.qty, 2) + ' ' + U.esc(baseUnit) + ' dasar</div></td>' +
        '<td><div class="cell-mono">' + U.esc(m.batchNo || "-") + '</div><div class="cell-sub">' + U.esc(m.notes || "-") + '</div></td>' +
        '<td>' + U.esc(m.user || "-") + '</td>' +
      '</tr>';
    }).join("");

    return '<div class="page-stack">' +
      '<div class="page-toolbar">' +
        '<div class="flex items-center gap-2">' +
          '<span class="fs-10 fw-700 muted">DARI</span>' +
          '<input id="reportFrom" class="input sm" style="max-width:150px" type="date" value="' + U.escapeAttr(state.from) + '" data-change-action="reports:filter">' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
          '<span class="fs-10 fw-700 muted">S/D</span>' +
          '<input id="reportTo" class="input sm" style="max-width:150px" type="date" value="' + U.escapeAttr(state.to) + '" data-change-action="reports:filter">' +
        '</div>' +
        '<select id="reportType" class="select sm" style="max-width:150px" data-change-action="reports:filter">' +
          '<option value="">Semua tipe</option>' +
          '<option value="IN"' + (state.type === "IN" ? " selected" : "") + '>Stok masuk</option>' +
          '<option value="OUT"' + (state.type === "OUT" ? " selected" : "") + '>Stok keluar</option>' +
        '</select>' +
        '<select id="reportProduct" class="select sm" style="max-width:230px" data-change-action="reports:filter">' + productOptions(state.productId, true) + '</select>' +
        '<div class="toolbar-spacer"></div>' +
        '<div class="toolbar-group">' +
          '<button type="button" class="btn btn-sm btn-ghost" data-action="reports:reset-filter"><i class="fa-solid fa-rotate-left"></i> Reset</button>' +
          '<button type="button" class="btn btn-sm btn-secondary" data-action="reports:export-filtered"><i class="fa-solid fa-file-export"></i> Ekspor</button>' +
          '<button type="button" class="btn btn-sm btn-primary" data-action="reports:print-mutations"><i class="fa-solid fa-print"></i> Cetak Rekap</button>' +
        '</div>' +
        '<div class="toolbar-note" style="flex-basis:100%">Periode <strong>' + U.esc(periodLabel()) + '</strong> · ' + summary.count + ' transaksi</div>' +
      '</div>' +

      '<div class="stat-grid">' +
        '<div class="stat-card"><div class="stat-top"><div class="stat-label">Transaksi</div><div class="stat-icon"><i class="fa-solid fa-receipt"></i></div></div><div class="stat-value">' + summary.count + '</div><div class="stat-foot">pada periode terpilih</div></div>' +
        '<div class="stat-card accent-success"><div class="stat-top"><div class="stat-label">Total Masuk</div><div class="stat-icon success"><i class="fa-solid fa-arrow-down"></i></div></div><div class="stat-value">' + U.formatNumber(summary.totalIn, 2) + '</div><div class="stat-foot">nilai ' + U.formatCurrency(summary.valueIn) + '</div></div>' +
        '<div class="stat-card accent-danger"><div class="stat-top"><div class="stat-label">Total Keluar</div><div class="stat-icon danger"><i class="fa-solid fa-arrow-up"></i></div></div><div class="stat-value">' + U.formatNumber(summary.totalOut, 2) + '</div><div class="stat-foot">akumulasi satuan dasar</div></div>' +
        '<div class="stat-card accent-warning"><div class="stat-top"><div class="stat-label">Selisih Bersih</div><div class="stat-icon warning"><i class="fa-solid fa-scale-balanced"></i></div></div><div class="stat-value">' + (summary.net > 0 ? "+" : "") + U.formatNumber(summary.net, 2) + '</div><div class="stat-foot">masuk dikurangi keluar</div></div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head has-border">' +
          '<div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-right-left"></i> Rekapitulasi Mutasi</div>' +
            '<div class="card-sub">' + U.esc(periodLabel()) + '</div></div>' +
        '</div>' +
        (total
          ? '<div class="table-wrap"><table class="data-table">' +
              '<thead><tr><th>Waktu</th><th>Tipe</th><th>Barang</th><th class="th-right">Qty</th><th>Batch / Catatan</th><th>Petugas</th></tr></thead>' +
              '<tbody>' + rows + '</tbody>' +
            '</table></div>' +
            App.ui.pagination({ total: total, page: state.movementPage, pages: pages, pageSize: pageSize(), noun: "transaksi", prevAction: "reports:page-prev", nextAction: "reports:page-next" })
          : '<div class="empty-state">' +
              '<div class="empty-icon"><i class="fa-solid fa-filter-circle-xmark"></i></div>' +
              '<div class="empty-title">Tidak ada mutasi pada periode ini</div>' +
              '<div class="empty-text">Ubah rentang tanggal, tipe transaksi, atau pilih barang lain.</div>' +
            '</div>') +
      '</div>' +
    '</div>';
  }

  /* ---------------------------------------------------------
     Documents
     --------------------------------------------------------- */
  function opnameSummary() {
    const records = store.opname();
    return {
      count: records.length,
      positive: records.filter(function (o) { return Number(o.diffQty) > 0; }).length,
      negative: records.filter(function (o) { return Number(o.diffQty) < 0; }).length,
      total: U.sum(records, function (o) { return o.diffQty; })
    };
  }

  function ensureDocProduct() {
    if (!store.products().length) return null;
    if (!state.docProductId || !store.productById(state.docProductId)) {
      state.docProductId = store.products()[0].id;
    }
    return store.productById(state.docProductId);
  }

  function renderDocuments() {
    const op = opnameSummary();
    const product = ensureDocProduct();
    const unit = product ? U.unitInfo(product) : null;

    return '<div class="page-stack">' +
      '<div class="info-banner"><i class="fa-solid fa-circle-info"></i><div>' +
        'Dokumen resmi dicetak sesuai profil perusahaan pada menu Pengaturan. Gunakan tombol cetak lalu pilih printer atau Simpan sebagai PDF.' +
      '</div></div>' +

      '<div class="settings-grid">' +
        '<div class="card">' +
          '<div class="card-head has-border"><div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-truck-fast"></i> Surat Jalan / Serah Terima</div>' +
            '<div class="card-sub">Dokumen pengiriman barang dengan kolom tanda tangan</div></div></div>' +
          '<div class="card-body pad">' +
            '<p class="muted fs-11" style="line-height:1.6">Pilih barang dan jumlah yang dikirim, lengkapi tujuan serta kurir, lalu cetak dokumen A4 siap tanda tangan.</p>' +
            '<div class="metric-inline" style="margin-top:14px">' +
              '<div class="mi"><div class="mi-label">Barang tersedia</div><div class="mi-value">' + store.products().length + '</div></div>' +
              '<div class="mi"><div class="mi-label">Tujuan</div><div class="mi-value">Manual</div></div>' +
            '</div>' +
            '<button type="button" class="btn btn-primary" style="margin-top:16px" data-action="reports:surat-jalan"><i class="fa-solid fa-file-circle-plus"></i> Buat Surat Jalan</button>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head has-border"><div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-clipboard-check"></i> Lembar Hitung Opname</div>' +
            '<div class="card-sub">Formulir hitung fisik untuk petugas lapangan</div></div></div>' +
          '<div class="card-body pad">' +
            '<p class="muted fs-11" style="line-height:1.6">Cetak lembar kerja berisi seluruh barang, stok sistem, dan kolom hitung fisik. Sertakan kolom catatan lapangan.</p>' +
            '<div class="metric-inline" style="margin-top:14px">' +
              '<div class="mi"><div class="mi-label">Jumlah item</div><div class="mi-value">' + store.products().length + '</div></div>' +
              '<div class="mi"><div class="mi-label">Riwayat audit</div><div class="mi-value">' + op.count + '</div></div>' +
            '</div>' +
            '<div class="btn-group" style="margin-top:16px">' +
              '<button type="button" class="btn btn-primary" data-action="reports:opname-sheet"><i class="fa-solid fa-print"></i> Cetak Lembar</button>' +
              '<button type="button" class="btn btn-secondary" data-action="reports:export-opname-template"><i class="fa-solid fa-file-export"></i> Template CSV</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head has-border"><div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Riwayat Audit Opname</div>' +
            '<div class="card-sub">Laporan penyesuaian stok hasil hitung fisik</div></div></div>' +
          '<div class="card-body pad">' +
            '<div class="metric-inline">' +
              '<div class="mi"><div class="mi-label">Catatan</div><div class="mi-value">' + op.count + '</div></div>' +
              '<div class="mi"><div class="mi-label">Selisih +</div><div class="mi-value text-success">' + op.positive + '</div></div>' +
              '<div class="mi"><div class="mi-label">Selisih −</div><div class="mi-value text-danger">' + op.negative + '</div></div>' +
              '<div class="mi"><div class="mi-label">Total Qty</div><div class="mi-value">' + (op.total > 0 ? "+" : "") + U.formatNumber(op.total, 2) + '</div></div>' +
            '</div>' +
            '<div class="btn-group" style="margin-top:16px">' +
              '<button type="button" class="btn btn-primary" data-action="reports:opname-history"><i class="fa-solid fa-print"></i> Cetak Riwayat</button>' +
              '<button type="button" class="btn btn-secondary" data-action="reports:export-opname-history"><i class="fa-solid fa-file-export"></i> Ekspor CSV</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head has-border"><div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-book"></i> Kartu Stok Barang</div>' +
            '<div class="card-sub">Cetak ledger mutasi per barang</div></div></div>' +
          '<div class="card-body pad">' +
            (product
              ? '<div class="field"><label class="field-label" for="reportDocProduct">Pilih barang</label>' +
                  '<select id="reportDocProduct" class="select" data-change-action="reports:doc-product">' + productOptions(state.docProductId, false) + '</select>' +
                  '<div class="field-hint">Stok sistem ' + U.formatNumber(product.stock, 2) + ' ' + U.esc(unit ? unit.base : "PCS") + ' · ' + product.name + '</div>' +
                '</div>' +
                '<div class="btn-group" style="margin-top:14px">' +
                  '<button type="button" class="btn btn-primary" data-action="reports:doc-ledger-print"><i class="fa-solid fa-print"></i> Cetak Kartu</button>' +
                  '<button type="button" class="btn btn-secondary" data-action="reports:doc-ledger-export"><i class="fa-solid fa-file-export"></i> Ekspor CSV</button>' +
                '</div>'
              : App.ui.emptyState({ icon: "fa-box-open", title: "Belum ada barang", text: "Tambahkan barang untuk mencetak kartu stok." })) +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------------------------------------------------------
     Surat jalan builder
     --------------------------------------------------------- */
  function sjRowHtml() {
    return '<div class="sj-row" data-sj-row style="display:grid;grid-template-columns:minmax(0,1fr) 105px 150px 34px;gap:8px;align-items:end;margin-bottom:8px">' +
      '<div class="field sj-col-product"><select name="productId" class="select">' + productOptions("", false) + '</select></div>' +
      '<div class="field sj-col-qty"><input name="qty" class="input mono" type="number" min="0.01" step="any" placeholder="Qty" value="1"></div>' +
      '<div class="field sj-col-notes"><input name="notes" class="input uppercase-input" value="PENGIRIMAN BARANG" placeholder="Keterangan"></div>' +
      '<button type="button" class="btn btn-icon btn-sm btn-soft-danger sj-col-action" data-action="reports:sj-remove-row" title="Hapus baris"><i class="fa-solid fa-trash"></i></button>' +
    '</div>';
  }

  function openSuratJalan() {
    if (!store.products().length) {
      App.ui.toast("Belum ada barang untuk dikirim.", "warning", "Data barang kosong");
      return;
    }
    const today = U.todayISO();
    const body =
      '<form id="sjForm" data-form-action="reports:sj-print" autocomplete="off">' +
        '<div class="form-grid">' +
          '<div class="field span-2"><label class="field-label" for="sjRecipient">Penerima / Tujuan</label>' +
            '<input id="sjRecipient" name="recipient" class="input uppercase-input" placeholder="Nama penerima / toko tujuan"></div>' +
          '<div class="field span-2"><label class="field-label" for="sjAddress">Alamat Tujuan</label>' +
            '<input id="sjAddress" name="address" class="input uppercase-input" placeholder="Alamat lengkap pengiriman"></div>' +
          '<div class="field"><label class="field-label" for="sjDriver">Kendaraan / Kurir</label>' +
            '<input id="sjDriver" name="driver" class="input uppercase-input" placeholder="Nama kurir atau nomor kendaraan"></div>' +
          '<div class="field"><label class="field-label" for="sjDate">Tanggal Kirim</label>' +
            '<input id="sjDate" name="date" class="input" type="date" value="' + today + '"></div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div class="flex items-center justify-between gap-2" style="margin-bottom:8px">' +
          '<div class="fs-11 fw-700">Daftar Barang Dikirim</div>' +
          '<button type="button" class="btn btn-sm btn-secondary" data-action="reports:sj-add-row"><i class="fa-solid fa-plus"></i> Tambah Baris</button>' +
        '</div>' +
        '<div class="sj-head" style="display:grid;grid-template-columns:minmax(0,1fr) 105px 150px 34px;gap:8px;margin-bottom:5px">' +
          '<span class="fs-10 fw-700 muted">BARANG</span><span class="fs-10 fw-700 muted">QTY</span>' +
          '<span class="fs-10 fw-700 muted">KETERANGAN</span><span></span>' +
        '</div>' +
        '<div id="sjItems">' + sjRowHtml() + '</div>' +
      '</form>';

    App.ui.openModal({
      title: "Buat Surat Jalan",
      subtitle: "Lengkapi tujuan dan daftar barang yang dikirim",
      size: "lg",
      body: body,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Batal</button>' +
        '<button type="submit" form="sjForm" class="btn btn-primary"><i class="fa-solid fa-print"></i> Cetak Surat Jalan</button>'
    });
  }

  /* ---------------------------------------------------------
     Tab renderer
     --------------------------------------------------------- */
  function render() {
    return '<div class="page-stack">' +
      '<div class="tabs">' +
        tabButton("inventory", "Persediaan", "fa-boxes-stacked") +
        tabButton("movement", "Mutasi", "fa-right-left") +
        tabButton("documents", "Dokumen", "fa-file-lines") +
      '</div>' +
      (state.tab === "movement" ? renderMovement() : (state.tab === "documents" ? renderDocuments() : renderInventory())) +
    '</div>';
  }

  /* ---------------------------------------------------------
     Actions
     --------------------------------------------------------- */
  App.actions["reports:tab"] = function (el) {
    const tab = el.getAttribute("data-tab");
    if (tab && tab !== state.tab) {
      state.tab = tab;
      App.router.refreshHard();
    }
  };

  App.changeActions["reports:filter"] = function () {
    const fromEl = U.$("#reportFrom");
    const toEl = U.$("#reportTo");
    const typeEl = U.$("#reportType");
    const productEl = U.$("#reportProduct");
    if (fromEl) state.from = fromEl.value;
    if (toEl) state.to = toEl.value;
    if (typeEl) state.type = typeEl.value;
    if (productEl) state.productId = productEl.value;
    if (state.from && state.to && state.from > state.to) {
      App.ui.toast("Tanggal awal tidak boleh melebihi tanggal akhir.", "error", "Periode tidak valid");
      state.from = state.to;
    }
    state.movementPage = 1;
    App.router.refresh();
  };

  App.actions["reports:reset-filter"] = function () {
    state.from = firstOfMonth();
    state.to = U.todayISO();
    state.type = "";
    state.productId = "";
    state.movementPage = 1;
    App.router.refreshHard();
  };

  App.actions["reports:page-prev"] = function () {
    if (state.movementPage <= 1) return;
    state.movementPage -= 1;
    App.router.refresh();
  };

  App.actions["reports:page-next"] = function () {
    const pages = Math.max(1, Math.ceil(filteredMutations().length / pageSize()));
    if (state.movementPage >= pages) return;
    state.movementPage += 1;
    App.router.refresh();
  };

  App.actions["reports:print-valuation"] = function () {
    App.print.valuation(store.products());
  };

  App.actions["reports:print-low"] = function () {
    App.print.lowStock(store.lowStock());
  };

  App.actions["reports:print-expiring"] = function () {
    App.print.expiring(store.expiringBatches(30), { limit: "30 hari" });
  };

  App.actions["reports:export-products"] = function () {
    const count = App.exports.productsCSV(store.products());
    App.ui.toast(count + " barang diekspor ke CSV.", "success", "Ekspor selesai");
  };

  App.actions["reports:export-mutations"] = function () {
    const list = store.mutationChronological().slice().reverse();
    if (!list.length) {
      App.ui.toast("Belum ada mutasi untuk diekspor.", "warning", "Ekspor kosong");
      return;
    }
    App.exports.mutationsCSV(list);
    App.ui.toast(list.length + " transaksi diekspor ke CSV.", "success", "Ekspor selesai");
  };

  App.actions["reports:export-low"] = function () {
    const list = store.lowStock();
    if (!list.length) {
      App.ui.toast("Tidak ada barang menipis untuk diekspor.", "info", "Ekspor kosong");
      return;
    }
    App.exports.lowStockCSV(list);
    App.ui.toast(list.length + " barang diekspor ke CSV.", "success", "Ekspor selesai");
  };

  App.actions["reports:export-expiring"] = function () {
    const list = store.expiringBatches(30);
    if (!list.length) {
      App.ui.toast("Tidak ada batch kritis untuk diekspor.", "info", "Ekspor kosong");
      return;
    }
    App.exports.expiringCSV(list);
    App.ui.toast(list.length + " batch diekspor ke CSV.", "success", "Ekspor selesai");
  };

  App.actions["reports:export-opname-template"] = function () {
    if (!store.products().length) {
      App.ui.toast("Belum ada barang untuk dibuatkan template.", "warning", "Data kosong");
      return;
    }
    App.exports.opnameTemplateCSV(store.products());
    App.ui.toast("Template opname berhasil diekspor.", "success", "Ekspor selesai");
  };

  App.actions["reports:backup"] = function () {
    App.exports.backupJSON(store.get());
    App.ui.toast("File cadangan JSON berhasil diunduh.", "success", "Cadangan dibuat");
  };

  App.actions["reports:print-mutations"] = function () {
    const list = filteredMutations();
    if (!list.length) {
      App.ui.toast("Tidak ada mutasi untuk dicetak pada periode ini.", "warning", "Data kosong");
      return;
    }
    App.print.mutations(list, { subtitle: "Periode " + periodLabel() });
  };

  App.actions["reports:export-filtered"] = function () {
    const list = filteredMutations();
    if (!list.length) {
      App.ui.toast("Tidak ada mutasi untuk diekspor pada periode ini.", "warning", "Ekspor kosong");
      return;
    }
    App.exports.mutationsCSV(list, "REKAP-MUTASI");
    App.ui.toast(list.length + " transaksi diekspor ke CSV.", "success", "Ekspor selesai");
  };

  App.actions["reports:opname-sheet"] = function () {
    if (!store.products().length) {
      App.ui.toast("Belum ada barang untuk dicetak.", "warning", "Data kosong");
      return;
    }
    App.print.opnameSheet(store.products(), {
      officer: store.user() ? store.user().name : "",
      warehouse: "SEMUA LOKASI"
    });
  };

  App.actions["reports:opname-history"] = function () {
    const records = store.opname();
    if (!records.length) {
      App.ui.toast("Belum ada riwayat opname untuk dicetak.", "warning", "Data kosong");
      return;
    }
    App.print.opnameHistory(records.slice().reverse(), { period: "SEMUA PERIODE" });
  };

  App.actions["reports:export-opname-history"] = function () {
    const records = store.opname();
    if (!records.length) {
      App.ui.toast("Belum ada riwayat opname untuk diekspor.", "warning", "Ekspor kosong");
      return;
    }
    const rows = [
      ["TANGGAL", "NAMA BARANG", "STOK SISTEM", "STOK FISIK", "SELISIH", "ALASAN", "PETUGAS"]
    ];
    records.slice().reverse().forEach(function (o) {
      rows.push([o.date, o.name, o.systemQty, o.actualQty, o.diffQty, o.reason, o.user]);
    });
    U.download("RIWAYAT-OPNAME-" + U.todayISO().replace(/-/g, "") + ".csv", U.toCSV(rows), "text/csv;charset=utf-8");
    App.ui.toast(records.length + " catatan opname diekspor.", "success", "Ekspor selesai");
  };

  App.changeActions["reports:doc-product"] = function () {
    const el = U.$("#reportDocProduct");
    if (el) state.docProductId = el.value;
    App.router.refresh();
  };

  function docLedgerData() {
    const product = ensureDocProduct();
    if (!product) return null;
    return { product: product, ledger: store.ledgerForProduct(product.id, "", "") };
  }

  App.actions["reports:doc-ledger-print"] = function () {
    const data = docLedgerData();
    if (!data) return;
    App.print.ledger(data.product, data.ledger);
  };

  App.actions["reports:doc-ledger-export"] = function () {
    const data = docLedgerData();
    if (!data) return;
    if (!data.ledger.entries.length) {
      App.ui.toast("Belum ada mutasi untuk barang ini.", "warning", "Data kosong");
      return;
    }
    App.exports.ledgerCSV(data.product, data.ledger.entries, data.ledger.opening, "", "");
    App.ui.toast(data.ledger.entries.length + " baris kartu stok diekspor.", "success", "Ekspor selesai");
  };

  App.actions["reports:surat-jalan"] = openSuratJalan;

  App.actions["reports:sj-add-row"] = function () {
    const host = U.$("#sjItems");
    if (!host) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = sjRowHtml();
    host.appendChild(wrap.firstChild);
    const rows = host.querySelectorAll("[data-sj-row]");
    const last = rows[rows.length - 1];
    if (last) {
      const select = last.querySelector('select[name="productId"]');
      if (select) select.focus();
    }
  };

  App.actions["reports:sj-remove-row"] = function (el) {
    const row = el.closest("[data-sj-row]");
    const host = U.$("#sjItems");
    if (!row || !host) return;
    if (host.querySelectorAll("[data-sj-row]").length <= 1) {
      App.ui.toast("Minimal satu barang harus diisi.", "info", "Baris tidak dapat dihapus");
      return;
    }
    row.parentNode.removeChild(row);
  };

  App.formActions["reports:sj-print"] = function (form) {
    const get = function (name) { return form.querySelector('[name="' + name + '"]'); };
    const rows = Array.prototype.slice.call(form.querySelectorAll("[data-sj-row]"));
    const items = [];
    rows.forEach(function (row) {
      const productId = (row.querySelector('[name="productId"]') || {}).value || "";
      const qty = U.parseNumber((row.querySelector('[name="qty"]') || {}).value);
      const notes = U.upper((row.querySelector('[name="notes"]') || {}).value) || "PENGIRIMAN BARANG";
      const product = store.productById(productId);
      if (product && qty > 0) {
        items.push({
          product: product,
          qty: qty,
          unit: product.satuan || "PCS",
          notes: notes
        });
      }
    });
    if (!items.length) {
      App.ui.toast("Isi minimal satu barang dengan jumlah lebih dari nol.", "error", "Data belum lengkap");
      return;
    }
    const date = (get("date") || {}).value || U.todayISO();
    const meta = {
      number: "SJ/" + date.replace(/-/g, "") + "-" + String(Date.now()).slice(-4),
      date: date,
      recipient: U.upper((get("recipient") || {}).value),
      recipientAddress: U.upper((get("address") || {}).value),
      driver: U.upper((get("driver") || {}).value)
    };
    App.ui.closeModal();
    App.print.suratJalan(items, meta);
  };

  App.router.register({
    id: "reports",
    label: "Laporan & Dokumen",
    subtitle: "Valuasi, rekap mutasi, dan dokumen resmi gudang",
    group: "Laporan",
    icon: "fa-file-lines",
    render: render
  });

  App.modules.reports = {
    render: render,
    state: state,
    openSuratJalan: openSuratJalan
  };
})(window.App);
