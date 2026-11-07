/* =========================================================
   Kartu Stok — Application Configuration
   ========================================================= */

window.App = window.App || {};
App.modules = App.modules || {};
App.actions = App.actions || {};
App.inputActions = App.inputActions || {};
App.changeActions = App.changeActions || {};
App.formActions = App.formActions || {};
App.keyActions = App.keyActions || {};

(function (App) {
  "use strict";

  function pad(n) { return String(n).padStart(2, "0"); }

  function dateOnly(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + Number(offsetDays || 0));
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function stamp(offsetDays, hour, minute) {
    const d = new Date();
    d.setDate(d.getDate() + Number(offsetDays || 0));
    d.setHours(hour == null ? 8 : hour, minute == null ? 30 : minute, 0, 0);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  const SUPABASE_URL = "https://wfbclfxnknspamkavqtk.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmNsZnhua25zcGFta2F2cXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODQ4NDQsImV4cCI6MjEwMTc2MDg0NH0.xORViaKJlXYWoXA-fhrQE1_E1I8DGxS7PNthYZoz3nw";

  const query = new URLSearchParams(window.location.search);
  const cloudDisabledByFlag = query.get("offline") === "1" ||
    (function () {
      try { return localStorage.getItem("KARTU_STOK_CLOUD_OFF") === "1"; }
      catch (e) { return false; }
    })();

  App.config = {
    appName: "Kartu Stok Gudang",
    shortName: "Kartu Stok",
    version: "6.0.0",
    edition: "Enterprise Cloud",
    developer: "Urai Ikhsan Fadhilah",
    storageKeys: {
      data: "KARTU_STOK_PRO_DATA",
      theme: "KARTU_STOK_THEME",
      opnameDraft: "KARTU_STOK_OPNAME_DRAFT",
      lastSync: "KARTU_STOK_LAST_SYNC",
      cloudOff: "KARTU_STOK_CLOUD_OFF"
    },
    pageSize: 10,
    auditPageSize: 8,
    passwordSalt: "NINNA_KARTUSTOK_SECRET_2026",
    masterKey: "NINNA-MASTER-2026",
    users: [
      { username: "admin", password: "admin123", role: "admin", name: "ADMINISTRATOR" },
      { username: "staf", password: "staf123", role: "staff", name: "STAF GUDANG" }
    ],
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
    },
    defaultData: {
      currentUser: null,
      profile: {
        storeName: "TOKO GUDANG UTAMA",
        address: "JL. MERDEKA NO. 123",
        city: "PONTIANAK, KALIMANTAN BARAT",
        phone: "0812-3456-7890",
        licenseKey: "NINNA-MASTER-2026"
      },
      categories: ["SEMBAKO", "KEMASAN", "MINUMAN", "SABUN & DETERJEN", "MAKANAN RINGAN"],
      units: ["PCS", "BUNGKUS", "BOTOL", "KALENG", "KG", "KARTON", "DUS", "PACK", "BAL", "IKAT", "SACHET"],
      products: [
        {
          id: "1", sku: "BRG-001", name: "MINYAK GORENG 1L", category: "SEMBAKO",
          warehouse: "RAK A-01", satuan: "BUNGKUS", satuanBesar: "KARTON", rasioKonversi: 12,
          minStock: 20, stock: 48, avgHpp: 14000, sellPrice: 18000, barcode: "8991234567890"
        },
        {
          id: "2", sku: "BRG-002", name: "KARDUS BOX 30X20", category: "KEMASAN",
          warehouse: "RAK B-03", satuan: "PCS", satuanBesar: "KARTON", rasioKonversi: 25,
          minStock: 50, stock: 12, avgHpp: 2500, sellPrice: 3500, barcode: "8991234567891"
        }
      ],
      mutasi: [
        {
          id: "TX-1001", date: stamp(-12, 8, 30), type: "IN", productId: "1",
          name: "MINYAK GORENG 1L", qty: 50, txUnit: "BUNGKUS", inputQty: 50,
          unitCost: 14000, batchNo: "BTC-20260818-001", expireDate: dateOnly(25),
          notes: "PEMBELIAN DARI DISTRIBUTOR", user: "ADMINISTRATOR"
        },
        {
          id: "TX-1002", date: stamp(-10, 9, 15), type: "IN", productId: "2",
          name: "KARDUS BOX 30X20", qty: 20, txUnit: "PCS", inputQty: 20,
          unitCost: 2500, batchNo: "BTC-20260820-002", expireDate: dateOnly(55),
          notes: "STOK AWAL", user: "ADMINISTRATOR"
        },
        {
          id: "TX-1003", date: stamp(-5, 13, 45), type: "OUT", productId: "1",
          name: "MINYAK GORENG 1L", qty: 2, txUnit: "BUNGKUS", inputQty: 2,
          unitCost: 14000, batchNo: "BTC-20260818-001", expireDate: "-",
          notes: "PENJUALAN", user: "STAF GUDANG"
        },
        {
          id: "TX-1004", date: stamp(-3, 15, 10), type: "OUT", productId: "2",
          name: "KARDUS BOX 30X20", qty: 8, txUnit: "PCS", inputQty: 8,
          unitCost: 2500, batchNo: "BTC-20260820-002", expireDate: "-",
          notes: "PENJUALAN", user: "STAF GUDANG"
        }
      ],
      opname: []
    }
  };

  // Avoid shared references when the default object is reused.
  App.config.cloneDefaultData = function () {
    return JSON.parse(JSON.stringify(App.config.defaultData));
  };
})(window.App);
