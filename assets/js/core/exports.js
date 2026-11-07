/* =========================================================
   Kartu Stok — Data Exports
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;

  function fileStamp() {
    const d = new Date();
    return U.dateOnly(d).replace(/-/g, "") + "-" + U.pad2(d.getHours()) + U.pad2(d.getMinutes());
  }

  const Exports = {};

  Exports.productsCSV = function (products, filenamePrefix) {
    const rows = [
      ["SKU", "BARCODE", "NAMA BARANG", "KATEGORI", "GUDANG/RAK", "SATUAN ECERAN", "SATUAN GROSIR",
        "RASIO KONVERSI", "STOK FISIK", "BATAS MINIMUM", "HARGA BELI (HPP)", "HARGA JUAL",
        "POTENSI MARGIN", "MARGIN (%)", "NILAI ASET"]
    ];
    (products || []).forEach(function (p) {
      const margin = U.marginInfo(p);
      rows.push([
        p.sku, p.barcode, p.name, p.category, p.warehouse, p.satuan, p.satuanBesar,
        p.rasioKonversi, p.stock, p.minStock, p.avgHpp, p.sellPrice,
        margin.margin, margin.percent == null ? "" : margin.percent.toFixed(1),
        (Number(p.stock) || 0) * (Number(p.avgHpp) || 0)
      ]);
    });
    U.download(
      (filenamePrefix || "MASTER-BARANG") + "-" + fileStamp() + ".csv",
      U.toCSV(rows),
      "text/csv;charset=utf-8"
    );
    return rows.length - 1;
  };

  Exports.mutationsCSV = function (mutations, filenamePrefix) {
    const rows = [
      ["WAKTU", "TIPE", "NAMA BARANG", "QTY DASAR", "SATUAN TRANSAKSI", "QTY TRANSAKSI",
        "HARGA UNIT", "NO BATCH", "TANGGAL EXPIRED", "KETERANGAN", "PETUGAS"]
    ];
    (mutations || []).forEach(function (m) {
      rows.push([
        m.date, m.type, m.name, m.qty, m.txUnit, m.inputQty || m.qty, m.unitCost,
        m.batchNo, m.expireDate, m.notes, m.user
      ]);
    });
    U.download(
      (filenamePrefix || "RIWAYAT-MUTASI") + "-" + fileStamp() + ".csv",
      U.toCSV(rows),
      "text/csv;charset=utf-8"
    );
    return rows.length - 1;
  };

  Exports.opnameTemplateCSV = function (products, filenamePrefix) {
    const rows = [
      ["SKU", "NAMA BARANG", "KATEGORI", "GUDANG/RAK", "SATUAN ECERAN", "STOK SISTEM",
        "STOK FISIK (HITUNG LAPANGAN)", "SELISIH", "CATATAN"]
    ];
    (products || []).forEach(function (p) {
      rows.push([
        p.sku, p.name, p.category, p.warehouse, p.satuan, p.stock, p.stock, 0, ""
      ]);
    });
    U.download(
      (filenamePrefix || "TEMPLATE-OPNAME") + "-" + fileStamp() + ".csv",
      U.toCSV(rows),
      "text/csv;charset=utf-8"
    );
    return rows.length - 1;
  };

  Exports.ledgerCSV = function (product, entries, openingBalance, from, to) {
    if (!product) return 0;
    const u = U.unitInfo(product);
    const rows = [
      ["KARTU STOK LEDGER"],
      ["SKU", product.sku, "BARANG", product.name],
      ["SATUAN", u.base, "PERIODE", (from || "AWAL") + " s/d " + (to || "SEKARANG")],
      ["SALDO AWAL", openingBalance + " " + u.base],
      [],
      ["WAKTU", "KETERANGAN / TRANSAKSI", "NO BATCH", "MASUK", "KELUAR", "SALDO STOK"]
    ];
    (entries || []).forEach(function (entry) {
      const m = entry.mutation || entry;
      const balance = entry.balanceAfter == null ? "" : entry.balanceAfter;
      rows.push([
        m.date,
        U.upper(m.notes || "-"),
        U.upper(m.batchNo || "-"),
        m.type === "IN" ? m.qty + " " + u.base : "-",
        m.type === "OUT" ? m.qty + " " + u.base : "-",
        balance + (balance === "" ? "" : " " + u.base)
      ]);
    });
    U.download(
      "LEDGER-" + product.sku + "-" + fileStamp() + ".csv",
      U.toCSV(rows),
      "text/csv;charset=utf-8"
    );
    return entries ? entries.length : 0;
  };

  Exports.lowStockCSV = function (products) {
    const rows = [
      ["SKU", "NAMA BARANG", "KATEGORI", "RAK", "STOK", "SATUAN", "BATAS MINIMUM", "KEKURANGAN"]
    ];
    (products || []).forEach(function (p) {
      rows.push([
        p.sku, p.name, p.category, p.warehouse, p.stock, p.satuan, p.minStock,
        Math.max(0, (Number(p.minStock) || 0) - (Number(p.stock) || 0))
      ]);
    });
    U.download("LAPORAN-STOK-MENIPIS-" + fileStamp() + ".csv", U.toCSV(rows), "text/csv;charset=utf-8");
    return rows.length - 1;
  };

  Exports.expiringCSV = function (batches) {
    const rows = [
      ["NAMA BARANG", "NO BATCH", "TANGGAL EXPIRED", "SISA HARI", "STATUS", "QTY BATCH", "SATUAN"]
    ];
    (batches || []).forEach(function (b) {
      rows.push([
        b.name, b.batchNo, b.expireDate, b.info.days, b.info.status, b.qty, b.unit
      ]);
    });
    U.download("LAPORAN-BATCH-EXPIRED-" + fileStamp() + ".csv", U.toCSV(rows), "text/csv;charset=utf-8");
    return rows.length - 1;
  };

  Exports.backupJSON = function (data) {
    const content = JSON.stringify(data, null, 2);
    U.download("BACKUP-KARTUSTOK-" + fileStamp() + ".json", content, "application/json;charset=utf-8");
  };

  App.exports = Exports;
})(window.App);
