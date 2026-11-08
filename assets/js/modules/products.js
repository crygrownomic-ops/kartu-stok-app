/* =========================================================
   Kartu Stok — Master Barang Module
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const store = App.store;
  const state = {
    search: "",
    category: "",
    stock: "",
    sort: "name-asc",
    page: 1
  };

  function pageSize() { return App.config.pageSize; }

  function filteredProducts() {
    const search = U.upper(state.search);
    const category = U.upper(state.category);
    const stockFilter = state.stock;
    let list = store.products().filter(function (p) {
      if (search) {
        const haystack = [p.name, p.sku, p.barcode, p.warehouse, p.category].join(" ");
        if (!U.includesText(haystack, search)) return false;
      }
      if (category && U.upper(p.category) !== category) return false;
      if (stockFilter === "low" && !U.isLowStock(p)) return false;
      if (stockFilter === "out" && !U.isOutOfStock(p)) return false;
      if (stockFilter === "safe" && U.isLowStock(p)) return false;
      if (stockFilter === "expiring") {
        const hasBatch = store.expiringBatches(30).some(function (b) { return String(b.productId) === String(p.id); });
        if (!hasBatch) return false;
      }
      return true;
    });

    list = list.slice();
    const sort = state.sort || "name-asc";
    list.sort(function (a, b) {
      switch (sort) {
        case "name-desc": return String(b.name).localeCompare(String(a.name));
        case "sku-asc": return String(a.sku || "").localeCompare(String(b.sku || ""));
        case "stock-asc": return (Number(a.stock) || 0) - (Number(b.stock) || 0);
        case "stock-desc": return (Number(b.stock) || 0) - (Number(a.stock) || 0);
        case "value-desc": return ((Number(b.stock) || 0) * (Number(b.avgHpp) || 0)) - ((Number(a.stock) || 0) * (Number(a.avgHpp) || 0));
        case "newest": return String(b.id).localeCompare(String(a.id));
        default: return String(a.name).localeCompare(String(b.name));
      }
    });
    return list;
  }

  function categoryOptions(selected) {
    return '<option value="">Semua kategori</option>' + store.categories().map(function (c) {
      return '<option value="' + U.escapeAttr(c) + '"' + (U.upper(selected) === U.upper(c) ? " selected" : "") + '>' + U.esc(c) + '</option>';
    }).join("");
  }

  function renderToolbar(list) {
    return '<div class="page-toolbar">' +
      '<div class="toolbar-search">' +
        '<i class="fa-solid fa-magnifying-glass"></i>' +
        '<input id="productSearch" class="input" type="search" value="' + U.escapeAttr(state.search) + '" placeholder="Cari nama, SKU, barcode, rak..." data-input-action="products:search" autocomplete="off">' +
      '</div>' +
      '<div class="toolbar-group">' +
        '<select id="productCategory" class="select" style="max-width:190px" data-change-action="products:filter" aria-label="Filter kategori">' + categoryOptions(state.category) + '</select>' +
        '<select id="productStock" class="select" style="max-width:165px" data-change-action="products:filter" aria-label="Filter stok">' +
          '<option value="">Semua stok</option>' +
          '<option value="low"' + (state.stock === "low" ? " selected" : "") + '>Stok menipis</option>' +
          '<option value="out"' + (state.stock === "out" ? " selected" : "") + '>Stok habis</option>' +
          '<option value="safe"' + (state.stock === "safe" ? " selected" : "") + '>Stok aman</option>' +
          '<option value="expiring"' + (state.stock === "expiring" ? " selected" : "") + '>Ada batch expired</option>' +
        '</select>' +
        '<select id="productSort" class="select" style="max-width:170px" data-change-action="products:filter" aria-label="Urutkan">' +
          '<option value="name-asc"' + (state.sort === "name-asc" ? " selected" : "") + '>Nama A-Z</option>' +
          '<option value="name-desc"' + (state.sort === "name-desc" ? " selected" : "") + '>Nama Z-A</option>' +
          '<option value="sku-asc"' + (state.sort === "sku-asc" ? " selected" : "") + '>SKU A-Z</option>' +
          '<option value="stock-asc"' + (state.sort === "stock-asc" ? " selected" : "") + '>Stok terendah</option>' +
          '<option value="stock-desc"' + (state.sort === "stock-desc" ? " selected" : "") + '>Stok tertinggi</option>' +
          '<option value="value-desc"' + (state.sort === "value-desc" ? " selected" : "") + '>Nilai aset terbesar</option>' +
          '<option value="newest"' + (state.sort === "newest" ? " selected" : "") + '>Terbaru</option>' +
        '</select>' +
      '</div>' +
      '<div class="toolbar-spacer"></div>' +
      '<div class="toolbar-group">' +
        '<button type="button" class="btn btn-sm btn-ghost" data-action="products:reset" title="Reset filter"><i class="fa-solid fa-rotate-left"></i><span class="admin-only" style="display:inline"> Reset</span></button>' +
        '<button type="button" class="btn btn-sm btn-secondary" data-action="products:import" title="Impor CSV"><i class="fa-solid fa-file-import"></i> Impor</button>' +
        '<button type="button" class="btn btn-sm btn-secondary" data-action="products:export" title="Ekspor CSV"><i class="fa-solid fa-file-export"></i> Ekspor</button>' +
        '<button type="button" class="btn btn-sm btn-primary admin-only" data-action="products:new"><i class="fa-solid fa-plus"></i> Tambah Barang</button>' +
      '</div>' +
      '<div class="toolbar-note" style="flex-basis:100%">' + (list ? list.length : 0) + ' barang ditemukan · data tersimpan otomatis</div>' +
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
        '<div class="empty-icon"><i class="fa-solid fa-box-open"></i></div>' +
        '<div class="empty-title">Barang tidak ditemukan</div>' +
        '<div class="empty-text">Ubah kata kunci atau filter, atau tambahkan barang baru ke master data.</div>' +
        '<div class="empty-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm" data-action="products:reset">Reset filter</button>' +
          '<button type="button" class="btn btn-primary btn-sm admin-only" data-action="products:new"><i class="fa-solid fa-plus"></i> Tambah Barang</button>' +
        '</div>' +
      '</div></div>';
    }

    const rows = paged.map(function (p) {
      const unit = U.unitInfo(p);
      const margin = U.marginInfo(p);
      const low = U.isLowStock(p);
      const out = U.isOutOfStock(p);
      const rowClass = out ? "row-danger" : (low ? "row-warning" : "");
      const stockBadge = out
        ? '<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> Habis</span>'
        : (low ? '<span class="badge badge-warning"><i class="fa-solid fa-triangle-exclamation"></i> Menipis</span>' : '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Aman</span>');
      return '<tr class="' + rowClass + '">' +
        '<td>' +
          '<div class="cell-main">' + U.esc(p.name) + '</div>' +
          '<div class="cell-sub mono">' + U.esc(p.sku || "-") + (p.barcode ? " · " + U.esc(p.barcode) : "") + '</div>' +
          '<div class="cell-sub">' + U.esc(p.warehouse || "Tanpa rak") + (unit.hasBig ? " · 1 " + U.esc(unit.big) + " = " + unit.ratio + " " + U.esc(unit.base) : "") + '</div>' +
        '</td>' +
        '<td><span class="badge badge-neutral">' + U.esc(p.category || "LAINNYA") + '</span></td>' +
        '<td class="qty"><span class="cell-strong">' + U.formatNumber(p.stock, 2) + '</span> ' + U.esc(unit.base) +
          '<div class="cell-sub">' + (unit.hasBig ? U.esc(U.stockText(p)) : "min " + U.formatNumber(p.minStock, 2)) + '</div>' +
        '</td>' +
        '<td class="center">' + stockBadge + '</td>' +
        '<td class="money">' + U.formatCurrency(p.avgHpp) + '</td>' +
        '<td class="money">' + U.formatCurrency(p.sellPrice) + '</td>' +
        '<td class="money">' + U.formatCurrency(margin.margin) +
          '<div class="cell-sub ' + (margin.margin < 0 ? "text-danger" : "text-success") + '">' + (margin.percent == null ? "-" : U.formatNumber(margin.percent, 1) + "%") + '</div>' +
        '</td>' +
        '<td>' +
          '<div class="table-actions">' +
            '<button type="button" class="btn btn-icon btn-sm btn-secondary" data-action="products:edit" data-id="' + U.escapeAttr(p.id) + '" title="Edit barang"><i class="fa-solid fa-pen"></i></button>' +
            '<button type="button" class="btn btn-icon btn-sm btn-soft-danger admin-only" data-action="products:delete" data-id="' + U.escapeAttr(p.id) + '" title="Hapus barang"><i class="fa-solid fa-trash"></i></button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join("");

    return '<div class="card">' +
      '<div class="table-wrap"><table class="data-table">' +
        '<thead><tr>' +
          '<th>Barang</th><th>Kategori</th><th class="th-right">Stok</th><th class="th-center">Status</th>' +
          '<th class="th-right">HPP</th><th class="th-right">Harga Jual</th><th class="th-right">Margin</th><th class="th-right">Aksi</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>' +
      App.ui.pagination({ total: total, page: state.page, pages: pages, pageSize: pageSize(), noun: "barang", prevAction: "products:page-prev", nextAction: "products:page-next" }) +
    '</div>';
  }

  function render() {
    const list = filteredProducts();
    const stats = store.stats();
    return '<div class="page-stack">' +
      '<div class="stat-grid">' +
        '<div class="stat-card"><div class="stat-top"><div class="stat-label">Jenis Barang</div><div class="stat-icon"><i class="fa-solid fa-boxes-stacked"></i></div></div><div class="stat-value">' + U.formatNumber(stats.itemCount) + '</div><div class="stat-foot"><strong>' + list.length + '</strong> sesuai filter</div></div>' +
        '<div class="stat-card accent-success"><div class="stat-top"><div class="stat-label">Total Kuantitas</div><div class="stat-icon success"><i class="fa-solid fa-cubes"></i></div></div><div class="stat-value">' + U.formatNumber(stats.totalQty, 2) + '</div><div class="stat-foot">akumulasi seluruh satuan dasar</div></div>' +
        '<div class="stat-card accent-warning"><div class="stat-top"><div class="stat-label">Stok Menipis</div><div class="stat-icon warning"><i class="fa-solid fa-triangle-exclamation"></i></div></div><div class="stat-value">' + stats.lowStockCount + '</div><div class="stat-foot"><strong>' + stats.outOfStockCount + '</strong> barang habis</div></div>' +
        '<div class="stat-card accent-danger"><div class="stat-top"><div class="stat-label">Nilai Aset</div><div class="stat-icon danger"><i class="fa-solid fa-sack-dollar"></i></div></div><div class="stat-value currency">' + U.formatCurrency(stats.totalHpp) + '</div><div class="stat-foot">berdasarkan HPP rata-rata</div></div>' +
      '</div>' +
      renderToolbar(list) +
      renderTable(list) +
    '</div>';
  }

  /* ---------------------------------------------------------
     Product modal
     --------------------------------------------------------- */
  function unitDatalist() {
    return '<datalist id="unitOptions">' + store.units().map(function (u) {
      return '<option value="' + U.escapeAttr(u) + '"></option>';
    }).join("") + '</datalist>';
  }

  function openProductModal(id) {
    if (!App.auth.requireAdmin("mengubah data barang")) return;
    const product = id ? store.productById(id) : null;
    const isEdit = Boolean(product);
    const p = product || {
      id: "", sku: "", name: "", category: "", warehouse: "", satuan: "PCS", satuanBesar: "",
      rasioKonversi: 1, minStock: 0, stock: 0, avgHpp: 0, sellPrice: 0, barcode: ""
    };

    const categorySelect = '<select id="productCategoryInput" class="select" name="category">' +
      '<option value="">Pilih kategori</option>' +
      store.categories().map(function (c) {
        return '<option value="' + U.escapeAttr(c) + '"' + (U.upper(p.category) === U.upper(c) ? " selected" : "") + '>' + U.esc(c) + '</option>';
      }).join("") +
    '</select>';

    const body =
      '<form id="productForm" data-form-action="products:save" autocomplete="off">' +
        '<input type="hidden" name="id" value="' + U.escapeAttr(p.id) + '">' +
        '<div class="form-grid">' +
          '<div class="field span-2"><label class="field-label" for="productNameInput">Nama Barang <span class="req">*</span></label>' +
            '<input id="productNameInput" name="name" class="input uppercase-input" value="' + U.escapeAttr(p.name) + '" placeholder="Contoh: MINYAK GORENG 1L" required></div>' +
          '<div class="field"><label class="field-label" for="productSkuInput">SKU / Kode</label>' +
            '<input id="productSkuInput" name="sku" class="input uppercase-input mono" value="' + U.escapeAttr(p.sku) + '" placeholder="BRG-001"></div>' +
          '<div class="field"><label class="field-label" for="productBarcodeInput">Barcode</label>' +
            '<input id="productBarcodeInput" name="barcode" class="input mono" value="' + U.escapeAttr(p.barcode) + '" placeholder="899xxxxxxxxx"></div>' +
          '<div class="field"><label class="field-label" for="productCategoryInput">Kategori</label>' + categorySelect + '</div>' +
          '<div class="field"><label class="field-label" for="productWarehouseInput">Gudang / Rak</label>' +
            '<input id="productWarehouseInput" name="warehouse" class="input uppercase-input" value="' + U.escapeAttr(p.warehouse) + '" placeholder="RAK A-01"></div>' +
          '<div class="field"><label class="field-label" for="productSatuanInput">Satuan Eceran <span class="req">*</span></label>' +
            '<input id="productSatuanInput" name="satuan" class="input uppercase-input" list="unitOptions" value="' + U.escapeAttr(p.satuan || "PCS") + '" required></div>' +
          '<div class="field"><label class="field-label" for="productSatuanBesarInput">Satuan Grosir</label>' +
            '<input id="productSatuanBesarInput" name="satuanBesar" class="input uppercase-input" list="unitOptions" value="' + U.escapeAttr(p.satuanBesar) + '" placeholder="KARTON"></div>' +
          '<div class="field"><label class="field-label" for="productRasioInput">Rasio Konversi</label>' +
            '<input id="productRasioInput" name="rasioKonversi" class="input mono" type="number" min="1" step="1" value="' + U.escapeAttr(p.rasioKonversi || 1) + '">' +
            '<div class="field-hint">Jumlah satuan eceran dalam 1 satuan grosir.</div></div>' +
          '<div class="field"><label class="field-label" for="productMinInput">Batas Minimum Stok</label>' +
            '<input id="productMinInput" name="minStock" class="input mono" type="number" min="0" step="0.01" value="' + U.escapeAttr(p.minStock) + '"></div>' +
          '<div class="field"><label class="field-label" for="productHppInput">Harga Pokok (HPP)</label>' +
            '<input id="productHppInput" name="avgHpp" class="input mono" inputmode="numeric" value="' + U.escapeAttr(p.avgHpp ? U.formatNumber(p.avgHpp, 0) : "") + '" data-input-action="products:currency" placeholder="0"></div>' +
          '<div class="field"><label class="field-label" for="productSellInput">Harga Jual</label>' +
            '<input id="productSellInput" name="sellPrice" class="input mono" inputmode="numeric" value="' + U.escapeAttr(p.sellPrice ? U.formatNumber(p.sellPrice, 0) : "") + '" data-input-action="products:currency" placeholder="0"></div>' +
          (isEdit
            ? '<div class="field span-2"><div class="info-banner"><i class="fa-solid fa-circle-info"></i><div>Stok saat ini <strong>' + U.formatNumber(p.stock, 2) + ' ' + U.esc(p.satuan || "PCS") + '</strong>. Untuk mengubah jumlah stok gunakan transaksi stok masuk/keluar atau stok opname agar kartu stok tetap akurat.</div></div></div>'
            : '<div class="field span-2"><label class="field-label" for="productInitialInput">Stok Awal</label>' +
              '<input id="productInitialInput" name="initialStock" class="input mono" type="number" min="0" step="0.01" value="0">' +
              '<div class="field-hint">Stok awal akan dicatat sebagai transaksi masuk pada kartu stok.</div></div>') +
        '</div>' +
        unitDatalist() +
      '</form>';

    App.ui.openModal({
      title: isEdit ? "Edit Barang" : "Tambah Barang Baru",
      subtitle: isEdit ? p.sku || p.name : "Lengkapi data master barang",
      size: "lg",
      body: body,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Batal</button>' +
        '<button type="submit" form="productForm" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> ' + (isEdit ? "Simpan Perubahan" : "Simpan Barang") + '</button>'
    });
  }

  function ensureReference(listName, value) {
    const data = store.get();
    const clean = U.upper(value);
    if (!clean) return;
    if (!Array.isArray(data[listName])) data[listName] = [];
    if (data[listName].indexOf(clean) === -1) data[listName].push(clean);
    data[listName].sort();
  }

  App.formActions["products:save"] = function (form) {
    if (!App.auth.requireAdmin("menyimpan data barang")) return;
    const get = function (name) { return form.querySelector('[name="' + name + '"]'); };
    const id = get("id").value;
    const name = U.upper(get("name").value);
    const sku = U.upper(get("sku").value);
    const satuan = U.upper(get("satuan").value) || "PCS";
    const rasio = Math.max(1, U.parseNumber(get("rasioKonversi").value) || 1);
    const avgHpp = U.parseNumber(get("avgHpp").value);
    const sellPrice = U.parseNumber(get("sellPrice").value);
    const minStock = Math.max(0, U.parseNumber(get("minStock").value));

    if (!name) {
      App.ui.toast("Nama barang wajib diisi.", "error", "Data belum lengkap");
      get("name").focus();
      return;
    }
    if (sku) {
      const duplicate = store.products().find(function (p) {
        return U.upper(p.sku) === sku && String(p.id) !== String(id);
      });
      if (duplicate) {
        App.ui.toast("SKU sudah digunakan oleh " + duplicate.name + ".", "error", "SKU duplikat");
        get("sku").focus();
        return;
      }
    }

    const data = store.get();
    const category = U.upper(get("category").value);
    const user = store.user() ? store.user().name : "SYSTEM";
    const now = U.nowStamp();

    if (id) {
      const product = store.productById(id);
      if (!product) return;
      product.name = name;
      product.sku = sku;
      product.barcode = U.upper(get("barcode").value);
      product.category = category || "LAINNYA";
      product.warehouse = U.upper(get("warehouse").value);
      product.satuan = satuan;
      product.satuanBesar = U.upper(get("satuanBesar").value);
      product.rasioKonversi = rasio;
      product.minStock = minStock;
      product.avgHpp = avgHpp;
      product.sellPrice = sellPrice;
      ensureReference("categories", product.category);
      ensureReference("units", product.satuan);
      ensureReference("units", product.satuanBesar);
      App.ui.closeModal();
      store.save();
      App.ui.toast("Data " + name + " berhasil diperbarui.", "success", "Barang diperbarui");
      return;
    }

    const newId = "PRD-" + Date.now();
    const initialStock = Math.max(0, U.parseNumber((get("initialStock") || { value: 0 }).value));
    const product = {
      id: newId,
      sku: sku,
      name: name,
      category: category || "LAINNYA",
      warehouse: U.upper(get("warehouse").value),
      satuan: satuan,
      satuanBesar: U.upper(get("satuanBesar").value),
      rasioKonversi: rasio,
      minStock: minStock,
      stock: initialStock,
      avgHpp: avgHpp,
      sellPrice: sellPrice,
      barcode: U.upper(get("barcode").value)
    };
    data.products.push(product);
    ensureReference("categories", product.category);
    ensureReference("units", product.satuan);
    ensureReference("units", product.satuanBesar);

    if (initialStock > 0) {
      data.mutasi.push({
        id: "TX-" + Date.now().toString().slice(-6),
        date: now,
        type: "IN",
        productId: newId,
        name: name,
        qty: initialStock,
        txUnit: satuan,
        inputQty: initialStock,
        unitCost: avgHpp,
        batchNo: U.autoBatchNo(),
        expireDate: "-",
        notes: "STOK AWAL",
        user: user
      });
    }

    App.ui.closeModal();
    store.save();
    App.ui.toast("Barang baru " + name + " berhasil ditambahkan.", "success", "Barang disimpan");
  };

  App.actions["products:new"] = function () { openProductModal(null); };

  App.actions["products:edit"] = function (el) {
    const id = el.getAttribute("data-id");
    if (id) openProductModal(id);
  };

  App.actions["products:delete"] = async function (el) {
    if (!App.auth.requireAdmin("menghapus data barang")) return;
    const id = el.getAttribute("data-id");
    const product = store.productById(id);
    if (!product) return;
    const ok = await App.ui.confirm({
      title: "Hapus barang?",
      message: "Barang <strong>" + U.esc(product.name) + "</strong> akan dihapus dari master data.",
      note: "Riwayat mutasi dan opname tetap disimpan sebagai arsip. Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Ya, hapus",
      variant: "danger",
      icon: "fa-trash"
    });
    if (!ok) return;
    const data = store.get();
    data.products = data.products.filter(function (p) { return String(p.id) !== String(id); });
    store.save();
    App.ui.toast("Barang " + product.name + " telah dihapus.", "success", "Barang dihapus");
  };

  App.actions["products:export"] = function () {
    const list = filteredProducts();
    if (!list.length) {
      App.ui.toast("Tidak ada data untuk diekspor.", "warning", "Ekspor kosong");
      return;
    }
    App.exports.productsCSV(list);
    App.ui.toast(list.length + " barang diekspor ke CSV.", "success", "Ekspor selesai");
  };

  App.actions["products:import"] = function () {
    if (!App.auth.requireAdmin("mengimpor data barang")) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.style.display = "none";
    input.addEventListener("change", function () {
      const file = input.files && input.files[0];
      if (file) handleImportFile(file);
      if (input.parentNode) input.parentNode.removeChild(input);
    });
    document.body.appendChild(input);
    input.click();
  };

  function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const rows = U.csvToObjects(U.parseCSV(event.target.result));
        if (!rows.length) {
          App.ui.toast("Berkas CSV tidak berisi data.", "error", "Impor gagal");
          return;
        }
        const data = store.get();
        const user = store.user() ? store.user().name : "SYSTEM";
        let created = 0;
        let updated = 0;
        let adjusted = 0;
        const now = U.nowStamp();

        // CSV headers are normalized by removing spaces and punctuation, so match
        // flexible aliases such as "NAMA BARANG", "HARGA BELI (HPP)" or "STOK FISIK".
        function pick(row, aliases) {
          for (let i = 0; i < aliases.length; i += 1) {
            const key = U.upper(aliases[i]).replace(/[^A-Z0-9]/g, "");
            if (!key) continue;
            const value = row[key];
            if (value !== undefined && value !== "") return value;
          }
          return undefined;
        }

        rows.forEach(function (row, index) {
          const name = U.upper(pick(row, ["NAMA", "NAMA BARANG", "NAME", "BARANG"]));
          if (!name) return;
          const sku = U.upper(pick(row, ["SKU", "KODE"]));
          const barcode = U.upper(pick(row, ["BARCODE", "BAR CODE"]));
          let product = null;
          if (sku) product = data.products.find(function (p) { return U.upper(p.sku) === sku; });
          if (!product && barcode) product = data.products.find(function (p) { return U.upper(p.barcode) === barcode; });
          if (!product) product = data.products.find(function (p) { return U.upper(p.name) === name; });

          const stockVal = pick(row, ["STOK FISIK", "STOK", "STOCK"]);
          const minVal = pick(row, ["BATAS MINIMUM", "MIN STOCK", "MINIMUM"]);
          const hppVal = pick(row, ["HARGA BELI (HPP)", "HARGA BELI", "HPP"]);
          const sellVal = pick(row, ["HARGA JUAL", "SELL PRICE"]);
          const categoryVal = pick(row, ["KATEGORI", "CATEGORY"]);
          const warehouseVal = pick(row, ["GUDANG/RAK", "GUDANG", "RAK", "WAREHOUSE"]);
          const unitVal = pick(row, ["SATUAN ECERAN", "SATUAN", "UNIT"]);
          const bigUnitVal = pick(row, ["SATUAN GROSIR", "SATUAN DUS", "SATUAN BESAR"]);
          const ratioVal = pick(row, ["RASIO KONVERSI", "RASIO"]);

          if (!product) {
            const stock = Math.max(0, U.parseNumber(stockVal));
            product = {
              id: "PRD-" + Date.now() + "-" + index,
              sku: sku || ("IMP-" + String(Date.now()).slice(-6) + "-" + index),
              barcode: barcode,
              name: name,
              category: U.upper(categoryVal) || "LAINNYA",
              warehouse: U.upper(warehouseVal),
              satuan: U.upper(unitVal) || "PCS",
              satuanBesar: U.upper(bigUnitVal),
              rasioKonversi: Math.max(1, U.parseNumber(ratioVal) || 1),
              minStock: Math.max(0, U.parseNumber(minVal)),
              stock: stock,
              avgHpp: Math.max(0, U.parseNumber(hppVal)),
              sellPrice: Math.max(0, U.parseNumber(sellVal))
            };
            data.products.push(product);
            created += 1;
            if (stock > 0) {
              data.mutasi.push({
                id: "TX-" + Date.now() + "-" + index,
                date: now,
                type: "IN",
                productId: product.id,
                name: product.name,
                qty: stock,
                txUnit: product.satuan,
                inputQty: stock,
                unitCost: product.avgHpp,
                batchNo: U.autoBatchNo(),
                expireDate: "-",
                notes: "IMPORT CSV: STOK AWAL",
                user: user
              });
            }
          } else {
            product.name = name;
            if (sku) product.sku = sku;
            if (barcode) product.barcode = barcode;
            if (categoryVal) product.category = U.upper(categoryVal);
            if (warehouseVal) product.warehouse = U.upper(warehouseVal);
            if (unitVal) product.satuan = U.upper(unitVal);
            if (bigUnitVal) product.satuanBesar = U.upper(bigUnitVal);
            if (ratioVal !== undefined && ratioVal !== "") product.rasioKonversi = Math.max(1, U.parseNumber(ratioVal) || 1);
            if (minVal !== undefined && minVal !== "") product.minStock = Math.max(0, U.parseNumber(minVal));
            if (hppVal !== undefined && hppVal !== "") product.avgHpp = Math.max(0, U.parseNumber(hppVal));
            if (sellVal !== undefined && sellVal !== "") product.sellPrice = Math.max(0, U.parseNumber(sellVal));

            if (stockVal !== undefined && stockVal !== "") {
              const newStock = Math.max(0, U.parseNumber(stockVal));
              const diff = newStock - (Number(product.stock) || 0);
              if (Math.abs(diff) > 0.0001) {
                product.stock = newStock;
                data.mutasi.push({
                  id: "TX-" + Date.now() + "-" + index,
                  date: now,
                  type: diff > 0 ? "IN" : "OUT",
                  productId: product.id,
                  name: product.name,
                  qty: Math.abs(diff),
                  txUnit: product.satuan,
                  inputQty: Math.abs(diff),
                  unitCost: product.avgHpp,
                  batchNo: U.autoBatchNo(),
                  expireDate: "-",
                  notes: "IMPORT CSV: PENYESUAIAN STOK",
                  user: user
                });
                adjusted += 1;
              }
            }
            updated += 1;
          }

          if (product.category) ensureReference("categories", product.category);
          if (product.satuan) ensureReference("units", product.satuan);
          if (product.satuanBesar) ensureReference("units", product.satuanBesar);
        });

        store.save();
        App.ui.toast(created + " barang baru, " + updated + " diperbarui, " + adjusted + " penyesuaian stok.", "success", "Impor CSV selesai");
      } catch (error) {
        console.error("Impor CSV gagal:", error);
        App.ui.toast("Berkas CSV tidak valid atau format tidak sesuai.", "error", "Impor gagal");
      }
    };
    reader.readAsText(file);
  }

  App.actions["products:reset"] = function () {
    state.search = "";
    state.category = "";
    state.stock = "";
    state.sort = "name-asc";
    state.page = 1;
    App.router.refreshHard();
  };

  App.inputActions["products:search"] = function (el) {
    state.search = el.value;
    state.page = 1;
    App.router.refresh();
  };

  App.changeActions["products:filter"] = function () {
    const categoryEl = U.$("#productCategory");
    const stockEl = U.$("#productStock");
    const sortEl = U.$("#productSort");
    if (categoryEl) state.category = categoryEl.value;
    if (stockEl) state.stock = stockEl.value;
    if (sortEl) state.sort = sortEl.value;
    state.page = 1;
    App.router.refresh();
  };

  App.actions["products:page-prev"] = function () {
    if (state.page <= 1) return;
    state.page -= 1;
    App.router.refresh();
  };

  App.actions["products:page-next"] = function () {
    const list = filteredProducts();
    const pages = Math.max(1, Math.ceil(list.length / pageSize()));
    if (state.page >= pages) return;
    state.page += 1;
    App.router.refresh();
  };

  App.inputActions["products:currency"] = function (el) {
    App.ui.formatCurrencyInput(el);
  };

  App.router.register({
    id: "products",
    label: "Master Barang",
    subtitle: "Kelola data barang, satuan, harga, dan batas minimum stok",
    group: "Data",
    icon: "fa-boxes-stacked",
    render: render,
    badge: function () {
      const count = store.lowStock().length;
      return count ? String(count) : null;
    }
  });

  App.modules.products = {
    render: render,
    openProductModal: openProductModal,
    showLowStock: function () {
      state.stock = "low";
      state.page = 1;
      if (App.router.current() && App.router.current().id === "products") App.router.refreshHard();
      else App.router.go("products");
    },
    state: state
  };
})(window.App);
