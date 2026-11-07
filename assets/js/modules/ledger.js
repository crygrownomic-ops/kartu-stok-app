/* =========================================================
   Kartu Stok — Kartu Stok / Ledger Module
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const store = App.store;

  const state = {
    productId: "",
    from: "",
    to: "",
    page: 1
  };

  function pageSize() { return App.config.pageSize; }

  function ensureProduct() {
    const products = store.products();
    if (!products.length) return null;
    if (!state.productId || !store.productById(state.productId)) {
      state.productId = products[0].id;
    }
    return store.productById(state.productId);
  }

  function ledgerFor(product) {
    return store.ledgerForProduct(product.id, state.from, state.to);
  }

  function productOptions(selectedId) {
    return store.products().map(function (p) {
      return '<option value="' + U.escapeAttr(p.id) + '"' + (String(p.id) === String(selectedId) ? " selected" : "") + '>' +
        U.esc(p.sku || "-") + ' — ' + U.esc(p.name) +
      '</option>';
    }).join("");
  }

  function renderProductCard(product) {
    const unit = U.unitInfo(product);
    return '<div class="card"><div class="card-body pad">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">' +
        '<div style="min-width:0">' +
          '<div class="flex items-center gap-2" style="flex-wrap:wrap">' +
            '<span class="badge badge-primary mono">' + U.esc(product.sku || "-") + '</span>' +
            '<span class="badge badge-neutral">' + U.esc(product.category || "LAINNYA") + '</span>' +
            (product.warehouse ? '<span class="badge badge-neutral"><i class="fa-solid fa-location-dot"></i> ' + U.esc(product.warehouse) + '</span>' : "") +
          '</div>' +
          '<h3 style="margin-top:9px;font-size:16px">' + U.esc(product.name) + '</h3>' +
          '<div class="muted fs-11" style="margin-top:3px">Satuan dasar <strong>' + U.esc(unit.base) + '</strong>' +
            (unit.hasBig ? ' · 1 ' + U.esc(unit.big) + ' = ' + unit.ratio + ' ' + U.esc(unit.base) : "") +
          '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div class="muted fs-10" style="font-weight:700;letter-spacing:.08em;text-transform:uppercase">Stok sistem</div>' +
          '<div class="mono fw-700" style="font-size:23px;margin-top:2px">' + U.formatNumber(product.stock, 2) + ' <span class="fs-11 muted">' + U.esc(unit.base) + '</span></div>' +
          '<div class="muted fs-10" style="margin-top:2px">HPP ' + U.formatCurrency(product.avgHpp) + '</div>' +
        '</div>' +
      '</div>' +
    '</div></div>';
  }

  function renderToolbar() {
    return '<div class="page-toolbar">' +
      '<div class="toolbar-group" style="flex:1 1 300px">' +
        '<select id="ledgerProduct" class="select" style="min-width:250px;max-width:380px" data-change-action="ledger:filter" aria-label="Pilih barang">' +
          productOptions(state.productId) +
        '</select>' +
      '</div>' +
      '<div class="toolbar-group">' +
        '<div class="flex items-center gap-2">' +
          '<span class="fs-10 fw-700 muted">DARI</span>' +
          '<input id="ledgerFrom" class="input sm" style="max-width:150px" type="date" value="' + U.escapeAttr(state.from) + '" data-change-action="ledger:filter" aria-label="Tanggal awal">' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
          '<span class="fs-10 fw-700 muted">S/D</span>' +
          '<input id="ledgerTo" class="input sm" style="max-width:150px" type="date" value="' + U.escapeAttr(state.to) + '" data-change-action="ledger:filter" aria-label="Tanggal akhir">' +
        '</div>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-action="ledger:reset"><i class="fa-solid fa-rotate-left"></i> Reset</button>' +
      '</div>' +
      '<div class="toolbar-spacer"></div>' +
      '<div class="toolbar-group">' +
        '<button type="button" class="btn btn-sm btn-secondary" data-action="ledger:export"><i class="fa-solid fa-file-export"></i> Ekspor</button>' +
        '<button type="button" class="btn btn-sm btn-primary" data-action="ledger:print"><i class="fa-solid fa-print"></i> Cetak Kartu Stok</button>' +
      '</div>' +
      '<div class="toolbar-note" style="flex-basis:100%">Pilih periode untuk melihat saldo awal, mutasi, dan saldo akhir. Kosongkan tanggal untuk menampilkan seluruh riwayat.</div>' +
    '</div>';
  }

  function renderSummary(data, unit) {
    return '<div class="stat-grid">' +
      '<div class="stat-card">' +
        '<div class="stat-top"><div class="stat-label">Saldo Awal</div><div class="stat-icon"><i class="fa-solid fa-flag"></i></div></div>' +
        '<div class="stat-value">' + U.formatNumber(data.opening, 2) + '</div>' +
        '<div class="stat-foot">' + U.esc(unit.base) + ' sebelum periode</div>' +
      '</div>' +
      '<div class="stat-card accent-success">' +
        '<div class="stat-top"><div class="stat-label">Total Masuk</div><div class="stat-icon success"><i class="fa-solid fa-arrow-down"></i></div></div>' +
        '<div class="stat-value">' + U.formatNumber(data.totalIn, 2) + '</div>' +
        '<div class="stat-foot">' + U.esc(unit.base) + ' dalam periode</div>' +
      '</div>' +
      '<div class="stat-card accent-danger">' +
        '<div class="stat-top"><div class="stat-label">Total Keluar</div><div class="stat-icon danger"><i class="fa-solid fa-arrow-up"></i></div></div>' +
        '<div class="stat-value">' + U.formatNumber(data.totalOut, 2) + '</div>' +
        '<div class="stat-foot">' + U.esc(unit.base) + ' dalam periode</div>' +
      '</div>' +
      '<div class="stat-card ' + (data.mismatch ? "accent-warning" : "accent-success") + '">' +
        '<div class="stat-top"><div class="stat-label">Saldo Akhir</div><div class="stat-icon ' + (data.mismatch ? "warning" : "success") + '"><i class="fa-solid fa-scale-balanced"></i></div></div>' +
        '<div class="stat-value">' + U.formatNumber(data.closing, 2) + '</div>' +
        '<div class="stat-foot">' + (data.mismatch ? "berbeda dengan stok sistem" : "sesuai stok sistem") + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderReconcile(data, unit) {
    if (!data.mismatch) {
      return '<div class="info-banner success"><i class="fa-solid fa-circle-check"></i><div>' +
        'Saldo kartu stok <strong>sesuai</strong> dengan stok sistem (' + U.formatNumber(data.systemStock, 2) + ' ' + U.esc(unit.base) + ').' +
      '</div></div>';
    }
    const diff = data.closing - data.systemStock;
    return '<div class="info-banner warning"><i class="fa-solid fa-triangle-exclamation"></i><div>' +
      'Terdapat selisih antara saldo kartu stok dan stok sistem sebesar <strong>' +
      (diff > 0 ? "+" : "") + U.formatNumber(diff, 2) + ' ' + U.esc(unit.base) + '</strong>. ' +
      'Gunakan stok opname untuk menyelaraskan data.' +
      ' <button type="button" class="btn btn-sm btn-soft-warning" style="margin-left:8px" data-action="dashboard:go" data-route="opname">Buka Opname</button>' +
    '</div></div>';
  }

  function renderTable(data, unit) {
    const total = data.entries.length;
    const pages = Math.max(1, Math.ceil(total / pageSize()));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;
    const start = (state.page - 1) * pageSize();
    const chronological = data.entries.slice().reverse();
    const paged = chronological.slice(start, start + pageSize());

    if (!total) {
      return '<div class="card"><div class="empty-state">' +
        '<div class="empty-icon"><i class="fa-solid fa-book-open"></i></div>' +
        '<div class="empty-title">Belum ada mutasi pada periode ini</div>' +
        '<div class="empty-text">Ubah rentang tanggal atau catat transaksi stok masuk/keluar untuk mengisi kartu stok.</div>' +
        '<div class="empty-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm" data-action="ledger:reset">Semua periode</button>' +
          '<button type="button" class="btn btn-primary btn-sm admin-only" data-action="transactions:open" data-type="IN"><i class="fa-solid fa-plus"></i> Stok Masuk</button>' +
        '</div>' +
      '</div></div>';
    }

    const rows = paged.map(function (entry) {
      const m = entry.mutation;
      const isIn = m.type === "IN";
      const exp = U.expiryInfo(m.expireDate);
      return '<tr>' +
        '<td><div class="cell-mono">' + U.esc(U.formatDateTime(m.date)) + '</div><div class="cell-sub mono">' + U.esc(m.id) + '</div></td>' +
        '<td><div class="cell-main">' + U.esc(m.notes || "-") + '</div><div class="cell-sub">' + U.esc(m.user || "SYSTEM") + ' · ' + U.esc(m.txUnit || unit.base) + '</div></td>' +
        '<td><div class="cell-mono">' + U.esc(m.batchNo || "-") + '</div>' +
          (m.expireDate && m.expireDate !== "-" ? '<div class="cell-sub"><span class="badge ' + exp.badge + '">' + U.esc(exp.label) + '</span></div>' : "") +
        '</td>' +
        '<td class="qty">' + (isIn ? '<span class="text-success fw-700">+' + U.formatNumber(m.qty, 2) + '</span> <span class="fs-10 muted">' + U.esc(unit.base) + '</span>' : '<span class="muted">-</span>') + '</td>' +
        '<td class="qty">' + (!isIn ? '<span class="text-danger fw-700">−' + U.formatNumber(m.qty, 2) + '</span> <span class="fs-10 muted">' + U.esc(unit.base) + '</span>' : '<span class="muted">-</span>') + '</td>' +
        '<td class="qty"><span class="cell-strong">' + U.formatNumber(entry.balanceAfter, 2) + '</span> <span class="fs-10 muted">' + U.esc(unit.base) + '</span></td>' +
      '</tr>';
    }).join("");

    return '<div class="card">' +
      '<div class="card-head has-border">' +
        '<div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-list-check"></i> Rincian Mutasi</div>' +
          '<div class="card-sub">' + total + ' transaksi pada periode terpilih</div></div>' +
      '</div>' +
      '<div class="table-wrap"><table class="data-table">' +
        '<thead><tr>' +
          '<th>Waktu</th><th>Keterangan</th><th>Batch / Expired</th>' +
          '<th class="th-right">Masuk</th><th class="th-right">Keluar</th><th class="th-right">Saldo</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>' +
      App.ui.pagination({
        total: total,
        page: state.page,
        pages: pages,
        pageSize: pageSize(),
        noun: "mutasi",
        prevAction: "ledger:page-prev",
        nextAction: "ledger:page-next"
      }) +
    '</div>';
  }

  function render() {
    if (!store.products().length) {
      return '<div class="page-stack">' +
        '<div class="card"><div class="empty-state">' +
          '<div class="empty-icon"><i class="fa-solid fa-book"></i></div>' +
          '<div class="empty-title">Kartu stok belum tersedia</div>' +
          '<div class="empty-text">Tambahkan barang pada master data terlebih dahulu untuk melihat kartu stok.</div>' +
          '<div class="empty-actions"><button type="button" class="btn btn-primary btn-sm admin-only" data-action="products:new"><i class="fa-solid fa-plus"></i> Tambah Barang</button></div>' +
        '</div></div>' +
      '</div>';
    }

    const product = ensureProduct();
    const data = ledgerFor(product);
    const unit = U.unitInfo(product);

    return '<div class="page-stack">' +
      renderToolbar() +
      renderProductCard(product) +
      renderSummary(data, unit) +
      renderReconcile(data, unit) +
      renderTable(data, unit) +
    '</div>';
  }

  function readFilters() {
    const productEl = U.$("#ledgerProduct");
    const fromEl = U.$("#ledgerFrom");
    const toEl = U.$("#ledgerTo");
    if (productEl) state.productId = productEl.value;
    if (fromEl) state.from = fromEl.value;
    if (toEl) state.to = toEl.value;
    if (state.from && state.to && state.from > state.to) {
      App.ui.toast("Tanggal awal tidak boleh melebihi tanggal akhir.", "error", "Periode tidak valid");
      state.from = state.to;
    }
    state.page = 1;
  }

  function printCurrent() {
    const product = ensureProduct();
    if (!product) return;
    const data = ledgerFor(product);
    if (!data.entries.length) {
      App.ui.toast("Tidak ada mutasi untuk dicetak pada periode ini.", "warning", "Data kosong");
      return;
    }
    App.print.ledger(product, data);
  }

  function exportCurrent() {
    const product = ensureProduct();
    if (!product) return;
    const data = ledgerFor(product);
    if (!data.entries.length) {
      App.ui.toast("Tidak ada mutasi untuk diekspor pada periode ini.", "warning", "Data kosong");
      return;
    }
    App.exports.ledgerCSV(product, data.entries, data.opening, state.from, state.to);
    App.ui.toast(data.entries.length + " baris kartu stok diekspor.", "success", "Ekspor selesai");
  }

  App.changeActions["ledger:filter"] = function () {
    readFilters();
    App.router.refreshHard();
  };

  App.actions["ledger:reset"] = function () {
    state.from = "";
    state.to = "";
    state.page = 1;
    App.router.refreshHard();
  };

  App.actions["ledger:print"] = printCurrent;
  App.actions["ledger:export"] = exportCurrent;

  App.actions["ledger:page-prev"] = function () {
    if (state.page <= 1) return;
    state.page -= 1;
    App.router.refresh();
  };

  App.actions["ledger:page-next"] = function () {
    const product = ensureProduct();
    if (!product) return;
    const total = ledgerFor(product).entries.length;
    const pages = Math.max(1, Math.ceil(total / pageSize()));
    if (state.page >= pages) return;
    state.page += 1;
    App.router.refresh();
  };

  App.router.register({
    id: "ledger",
    label: "Kartu Stok",
    subtitle: "Ledger mutasi per barang dengan saldo berjalan",
    group: "Laporan",
    icon: "fa-book",
    render: render
  });

  App.modules.ledger = {
    render: render,
    state: state,
    printCurrent: printCurrent,
    exportCurrent: exportCurrent
  };
})(window.App);
