/* =========================================================
   Kartu Stok — Stok Opname Massal
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const store = App.store;
  const DRAFT_KEY = App.config.storageKeys.opnameDraft;

  const state = {
    search: "",
    category: "",
    warehouse: "",
    onlyDiff: false,
    page: 1,
    auditPage: 1
  };

  let drafts = loadDrafts();

  function loadDrafts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function persistDrafts() {
    try {
      if (Object.keys(drafts).length) localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
      else localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.warn("Gagal menyimpan draft opname:", error);
    }
  }

  function actualFor(product) {
    const draft = drafts[product.id];
    return draft && draft.actualQty != null ? Number(draft.actualQty) : Number(product.stock) || 0;
  }

  function reasonFor(product) {
    const draft = drafts[product.id];
    return draft && draft.reason ? draft.reason : "";
  }

  function diffFor(product) {
    return actualFor(product) - (Number(product.stock) || 0);
  }

  function diffSummary() {
    let count = 0;
    let total = 0;
    let positive = 0;
    let negative = 0;
    store.products().forEach(function (p) {
      const diff = diffFor(p);
      if (Math.abs(diff) > 0.0001) {
        count += 1;
        total += diff;
        if (diff > 0) positive += 1;
        else negative += 1;
      }
    });
    return { count: count, total: total, positive: positive, negative: negative };
  }

  function filteredProducts() {
    const search = U.upper(state.search);
    const category = U.upper(state.category);
    const warehouse = U.upper(state.warehouse);
    return store.products().filter(function (p) {
      if (search) {
        const haystack = [p.name, p.sku, p.barcode, p.warehouse].join(" ");
        if (!U.includesText(haystack, search)) return false;
      }
      if (category && U.upper(p.category) !== category) return false;
      if (warehouse && U.upper(p.warehouse) !== warehouse) return false;
      if (state.onlyDiff && Math.abs(diffFor(p)) < 0.0001) return false;
      return true;
    });
  }

  function categoryOptions() {
    return '<option value="">Semua kategori</option>' + store.categories().map(function (c) {
      return '<option value="' + U.escapeAttr(c) + '"' + (U.upper(state.category) === U.upper(c) ? " selected" : "") + '>' + U.esc(c) + '</option>';
    }).join("");
  }

  function warehouseOptions() {
    const list = Array.from(new Set(store.products().map(function (p) { return U.upper(p.warehouse); }).filter(Boolean))).sort();
    return '<option value="">Semua lokasi</option>' + list.map(function (w) {
      return '<option value="' + U.escapeAttr(w) + '"' + (U.upper(state.warehouse) === U.upper(w) ? " selected" : "") + '>' + U.esc(w) + '</option>';
    }).join("");
  }

  function renderToolbar() {
    const summary = diffSummary();
    return '<div class="page-toolbar">' +
      '<div class="toolbar-search">' +
        '<i class="fa-solid fa-magnifying-glass"></i>' +
        '<input id="opnameSearch" class="input" type="search" value="' + U.escapeAttr(state.search) + '" placeholder="Cari barang, SKU, atau rak..." data-input-action="opname:search" autocomplete="off">' +
      '</div>' +
      '<div class="toolbar-group">' +
        '<select id="opnameCategory" class="select" style="max-width:175px" data-change-action="opname:filter">' + categoryOptions() + '</select>' +
        '<select id="opnameWarehouse" class="select" style="max-width:165px" data-change-action="opname:filter">' + warehouseOptions() + '</select>' +
        '<label class="checkbox" style="white-space:nowrap"><input type="checkbox" id="opnameOnlyDiff" ' + (state.onlyDiff ? "checked" : "") + ' data-change-action="opname:filter"> Hanya selisih</label>' +
      '</div>' +
      '<div class="toolbar-spacer"></div>' +
      '<div class="toolbar-group">' +
        '<button type="button" class="btn btn-sm btn-secondary" data-action="opname:print-sheet"><i class="fa-solid fa-print"></i> Lembar Hitung</button>' +
        '<button type="button" class="btn btn-sm btn-secondary" data-action="opname:export"><i class="fa-solid fa-file-export"></i> Template</button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-action="opname:reset-draft"><i class="fa-solid fa-eraser"></i> Reset</button>' +
        '<button type="button" class="btn btn-sm btn-primary admin-only" data-action="opname:save"><i class="fa-solid fa-check-double"></i> Simpan Penyesuaian (' + summary.count + ')</button>' +
      '</div>' +
    '</div>';
  }

  function renderSummary() {
    const summary = diffSummary();
    const totalProducts = store.products().length;
    return '<div class="card"><div class="card-body pad">' +
      '<div class="metric-inline">' +
        '<div class="mi"><div class="mi-label">Barang Diopname</div><div class="mi-value">' + totalProducts + '</div></div>' +
        '<div class="mi"><div class="mi-label">Item Berselisih</div><div class="mi-value ' + (summary.count ? "text-warning" : "text-success") + '">' + summary.count + '</div></div>' +
        '<div class="mi"><div class="mi-label">Selisih Positif</div><div class="mi-value text-success">' + summary.positive + '</div></div>' +
        '<div class="mi"><div class="mi-label">Selisih Negatif</div><div class="mi-value text-danger">' + summary.negative + '</div></div>' +
        '<div class="mi"><div class="mi-label">Total Selisih Qty</div><div class="mi-value">' + (summary.total > 0 ? "+" : "") + U.formatNumber(summary.total, 2) + '</div></div>' +
      '</div>' +
      (summary.count
        ? '<div class="info-banner warning" style="margin-top:13px"><i class="fa-solid fa-triangle-exclamation"></i><div>Ada <strong>' + summary.count + '</strong> barang dengan selisih. Draft tersimpan otomatis di perangkat ini. Tinjau kembali sebelum menyimpan penyesuaian.</div></div>'
        : '<div class="info-banner" style="margin-top:13px"><i class="fa-solid fa-circle-info"></i><div>Masukkan hasil hitung fisik pada kolom yang tersedia. Barang tanpa perubahan tidak akan dibuatkan catatan opname.</div></div>') +
    '</div></div>';
  }

  function renderTable(list) {
    const total = list.length;
    const size = App.config.pageSize;
    const pages = Math.max(1, Math.ceil(total / size));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;
    const start = (state.page - 1) * size;
    const paged = list.slice(start, start + size);

    if (!total) {
      return '<div class="card"><div class="empty-state">' +
        '<div class="empty-icon"><i class="fa-solid fa-clipboard-check"></i></div>' +
        '<div class="empty-title">Tidak ada barang untuk diopname</div>' +
        '<div class="empty-text">Ubah filter pencarian atau tambahkan barang terlebih dahulu pada master barang.</div>' +
      '</div></div>';
    }

    const rows = paged.map(function (p) {
      const unit = U.unitInfo(p);
      const actual = actualFor(p);
      const diff = diffFor(p);
      const diffClass = diff > 0 ? "text-success" : (diff < 0 ? "text-danger" : "text-muted");
      return '<tr class="' + (Math.abs(diff) > 0.0001 ? "row-warning" : "") + '">' +
        '<td><div class="cell-mono">' + U.esc(p.sku || "-") + '</div><div class="cell-sub">' + U.esc(p.warehouse || "Tanpa rak") + '</div></td>' +
        '<td><div class="cell-main">' + U.esc(p.name) + '</div><div class="cell-sub">' + U.esc(p.category || "-") + '</div></td>' +
        '<td class="qty"><span class="cell-strong">' + U.formatNumber(p.stock, 2) + '</span> ' + U.esc(unit.base) + '</td>' +
        '<td>' +
          '<div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">' +
            '<input id="opnameActual_' + U.escapeAttr(p.id) + '" class="input sm mono" style="max-width:100px;text-align:right" type="number" min="0" step="0.01" value="' + U.escapeAttr(actual) + '" data-input-action="opname:actual" data-id="' + U.escapeAttr(p.id) + '" aria-label="Stok fisik ' + U.escapeAttr(p.name) + '">' +
            '<span class="fs-10 fw-700 muted">' + U.esc(unit.base) + '</span>' +
          '</div>' +
        '</td>' +
        '<td class="qty"><span id="opnameDiff_' + U.escapeAttr(p.id) + '" class="' + diffClass + ' fw-700">' + (diff > 0 ? "+" : "") + U.formatNumber(diff, 2) + '</span></td>' +
        '<td>' +
          '<input id="opnameReason_' + U.escapeAttr(p.id) + '" class="input sm uppercase-input" value="' + U.escapeAttr(reasonFor(p)) + '" placeholder="Keterangan selisih..." data-input-action="opname:reason" data-id="' + U.escapeAttr(p.id) + '">' +
        '</td>' +
      '</tr>';
    }).join("");

    return '<div class="card">' +
      '<div class="table-wrap"><table class="data-table">' +
        '<thead><tr>' +
          '<th>SKU / Rak</th><th>Barang</th><th class="th-right">Stok Sistem</th>' +
          '<th class="th-right">Stok Fisik</th><th class="th-right">Selisih</th><th>Keterangan</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>' +
      App.ui.pagination({ total: total, page: state.page, pages: pages, pageSize: size, noun: "barang", prevAction: "opname:page-prev", nextAction: "opname:page-next" }) +
    '</div>';
  }

  function renderAudit() {
    const all = store.opname().slice().reverse();
    const size = App.config.auditPageSize;
    const pages = Math.max(1, Math.ceil(all.length / size));
    if (state.auditPage > pages) state.auditPage = pages;
    if (state.auditPage < 1) state.auditPage = 1;
    const start = (state.auditPage - 1) * size;
    const paged = all.slice(start, start + size);

    const rows = paged.map(function (o) {
      const diff = Number(o.diffQty) || 0;
      const product = store.productById(o.productId) || store.products().find(function (p) { return U.upper(p.name) === U.upper(o.name); });
      return '<tr>' +
        '<td class="cell-mono">' + U.esc(U.formatDate(o.date)) + '</td>' +
        '<td><div class="cell-main">' + U.esc(o.name) + '</div><div class="cell-sub">' + U.esc(o.user || "-") + '</div></td>' +
        '<td class="qty">' + U.formatNumber(o.systemQty, 2) + '</td>' +
        '<td class="qty">' + U.formatNumber(o.actualQty, 2) + '</td>' +
        '<td class="qty"><span class="' + (diff < 0 ? "text-danger" : "text-success") + ' fw-700">' + (diff > 0 ? "+" : "") + U.formatNumber(diff, 2) + '</span></td>' +
        '<td><div class="cell-sub" style="margin:0;color:var(--text-2)">' + U.esc(o.reason || "-") + '</div></td>' +
        '<td><div class="table-actions">' +
          (product ? '<button type="button" class="btn btn-icon btn-sm btn-secondary" data-action="opname:focus-product" data-id="' + U.escapeAttr(product.id) + '" title="Cari barang ini"><i class="fa-solid fa-magnifying-glass"></i></button>' : "") +
        '</div></td>' +
      '</tr>';
    }).join("");

    return '<div class="card">' +
      '<div class="card-head has-border">' +
        '<div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Riwayat Audit Opname</div>' +
          '<div class="card-sub">Catatan penyesuaian stok hasil hitung fisik</div></div>' +
        '<div class="card-actions">' +
          '<button type="button" class="btn btn-sm btn-secondary" data-action="opname:print-history"><i class="fa-solid fa-print"></i> Cetak Riwayat</button>' +
        '</div>' +
      '</div>' +
      '<div class="card-body flush">' +
        (all.length
          ? '<div class="table-wrap"><table class="data-table" style="min-width:680px">' +
              '<thead><tr><th>Tanggal</th><th>Barang</th><th class="th-right">Sistem</th><th class="th-right">Fisik</th><th class="th-right">Selisih</th><th>Alasan</th><th class="th-right">Aksi</th></tr></thead>' +
              '<tbody>' + rows + '</tbody>' +
            '</table></div>' +
            App.ui.pagination({ total: all.length, page: state.auditPage, pages: pages, pageSize: size, noun: "riwayat", prevAction: "opname:audit-prev", nextAction: "opname:audit-next" })
          : App.ui.emptyState({ icon: "fa-clipboard-check", title: "Belum ada riwayat opname", text: "Riwayat penyesuaian akan muncul setelah Anda menyimpan opname dengan selisih." })) +
      '</div>' +
    '</div>';
  }

  function render() {
    const list = filteredProducts();
    return '<div class="page-stack">' +
      renderSummary() +
      renderToolbar() +
      renderTable(list) +
      renderAudit() +
    '</div>';
  }

  /* ---------------------------------------------------------
     Draft interactions
     --------------------------------------------------------- */
  function updateDiffCell(product) {
    const el = document.getElementById("opnameDiff_" + product.id);
    if (!el) return;
    const diff = diffFor(product);
    el.textContent = (diff > 0 ? "+" : "") + U.formatNumber(diff, 2);
    el.className = (diff > 0 ? "text-success" : (diff < 0 ? "text-danger" : "text-muted")) + " fw-700";
    const row = el.closest("tr");
    if (row) row.classList.toggle("row-warning", Math.abs(diff) > 0.0001);
  }

  App.inputActions["opname:actual"] = function (el) {
    const id = el.getAttribute("data-id");
    const product = store.productById(id);
    if (!product) return;
    const value = U.parseNumber(el.value);
    drafts[id] = drafts[id] || {};
    drafts[id].actualQty = value;
    if (drafts[id].reason == null) drafts[id].reason = "";
    persistDrafts();
    updateDiffCell(product);
    const saveBtn = document.querySelector('[data-action="opname:save"]');
    if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Simpan Penyesuaian (' + diffSummary().count + ')';
  };

  App.inputActions["opname:reason"] = function (el) {
    const id = el.getAttribute("data-id");
    const product = store.productById(id);
    if (!product) return;
    drafts[id] = drafts[id] || { actualQty: Number(product.stock) || 0 };
    drafts[id].reason = U.upper(el.value);
    persistDrafts();
  };

  App.actions["opname:save"] = async function () {
    if (!App.auth.requireAdmin("menyimpan penyesuaian opname")) return;
    const summary = diffSummary();
    if (!summary.count) {
      App.ui.toast("Tidak ada selisih stok untuk disimpan.", "info", "Tidak ada perubahan");
      return;
    }
    const ok = await App.ui.confirm({
      title: "Simpan penyesuaian opname?",
      message: "Sebanyak <strong>" + summary.count + " barang</strong> akan disesuaikan stoknya dengan total selisih <strong>" +
        (summary.total > 0 ? "+" : "") + U.formatNumber(summary.total, 2) + "</strong>.",
      note: "Setiap penyesuaian akan dicatat pada riwayat opname sekaligus kartu stok (mutasi). Pastikan hasil hitung fisik sudah benar.",
      confirmText: "Ya, simpan penyesuaian",
      variant: "warning",
      icon: "fa-clipboard-check"
    });
    if (!ok) return;

    const data = store.get();
    const user = store.user() ? store.user().name : "SYSTEM";
    const today = U.todayISO();
    const now = U.nowStamp();
    let count = 0;

    data.products.forEach(function (p) {
      const actual = actualFor(p);
      const diff = actual - (Number(p.stock) || 0);
      if (Math.abs(diff) <= 0.0001) return;
      const reason = U.upper(reasonFor(p)) || "HASIL OPNAME FISIK";
      const unit = U.unitInfo(p);
      const systemQty = Number(p.stock) || 0;

      data.opname.push({
        id: "ADJ-" + Date.now().toString().slice(-6) + "-" + count,
        date: today,
        productId: p.id,
        name: p.name,
        systemQty: systemQty,
        actualQty: actual,
        diffQty: diff,
        reason: reason,
        user: user
      });

      data.mutasi.push({
        id: "TX-" + Date.now().toString().slice(-6) + "-" + count,
        date: now,
        type: diff > 0 ? "IN" : "OUT",
        productId: p.id,
        name: p.name,
        qty: Math.abs(diff),
        txUnit: unit.base,
        inputQty: Math.abs(diff),
        unitCost: Number(p.avgHpp) || 0,
        batchNo: U.autoBatchNo("ADJ"),
        expireDate: "-",
        notes: "PENYESUAIAN OPNAME: " + reason,
        user: user
      });

      p.stock = actual;
      count += 1;
    });

    drafts = {};
    persistDrafts();
    state.page = 1;
    state.auditPage = 1;
    store.save();
    App.ui.toast(count + " barang berhasil disesuaikan dan dicatat pada kartu stok.", "success", "Opname disimpan");
  };

  App.actions["opname:reset-draft"] = async function () {
    if (!Object.keys(drafts).length) {
      App.ui.toast("Tidak ada draft opname untuk direset.", "info", "Draft kosong");
      return;
    }
    const ok = await App.ui.confirm({
      title: "Reset draft opname?",
      message: "Semua hasil hitung fisik yang belum disimpan akan dihapus.",
      confirmText: "Ya, reset draft",
      variant: "danger",
      icon: "fa-eraser"
    });
    if (!ok) return;
    drafts = {};
    persistDrafts();
    App.router.refreshHard();
    App.ui.toast("Draft opname berhasil direset.", "success", "Draft direset");
  };

  App.actions["opname:print-sheet"] = function () {
    const list = filteredProducts();
    if (!list.length) {
      App.ui.toast("Tidak ada barang untuk dicetak.", "warning", "Data kosong");
      return;
    }
    App.print.opnameSheet(list, {
      warehouse: state.warehouse || "SEMUA LOKASI",
      officer: store.user() ? store.user().name : ""
    });
  };

  App.actions["opname:print-history"] = function () {
    const records = store.opname();
    if (!records.length) {
      App.ui.toast("Belum ada riwayat opname untuk dicetak.", "warning", "Data kosong");
      return;
    }
    App.print.opnameHistory(records.slice().reverse());
  };

  App.actions["opname:export"] = function () {
    const list = filteredProducts();
    if (!list.length) {
      App.ui.toast("Tidak ada barang untuk diekspor.", "warning", "Data kosong");
      return;
    }
    App.exports.opnameTemplateCSV(list);
    App.ui.toast("Template opname berhasil diekspor.", "success", "Ekspor selesai");
  };

  App.actions["opname:focus-product"] = function (el) {
    const product = store.productById(el.getAttribute("data-id"));
    if (!product) return;
    state.search = product.name;
    state.page = 1;
    state.onlyDiff = false;
    App.router.refreshHard();
    App.ui.scrollTop();
  };

  App.inputActions["opname:search"] = function (el) {
    state.search = el.value;
    state.page = 1;
    App.router.refresh();
  };

  App.changeActions["opname:filter"] = function () {
    const cat = U.$("#opnameCategory");
    const wh = U.$("#opnameWarehouse");
    const only = U.$("#opnameOnlyDiff");
    state.category = cat ? cat.value : "";
    state.warehouse = wh ? wh.value : "";
    state.onlyDiff = only ? only.checked : false;
    state.page = 1;
    App.router.refresh();
  };

  App.actions["opname:page-prev"] = function () {
    if (state.page <= 1) return;
    state.page -= 1;
    App.router.refresh();
  };

  App.actions["opname:page-next"] = function () {
    const pages = Math.max(1, Math.ceil(filteredProducts().length / App.config.pageSize));
    if (state.page >= pages) return;
    state.page += 1;
    App.router.refresh();
  };

  App.actions["opname:audit-prev"] = function () {
    if (state.auditPage <= 1) return;
    state.auditPage -= 1;
    App.router.refresh();
  };

  App.actions["opname:audit-next"] = function () {
    const pages = Math.max(1, Math.ceil(store.opname().length / App.config.auditPageSize));
    if (state.auditPage >= pages) return;
    state.auditPage += 1;
    App.router.refresh();
  };

  App.router.register({
    id: "opname",
    label: "Stok Opname",
    subtitle: "Hitung fisik massal dan sesuaikan stok dengan riwayat audit",
    group: "Operasional",
    icon: "fa-clipboard-check",
    render: render,
    badge: function () {
      const count = diffSummary().count;
      return count ? String(count) : null;
    }
  });

  App.modules.opname = {
    render: render,
    getDraftCount: function () { return Object.keys(drafts).length; }
  };
})(window.App);
