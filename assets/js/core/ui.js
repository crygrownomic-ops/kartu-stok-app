/* =========================================================
   Kartu Stok — UI Primitives (toast, modal, theme, helpers)
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const UI = {};

  /* ---------------------------------------------------------
     Toast
     --------------------------------------------------------- */
  const TOAST_META = {
    success: { icon: "fa-check", title: "Berhasil" },
    error: { icon: "fa-xmark", title: "Gagal" },
    warning: { icon: "fa-triangle-exclamation", title: "Perhatian" },
    info: { icon: "fa-circle-info", title: "Informasi" }
  };

  UI.toast = function (message, type, title) {
    const host = U.$("#toastHost");
    if (!host) return;
    const kind = TOAST_META[type] ? type : "info";
    const meta = TOAST_META[kind];
    const el = document.createElement("div");
    el.className = "toast toast-" + kind;
    el.setAttribute("role", "status");
    el.innerHTML =
      '<div class="toast-icon"><i class="fa-solid ' + meta.icon + '"></i></div>' +
      '<div class="toast-content">' +
        '<div class="toast-title">' + U.esc(title || meta.title) + '</div>' +
        '<div class="toast-msg">' + U.esc(message) + '</div>' +
      '</div>' +
      '<button type="button" class="toast-close" aria-label="Tutup notifikasi"><i class="fa-solid fa-xmark"></i></button>';
    host.appendChild(el);

    let timer = setTimeout(remove, 4200);
    function remove() {
      clearTimeout(timer);
      if (!el.parentNode) return;
      el.classList.add("leaving");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 190);
    }
    el.querySelector(".toast-close").addEventListener("click", remove);
    el.addEventListener("mouseenter", function () { clearTimeout(timer); });
    el.addEventListener("mouseleave", function () { timer = setTimeout(remove, 1800); });
  };

  /* ---------------------------------------------------------
     Modal
     --------------------------------------------------------- */
  let activeModal = null;

  UI.openModal = function (options) {
    const opts = options || {};
    UI.closeModal();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const sizeClass = "modal-" + (opts.size || "md");
    const closable = opts.closable !== false;
    const titleHtml = opts.title
      ? '<div class="modal-title-wrap"><div class="modal-title">' + U.esc(opts.title) + '</div>' +
        (opts.subtitle ? '<div class="modal-sub">' + U.esc(opts.subtitle) + '</div>' : "") + '</div>'
      : '<div></div>';

    overlay.innerHTML =
      '<div class="modal-card ' + sizeClass + '" role="dialog" aria-modal="true">' +
        '<div class="modal-head">' + titleHtml +
          (closable ? '<button type="button" class="modal-close" data-modal-close aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>' : "") +
        '</div>' +
        '<div class="modal-body' + (opts.bodyFlush ? " flush" : "") + '">' + (opts.body || "") + '</div>' +
        (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : "") +
      '</div>';

    document.body.appendChild(overlay);
    document.body.classList.add("modal-open");

    let closed = false;
    const handle = {
      overlay: overlay,
      card: overlay.querySelector(".modal-card"),
      close: function () { UI.closeModal(); }
    };

    function finish() {
      if (closed) return;
      closed = true;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (!document.querySelector(".modal-overlay")) document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKeydown);
      if (activeModal && activeModal.overlay === overlay) activeModal = null;
      if (typeof opts.onClose === "function") opts.onClose();
    }

    function onKeydown(event) {
      if (event.key === "Escape" && closable) {
        event.preventDefault();
        UI.closeModal();
      }
    }

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay && closable) UI.closeModal();
    });

    const closeButton = overlay.querySelector("[data-modal-close]");
    if (closeButton) closeButton.addEventListener("click", function () { UI.closeModal(); });

    document.addEventListener("keydown", onKeydown);
    activeModal = { overlay: overlay, finish: finish, handle: handle };

    if (typeof opts.onMount === "function") {
      try { opts.onMount(handle.card, handle); }
      catch (error) { console.error("Modal onMount error:", error); }
    }

    setTimeout(function () {
      const focusable = overlay.querySelector(".modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea, .modal-body button, .modal-foot .btn");
      if (focusable) {
        focusable.focus();
        if (focusable.tagName === "INPUT" && focusable.type === "text" && focusable.select) {
          try { focusable.select(); } catch (e) { /* ignore */ }
        }
      }
    }, 60);

    return handle;
  };

  UI.closeModal = function () {
    if (activeModal) activeModal.finish();
  };

  UI.confirm = function (options) {
    const opts = options || {};
    const variant = opts.variant || "primary";
    const iconTone = variant === "danger" ? "danger" : (variant === "warning" ? "warning" : "");
    return new Promise(function (resolve) {
      let settled = false;
      function done(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }
      UI.openModal({
        size: "sm",
        closable: true,
        title: opts.title || "Konfirmasi",
        body:
          '<div class="confirm-icon ' + iconTone + '"><i class="fa-solid ' + (opts.icon || (variant === "danger" ? "fa-triangle-exclamation" : "fa-circle-question")) + '"></i></div>' +
          '<div class="confirm-message">' + (opts.html || U.esc(opts.message || "")) + '</div>' +
          (opts.note ? '<div class="modal-note ' + (variant === "danger" ? "danger" : "warning") + ' mt-3">' + U.esc(opts.note) + '</div>' : ""),
        footer:
          '<button type="button" class="btn btn-secondary" data-confirm-cancel>' + U.esc(opts.cancelText || "Batal") + '</button>' +
          '<button type="button" class="btn ' + (variant === "danger" ? "btn-danger" : (variant === "warning" ? "btn-warning" : "btn-primary")) + '" data-confirm-ok>' + U.esc(opts.confirmText || "Ya, lanjutkan") + '</button>',
        onMount: function (card, handle) {
          card.querySelector("[data-confirm-cancel]").addEventListener("click", function () {
            done(false);
            handle.close();
          });
          card.querySelector("[data-confirm-ok]").addEventListener("click", function () {
            done(true);
            handle.close();
          });
        },
        onClose: function () { done(false); }
      });
    });
  };

  UI.prompt = function (options) {
    const opts = options || {};
    return new Promise(function (resolve) {
      let settled = false;
      function done(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }
      UI.openModal({
        size: "sm",
        closable: true,
        title: opts.title || "Input Data",
        subtitle: opts.subtitle || "",
        body:
          (opts.message ? '<div class="confirm-message mb-3">' + U.esc(opts.message) + '</div>' : "") +
          '<div class="field">' +
            (opts.label ? '<label class="field-label" for="uiPromptInput">' + U.esc(opts.label) + '</label>' : "") +
            '<input id="uiPromptInput" class="input" type="' + (opts.type || "text") + '" value="' + U.escapeAttr(opts.value || "") + '" placeholder="' + U.escapeAttr(opts.placeholder || "") + '" ' +
              (opts.min ? 'min="' + U.escapeAttr(opts.min) + '" ' : "") +
              (opts.max ? 'max="' + U.escapeAttr(opts.max) + '" ' : "") +
              (opts.step ? 'step="' + U.escapeAttr(opts.step) + '" ' : "") + '>' +
            (opts.hint ? '<div class="field-hint">' + U.esc(opts.hint) + '</div>' : "") +
            '<div class="field-error hidden" data-prompt-error></div>' +
          '</div>',
        footer:
          '<button type="button" class="btn btn-secondary" data-prompt-cancel>' + U.esc(opts.cancelText || "Batal") + '</button>' +
          '<button type="button" class="btn btn-primary" data-prompt-ok>' + U.esc(opts.confirmText || "Simpan") + '</button>',
        onMount: function (card, handle) {
          const input = card.querySelector("#uiPromptInput");
          const errorEl = card.querySelector("[data-prompt-error]");
          function submit() {
            const value = input.value.trim();
            if (opts.required !== false && !value) {
              errorEl.textContent = opts.requiredMessage || "Nilai tidak boleh kosong.";
              errorEl.classList.remove("hidden");
              input.classList.add("error");
              input.focus();
              return;
            }
            done(value);
            handle.close();
          }
          card.querySelector("[data-prompt-cancel]").addEventListener("click", function () {
            done(null);
            handle.close();
          });
          card.querySelector("[data-prompt-ok]").addEventListener("click", submit);
          input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          });
          input.addEventListener("input", function () {
            errorEl.classList.add("hidden");
            input.classList.remove("error");
          });
        },
        onClose: function () { done(null); }
      });
    });
  };

  /* ---------------------------------------------------------
     Theme
     --------------------------------------------------------- */
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  UI.getThemeMode = function () {
    try {
      return localStorage.getItem(App.config.storageKeys.theme) || "system";
    } catch (error) {
      return "system";
    }
  };

  UI.resolveTheme = function (mode) {
    const value = mode || UI.getThemeMode();
    if (value === "system") return media && media.matches ? "dark" : "light";
    return value === "dark" ? "dark" : "light";
  };

  UI.applyTheme = function (mode, options) {
    const opts = options || {};
    const nextMode = mode || "system";
    try { localStorage.setItem(App.config.storageKeys.theme, nextMode); } catch (error) { /* ignore */ }
    const resolved = UI.resolveTheme(nextMode);
    document.documentElement.setAttribute("data-theme", resolved);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "dark" ? "#070d19" : "#f4f6fb");
    U.$$(".theme-icon").forEach(function (icon) {
      icon.className = "fa-solid theme-icon " + (resolved === "dark" ? "fa-sun" : "fa-moon");
    });
    if (opts.refresh && App.router && App.router.refresh) App.router.refresh();
  };

  UI.toggleTheme = function () {
    const resolved = UI.resolveTheme();
    UI.applyTheme(resolved === "dark" ? "light" : "dark", { refresh: true });
  };

  UI.setThemeMode = function (mode) {
    UI.applyTheme(mode, { refresh: true });
  };

  function watchSystemTheme() {
    if (!media) return;
    const handler = function () {
      if (UI.getThemeMode() === "system") UI.applyTheme("system", { refresh: true });
    };
    if (media.addEventListener) media.addEventListener("change", handler);
    else if (media.addListener) media.addListener(handler);
  }

  /* ---------------------------------------------------------
     Currency input
     --------------------------------------------------------- */
  UI.formatCurrencyInput = function (el) {
    const raw = String(el.value || "").replace(/\D/g, "");
    if (raw) {
      const formatted = Number(raw).toLocaleString("id-ID");
      if (el.value !== formatted) el.value = formatted;
    } else {
      el.value = "";
    }
  };

  /* ---------------------------------------------------------
     Page / user indicators
     --------------------------------------------------------- */
  UI.setPage = function (route) {
    const titleEl = U.$("#pageTitle");
    const subEl = U.$("#pageSub");
    const groupEl = U.$("#pageGroup");
    if (titleEl) titleEl.textContent = route.label;
    if (subEl) subEl.textContent = route.subtitle || "";
    if (groupEl) groupEl.textContent = route.group || "Workspace";
    document.title = route.label + " · " + App.config.appName;
  };

  UI.renderUser = function () {
    const user = App.store.user();
    const name = user ? user.name : "TAMU";
    const roleLabel = user ? (user.role === "admin" ? "Administrator" : "Staf Gudang") : "Belum masuk";
    const initials = U.initials(name);

    U.$$("[data-user-name]").forEach(function (el) { el.textContent = name; });
    U.$$("[data-user-role]").forEach(function (el) { el.textContent = roleLabel; });
    U.$$("[data-user-initials]").forEach(function (el) { el.textContent = initials; });
    U.$$("[data-user-username]").forEach(function (el) { el.textContent = user ? "@" + user.username : "-"; });
    document.body.setAttribute("data-role", user ? user.role : "guest");
  };

  UI.setCloudIndicator = function (state, text) {
    const pill = U.$("#cloudPill");
    const label = U.$("#cloudPillText");
    if (!pill || !label) return;
    const map = {
      synced: { cls: "pill-success", icon: "fa-cloud", text: text || "Cloud tersinkron" },
      syncing: { cls: "pill-info", icon: "fa-arrows-rotate spin", text: text || "Menyinkronkan..." },
      offline: { cls: "pill-warning", icon: "fa-plane", text: text || "Mode offline" },
      error: { cls: "pill-danger", icon: "fa-triangle-exclamation", text: text || "Cloud bermasalah" },
      disabled: { cls: "pill-muted", icon: "fa-cloud-slash", text: text || "Cloud nonaktif" },
      idle: { cls: "pill-muted", icon: "fa-cloud", text: text || "Cloud siap" }
    };
    const meta = map[state] || map.idle;
    pill.className = "pill cloud-pill " + meta.cls;
    pill.innerHTML = '<i class="fa-solid ' + meta.icon + '"></i><span id="cloudPillText">' + U.esc(meta.text) + '</span>';
  };

  /* ---------------------------------------------------------
     HTML helpers
     --------------------------------------------------------- */
  UI.pagination = function (options) {
    const opts = options || {};
    const total = Number(opts.total) || 0;
    const page = Math.max(1, Number(opts.page) || 1);
    const pages = Math.max(1, Number(opts.pages) || 1);
    const pageSize = Number(opts.pageSize) || App.config.pageSize;
    const start = total > 0 ? (page - 1) * pageSize + 1 : 0;
    const end = Math.min(page * pageSize, total);
    return '<div class="pagination">' +
      '<div>Menampilkan <strong>' + start + '–' + end + '</strong> dari <strong>' + total + '</strong> ' + U.esc(opts.noun || "data") + '</div>' +
      '<div class="pagination-controls">' +
        '<button type="button" class="page-btn" data-action="' + U.escapeAttr(opts.prevAction) + '" ' + (page <= 1 ? "disabled" : "") + ' aria-label="Halaman sebelumnya"><i class="fa-solid fa-chevron-left"></i></button>' +
        '<span class="page-current">' + page + ' / ' + pages + '</span>' +
        '<button type="button" class="page-btn" data-action="' + U.escapeAttr(opts.nextAction) + '" ' + (page >= pages ? "disabled" : "") + ' aria-label="Halaman berikutnya"><i class="fa-solid fa-chevron-right"></i></button>' +
      '</div>' +
    '</div>';
  };

  UI.emptyState = function (options) {
    const opts = options || {};
    return '<div class="empty-state">' +
      '<div class="empty-icon"><i class="fa-solid ' + U.escapeAttr(opts.icon || "fa-box-open") + '"></i></div>' +
      '<div class="empty-title">' + U.esc(opts.title || "Belum ada data") + '</div>' +
      '<div class="empty-text">' + U.esc(opts.text || "") + '</div>' +
      (opts.actions ? '<div class="empty-actions">' + opts.actions + '</div>' : "") +
    '</div>';
  };

  UI.scrollTop = function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  UI.init = function () {
    UI.applyTheme(UI.getThemeMode());
    watchSystemTheme();
  };

  App.ui = UI;
})(window.App);
