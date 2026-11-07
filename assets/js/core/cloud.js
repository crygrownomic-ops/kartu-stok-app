/* =========================================================
   Kartu Stok — Supabase Cloud Sync
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const C = {};

  let client = null;
  let pushTimer = null;
  let syncing = false;
  let bootstrapped = false;

  function enabled() {
    return Boolean(client) && App.config.cloud.enabled;
  }

  function setStatus(state, text) {
    App.ui.setCloudIndicator(state, text);
  }

  function markSynced() {
    try {
      localStorage.setItem(App.config.storageKeys.lastSync, U.nowStamp());
    } catch (error) { /* ignore */ }
  }

  C.lastSync = function () {
    try { return localStorage.getItem(App.config.storageKeys.lastSync) || ""; }
    catch (error) { return ""; }
  };

  /* ---------------------------------------------------------
     Mapping helpers
     --------------------------------------------------------- */
  function toProduct(row) {
    return {
      id: String(row.id),
      sku: row.sku || "",
      name: row.name || "",
      category: row.category || "",
      warehouse: row.warehouse || "",
      satuan: row.satuan || "PCS",
      satuanBesar: row.satuan_besar || "",
      rasioKonversi: Number(row.rasio_konversi || 1),
      minStock: Number(row.min_stock || 0),
      stock: Number(row.stock || 0),
      avgHpp: Number(row.avg_hpp || 0),
      sellPrice: Number(row.sell_price || 0),
      barcode: row.barcode || ""
    };
  }

  function toMutation(row) {
    return {
      id: String(row.id),
      date: row.date || "",
      type: row.type || "IN",
      productId: row.product_id != null ? String(row.product_id) : "",
      name: row.name || "",
      qty: Number(row.qty || 0),
      txUnit: row.tx_unit || "PCS",
      inputQty: Number(row.input_qty != null ? row.input_qty : row.qty || 0),
      unitCost: Number(row.unit_cost || 0),
      batchNo: row.batch_no || "-",
      expireDate: row.expire_date || "-",
      notes: row.notes || "-",
      user: row.user_name || "SYSTEM"
    };
  }

  function toOpname(row) {
    return {
      id: String(row.id),
      date: row.date || "",
      productId: row.product_id != null ? String(row.product_id) : "",
      name: row.name || "",
      systemQty: Number(row.system_qty || 0),
      actualQty: Number(row.actual_qty || 0),
      diffQty: Number(row.diff_qty || 0),
      reason: row.reason || "",
      user: row.user_name || "SYSTEM"
    };
  }

  function toProfile(row) {
    return {
      storeName: row.store_name || "",
      address: row.address || "",
      city: row.city || "",
      phone: row.phone || "",
      licenseKey: row.license_key || App.config.masterKey
    };
  }

  function productRow(product) {
    return {
      id: String(product.id),
      sku: product.sku || "",
      name: product.name || "",
      category: product.category || "",
      warehouse: product.warehouse || "",
      satuan: product.satuan || "PCS",
      satuan_besar: product.satuanBesar || "",
      rasio_konversi: Number(product.rasioKonversi || 1),
      min_stock: Number(product.minStock || 0),
      stock: Number(product.stock || 0),
      avg_hpp: Number(product.avgHpp || 0),
      sell_price: Number(product.sellPrice || 0),
      barcode: product.barcode || ""
    };
  }

  function mutationRow(mutation) {
    return {
      id: String(mutation.id),
      date: mutation.date,
      type: mutation.type,
      product_id: String(mutation.productId || ""),
      name: mutation.name || "",
      qty: Number(mutation.qty || 0),
      tx_unit: mutation.txUnit || "PCS",
      input_qty: Number(mutation.inputQty != null ? mutation.inputQty : mutation.qty || 0),
      unit_cost: Number(mutation.unitCost || 0),
      batch_no: mutation.batchNo || "-",
      expire_date: mutation.expireDate || "-",
      notes: mutation.notes || "-",
      user_name: mutation.user || "SYSTEM"
    };
  }

  function opnameRow(record) {
    return {
      id: String(record.id),
      date: record.date,
      product_id: record.productId ? String(record.productId) : null,
      name: record.name || "",
      system_qty: Number(record.systemQty || 0),
      actual_qty: Number(record.actualQty || 0),
      diff_qty: Number(record.diffQty || 0),
      reason: record.reason || "",
      user_name: record.user || "SYSTEM"
    };
  }

  function profileRow(profile) {
    return {
      id: 1,
      store_name: profile.storeName || "",
      address: profile.address || "",
      city: profile.city || "",
      phone: profile.phone || "",
      license_key: profile.licenseKey || App.config.masterKey
    };
  }

  async function upsertChunked(table, rows, label) {
    if (!rows || !rows.length) return;
    const chunkSize = 400;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const result = await client.from(table).upsert(chunk, { onConflict: "id" });
      if (result.error) {
        throw new Error("Gagal menyinkronkan " + label + ": " + result.error.message);
      }
    }
  }

  /* ---------------------------------------------------------
     Pull / push
     --------------------------------------------------------- */
  async function pullRemote() {
    const results = await Promise.all([
      client.from("products").select("*"),
      client.from("mutasi").select("*"),
      client.from("opname").select("*"),
      client.from("profile").select("*").limit(1)
    ]);

    const productRes = results[0];
    if (productRes.error) {
      throw new Error("Gagal mengambil data barang: " + productRes.error.message);
    }
    if (results[1].error) throw new Error("Gagal mengambil mutasi: " + results[1].error.message);
    if (results[2].error) throw new Error("Gagal mengambil opname: " + results[2].error.message);
    if (results[3].error) throw new Error("Gagal mengambil profil: " + results[3].error.message);

    const profileRows = results[3].data || [];
    return {
      products: (productRes.data || []).map(toProduct),
      mutasi: (results[1].data || []).map(toMutation),
      opname: (results[2].data || []).map(toOpname),
      profile: profileRows.length ? toProfile(profileRows[0]) : null
    };
  }

  async function pushLocal() {
    const data = App.store.get();
    await upsertChunked("products", (data.products || []).map(productRow), "data barang");
    await upsertChunked("mutasi", (data.mutasi || []).map(mutationRow), "riwayat mutasi");
    await upsertChunked("opname", (data.opname || []).map(opnameRow), "riwayat opname");

    const profile = data.profile || {};
    const profileResult = await client.from("profile").upsert(profileRow(profile), { onConflict: "id" });
    if (profileResult.error) {
      throw new Error("Gagal menyinkronkan profil: " + profileResult.error.message);
    }
  }

  function applyRemote(remote) {
    const current = App.store.get();
    const payload = Object.assign({}, current, {
      products: remote.products,
      mutasi: remote.mutasi,
      opname: remote.opname,
      profile: remote.profile || current.profile,
      currentUser: current.currentUser
    });
    App.store.replace(payload, { sync: false, render: true });
  }

  function hasRemoteData(remote) {
    return Boolean(
      (remote.products && remote.products.length) ||
      (remote.mutasi && remote.mutasi.length) ||
      (remote.opname && remote.opname.length) ||
      remote.profile
    );
  }

  /* ---------------------------------------------------------
     Public API
     --------------------------------------------------------- */
  C.init = function () {
    if (!App.config.cloud.enabled) {
      setStatus("disabled", "Cloud nonaktif");
      return;
    }
    if (!window.supabase || !window.supabase.createClient) {
      setStatus("error", "Library cloud tidak tersedia");
      return;
    }
    try {
      client = window.supabase.createClient(App.config.cloud.url, App.config.cloud.anonKey);
      setStatus(navigator.onLine ? "idle" : "offline");
    } catch (error) {
      console.warn("Supabase init gagal:", error);
      setStatus("error", "Cloud tidak dapat dimuat");
      client = null;
    }
  };

  C.enabled = enabled;

  C.bootstrap = async function () {
    if (!enabled()) {
      if (!App.config.cloud.enabled) setStatus("disabled", "Cloud nonaktif");
      return;
    }
    if (bootstrapped || syncing) return;
    bootstrapped = true;

    if (!navigator.onLine) {
      setStatus("offline", "Mode offline");
      return;
    }

    syncing = true;
    setStatus("syncing", "Memuat data cloud...");
    try {
      const remote = await pullRemote();
      if (hasRemoteData(remote) && remote.products.length) {
        applyRemote(remote);
      } else if (App.store.products().length || App.store.mutations().length || App.store.opname().length) {
        await pushLocal();
      }
      markSynced();
      setStatus("synced", "Cloud tersinkron");
    } catch (error) {
      console.warn("Bootstrap cloud gagal:", error);
      setStatus("error", "Cloud bermasalah");
    } finally {
      syncing = false;
    }
  };

  C.syncNow = async function () {
    if (!App.config.cloud.enabled) {
      App.ui.toast("Sinkronisasi cloud dinonaktifkan. Gunakan ?offline=1 atau hapus flag KARTU_STOK_CLOUD_OFF.", "info", "Cloud nonaktif");
      return false;
    }
    if (!client) {
      App.ui.toast("Library cloud belum siap. Periksa koneksi internet Anda.", "error", "Cloud tidak siap");
      return false;
    }
    if (!navigator.onLine) {
      setStatus("offline", "Mode offline");
      App.ui.toast("Anda sedang offline. Data tetap tersimpan di perangkat ini.", "warning", "Tidak ada koneksi");
      return false;
    }
    if (syncing) return false;

    syncing = true;
    setStatus("syncing", "Menyinkronkan...");
    try {
      await pushLocal();
      const remote = await pullRemote();
      if (hasRemoteData(remote)) applyRemote(remote);
      markSynced();
      setStatus("synced", "Cloud tersinkron");
      App.ui.toast("Data lokal dan cloud berhasil disamakan.", "success", "Sinkronisasi selesai");
      return true;
    } catch (error) {
      console.warn("Sync gagal:", error);
      setStatus("error", "Cloud bermasalah");
      App.ui.toast(error.message || String(error), "error", "Sinkronisasi gagal");
      return false;
    } finally {
      syncing = false;
    }
  };

  C.schedulePush = function () {
    if (!enabled() || !navigator.onLine || !App.store.isLoggedIn()) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(async function () {
      pushTimer = null;
      if (syncing) return;
      syncing = true;
      setStatus("syncing", "Menyimpan ke cloud...");
      try {
        await pushLocal();
        markSynced();
        setStatus("synced", "Cloud tersinkron");
      } catch (error) {
        console.warn("Push cloud gagal:", error);
        setStatus("error", "Cloud bermasalah");
      } finally {
        syncing = false;
      }
    }, 1400);
  };

  C.status = function () {
    if (!App.config.cloud.enabled) return "disabled";
    if (!navigator.onLine) return "offline";
    if (!client) return "error";
    return "idle";
  };

  /* ---------------------------------------------------------
     Global actions
     --------------------------------------------------------- */
  App.actions["cloud:sync"] = function () { C.syncNow(); };

  App.cloud = C;
})(window.App);
