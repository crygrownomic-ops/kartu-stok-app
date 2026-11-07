/* =========================================================
   Kartu Stok — Shared Utilities
   ========================================================= */

(function (App) {
  "use strict";

  const U = {};

  U.$ = function (selector, root) { return (root || document).querySelector(selector); };
  U.$$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

  U.escapeHtml = function (value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };
  U.escapeAttr = U.escapeHtml;
  U.esc = U.escapeHtml;

  U.text = function (value, fallback) {
    if (value === null || value === undefined || value === "") return fallback || "";
    return String(value);
  };
  U.upper = function (value) { return String(value == null ? "" : value).trim().toUpperCase(); };
  U.number = function (value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  };
  U.parseInt = function (value, fallback) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : (fallback || 0);
  };

  U.formatNumber = function (value, digits) {
    const n = Number(value) || 0;
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: digits == null ? 2 : digits
    }).format(n);
  };

  U.formatCurrency = function (value) {
    const n = Math.round(Number(value) || 0);
    return (n < 0 ? "-Rp " : "Rp ") + Math.abs(n).toLocaleString("id-ID");
  };

  U.formatQuantity = function (value, unit) {
    return U.formatNumber(value, 2) + (unit ? " " + unit : "");
  };

  U.parseNumber = function (value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const clean = String(value).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(clean);
    return Number.isFinite(n) ? n : 0;
  };

  U.parseDateLocal = function (value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (match) {
      return new Date(
        Number(match[1]), Number(match[2]) - 1, Number(match[3]),
        Number(match[4] || 0), Number(match[5] || 0), 0, 0
      );
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  U.pad2 = function (n) { return String(n).padStart(2, "0"); };

  U.dateOnly = function (date) {
    const d = date instanceof Date ? date : U.parseDateLocal(date);
    if (!d) return "";
    return d.getFullYear() + "-" + U.pad2(d.getMonth() + 1) + "-" + U.pad2(d.getDate());
  };

  U.todayISO = function () { return U.dateOnly(new Date()); };

  U.offsetDate = function (offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + Number(offsetDays || 0));
    return d;
  };

  U.nowStamp = function () {
    const d = new Date();
    return U.dateOnly(d) + " " + U.pad2(d.getHours()) + ":" + U.pad2(d.getMinutes());
  };

  U.formatDate = function (value) {
    const d = U.parseDateLocal(value);
    if (!d) return value ? String(value) : "-";
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  U.formatDateTime = function (value) {
    const d = U.parseDateLocal(value);
    if (!d) return value ? String(value) : "-";
    const date = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return date + " · " + time;
  };

  U.formatTime = function (value) {
    const d = U.parseDateLocal(value);
    if (!d) return "";
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  U.formatDayShort = function (date) {
    const d = date instanceof Date ? date : U.parseDateLocal(date);
    if (!d) return "";
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  };

  U.formatLongDate = function (date) {
    const d = date instanceof Date ? date : (U.parseDateLocal(date) || new Date());
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  U.toInputDate = function (value) {
    const d = U.parseDateLocal(value);
    return d ? U.dateOnly(d) : "";
  };

  U.daysUntil = function (value) {
    const d = U.parseDateLocal(value);
    if (!d) return null;
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date();
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.ceil((target.getTime() - base.getTime()) / 86400000);
  };

  U.expiryInfo = function (value) {
    if (!value || value === "-") {
      return { status: "none", days: null, label: "Tanpa ED", badge: "badge-neutral", tone: "" };
    }
    const days = U.daysUntil(value);
    if (days === null) {
      return { status: "none", days: null, label: "-", badge: "badge-neutral", tone: "" };
    }
    if (days < 0) {
      return {
        status: "expired", days: days, label: "Expired " + Math.abs(days) + " hari",
        badge: "badge-danger", tone: "text-danger"
      };
    }
    if (days === 0) {
      return { status: "today", days: 0, label: "Expired hari ini", badge: "badge-danger", tone: "text-danger" };
    }
    if (days <= 30) {
      return {
        status: "soon", days: days, label: "Sisa " + days + " hari",
        badge: "badge-warning", tone: "text-warning"
      };
    }
    return { status: "ok", days: days, label: U.formatDate(value), badge: "badge-neutral", tone: "" };
  };

  U.unitInfo = function (product) {
    const p = product || {};
    const base = U.upper(p.satuan) || "PCS";
    const big = U.upper(p.satuanBesar);
    const ratio = Number(p.rasioKonversi) || 1;
    return { base: base, big: big, ratio: ratio, hasBig: Boolean(big && ratio > 1) };
  };

  U.stockText = function (product) {
    const p = product || {};
    const u = U.unitInfo(p);
    const stock = Number(p.stock) || 0;
    if (!u.hasBig) return U.formatNumber(stock, 2) + " " + u.base;
    const bigQty = Math.floor(stock / u.ratio);
    const remainder = stock % u.ratio;
    return bigQty + " " + u.big + (remainder > 0 ? " + " + U.formatNumber(remainder, 2) + " " + u.base : "");
  };

  U.marginInfo = function (product) {
    const p = product || {};
    const hpp = Number(p.avgHpp) || 0;
    const sell = Number(p.sellPrice) || 0;
    const margin = sell - hpp;
    const percent = hpp > 0 ? (margin / hpp) * 100 : null;
    return { margin: margin, percent: percent, hasData: hpp > 0 };
  };

  U.isLowStock = function (product) {
    const p = product || {};
    return Number(p.stock) <= Number(p.minStock);
  };

  U.isOutOfStock = function (product) {
    return Number((product || {}).stock) <= 0;
  };

  U.uid = function (prefix) {
    const time = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return (prefix || "ID") + "-" + time + "-" + rand;
  };

  U.autoBatchNo = function (prefix) {
    const d = new Date();
    const stamp = d.getFullYear() + U.pad2(d.getMonth() + 1) + U.pad2(d.getDate());
    const rand = Math.floor(1000 + Math.random() * 9000);
    return (prefix || "BTC") + "-" + stamp + "-" + rand;
  };

  U.debounce = function (fn, wait) {
    let timer = null;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
    };
  };

  U.throttle = function (fn, wait) {
    let last = 0;
    let timer = null;
    return function () {
      const args = arguments;
      const ctx = this;
      const now = Date.now();
      const remaining = wait - (now - last);
      if (remaining <= 0) {
        clearTimeout(timer);
        timer = null;
        last = now;
        fn.apply(ctx, args);
      } else if (!timer) {
        timer = setTimeout(function () {
          last = Date.now();
          timer = null;
          fn.apply(ctx, args);
        }, remaining);
      }
    };
  };

  U.clamp = function (value, min, max) {
    return Math.min(Math.max(Number(value) || 0, min), max);
  };

  U.sum = function (items, getter) {
    return (items || []).reduce(function (total, item, index) {
      return total + (Number(getter ? getter(item, index) : item) || 0);
    }, 0);
  };

  U.groupBy = function (items, keyFn) {
    return (items || []).reduce(function (acc, item) {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  };

  U.unique = function (items) {
    return Array.from(new Set(items || []));
  };

  U.includesText = function (haystack, needle) {
    return String(haystack == null ? "" : haystack).toUpperCase().indexOf(String(needle == null ? "" : needle).toUpperCase()) !== -1;
  };

  U.percent = function (part, total, digits) {
    const t = Number(total) || 0;
    if (t <= 0) return 0;
    return Number(((Number(part) || 0) / t * 100).toFixed(digits == null ? 1 : digits));
  };

  U.formatBytes = function (bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(2) + " MB";
  };

  U.initials = function (name) {
    const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  U.safeJSONParse = function (text, fallback) {
    try { return JSON.parse(text); }
    catch (e) { return fallback; }
  };

  U.isOnline = function () {
    return typeof navigator.onLine === "boolean" ? navigator.onLine : true;
  };

  U.download = function (filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };

  U.csvCell = function (value) {
    const s = value === null || value === undefined ? "" : String(value);
    return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  U.toCSV = function (rows) {
    return "\uFEFF" + (rows || []).map(function (row) {
      return row.map(U.csvCell).join(";");
    }).join("\r\n") + "\r\n";
  };

  U.parseCSV = function (text) {
    let input = String(text || "").replace(/^\uFEFF/, "");
    if (!input.trim()) return [];
    const firstLine = input.split(/\r?\n/)[0] || "";
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolons >= commas ? ";" : ",";

    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      const next = input[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') {
          field += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (ch === "\r") {
        // ignore
      } else {
        field += ch;
      }
    }
    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter(function (r) {
      return r.some(function (cell) { return String(cell).trim() !== ""; });
    });
  };

  U.csvToObjects = function (rows) {
    if (!rows || rows.length < 2) return [];
    const headers = rows[0].map(function (h) {
      return String(h).toUpperCase().replace(/[^A-Z0-9]/g, "");
    });
    return rows.slice(1).map(function (row) {
      const obj = {};
      headers.forEach(function (header, index) {
        obj[header] = row[index] === undefined ? "" : String(row[index]).trim();
      });
      return obj;
    });
  };

  App.utils = U;
})(window.App);
