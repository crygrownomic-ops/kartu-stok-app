/* =========================================================
   Kartu Stok — Barcode Scanner
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const store = App.store;

  const state = {
    code: "",
    foundId: "",
    searched: false,
    scanning: false,
    starting: false,
    status: "Arahkan kamera ke barcode, atau masukkan kode secara manual.",
    history: []
  };

  let qr = null;
  let decoding = false;
  let audioCtx = null;

  function productForCode(code) {
    const clean = U.upper(code);
    if (!clean) return null;
    return store.productByBarcode(clean);
  }

  function statusText() {
    if (state.starting) return "Menyalakan kamera...";
    if (state.scanning) return "Kamera aktif. Arahkan barcode ke dalam kotak pemindai.";
    return state.status;
  }

  function beep(ok) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.value = ok ? 880 : 220;
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (error) { /* audio is optional */ }
  }

  function pushHistory(entry) {
    state.history.unshift(entry);
    state.history = state.history.slice(0, 8);
  }

  function handleCode(rawCode, source) {
    const clean = U.upper(rawCode);
    if (!clean) return null;
    const product = productForCode(clean);

    state.code = clean;
    state.foundId = product ? product.id : "";
    state.searched = true;
    state.status = product
      ? "Barcode cocok dengan data barang."
      : "Kode tidak cocok dengan barcode maupun SKU manapun.";

    pushHistory({
      code: clean,
      productId: product ? product.id : "",
      name: product ? product.name : "TIDAK DITEMUKAN",
      found: Boolean(product),
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      source: source || "kamera"
    });

    beep(Boolean(product));
    updateResult();
    updateHistory();

    if (product) {
      App.ui.toast(product.name + " · stok " + U.formatNumber(product.stock, 2) + " " + U.unitInfo(product).base, "success", "Barang ditemukan");
    } else {
      App.ui.toast("Kode " + clean + " belum terdaftar pada master barang.", "warning", "Barcode tidak ditemukan");
    }
    return product;
  }

  /* ---------------------------------------------------------
     Camera lifecycle
     --------------------------------------------------------- */
  function secureCameraAvailable() {
    if (typeof window.Html5Qrcode === "undefined") {
      return { ok: false, message: "Modul pemindai belum siap. Periksa koneksi internet lalu muat ulang halaman." };
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { ok: false, message: "Perangkat ini tidak mendukung akses kamera melalui browser." };
    }
    const secure = window.isSecureContext || location.protocol === "https:" ||
      location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!secure) {
      return { ok: false, message: "Kamera memerlukan HTTPS atau localhost. Gunakan input manual atau jalankan lewat server lokal." };
    }
    return { ok: true, message: "" };
  }

  function updateCameraUI() {
    const frame = U.$("#scannerFrame");
    const placeholder = U.$("#scannerPlaceholder");
    const startBtn = U.$("#scannerStartBtn");
    const stopBtn = U.$("#scannerStopBtn");
    const status = U.$("#scannerStatus");
    if (frame) {
      frame.classList.toggle("scanning", state.scanning);
      frame.classList.toggle("starting", state.starting);
    }
    if (placeholder) placeholder.classList.toggle("hidden", state.scanning || state.starting);
    if (startBtn) {
      startBtn.classList.toggle("hidden", state.scanning || state.starting);
      startBtn.disabled = state.starting;
    }
    if (stopBtn) stopBtn.classList.toggle("hidden", !state.scanning);
    if (status) status.textContent = statusText();
  }

  async function startCamera() {
    if (state.scanning || state.starting) return;
    const check = secureCameraAvailable();
    if (!check.ok) {
      state.status = check.message;
      updateCameraUI();
      App.ui.toast(check.message, "warning", "Kamera tidak tersedia");
      return;
    }
    const reader = U.$("#scannerReader");
    if (!reader) return;

    state.starting = true;
    state.status = "Menyalakan kamera...";
    updateCameraUI();

    try {
      if (qr) {
        try { await qr.stop(); } catch (error) { /* ignore */ }
        try { qr.clear(); } catch (error) { /* ignore */ }
        qr = null;
      }
      reader.innerHTML = "";
      qr = new window.Html5Qrcode("scannerReader", { verbose: false });
      await qr.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: function (width, height) {
            const size = Math.floor(Math.min(width, height) * 0.72);
            return { width: Math.max(180, size), height: Math.max(130, Math.floor(size * 0.62)) };
          },
          aspectRatio: 1.4
        },
        function (decodedText) { onDecoded(decodedText); },
        function () { /* frame without code */ }
      );
      state.scanning = true;
      state.status = "Kamera aktif. Arahkan barcode ke dalam kotak pemindai.";
    } catch (error) {
      console.warn("Kamera gagal dinyalakan:", error);
      state.scanning = false;
      state.status = "Kamera tidak dapat diakses. Periksa izin kamera, lalu coba lagi atau gunakan input manual.";
      App.ui.toast("Akses kamera ditolak atau tidak tersedia.", "error", "Kamera gagal");
    } finally {
      state.starting = false;
      updateCameraUI();
    }
  }

  async function stopCamera() {
    const instance = qr;
    qr = null;
    state.scanning = false;
    state.starting = false;
    updateCameraUI();
    if (!instance) return;
    try { await instance.stop(); } catch (error) { /* ignore */ }
    try { instance.clear(); } catch (error) { /* ignore */ }
  }

  async function onDecoded(text) {
    if (decoding) return;
    decoding = true;
    await stopCamera();
    handleCode(text, "kamera");
    decoding = false;
  }

  /* ---------------------------------------------------------
     Rendering
     --------------------------------------------------------- */
  function productResultHtml(product) {
    const unit = U.unitInfo(product);
    const margin = U.marginInfo(product);
    const low = U.isLowStock(product);
    const out = U.isOutOfStock(product);
    const stockBadge = out
      ? '<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> Stok habis</span>'
      : (low
        ? '<span class="badge badge-warning"><i class="fa-solid fa-triangle-exclamation"></i> Stok menipis</span>'
        : '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Stok aman</span>');

    return '<div class="scan-result">' +
      '<div class="scan-result-top">' +
        '<div style="min-width:0">' +
          '<div class="flex items-center gap-2" style="flex-wrap:wrap">' +
            '<span class="badge badge-primary mono">' + U.esc(product.sku || "-") + '</span>' +
            '<span class="badge badge-neutral">' + U.esc(product.category || "LAINNYA") + '</span>' +
            stockBadge +
          '</div>' +
          '<h3 class="scan-result-name">' + U.esc(product.name) + '</h3>' +
          '<div class="scan-result-meta mono">' + U.esc(state.code) + (product.barcode && U.upper(product.barcode) !== state.code ? ' · ' + U.esc(product.barcode) : "") + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="scan-facts">' +
        '<div class="scan-fact"><span>Stok sistem</span><strong>' + U.formatNumber(product.stock, 2) + ' ' + U.esc(unit.base) + '</strong></div>' +
        '<div class="scan-fact"><span>Batas minimum</span><strong>' + U.formatNumber(product.minStock, 2) + ' ' + U.esc(unit.base) + '</strong></div>' +
        '<div class="scan-fact"><span>HPP rata-rata</span><strong>' + U.formatCurrency(product.avgHpp) + '</strong></div>' +
        '<div class="scan-fact"><span>Harga jual</span><strong>' + U.formatCurrency(product.sellPrice) + '</strong></div>' +
        '<div class="scan-fact"><span>Margin</span><strong class="' + (margin.margin < 0 ? "text-danger" : "text-success") + '">' + U.formatCurrency(margin.margin) + '</strong></div>' +
        '<div class="scan-fact"><span>Lokasi rak</span><strong>' + U.esc(product.warehouse || "-") + '</strong></div>' +
      '</div>' +
      (unit.hasBig
        ? '<div class="info-banner mt-3"><i class="fa-solid fa-boxes-packing"></i><div>Konversi grosir: 1 ' + U.esc(unit.big) + ' = ' + unit.ratio + ' ' + U.esc(unit.base) + '.</div></div>'
        : "") +
      '<div class="scan-actions">' +
        '<button type="button" class="btn btn-success" data-action="scanner:tx" data-type="IN" data-id="' + U.escapeAttr(product.id) + '"><i class="fa-solid fa-arrow-down"></i> Stok Masuk</button>' +
        '<button type="button" class="btn btn-danger" data-action="scanner:tx" data-type="OUT" data-id="' + U.escapeAttr(product.id) + '"><i class="fa-solid fa-arrow-up"></i> Stok Keluar</button>' +
        '<button type="button" class="btn btn-secondary" data-action="scanner:ledger" data-id="' + U.escapeAttr(product.id) + '"><i class="fa-solid fa-book"></i> Kartu Stok</button>' +
        '<button type="button" class="btn btn-ghost admin-only" data-action="scanner:edit" data-id="' + U.escapeAttr(product.id) + '"><i class="fa-solid fa-pen"></i> Edit</button>' +
      '</div>' +
    '</div>';
  }

  function resultHtml() {
    if (!state.searched) {
      return App.ui.emptyState({
        icon: "fa-barcode",
        title: "Belum ada hasil pindai",
        text: "Nyalakan kamera atau ketik barcode / SKU pada kolom di atas untuk mencari barang."
      });
    }
    const product = state.foundId ? store.productById(state.foundId) : null;
    if (product) return productResultHtml(product);
    return '<div class="scan-not-found">' +
      '<div class="scan-not-found-icon"><i class="fa-solid fa-circle-question"></i></div>' +
      '<div class="empty-title">Barcode tidak ditemukan</div>' +
      '<div class="empty-text" style="margin:0 auto">Kode <strong class="mono">' + U.esc(state.code) + '</strong> belum terdaftar sebagai barcode maupun SKU barang.</div>' +
      '<div class="empty-actions">' +
        '<button type="button" class="btn btn-secondary btn-sm" data-action="scanner:search-product"><i class="fa-solid fa-magnifying-glass"></i> Cari di Master Barang</button>' +
        '<button type="button" class="btn btn-primary btn-sm admin-only" data-action="products:new"><i class="fa-solid fa-plus"></i> Tambah Barang</button>' +
      '</div>' +
    '</div>';
  }

  function historyHtml() {
    if (!state.history.length) {
      return App.ui.emptyState({
        icon: "fa-clock-rotate-left",
        title: "Belum ada riwayat pindai",
        text: "Hasil pemindaian terakhir akan tampil di sini selama halaman belum dimuat ulang."
      });
    }
    return '<div class="mini-list">' + state.history.map(function (item) {
      return '<div class="mini-list-item">' +
        '<div style="display:flex;align-items:center;gap:9px;min-width:0">' +
          '<span class="setting-icon" style="width:28px;height:28px;flex-basis:28px;font-size:10px;' +
            (item.found ? "" : "color:var(--danger-text);background:var(--danger-soft)") + '">' +
            '<i class="fa-solid ' + (item.found ? "fa-barcode" : "fa-circle-question") + '"></i></span>' +
          '<div style="min-width:0">' +
            '<div class="name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + U.esc(item.name) + '</div>' +
            '<div class="meta">' + U.esc(item.code) + ' · ' + U.esc(item.time) + ' · ' + U.esc(item.source) + '</div>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-icon btn-sm btn-secondary" data-action="scanner:again" data-code="' + U.escapeAttr(item.code) + '" title="Cari ulang kode ini"><i class="fa-solid fa-rotate-right"></i></button>' +
      '</div>';
    }).join("") + '</div>';
  }

  function updateResult() {
    const host = U.$("#scanResult");
    if (host) host.innerHTML = resultHtml();
  }

  function updateHistory() {
    const host = U.$("#scanHistory");
    if (host) host.innerHTML = historyHtml();
  }

  function clearResult() {
    state.code = "";
    state.foundId = "";
    state.searched = false;
    state.status = "Arahkan kamera ke barcode, atau masukkan kode secara manual.";
    updateResult();
    updateCameraUI();
  }

  function render() {
    return '<div class="page-stack">' +
      '<div class="info-banner"><i class="fa-solid fa-circle-info"></i><div>' +
        'Pemindai mendukung barcode dan SKU. Setelah barang ditemukan, pilih <strong>Stok Masuk</strong> atau <strong>Stok Keluar</strong> untuk langsung mencatat transaksi. Kamera membutuhkan HTTPS atau localhost.' +
      '</div></div>' +
      '<div class="section-grid">' +
        '<div class="card">' +
          '<div class="card-head has-border">' +
            '<div class="card-title-wrap">' +
              '<div class="card-title"><i class="fa-solid fa-camera"></i> Kamera Pemindai</div>' +
              '<div class="card-sub">Gunakan kamera belakang untuk membaca barcode secara langsung.</div>' +
            '</div>' +
          '</div>' +
          '<div class="card-body pad">' +
            '<div class="scanner-frame" id="scannerFrame">' +
              '<div id="scannerReader" class="scanner-reader"></div>' +
              '<div class="scan-placeholder" id="scannerPlaceholder">' +
                '<i class="fa-solid fa-barcode"></i>' +
                '<div class="scan-placeholder-title">Kamera belum aktif</div>' +
                '<div class="scan-placeholder-text">Tekan tombol mulai kamera di bawah untuk memindai barcode.</div>' +
              '</div>' +
            '</div>' +
            '<div class="flex gap-2 mt-3" style="flex-wrap:wrap">' +
              '<button type="button" class="btn btn-primary" id="scannerStartBtn" data-action="scanner:start"><i class="fa-solid fa-video"></i> Mulai Kamera</button>' +
              '<button type="button" class="btn btn-secondary hidden" id="scannerStopBtn" data-action="scanner:stop"><i class="fa-solid fa-stop"></i> Hentikan</button>' +
              '<button type="button" class="btn btn-ghost" data-action="scanner:clear"><i class="fa-solid fa-eraser"></i> Bersihkan</button>' +
            '</div>' +
            '<div class="field-hint mt-2" id="scannerStatus">' + U.esc(statusText()) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head has-border">' +
            '<div class="card-title-wrap">' +
              '<div class="card-title"><i class="fa-solid fa-keyboard"></i> Input Manual & Hasil</div>' +
              '<div class="card-sub">Ketik barcode atau SKU, lalu tekan Enter.</div>' +
            '</div>' +
          '</div>' +
          '<div class="card-body pad">' +
            '<form data-form-action="scanner:manual" autocomplete="off">' +
              '<div class="scanner-input-row">' +
                '<input id="scannerInput" name="code" class="input mono uppercase-input" placeholder="Scan atau ketik barcode / SKU..." autocomplete="off" autofocus>' +
                '<button type="submit" class="btn btn-primary"><i class="fa-solid fa-magnifying-glass"></i> Cari</button>' +
              '</div>' +
            '</form>' +
            '<div id="scanResult" style="margin-top:16px">' + resultHtml() + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-head has-border">' +
          '<div class="card-title-wrap">' +
            '<div class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Riwayat Pindai</div>' +
            '<div class="card-sub">Delapan kode terakhir yang dipindai pada sesi ini.</div>' +
          '</div>' +
          '<span class="badge badge-neutral">' + state.history.length + ' kode</span>' +
        '</div>' +
        '<div class="card-body pad" id="scanHistory">' + historyHtml() + '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------------------------------------------------------
     Actions
     --------------------------------------------------------- */
  App.formActions["scanner:manual"] = function (form) {
    const input = form.querySelector('[name="code"]');
    const value = input ? input.value : "";
    if (!U.upper(value)) {
      App.ui.toast("Masukkan barcode atau SKU terlebih dahulu.", "warning", "Input kosong");
      if (input) input.focus();
      return;
    }
    handleCode(value, "manual");
    if (input) {
      input.value = "";
      input.focus();
    }
  };

  App.actions["scanner:start"] = function () { startCamera(); };
  App.actions["scanner:stop"] = function () { stopCamera(); };
  App.actions["scanner:clear"] = function () { clearResult(); };

  App.actions["scanner:again"] = function (el) {
    handleCode(el.getAttribute("data-code"), "riwayat");
    const input = U.$("#scannerInput");
    if (input) input.focus();
  };

  App.actions["scanner:tx"] = function (el) {
    const id = el.getAttribute("data-id");
    const type = el.getAttribute("data-type") === "OUT" ? "OUT" : "IN";
    if (App.modules.transactions && App.modules.transactions.openModal) {
      App.modules.transactions.openModal(type, id);
    }
  };

  App.actions["scanner:ledger"] = function (el) {
    const id = el.getAttribute("data-id");
    if (App.modules.ledger && App.modules.ledger.state) {
      App.modules.ledger.state.productId = id;
      App.modules.ledger.state.page = 1;
    }
    App.router.go("ledger");
  };

  App.actions["scanner:edit"] = function (el) {
    const id = el.getAttribute("data-id");
    if (App.modules.products && App.modules.products.openProductModal) {
      App.modules.products.openProductModal(id);
    }
  };

  App.actions["scanner:search-product"] = function () {
    let code = state.code;
    if (!code) {
      const input = U.$("#scannerInput");
      code = input ? input.value : "";
    }
    if (App.modules.products && App.modules.products.state) {
      App.modules.products.state.search = code;
      App.modules.products.state.page = 1;
    }
    App.router.go("products");
  };

  App.router.register({
    id: "scanner",
    label: "Scan Barcode",
    subtitle: "Cari barang dan catat transaksi langsung dari barcode",
    group: "Operasional",
    icon: "fa-barcode",
    render: render,
    mount: function () {
      updateCameraUI();
      const input = U.$("#scannerInput");
      if (input && !state.scanning) input.focus();
    }
  });

  window.addEventListener("hashchange", function () {
    if (window.location.hash !== "#/scanner") {
      const wasScanning = state.scanning;
      stopCamera();
      if (wasScanning) state.status = "Arahkan kamera ke barcode, atau masukkan kode secara manual.";
    }
  });
  window.addEventListener("beforeunload", function () { stopCamera(); });

  App.modules.scanner = {
    render: render,
    state: state,
    startCamera: startCamera,
    stopCamera: stopCamera,
    handleCode: handleCode,
    open: function () { App.router.go("scanner"); }
  };
})(window.App);
