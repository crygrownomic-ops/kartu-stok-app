/* =========================================================
   Kartu Stok — Master Kategori & Satuan
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const store = App.store;

  function usageCount(list, name) {
    if (list === "categories") {
      return store.products().filter(function (p) { return U.upper(p.category) === U.upper(name); }).length;
    }
    return store.products().filter(function (p) {
      return U.upper(p.satuan) === U.upper(name) || U.upper(p.satuanBesar) === U.upper(name);
    }).length;
  }

  function referenceCard(options) {
    const o = options || {};
    const items = o.items || [];
    return '<div class="card">' +
      '<div class="card-head has-border">' +
        '<div class="card-title-wrap">' +
          '<div class="card-title"><i class="fa-solid ' + U.escapeAttr(o.icon) + '"></i> ' + U.esc(o.title) + '</div>' +
          '<div class="card-sub">' + U.esc(o.subtitle) + '</div>' +
        '</div>' +
        '<span class="badge badge-primary">' + items.length + ' data</span>' +
      '</div>' +
      '<div class="card-body pad">' +
        '<form data-form-action="' + U.escapeAttr(o.formAction) + '" autocomplete="off">' +
          '<div class="flex gap-2 items-center" style="margin-bottom:14px">' +
            '<input class="input uppercase-input" name="value" id="' + U.escapeAttr(o.inputId) + '" placeholder="' + U.escapeAttr(o.placeholder) + '" maxlength="40" required style="flex:1">' +
            '<button type="submit" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Tambah</button>' +
          '</div>' +
        '</form>' +
        '<div class="mini-list">' +
          (items.length
            ? items.map(function (item) {
              const used = usageCount(o.listName, item);
              return '<div class="mini-list-item">' +
                '<div style="display:flex;align-items:center;gap:9px;min-width:0">' +
                  '<span class="setting-icon" style="width:28px;height:28px;flex-basis:28px;font-size:11px"><i class="fa-solid ' + U.escapeAttr(o.itemIcon) + '"></i></span>' +
                  '<div style="min-width:0"><div class="name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + U.esc(item) + '</div>' +
                  '<div class="meta">' + used + ' barang memakai</div></div>' +
                '</div>' +
                '<button type="button" class="btn btn-icon btn-sm btn-soft-danger" data-action="reference:delete" data-list="' + U.escapeAttr(o.listName) + '" data-name="' + U.escapeAttr(item) + '" title="Hapus ' + U.escapeAttr(item) + '"><i class="fa-solid fa-trash"></i></button>' +
              '</div>';
            }).join("")
            : App.ui.emptyState({ icon: o.itemIcon, title: "Belum ada data", text: "Tambahkan " + o.title.toLowerCase() + " pertama melalui formulir di atas." })) +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function render() {
    return '<div class="page-stack">' +
      '<div class="info-banner"><i class="fa-solid fa-circle-info"></i><div>' +
        'Kategori dan satuan digunakan pada formulir master barang serta filter laporan. ' +
        'Data yang masih dipakai oleh barang tidak dapat dihapus untuk menjaga konsistensi.' +
      '</div></div>' +
      '<div class="section-grid">' +
        referenceCard({
          title: "Kategori Barang",
          subtitle: "Pengelompokan barang untuk laporan dan filter",
          icon: "fa-tags",
          itemIcon: "fa-tag",
          listName: "categories",
          items: store.categories(),
          inputId: "inputNewCategory",
          placeholder: "Contoh: SEMBAKO",
          formAction: "reference:add-category"
        }) +
        referenceCard({
          title: "Satuan",
          subtitle: "Satuan eceran dan grosir yang tersedia",
          icon: "fa-ruler-combined",
          itemIcon: "fa-ruler",
          listName: "units",
          items: store.units(),
          inputId: "inputNewUnit",
          placeholder: "Contoh: KARTON",
          formAction: "reference:add-unit"
        }) +
      '</div>' +
      '<div class="card"><div class="card-body pad">' +
        '<div class="metric-inline">' +
          '<div class="mi"><div class="mi-label">Kategori</div><div class="mi-value">' + store.categories().length + '</div></div>' +
          '<div class="mi"><div class="mi-label">Satuan</div><div class="mi-value">' + store.units().length + '</div></div>' +
          '<div class="mi"><div class="mi-label">Barang</div><div class="mi-value">' + store.products().length + '</div></div>' +
          '<div class="mi"><div class="mi-label">Kategori Terpakai</div><div class="mi-value">' + store.categories().filter(function (c) { return usageCount("categories", c) > 0; }).length + '</div></div>' +
        '</div>' +
      '</div></div>' +
    '</div>';
  }

  function addReference(listName, value) {
    if (!App.auth.requireAdmin("mengubah referensi data")) return;
    const clean = U.upper(value);
    if (!clean) {
      App.ui.toast("Nilai tidak boleh kosong.", "error", "Input tidak valid");
      return;
    }
    const data = store.get();
    if (!Array.isArray(data[listName])) data[listName] = [];
    if (data[listName].indexOf(clean) >= 0) {
      App.ui.toast(clean + " sudah terdaftar.", "warning", "Data sudah ada");
      return;
    }
    data[listName].push(clean);
    data[listName].sort();
    store.save();
    App.ui.toast(clean + " berhasil ditambahkan.", "success", "Referensi ditambahkan");
  }

  App.formActions["reference:add-category"] = function (form) {
    const input = form.querySelector('[name="value"]');
    addReference("categories", input ? input.value : "");
    if (input) input.value = "";
  };

  App.formActions["reference:add-unit"] = function (form) {
    const input = form.querySelector('[name="value"]');
    addReference("units", input ? input.value : "");
    if (input) input.value = "";
  };

  App.actions["reference:delete"] = async function (el) {
    if (!App.auth.requireAdmin("menghapus referensi data")) return;
    const listName = el.getAttribute("data-list");
    const name = el.getAttribute("data-name");
    if (!listName || !name) return;
    const used = usageCount(listName, name);
    if (used > 0) {
      App.ui.toast(name + " masih digunakan oleh " + used + " barang. Ubah data barang terlebih dahulu.", "error", "Tidak dapat dihapus");
      return;
    }
    const ok = await App.ui.confirm({
      title: "Hapus referensi?",
      message: "<strong>" + U.esc(name) + "</strong> akan dihapus dari daftar " + (listName === "categories" ? "kategori" : "satuan") + ".",
      confirmText: "Ya, hapus",
      variant: "danger",
      icon: "fa-trash"
    });
    if (!ok) return;
    const data = store.get();
    data[listName] = (data[listName] || []).filter(function (item) { return U.upper(item) !== U.upper(name); });
    store.save();
    App.ui.toast(name + " telah dihapus.", "success", "Referensi dihapus");
  };

  App.router.register({
    id: "reference",
    label: "Kategori & Satuan",
    subtitle: "Kelola referensi kategori barang dan satuan",
    group: "Data",
    icon: "fa-tags",
    adminOnly: true,
    render: render
  });

  App.modules.reference = { render: render };
})(window.App);
