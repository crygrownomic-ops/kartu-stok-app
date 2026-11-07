/* =========================================================
   Kartu Stok — Riwayat Mutasi & Transaksi
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const store = App.store;
  const state = {
    search: "",
    type: "",
    page: 1
  };

  function pageSize() { return App.config.pageSize; }

  function allMutations() {
    return store.mutationChronological().slice().reverse();
  }

  function filteredMutations() {
    const search = U.upper(state.search);
    const type = state.type;
    return allMutations().filter(function (m) {
      if (type && m.type !== type) return false;
      if (!search) return true;
      const haystack = [m.name, m.batchNo, m.notes, m.user, m.id, m.txUnit].join(" ");
      return U.includesText(haystack, search);
    });
  }

  function renderToolbar(list) {
    const totalIn = U.sum(list.filter(function (m) { return m.type === "IN"; }), function (m) { return m.qty; });
    const totalOut = U.sum(list.filter(function (m) { return m.type === "OUT"; }), function (m) { return m.qty; });
    return '<div class="page-toolbar">' +
      '<div class="toolbar-search">' +
        '<i class="fa-solid fa-magnifying-glass"></i>' +
        '<input id="txSearch" class="input" type="search" value="' + U.escapeAttr(state.search) + '" placeholder="Cari barang, batch, petugas, catatan..." data-input-action="transactions:search" autocomplete="off">' +
      '</div>' +
      '<div class="toolbar-group">' +
        '<select id="txFilterType" class="select" style="max-width:170px" data-change-action="transactions:filter" aria-label="Filter tipe">' +
          '<option value="">Semua tipe</option>' +
          '<option value="IN"' + (state.type === "IN" ? " selected" : "") + '>Stok masuk</option>' +
          '<option value="OUT"' + (state.type === "OUT" ? " selected" : "") + '>Stok keluar</option>' +
        '</select>' +
      '</div>' +
      '<div class="toolbar-spacer"></div>' +
      '<div class="toolbar-group">' +
        '<button type="button" class="btn btn-sm btn-secondary" data-action="transactions:export"><i class="fa-solid fa-file-export"></i> Ekspor</button>' +
        '<button type="button" class="btn btn-sm btn-soft-success" data-action="transactions:open" data-type="IN"><i class="fa-solid fa-arrow-down"></i> Stok Masuk</button>' +
        '<button type="button" class="btn btn-sm btn-soft-danger" data-action="transactions:open" data-type="OUT"><i class="fa-solid fa-arrow-up"></i> Stok Keluar</button>' +
      '</div>' +
      '<div class="toolbar-note" style="flex-basis:100%">' + list.length + ' transaksi · masuk <strong class="text-success">' + U.formatNumber(totalIn, 2) + '</strong> · keluar <strong class="text-danger">' + U.formatNumber(totalOut, 2) + '</strong></div>' +
    '</div>';
  }

  function renderTable(list) {
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / pageSize()));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;
    const start = (state.page - 1) * pageSize();
    const paged = list.slice(start, start + pageSize());

    if (!total) {
      return '<div class="card"><div class="empty-state">' +
        '<div class="empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>' +
        '<div class="empty-title">Belum ada transaksi</div>' +
        '<div class="empty-text">Riwayat stok masuk dan keluar akan muncul di sini setelah transaksi pertama disimpan.</div>' +
        '<div class="empty-actions"><button type="button" class="btn btn-primary btn-sm" data-action="transactions:open" data-type="IN"><i class="fa-solid fa-plus"></i> Input Stok Masuk</button></div>' +
      '</div></div>';
    }

    const rows = paged.map(function (m) {
      const product = store.productById(m.productId);
      const baseUnit = product ? U.unitInfo(product).base : (m.txUnit || "PCS");
      const inputQty = m.inputQty != null ? m.inputQty : m.qty;
      const isIn = m.type === "IN";
      const exp = U.expiryInfo(m.expireDate);
      const expBadge = m.expireDate && m.expireDate !== "-"
        ? '<span class="badge ' + exp.badge + '">' + U.esc(exp.label) + '</span>'
        : '<span class="badge badge-neutral">Tanpa ED</span>';
      return '<tr>' +
        '<td><div class="cell-mono">' + U.esc(U.formatDateTime(m.date)) + '</div><div class="cell-sub mono">' + U.esc(m.id) + '</div></td>' +
        '<td><div class="cell-main">' + U.esc(m.name) + '</div><div class="cell-sub">' + U.esc(product ? (product.sku || "-") : "-") + ' · ' + U.esc(m.user || "-") + '</div></td>' +
        '<td><span class="badge ' + (isIn ? "badge-success" : "badge-danger") + '"><i class="fa-solid ' + (isIn ? "fa-arrow-down" : "fa-arrow-up") + '"></i> ' + (isIn ? "Masuk" : "Keluar") + '</span></td>' +
        '<td class="qty"><span class="' + (isIn ? "text-success" : "text-danger") + ' fw-700">' + (isIn ? "+" : "−") + U.formatNumber(inputQty, 2) + ' ' + U.esc(m.txUnit || baseUnit) + '</span>' +
          '<div class="cell-sub">' + U.formatNumber(m.qty, 2) + ' ' + U.esc(baseUnit) + ' dasar</div></td>' +
        '<td><div class="cell-mono">' + U.esc(m.batchNo || "-") + '</div><div class="cell-sub">' + expBadge + '</div></td>' +
        '<td class="money">' + U.formatCurrency(m.unitCost) + '</td>' +
        '<td>' +
          '<div class="table-actions">' +
            '<button type="button" class="btn btn-icon btn-sm btn-secondary" data-action="transactions:receipt" data-id="' + U.escapeAttr(m.id) + '" title="Cetak struk"><i class="fa-solid fa-receipt"></i></button>' +
            (m.expireDate && m.expireDate !== "-"
              ? '<button type="button" class="btn btn-icon btn-sm btn-secondary" data-action="transactions:edit-expiry" data-id="' + U.escapeAttr(m.id) + '" title="Revisi tanggal expired"><i class="fa-solid fa-calendar-days"></i></button>'
              : "") +
            '<button type="button" class="btn btn-icon btn-sm btn-soft-danger admin-only" data-action="transactions:delete" data-id="' + U.escapeAttr(m.id) + '" title="Hapus transaksi"><i class="fa-solid fa-trash"></i></button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join("");

    return '<div class="card">' +
      '<div class="table-wrap"><table class="data-table">' +
        '<thead><tr>' +
          '<th>Waktu</th><th>Barang</th><th>Tipe</th><th class="th-right">Qty</th>' +
          '<th>Batch / Expired</th><th class="th-right">Harga Unit</th><th class="th-right">Aksi</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>' +
      App.ui.pagination({ total: total, page: state.page, pages: pages, pageSize: pageSize(), noun: "transaksi", prevAction: "transactions:page-prev", nextAction: "transactions:page-next" }) +
    '</div>';
  }

  function render() {
    const list = filteredMutations();
    return '<div class="page-stack">' + renderToolbar(list) + renderTable(list) + '</div>';
  }

  /* ---------------------------------------------------------
     Transaction modal
     --------------------------------------------------------- */
  function productOptions(selectedId) {
    return store.products().map(function (p) {
      return '<option value="' + U.escapeAttr(p.id) + '"' + (String(p.id) === String(selectedId) ? " selected" : "") + '>' +
        U.esc(p.sku || "-") + ' — ' + U.esc(p.name) + ' (stok ' + U.formatNumber(p.stock, 2) + ' ' + U.esc(p.satuan || "PCS") + ')' +
      '</option>';
    }).join("");
  }

  function openModal(type, productId) {
    if (!store.products().length) {
      App.ui.toast("Belum ada barang. Tambahkan master barang terlebih dahulu.", "warning", "Data barang kosong");
      return;
    }
    const isIn = type !== "OUT";
    const products = store.products();
    const selected = products.find(function (p) { return String(p.id) === String(productId); }) || products[0];

    const body =
      '<form id="txForm" data-form-action="transactions:save" autocomplete="off">' +
        '<input type="hidden" name="type" value="' + (isIn ? "IN" : "OUT") + '">' +
        '<div class="form-grid">' +
          '<div class="field span-2"><label class="field-label" for="txProductId">Barang <span class="req">*</span></label>' +
            '<select id="txProductId" name="productId" class="select" data-change-action="transactions:product">' + productOptions(selected.id) + '</select>' +
          '</div>' +
          '<div class="field"><label class="field-label" for="txQty">Jumlah <span class="req">*</span></label>' +
            '<input id="txQty" name="qty" class="input mono" type="number" min="0.01" step="any" value="1" data-input-action="transactions:qty" required></div>' +
          '<div class="field"><label class="field-label" for="txUnitType">Satuan Transaksi</label>' +
            '<select id="txUnitType" name="unit" class="select" data-change-action="transactions:unit"></select></div>' +
          '<div class="field hidden" id="txRatioGroup"><label class="field-label" for="txCustomRatio">Isi per Satuan Grosir</label>' +
            '<input id="txCustomRatio" name="ratio" class="input mono" type="number" min="1" step="1" value="1" data-input-action="transactions:qty">' +
            '<div class="field-hint">Boleh disesuaikan bila isi kemasan berbeda.</div></div>' +
          '<div class="field" id="txPriceGroup"><label class="field-label" for="txUnitCost">Harga Beli per Satuan</label>' +
            '<input id="txUnitCost" name="unitCost" class="input mono" inputmode="numeric" value="" placeholder="0" data-input-action="transactions:currency">' +
            '<div class="field-hint">Kosongkan untuk memakai HPP barang saat ini.</div></div>' +
          '<div class="field"><label class="field-label" for="txBatchNo">No. Batch</label>' +
            '<input id="txBatchNo" name="batchNo" class="input mono uppercase-input" value="' + U.escapeAttr(U.autoBatchNo()) + '" placeholder="Otomatis"></div>' +
          '<div class="field"><label class="field-label" for="txExpireDate">Tanggal Expired</label>' +
            '<input id="txExpireDate" name="expireDate" class="input" type="date"></div>' +
          '<div class="field span-2"><label class="field-label" for="txNotes">Keterangan</label>' +
            '<input id="txNotes" name="notes" class="input uppercase-input" value="' + (isIn ? "PEMBELIAN DARI DISTRIBUTOR" : "PENJUALAN") + '" placeholder="Catatan transaksi"></div>' +
          '<div class="field span-2"><div class="alert alert-info" id="txConversionPreview" style="padding:9px 12px"><div class="alert-icon" style="width:24px;height:24px;flex-basis:24px;font-size:10px"><i class="fa-solid fa-calculator"></i></div><div class="alert-copy"><div class="alert-text" data-preview-text>Pilih barang dan jumlah untuk melihat konversi.</div></div></div></div>' +
        '</div>' +
      '</form>';

    App.ui.openModal({
      title: isIn ? "Input Stok Masuk" : "Input Stok Keluar",
      subtitle: isIn ? "Catat pembelian, retur, atau penambahan stok" : "Catat penjualan, pemakaian, atau pengurangan stok",
      size: "lg",
      body: body,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Batal</button>' +
        '<button type="submit" form="txForm" class="btn ' + (isIn ? "btn-success" : "btn-danger") + '"><i class="fa-solid fa-floppy-disk"></i> Simpan Transaksi</button>',
      onMount: function () {
        refreshUnitOptions();
        refreshPreview();
        const price = document.getElementById("txUnitCost");
        if (price && selected.avgHpp) price.value = U.formatNumber(selected.avgHpp, 0);
      }
    });
  }

  function refreshUnitOptions() {
    const productSelect = document.getElementById("txProductId");
    const unitSelect = document.getElementById("txUnitType");
    if (!productSelect || !unitSelect) return;
    const product = store.productById(productSelect.value);
    if (!product) return;
    const unit = U.unitInfo(product);
    const previous = unitSelect.value;
    unitSelect.innerHTML = '<option value="' + U.escapeAttr(unit.base) + '">' + U.esc(unit.base) + ' (eceran)</option>' +
      (unit.hasBig ? '<option value="' + U.escapeAttr(unit.big) + '">' + U.esc(unit.big) + ' (grosir · isi ' + unit.ratio + ')</option>' : "");
    if (previous === unit.big && unit.hasBig) unitSelect.value = unit.big;
    const ratioInput = document.getElementById("txCustomRatio");
    if (ratioInput) ratioInput.value = unit.ratio;
    refreshPreview();
  }

  function refreshPreview() {
    const productSelect = document.getElementById("txProductId");
    const qtyInput = document.getElementById("txQty");
    const unitSelect = document.getElementById("txUnitType");
    const ratioGroup = document.getElementById("txRatioGroup");
    const ratioInput = document.getElementById("txCustomRatio");
    const preview = document.querySelector("[data-preview-text]");
    const form = document.getElementById("txForm");
    if (!productSelect || !qtyInput || !unitSelect || !preview) return;

    const product = store.productById(productSelect.value);
    if (!product) return;
    const unit = U.unitInfo(product);
    const qty = U.parseNumber(qtyInput.value);
    const isBig = unit.hasBig && unitSelect.value === unit.big;
    if (ratioGroup) ratioGroup.classList.toggle("hidden", !isBig);
    const ratio = isBig ? Math.max(1, U.parseNumber(ratioInput ? ratioInput.value : unit.ratio) || unit.ratio) : 1;
    const baseQty = qty * ratio;

    let text;
    if (isBig) {
      text = "Konversi: " + U.formatNumber(qty, 2) + " " + unit.big + " × " + ratio + " " + unit.base +
        " = <strong>" + U.formatNumber(baseQty, 2) + " " + unit.base + "</strong>.";
    } else {
      text = "Transaksi: <strong>" + U.formatNumber(qty, 2) + " " + unit.base + "</strong>.";
    }
    text += " Stok saat ini " + U.formatNumber(product.stock, 2) + " " + unit.base + ".";
    if (form && form.querySelector('[name="type"]').value === "OUT") {
      const enough = Number(product.stock) >= baseQty;
      text += enough
        ? ' <span class="text-success">Stok mencukupi.</span>'
        : ' <span class="text-danger">Stok tidak mencukupi.</span>';
    }
    preview.innerHTML = text;
  }

  App.formActions["transactions:save"] = function (form) {
    const productId = form.querySelector('[name="productId"]').value;
    const type = form.querySelector('[name="type"]').value === "OUT" ? "OUT" : "IN";
    const product = store.productById(productId);
    if (!product) {
      App.ui.toast("Barang tidak ditemukan.", "error", "Transaksi gagal");
      return;
    }
    const inputQty = U.parseNumber(form.querySelector('[name="qty"]').value);
    if (!(inputQty > 0)) {
      App.ui.toast("Jumlah harus lebih dari nol.", "error", "Jumlah tidak valid");
      return;
    }

    const unit = U.unitInfo(product);
    const selectedUnit = form.querySelector('[name="unit"]').value || unit.base;
    const isBig = unit.hasBig && selectedUnit === unit.big;
    const ratio = isBig ? Math.max(1, U.parseNumber(form.querySelector('[name="ratio"]').value) || unit.ratio) : 1;
    const baseQty = inputQty * ratio;
    const rawUnitCost = U.parseNumber(form.querySelector('[name="unitCost"]').value);
    const unitCostPerBase = ratio > 1 ? Math.round(rawUnitCost / ratio) : rawUnitCost;

    if (type === "OUT" && Number(product.stock) < baseQty) {
      App.ui.toast("Stok tidak mencukupi. Stok saat ini " + U.formatNumber(product.stock, 2) + " " + unit.base + ".", "error", "Stok kurang");
      return;
    }

    if (type === "IN" && unitCostPerBase > 0) {
      const currentValue = (Number(product.stock) || 0) * (Number(product.avgHpp) || 0);
      const newValue = currentValue + (baseQty * unitCostPerBase);
      const newQty = (Number(product.stock) || 0) + baseQty;
      product.avgHpp = newQty > 0 ? Math.round(newValue / newQty) : unitCostPerBase;
    }
    product.stock = Number(product.stock || 0) + (type === "IN" ? baseQty : -baseQty);

    const batchInput = form.querySelector('[name="batchNo"]');
    const batchNo = U.upper(batchInput.value) || U.autoBatchNo();
    const expireValue = form.querySelector('[name="expireDate"]').value;
    const notesBase = U.upper(form.querySelector('[name="notes"]').value) || "-";
    const notes = notesBase + (isBig ? " (" + U.formatNumber(inputQty, 2) + " " + unit.big + " ISI " + ratio + ")" : "");
    const user = store.user() ? store.user().name : "SYSTEM";

    const data = store.get();
    data.mutasi.push({
      id: "TX-" + Date.now().toString().slice(-6),
      date: U.nowStamp(),
      type: type,
      productId: product.id,
      name: product.name,
      qty: baseQty,
      txUnit: selectedUnit,
      inputQty: inputQty,
      unitCost: rawUnitCost > 0 ? rawUnitCost : (product.avgHpp || 0),
      batchNo: batchNo,
      expireDate: expireValue || "-",
      notes: notes,
      user: user
    });

    App.ui.closeModal();
    store.save();
    App.ui.toast("Transaksi stok " + (type === "IN" ? "masuk" : "keluar") + " berhasil disimpan.", "success", "Transaksi tersimpan");
  };

  App.actions["transactions:open"] = function (el) {
    const type = el.getAttribute("data-type") === "OUT" ? "OUT" : "IN";
    openModal(type);
  };

  App.actions["transactions:receipt"] = function (el) {
    const mutation = store.mutations().find(function (m) { return String(m.id) === String(el.getAttribute("data-id")); });
    if (mutation) App.print.receipt(mutation);
  };

  App.actions["transactions:edit-expiry"] = async function (el) {
    if (!App.auth.requireAdmin("merevisi tanggal expired")) return;
    const mutation = store.mutations().find(function (m) { return String(m.id) === String(el.getAttribute("data-id")); });
    if (!mutation) return;
    const current = mutation.expireDate && mutation.expireDate !== "-" ? mutation.expireDate : "";
    const value = await App.ui.prompt({
      title: "Revisi Tanggal Expired",
      subtitle: mutation.name + " · " + mutation.batchNo,
      message: "Kosongkan untuk menghapus tanggal expired.",
      label: "Tanggal expired baru",
      type: "date",
      value: current,
      required: false,
      confirmText: "Simpan"
    });
    if (value === null) return;
    mutation.expireDate = value || "-";
    store.save({ render: false });
    App.router.refresh();
    App.ui.toast("Tanggal expired batch " + mutation.batchNo + " diperbarui.", "success", "Data diperbarui");
  };

  App.actions["transactions:delete"] = async function (el) {
    if (!App.auth.requireAdmin("menghapus transaksi")) return;
    const mutation = store.mutations().find(function (m) { return String(m.id) === String(el.getAttribute("data-id")); });
    if (!mutation) return;
    const product = store.productById(mutation.productId);
    const ok = await App.ui.confirm({
      title: "Hapus transaksi?",
      message: "Transaksi <strong>" + U.esc(mutation.name) + "</strong> sebesar " + U.formatNumber(mutation.qty, 2) + " akan dihapus dan stok barang disesuaikan.",
      note: "Riwayat transaksi akan hilang permanen. HPP rata-rata tidak dihitung ulang otomatis.",
      confirmText: "Ya, hapus transaksi",
      variant: "danger",
      icon: "fa-trash"
    });
    if (!ok) return;

    if (product) {
      const reverse = mutation.type === "IN" ? -Number(mutation.qty) : Number(mutation.qty);
      const nextStock = Number(product.stock || 0) + reverse;
      if (nextStock < -0.0001) {
        App.ui.toast("Tidak dapat menghapus transaksi karena stok barang akan menjadi negatif.", "error", "Stok tidak valid");
        return;
      }
      product.stock = Math.max(0, nextStock);
    }

    const data = store.get();
    data.mutasi = data.mutasi.filter(function (m) { return String(m.id) !== String(mutation.id); });
    store.save();
    App.ui.toast("Transaksi " + mutation.id + " telah dihapus.", "success", "Transaksi dihapus");
  };

  App.actions["transactions:export"] = function () {
    const list = filteredMutations();
    if (!list.length) {
      App.ui.toast("Tidak ada transaksi untuk diekspor.", "warning", "Ekspor kosong");
      return;
    }
    App.exports.mutationsCSV(list);
    App.ui.toast(list.length + " transaksi diekspor ke CSV.", "success", "Ekspor selesai");
  };

  App.inputActions["transactions:search"] = function (el) {
    state.search = el.value;
    state.page = 1;
    App.router.refresh();
  };

  App.changeActions["transactions:filter"] = function () {
    const el = U.$("#txFilterType");
    state.type = el ? el.value : "";
    state.page = 1;
    App.router.refresh();
  };

  App.changeActions["transactions:product"] = function () { refreshUnitOptions(); };
  App.changeActions["transactions:unit"] = function () { refreshPreview(); };
  App.inputActions["transactions:qty"] = function () { refreshPreview(); };
  App.inputActions["transactions:currency"] = function (el) { App.ui.formatCurrencyInput(el); };

  App.actions["transactions:page-prev"] = function () {
    if (state.page <= 1) return;
    state.page -= 1;
    App.router.refresh();
  };

  App.actions["transactions:page-next"] = function () {
    const pages = Math.max(1, Math.ceil(filteredMutations().length / pageSize()));
    if (state.page >= pages) return;
    state.page += 1;
    App.router.refresh();
  };

  App.router.register({
    id: "mutasi",
    label: "Riwayat Mutasi",
    subtitle: "Semua transaksi stok masuk, keluar, dan batch expired",
    group: "Operasional",
    icon: "fa-right-left",
    render: render,
    badge: function () {
      const today = U.todayISO();
      const count = store.mutations().filter(function (m) { return String(m.date || "").slice(0, 10) === today; }).length;
      return count ? String(count) : null;
    }
  });

  App.modules.transactions = {
    render: render,
    openModal: openModal,
    state: state
  };
})(window.App);
