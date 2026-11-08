/* =========================================================
   Kartu Stok — Application Boot & Global Behaviour
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const store = App.store;
  const ui = App.ui;

  let booted = false;

  /* ---------------------------------------------------------
     Popovers
     --------------------------------------------------------- */
  function closePopover(id) {
    const el = typeof id === "string" ? U.$(id) : id;
    if (el) el.classList.add("hidden");
  }

  function closePopovers() {
    closePopover("#notifPopover");
    closePopover("#userMenu");
  }

  function togglePopover(id) {
    const el = U.$(id);
    if (!el) return;
    const willOpen = el.classList.contains("hidden");
    closePopovers();
    if (willOpen) el.classList.remove("hidden");
  }

  /* ---------------------------------------------------------
     Notifications
     --------------------------------------------------------- */
  function notificationItems() {
    const items = [];
    if (!store.isLoggedIn()) return items;
    const stats = store.stats();

    if (stats.expiredCount > 0) {
      items.push({
        tone: "danger",
        icon: "fa-skull-crossbones",
        title: stats.expiredCount + " batch sudah expired",
        sub: "Pisahkan dari stok layak jual dan tindak lanjuti segera.",
        route: "reports",
        badge: String(stats.expiredCount)
      });
    }
    if (stats.lowStockCount > 0) {
      items.push({
        tone: "warning",
        icon: "fa-arrow-trend-down",
        title: stats.lowStockCount + " barang di bawah stok minimum",
        sub: "Buka daftar barang dan lakukan pengadaan ulang.",
        route: "products",
        lowStock: true,
        badge: String(stats.lowStockCount)
      });
    }
    if (stats.soonCount > 0) {
      items.push({
        tone: "info",
        icon: "fa-hourglass-half",
        title: stats.soonCount + " batch mendekati expired",
        sub: "Prioritaskan pengeluaran batch ini dengan metode FEFO.",
        route: "reports"
      });
    }
    if (stats.outOfStockCount > 0) {
      items.push({
        tone: "danger",
        icon: "fa-circle-xmark",
        title: stats.outOfStockCount + " barang stok habis",
        sub: "Barang dengan stok nol perlu segera diisi ulang.",
        route: "products",
        lowStock: true,
        badge: String(stats.outOfStockCount)
      });
    }
    if (!U.isOnline()) {
      items.push({
        tone: "warning",
        icon: "fa-plane",
        title: "Mode offline",
        sub: "Data tetap tersimpan di perangkat. Sinkronkan saat kembali online.",
        route: ""
      });
    } else if (!App.config.cloud.enabled && store.isAdmin()) {
      items.push({
        tone: "muted",
        icon: "fa-cloud-slash",
        title: "Sinkronisasi cloud nonaktif",
        sub: "Aktifkan kembali melalui halaman pengaturan.",
        route: "settings"
      });
    }
    return items;
  }

  App.renderNotifications = function () {
    const items = notificationItems();
    const dot = U.$("#notifDot");
    if (dot) {
      dot.textContent = items.length > 9 ? "9+" : String(items.length);
      dot.classList.toggle("hidden", items.length === 0);
    }
    const list = U.$("#notifList");
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div class="popover-empty"><i class="fa-solid fa-circle-check"></i>Tidak ada notifikasi. Semua kondisi stok aman.</div>';
      return;
    }
    list.innerHTML = items.map(function (item) {
      const toneStyle = item.tone === "danger"
        ? "color:var(--danger-text);background:var(--danger-soft)"
        : (item.tone === "warning"
          ? "color:var(--warning-text);background:var(--warning-soft)"
          : (item.tone === "info" ? "color:var(--info-text);background:var(--info-soft)" : ""));
      return '<button type="button" class="popover-item" data-action="app:notif-go" ' +
        'data-route="' + U.escapeAttr(item.route || "") + '"' + (item.lowStock ? ' data-low-stock="1"' : "") + '>' +
        '<span class="pi-icon" style="' + toneStyle + '"><i class="fa-solid ' + U.escapeAttr(item.icon) + '"></i></span>' +
        '<span class="pi-copy">' +
          '<span class="pi-title">' + U.esc(item.title) + '</span>' +
          '<span class="pi-sub">' + U.esc(item.sub) + '</span>' +
        '</span>' +
        (item.badge ? '<span class="badge badge-danger">' + U.esc(item.badge) + '</span>' : "") +
      '</button>';
    }).join("");
  };

  /* ---------------------------------------------------------
     Command palette
     --------------------------------------------------------- */
  function paletteCommands() {
    const commands = [];

    App.router.routes().forEach(function (route) {
      if (!App.router.allowed(route)) return;
      commands.push({
        group: route.group || "Halaman",
        title: route.label,
        sub: route.subtitle || "Buka halaman",
        icon: route.icon || "fa-circle",
        run: function () { App.router.go(route.id); }
      });
    });

    commands.push({
      group: "Aksi Cepat",
      title: "Input Stok Masuk",
      sub: "Catat pembelian, retur, atau penambahan stok",
      icon: "fa-arrow-down",
      run: function () { App.modules.transactions.openModal("IN"); }
    });
    commands.push({
      group: "Aksi Cepat",
      title: "Input Stok Keluar",
      sub: "Catat penjualan, pemakaian, atau pengurangan stok",
      icon: "fa-arrow-up",
      run: function () { App.modules.transactions.openModal("OUT"); }
    });
    commands.push({
      group: "Aksi Cepat",
      title: "Scan Barcode",
      sub: "Cari barang melalui kamera atau input manual",
      icon: "fa-barcode",
      run: function () { App.router.go("scanner"); }
    });
    if (store.isAdmin()) {
      commands.push({
        group: "Aksi Cepat",
        title: "Tambah Barang Baru",
        sub: "Buat data master barang baru",
        icon: "fa-plus",
        run: function () {
          App.router.go("products");
          setTimeout(function () {
            if (App.modules.products && App.modules.products.openProductModal) {
              App.modules.products.openProductModal(null);
            }
          }, 180);
        }
      });
      commands.push({
        group: "Aksi Cepat",
        title: "Unduh Cadangan JSON",
        sub: "Simpan seluruh data ke berkas cadangan",
        icon: "fa-download",
        run: function () { App.exports.backupJSON(store.get()); }
      });
    }
    if (App.config.cloud.enabled) {
      commands.push({
        group: "Aksi Cepat",
        title: "Sinkronkan Cloud",
        sub: "Kirim data lokal lalu ambil data terbaru",
        icon: "fa-cloud",
        run: function () { App.cloud.syncNow(); }
      });
    }
    commands.push({
      group: "Sistem",
      title: "Ganti Tema",
      sub: "Beralih antara mode terang dan gelap",
      icon: "fa-circle-half-stroke",
      run: function () { App.ui.toggleTheme(); }
    });
    commands.push({
      group: "Sistem",
      title: "Pintasan Keyboard",
      sub: "Lihat daftar tombol pintas yang tersedia",
      icon: "fa-keyboard",
      run: function () { App.actions["app:shortcuts"](); }
    });
    commands.push({
      group: "Sistem",
      title: "Keluar dari Akun",
      sub: "Akhiri sesi pengguna saat ini",
      icon: "fa-right-from-bracket",
      run: function () { App.auth.logout(); }
    });

    return commands;
  }

  function openPalette() {
    if (!store.isLoggedIn()) return;
    closePopovers();
    const commands = paletteCommands();
    let filtered = commands.slice();
    let active = 0;

    const body =
      '<div class="palette-head">' +
        '<div class="palette-input-wrap">' +
          '<i class="fa-solid fa-magnifying-glass"></i>' +
          '<input id="paletteInput" class="input" type="text" placeholder="Cari halaman, barang, atau aksi..." autocomplete="off" spellcheck="false">' +
        '</div>' +
      '</div>' +
      '<div class="palette-list" id="paletteList"></div>' +
      '<div class="palette-foot">' +
        '<span><span class="kbd">↑</span><span class="kbd">↓</span> navigasi</span>' +
        '<span><span class="kbd">Enter</span> pilih</span>' +
        '<span><span class="kbd">Esc</span> tutup</span>' +
      '</div>';

    ui.openModal({
      size: "md",
      title: "Pencarian Cepat",
      subtitle: "Navigasi halaman dan jalankan aksi tanpa mouse",
      body: body,
      bodyFlush: true,
      onMount: function (card, handle) {
        const input = card.querySelector("#paletteInput");
        const list = card.querySelector("#paletteList");

        function setActive(index) {
          if (!filtered.length) { active = 0; return; }
          active = (index + filtered.length) % filtered.length;
          renderList(false);
        }

        function activate(index) {
          const command = filtered[index];
          if (!command) return;
          handle.close();
          setTimeout(function () {
            try { command.run(); }
            catch (error) {
              console.error("Perintah palette gagal:", error);
              App.ui.toast("Perintah tidak dapat dijalankan.", "error", "Terjadi kesalahan");
            }
          }, 70);
        }

        function renderList(scroll) {
          if (!filtered.length) {
            list.innerHTML = '<div class="palette-empty"><i class="fa-solid fa-magnifying-glass"></i>Tidak ada hasil untuk pencarian tersebut.</div>';
            return;
          }
          let html = "";
          let lastGroup = "";
          filtered.forEach(function (command, index) {
            if (command.group !== lastGroup) {
              html += '<div class="palette-group-label">' + U.esc(command.group) + '</div>';
              lastGroup = command.group;
            }
            html += '<button type="button" class="palette-item' + (index === active ? " active" : "") + '" data-palette-index="' + index + '">' +
              '<span class="palette-icon"><i class="fa-solid ' + U.escapeAttr(command.icon) + '"></i></span>' +
              '<span class="palette-copy">' +
                '<span class="palette-title">' + U.esc(command.title) + '</span>' +
                '<span class="palette-sub">' + U.esc(command.sub) + '</span>' +
              '</span>' +
              (index === active ? '<span class="palette-kbd">ENTER</span>' : "") +
            '</button>';
          });
          list.innerHTML = html;
          const buttons = list.querySelectorAll("[data-palette-index]");
          buttons.forEach(function (button) {
            button.addEventListener("click", function () {
              activate(Number(button.getAttribute("data-palette-index")));
            });
            button.addEventListener("mouseenter", function () {
              active = Number(button.getAttribute("data-palette-index"));
              buttons.forEach(function (item) { item.classList.remove("active"); });
              button.classList.add("active");
            });
          });
          if (scroll !== false && buttons[active]) {
            buttons[active].scrollIntoView({ block: "nearest" });
          }
        }

        function filter() {
          const query = U.upper(input.value);
          filtered = commands.filter(function (command) {
            return !query || U.includesText(command.title + " " + command.sub + " " + command.group, query);
          });
          active = 0;
          renderList(false);
        }

        input.addEventListener("input", filter);
        input.addEventListener("keydown", function (event) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive(active + 1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive(active - 1);
          } else if (event.key === "Enter") {
            event.preventDefault();
            activate(active);
          }
        });

        renderList(false);
      }
    });
  }

  /* ---------------------------------------------------------
     Global actions
     --------------------------------------------------------- */
  App.actions["app:palette"] = function () { openPalette(); };

  App.actions["app:toggle-theme"] = function () {
    closePopovers();
    App.ui.toggleTheme();
  };

  App.actions["app:open-sidebar"] = function () {
    const sidebar = U.$("#sidebar");
    const overlay = U.$("#sidebarOverlay");
    if (sidebar) sidebar.classList.add("open");
    if (overlay) overlay.classList.add("show");
    document.body.classList.add("sidebar-open");
  };

  App.actions["app:close-sidebar"] = function () {
    const sidebar = U.$("#sidebar");
    const overlay = U.$("#sidebarOverlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("show");
    document.body.classList.remove("sidebar-open");
  };

  App.actions["app:scan"] = function () {
    if (!store.isLoggedIn()) return;
    closePopovers();
    App.router.go("scanner");
  };

  App.actions["app:toggle-notif"] = function () {
    App.renderNotifications();
    togglePopover("#notifPopover");
  };

  App.actions["app:refresh-notif"] = function () {
    App.renderNotifications();
    ui.toast("Notifikasi diperbarui.", "info", "Diperbarui");
  };

  App.actions["app:notif-go"] = function (el) {
    closePopovers();
    if (el.getAttribute("data-low-stock") === "1") {
      if (App.modules.products && App.modules.products.showLowStock) {
        App.modules.products.showLowStock();
        return;
      }
    }
    const route = el.getAttribute("data-route");
    if (route) App.router.go(route);
  };

  App.actions["app:toggle-user-menu"] = function () {
    togglePopover("#userMenu");
  };

  App.actions["app:go-settings"] = function () {
    closePopovers();
    if (!store.isAdmin()) {
      ui.toast("Halaman pengaturan hanya tersedia untuk Administrator.", "error", "Akses ditolak");
      return;
    }
    App.router.go("settings");
  };

  App.actions["app:shortcuts"] = function () {
    const rows = [
      { key: "Ctrl + K", text: "Buka pencarian cepat dan daftar perintah" },
      { key: "Esc", text: "Tutup dialog, menu, atau notifikasi" },
      { key: "?", text: "Tampilkan daftar pintasan keyboard" },
      { key: "Enter", text: "Jalankan perintah pada pencarian cepat" },
      { key: "↑ / ↓", text: "Pindahkan pilihan pada pencarian cepat" }
    ];
    ui.openModal({
      size: "sm",
      title: "Pintasan Keyboard",
      subtitle: "Percepat pekerjaan tanpa berpindah ke mouse",
      body: '<div>' + rows.map(function (row) {
        return '<div class="setting-row">' +
          '<div class="setting-copy"><div class="setting-title">' + U.esc(row.text) + '</div></div>' +
          '<span class="kbd">' + U.esc(row.key) + '</span>' +
        '</div>';
      }).join("") + '</div>',
      footer: '<button type="button" class="btn btn-primary" data-modal-close>Mengerti</button>'
    });
  };

  /* ---------------------------------------------------------
     Delegation
     --------------------------------------------------------- */
  function isDisabled(el) {
    return Boolean(el.disabled || el.getAttribute("aria-disabled") === "true");
  }

  function runSafely(label, fn) {
    try {
      const result = fn();
      if (result && typeof result.catch === "function") {
        result.catch(function (error) {
          console.error(label, error);
          ui.toast("Terjadi kesalahan saat menjalankan aksi.", "error", "Gagal");
        });
      }
    } catch (error) {
      console.error(label, error);
      ui.toast("Terjadi kesalahan saat menjalankan aksi.", "error", "Gagal");
    }
  }

  function bindDelegation() {
    document.addEventListener("click", function (event) {
      const el = event.target.closest ? event.target.closest("[data-action]") : null;
      if (!el || isDisabled(el)) return;
      const name = el.getAttribute("data-action");
      const handler = App.actions[name];
      if (!handler) {
        console.warn("Aksi tidak dikenal:", name);
        return;
      }
      if (el.tagName === "A" && el.getAttribute("href") === "#") event.preventDefault();
      runSafely("Aksi " + name + " gagal:", function () { return handler(el, event); });
    });

    document.addEventListener("input", function (event) {
      const el = event.target.closest ? event.target.closest("[data-input-action]") : null;
      if (!el) return;
      const handler = App.inputActions[el.getAttribute("data-input-action")];
      if (handler) runSafely("Input action gagal:", function () { return handler(el, event); });
    });

    document.addEventListener("change", function (event) {
      const el = event.target.closest ? event.target.closest("[data-change-action]") : null;
      if (!el) return;
      const handler = App.changeActions[el.getAttribute("data-change-action")];
      if (handler) runSafely("Change action gagal:", function () { return handler(el, event); });
    });

    document.addEventListener("submit", function (event) {
      const form = event.target.closest ? event.target.closest("form[data-form-action]") : null;
      if (!form) return;
      event.preventDefault();
      const handler = App.formActions[form.getAttribute("data-form-action")];
      if (handler) runSafely("Form action gagal:", function () { return handler(form, event); });
    });

    document.addEventListener("keydown", function (event) {
      const target = event.target;
      const keyEl = target && target.closest ? target.closest("[data-keydown-action]") : null;
      if (keyEl) {
        const handler = App.keyActions[keyEl.getAttribute("data-keydown-action")];
        if (handler) runSafely("Key action gagal:", function () { return handler(keyEl, event); });
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === "k" || event.key === "K")) {
        event.preventDefault();
        openPalette();
        return;
      }

      if (event.key === "Escape") {
        closePopovers();
        return;
      }

      const typing = target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
      if (typing) return;

      if (event.key === "?") {
        event.preventDefault();
        App.actions["app:shortcuts"]();
      }
    });

    // Close popovers when clicking outside of them.
    document.addEventListener("click", function (event) {
      const target = event.target;
      if (!target || !target.closest) return;
      const notif = U.$("#notifPopover");
      const userMenu = U.$("#userMenu");
      if (notif && !notif.classList.contains("hidden") &&
        !target.closest("#notifPopover") && !target.closest('[data-action="app:toggle-notif"]')) {
        closePopover(notif);
      }
      if (userMenu && !userMenu.classList.contains("hidden") &&
        !target.closest("#userMenu") && !target.closest('[data-action="app:toggle-user-menu"]')) {
        closePopover(userMenu);
      }
    });

    window.addEventListener("hashchange", closePopovers);
  }

  /* ---------------------------------------------------------
     Connectivity
     --------------------------------------------------------- */
  function bindConnectivity() {
    window.addEventListener("online", function () {
      if (App.config.cloud.enabled) ui.setCloudIndicator("idle", "Cloud siap");
      else ui.setCloudIndicator("disabled", "Cloud nonaktif");
      App.renderNotifications();
      ui.toast("Koneksi internet kembali tersedia.", "success", "Kembali online");
    });

    window.addEventListener("offline", function () {
      ui.setCloudIndicator("offline", "Mode offline");
      App.renderNotifications();
      ui.toast("Anda sedang offline. Data tetap tersimpan di perangkat.", "warning", "Koneksi terputus");
    });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  function boot() {
    if (booted) return;
    booted = true;

    store.load();
    ui.init();
    App.cloud.init();
    App.auth.init();
    bindDelegation();
    bindConnectivity();
    App.renderNotifications();

    if (!App.auth.isActivated()) {
      App.auth.showActivation();
      return;
    }
    if (store.isLoggedIn()) {
      App.auth.enterApp();
    } else {
      App.auth.showLogin();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  App.openPalette = openPalette;
  App.boot = boot;
})(window.App);
