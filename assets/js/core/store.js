/* =========================================================
   Kartu Stok — Local Store & Derived Selectors
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const KEY = App.config.storageKeys.data;

  const listeners = [];
  let data = null;

  function numeric(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function normalizeProduct(product, index) {
    const p = product || {};
    return {
      id: String(p.id != null ? p.id : ("PRD-" + Date.now() + "-" + index)),
      sku: U.upper(p.sku),
      name: U.upper(p.name),
      category: U.upper(p.category) || "LAINNYA",
      warehouse: U.upper(p.warehouse),
      satuan: U.upper(p.satuan) || "PCS",
      satuanBesar: U.upper(p.satuanBesar),
      rasioKonversi: Math.max(1, numeric(p.rasioKonversi, 1)),
      minStock: Math.max(0, numeric(p.minStock, 0)),
      stock: numeric(p.stock, 0),
      avgHpp: Math.max(0, numeric(p.avgHpp, 0)),
      sellPrice: Math.max(0, numeric(p.sellPrice, 0)),
      barcode: U.upper(p.barcode)
    };
  }

  function normalizeMutation(mutation, index) {
    const m = mutation || {};
    const type = U.upper(m.type) === "OUT" ? "OUT" : "IN";
    const qty = numeric(m.qty, 0);
    return {
      id: String(m.id != null ? m.id : ("TX-" + Date.now() + "-" + index)),
      date: m.date ? String(m.date) : U.nowStamp(),
      type: type,
      productId: String(m.productId || ""),
      name: U.upper(m.name),
      qty: qty,
      txUnit: U.upper(m.txUnit) || "PCS",
      inputQty: numeric(m.inputQty, qty),
      unitCost: Math.max(0, numeric(m.unitCost, 0)),
      batchNo: U.upper(m.batchNo) || "-",
      expireDate: m.expireDate ? String(m.expireDate) : "-",
      notes: U.upper(m.notes) || "-",
      user: U.upper(m.user) || "SYSTEM"
    };
  }

  function normalizeOpname(record, index) {
    const o = record || {};
    const systemQty = numeric(o.systemQty, 0);
    const actualQty = numeric(o.actualQty, 0);
    return {
      id: String(o.id != null ? o.id : ("ADJ-" + Date.now() + "-" + index)),
      date: o.date ? String(o.date) : U.todayISO(),
      productId: o.productId ? String(o.productId) : "",
      name: U.upper(o.name),
      systemQty: systemQty,
      actualQty: actualQty,
      diffQty: numeric(o.diffQty, actualQty - systemQty),
      reason: U.upper(o.reason) || "HASIL OPNAME FISIK",
      user: U.upper(o.user) || "SYSTEM"
    };
  }

  function normalize(input) {
    const defaults = App.config.cloneDefaultData();
    const raw = input && typeof input === "object" ? input : {};
    const merged = Object.assign({}, defaults, raw);

    merged.profile = Object.assign({}, defaults.profile, raw.profile || {});
    merged.profile.storeName = U.upper(merged.profile.storeName);
    merged.profile.address = U.upper(merged.profile.address);
    merged.profile.city = U.upper(merged.profile.city);
    merged.profile.phone = String(merged.profile.phone || "").trim();
    merged.profile.licenseKey = String(merged.profile.licenseKey || App.config.masterKey).trim();

    merged.categories = U.unique((Array.isArray(merged.categories) ? merged.categories : defaults.categories)
      .map(function (c) { return U.upper(c); })
      .filter(Boolean));

    merged.units = U.unique((Array.isArray(merged.units) ? merged.units : defaults.units)
      .map(function (u) { return U.upper(u); })
      .filter(Boolean));

    merged.products = (Array.isArray(merged.products) ? merged.products : []).map(normalizeProduct);
    merged.mutasi = (Array.isArray(merged.mutasi) ? merged.mutasi : []).map(normalizeMutation);
    merged.opname = (Array.isArray(merged.opname) ? merged.opname : []).map(normalizeOpname);

    // Keep reference lists in sync with data that may come from an older backup.
    merged.products.forEach(function (p) {
      if (p.category && merged.categories.indexOf(p.category) === -1) merged.categories.push(p.category);
      if (p.satuan && merged.units.indexOf(p.satuan) === -1) merged.units.push(p.satuan);
      if (p.satuanBesar && merged.units.indexOf(p.satuanBesar) === -1) merged.units.push(p.satuanBesar);
    });

    if (raw.currentUser && typeof raw.currentUser === "object") {
      const account = App.config.users.find(function (user) {
        return user.username === String(raw.currentUser.username || "").toLowerCase();
      });
      merged.currentUser = account
        ? { username: account.username, role: account.role, name: account.name }
        : null;
    } else {
      merged.currentUser = null;
    }

    return merged;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Gagal menyimpan data lokal:", error);
      if (App.ui && App.ui.toast) {
        App.ui.toast("Penyimpanan lokal penuh. Ekspor cadangan lalu bersihkan data lama.", "error", "Penyimpanan gagal");
      }
      return false;
    }
  }

  function emit(eventName) {
    listeners.forEach(function (listener) {
      try { listener(eventName || "change", data); }
      catch (error) { console.error("Store listener error:", error); }
    });
  }

  const store = {
    load: function () {
      let parsed = null;
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) parsed = JSON.parse(raw);
      } catch (error) {
        console.warn("Data lokal tidak valid, memakai data default.", error);
      }
      data = normalize(parsed);
      persist();
      return data;
    },

    save: function (options) {
      const opts = options || {};
      persist();
      emit("change");
      if (opts.render !== false && App.router && App.router.refresh) {
        App.router.refresh();
      }
      if (opts.sync !== false && App.cloud && App.cloud.schedulePush) {
        App.cloud.schedulePush();
      }
      return data;
    },

    replace: function (newData, options) {
      data = normalize(newData);
      return store.save(options);
    },

    reset: function (options) {
      data = normalize(App.config.cloneDefaultData());
      data.currentUser = null;
      return store.save(options);
    },

    get: function () { return data; },
    get data() { return data; },

    on: function (listener) {
      listeners.push(listener);
      return function () {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },

    user: function () { return data ? data.currentUser : null; },
    isAdmin: function () { return Boolean(data && data.currentUser && data.currentUser.role === "admin"); },
    isLoggedIn: function () { return Boolean(data && data.currentUser); },

    profile: function () { return (data && data.profile) || {}; },
    products: function () { return (data && data.products) || []; },
    mutations: function () { return (data && data.mutasi) || []; },
    opname: function () { return (data && data.opname) || []; },
    categories: function () { return (data && data.categories) || []; },
    units: function () { return (data && data.units) || []; },

    productById: function (id) {
      return store.products().find(function (p) { return String(p.id) === String(id); }) || null;
    },

    productByBarcode: function (code) {
      const clean = U.upper(code);
      if (!clean) return null;
      return store.products().find(function (p) {
        return U.upper(p.barcode) === clean || U.upper(p.sku) === clean;
      }) || null;
    },

    lowStock: function () {
      return store.products()
        .filter(function (p) { return Number(p.stock) <= Number(p.minStock); })
        .sort(function (a, b) {
          const ratioA = Number(a.minStock) > 0 ? Number(a.stock) / Number(a.minStock) : 0;
          const ratioB = Number(b.minStock) > 0 ? Number(b.stock) / Number(b.minStock) : 0;
          return ratioA - ratioB;
        });
    },

    outOfStock: function () {
      return store.products().filter(function (p) { return Number(p.stock) <= 0; });
    },

    expiringBatches: function (days) {
      const limit = days == null ? 30 : Number(days);
      const seen = {};
      const batches = [];
      store.mutations().forEach(function (m) {
        if (!m.expireDate || m.expireDate === "-") return;
        const key = String(m.productId) + "::" + m.batchNo + "::" + m.expireDate;
        const info = U.expiryInfo(m.expireDate);
        if (info.days === null) return;
        if (info.days > limit) return;
        const product = store.productById(m.productId);
        const unit = product ? U.unitInfo(product).base : m.txUnit;
        if (!seen[key]) {
          seen[key] = true;
          batches.push({
            productId: m.productId,
            name: m.name,
            batchNo: m.batchNo,
            expireDate: m.expireDate,
            qty: m.qty,
            unit: unit,
            notes: m.notes,
            info: info,
            mutation: m
          });
        }
      });
      return batches.sort(function (a, b) {
        return String(a.expireDate).localeCompare(String(b.expireDate));
      });
    },

    mutationChronological: function () {
      return store.mutations()
        .map(function (m, index) { return { m: m, index: index }; })
        .sort(function (a, b) {
          const dateCompare = String(a.m.date || "").localeCompare(String(b.m.date || ""));
          return dateCompare !== 0 ? dateCompare : a.index - b.index;
        })
        .map(function (entry) { return entry.m; });
    },

    mutationsForProduct: function (productId) {
      return store.mutationChronological().filter(function (m) {
        return String(m.productId) === String(productId);
      });
    },

    recentMutations: function (limit) {
      const list = store.mutationChronological().slice().reverse();
      return limit ? list.slice(0, limit) : list;
    },

    ledgerForProduct: function (productId, from, to) {
      const product = store.productById(productId);
      if (!product) {
        return { product: null, opening: 0, entries: [], totalIn: 0, totalOut: 0, closing: 0, systemStock: 0, mismatch: false };
      }
      const fromDate = from ? String(from).slice(0, 10) : "";
      const toDate = to ? String(to).slice(0, 10) : "";
      let opening = 0;
      let running = 0;
      let totalIn = 0;
      let totalOut = 0;
      const entries = [];

      store.mutationsForProduct(productId).forEach(function (m) {
        const dateKey = String(m.date || "").slice(0, 10);
        const qty = Number(m.qty) || 0;
        const isBefore = fromDate && dateKey < fromDate;
        if (isBefore) {
          opening += m.type === "IN" ? qty : -qty;
          return;
        }
        if (toDate && dateKey > toDate) return;
        running += m.type === "IN" ? qty : -qty;
        if (m.type === "IN") totalIn += qty;
        else totalOut += qty;
        entries.push({ mutation: m, balanceAfter: opening + running });
      });

      const closing = opening + running;
      return {
        product: product,
        opening: opening,
        entries: entries,
        totalIn: totalIn,
        totalOut: totalOut,
        closing: closing,
        systemStock: Number(product.stock) || 0,
        mismatch: Math.abs(closing - (Number(product.stock) || 0)) > 0.0001
      };
    },

    categoryBreakdown: function () {
      const map = {};
      store.products().forEach(function (p) {
        const key = p.category || "LAINNYA";
        if (!map[key]) map[key] = { category: key, count: 0, qty: 0, value: 0, sellValue: 0 };
        map[key].count += 1;
        map[key].qty += Number(p.stock) || 0;
        map[key].value += (Number(p.stock) || 0) * (Number(p.avgHpp) || 0);
        map[key].sellValue += (Number(p.stock) || 0) * (Number(p.sellPrice) || 0);
      });
      return Object.keys(map).map(function (key) { return map[key]; })
        .sort(function (a, b) { return b.value - a.value; });
    },

    topValueProducts: function (limit) {
      return store.products().slice()
        .sort(function (a, b) {
          return ((Number(b.stock) || 0) * (Number(b.avgHpp) || 0)) -
            ((Number(a.stock) || 0) * (Number(a.avgHpp) || 0));
        })
        .slice(0, limit || 5);
    },

    movementSeries: function (days) {
      const totalDays = days || 7;
      const labels = [];
      const keys = [];
      const inMap = {};
      const outMap = {};
      for (let i = totalDays - 1; i >= 0; i -= 1) {
        const d = U.offsetDate(-i);
        const key = U.dateOnly(d);
        keys.push(key);
        labels.push(U.formatDayShort(d));
        inMap[key] = 0;
        outMap[key] = 0;
      }
      store.mutations().forEach(function (m) {
        const key = String(m.date || "").slice(0, 10);
        if (!(key in inMap)) return;
        if (m.type === "IN") inMap[key] += Number(m.qty) || 0;
        else outMap[key] += Number(m.qty) || 0;
      });
      return {
        labels: labels,
        keys: keys,
        inbound: keys.map(function (k) { return inMap[k]; }),
        outbound: keys.map(function (k) { return outMap[k]; })
      };
    },

    stats: function () {
      const products = store.products();
      const totalQty = U.sum(products, function (p) { return p.stock; });
      const totalHpp = U.sum(products, function (p) { return (Number(p.stock) || 0) * (Number(p.avgHpp) || 0); });
      const totalSell = U.sum(products, function (p) { return (Number(p.stock) || 0) * (Number(p.sellPrice) || 0); });
      const lowStock = store.lowStock();
      const outOfStock = store.outOfStock();
      const batches = store.expiringBatches(30);
      const expired = batches.filter(function (b) { return b.info.status === "expired" || b.info.status === "today"; });
      const soon = batches.filter(function (b) { return b.info.status === "soon"; });
      return {
        itemCount: products.length,
        categoryCount: store.categories().length,
        unitCount: store.units().length,
        totalQty: totalQty,
        totalHpp: totalHpp,
        totalSell: totalSell,
        potentialProfit: totalSell - totalHpp,
        marginPercent: totalHpp > 0 ? ((totalSell - totalHpp) / totalHpp) * 100 : 0,
        lowStockCount: lowStock.length,
        lowStockItems: lowStock,
        outOfStockCount: outOfStock.length,
        expiredCount: expired.length,
        soonCount: soon.length,
        expiringCount: batches.length,
        expiringBatches: batches,
        mutationCount: store.mutations().length,
        opnameCount: store.opname().length,
        todayMutationCount: store.mutations().filter(function (m) {
          return String(m.date || "").slice(0, 10) === U.todayISO();
        }).length
      };
    }
  };

  App.store = store;
})(window.App);
