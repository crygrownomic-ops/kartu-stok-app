/* =========================================================
   Kartu Stok — Router & Navigation
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const Router = {};

  const routes = [];
  let currentId = null;
  let started = false;
  let hashBound = false;

  Router.register = function (route) {
    if (!route || !route.id || typeof route.render !== "function") {
      console.warn("Rute tidak valid:", route);
      return;
    }
    const existing = routes.findIndex(function (item) { return item.id === route.id; });
    if (existing >= 0) routes.splice(existing, 1);
    routes.push(route);
  };

  Router.routes = function () { return routes.slice(); };

  Router.get = function (id) {
    return routes.find(function (route) { return route.id === id; }) || null;
  };

  Router.allowed = function (route) {
    if (!route) return false;
    if (route.adminOnly && !App.store.isAdmin()) return false;
    return true;
  };

  Router.current = function () { return Router.get(currentId); };

  function resolveId(raw) {
    const id = String(raw || "").replace(/^#\/?/, "").trim();
    if (!id) return "dashboard";
    return id;
  }

  function firstAllowed() {
    const route = routes.find(Router.allowed);
    return route ? route.id : "dashboard";
  }

  /* ---------------------------------------------------------
     Navigation rendering
     --------------------------------------------------------- */
  function navItem(route) {
    const badge = typeof route.badge === "function" ? route.badge() : null;
    const badgeHtml = badge
      ? '<span class="nav-badge" data-nav-badge="' + U.escapeAttr(route.id) + '">' + U.esc(badge) + '</span>'
      : '<span class="nav-badge' + (route.badge ? "" : " hidden") + '" data-nav-badge="' + U.escapeAttr(route.id) + '"></span>';
    return '<button type="button" class="nav-item' + (route.id === currentId ? " active" : "") + '" ' +
      'data-action="nav:go" data-route="' + U.escapeAttr(route.id) + '">' +
      '<i class="fa-solid ' + U.escapeAttr(route.icon || "fa-circle") + '"></i>' +
      '<span class="nav-label">' + U.esc(route.label) + '</span>' +
      badgeHtml +
    '</button>';
  }

  Router.renderNav = function () {
    const host = U.$("#sidebarNav");
    if (!host) return;
    const allowed = routes.filter(function (route) {
      return !route.hidden && Router.allowed(route);
    });
    const groups = [];
    const map = {};
    allowed.forEach(function (route) {
      const group = route.group || "Workspace";
      if (!map[group]) {
        map[group] = [];
        groups.push(group);
      }
      map[group].push(route);
    });
    host.innerHTML = groups.map(function (group) {
      return '<div class="nav-group">' +
        '<div class="nav-group-label">' + U.esc(group) + '</div>' +
        map[group].map(navItem).join("") +
      '</div>';
    }).join("");
  };

  Router.refreshBadges = function () {
    routes.forEach(function (route) {
      const el = U.$('[data-nav-badge="' + route.id + '"]');
      if (!el) return;
      const badge = typeof route.badge === "function" ? route.badge() : null;
      el.textContent = badge == null || badge === "" || badge === 0 ? "" : badge;
      el.classList.toggle("hidden", badge == null || badge === "" || badge === 0);
    });
  };

  /* ---------------------------------------------------------
     Focus / scroll preservation
     --------------------------------------------------------- */
  function captureFocus() {
    const root = U.$("#viewRoot");
    const active = document.activeElement;
    if (!root || !active || !root.contains(active)) return null;
    const snapshot = {
      id: active.id || "",
      name: active.getAttribute("name") || "",
      action: active.getAttribute("data-input-action") || active.getAttribute("data-change-action") || "",
      tag: active.tagName,
      start: null,
      end: null,
      scrollY: window.scrollY || window.pageYOffset || 0
    };
    try {
      if (typeof active.selectionStart === "number") {
        snapshot.start = active.selectionStart;
        snapshot.end = active.selectionEnd;
      }
    } catch (error) { /* ignore */ }
    return snapshot;
  }

  function restoreFocus(snapshot) {
    if (!snapshot) return;
    const root = U.$("#viewRoot");
    let el = null;
    if (snapshot.id) el = root.querySelector("#" + (window.CSS && CSS.escape ? CSS.escape(snapshot.id) : snapshot.id));
    if (!el && snapshot.name) el = root.querySelector('[name="' + snapshot.name + '"]');
    if (!el && snapshot.action) el = root.querySelector('[data-input-action="' + snapshot.action + '"], [data-change-action="' + snapshot.action + '"]');
    if (el && typeof el.focus === "function") {
      el.focus({ preventScroll: true });
      if (snapshot.start != null && typeof el.setSelectionRange === "function") {
        try { el.setSelectionRange(snapshot.start, snapshot.end); } catch (error) { /* ignore */ }
      }
    }
    window.scrollTo({ top: snapshot.scrollY || 0, behavior: "auto" });
  }

  /* ---------------------------------------------------------
     Render
     --------------------------------------------------------- */
  function render(options) {
    const opts = options || {};
    const root = U.$("#viewRoot");
    if (!root) return;
    let route = Router.get(currentId);
    if (!route || !Router.allowed(route)) {
      currentId = firstAllowed();
      route = Router.get(currentId);
    }
    if (!route) return;

    const snapshot = opts.preserveFocus === false ? null : captureFocus();
    document.body.setAttribute("data-route", route.id);
    App.ui.setPage(route);
    root.innerHTML = route.render();
    if (typeof route.mount === "function") {
      try { route.mount(root); }
      catch (error) { console.error("Mount rute " + route.id + " gagal:", error); }
    }
    Router.renderNav();
    Router.refreshBadges();
    restoreFocus(snapshot);
  }

  Router.show = function (id) {
    const route = Router.get(id);
    if (!route || !Router.allowed(route)) {
      App.ui.toast("Halaman tidak tersedia untuk peran akun Anda.", "warning", "Akses dibatasi");
      Router.go(firstAllowed());
      return false;
    }
    currentId = id;
    if (started) render();
    return true;
  };

  Router.go = function (id) {
    const route = Router.get(id);
    if (!route) return false;
    if (!Router.allowed(route)) {
      App.ui.toast("Halaman ini hanya tersedia untuk Administrator.", "error", "Akses ditolak");
      return false;
    }
    const target = "#/" + id;
    if (window.location.hash === target) {
      if (currentId !== id) Router.show(id);
      else render({ preserveFocus: false });
    } else {
      window.location.hash = target;
    }
    closeMobileSidebar();
    return true;
  };

  Router.refresh = function () {
    if (!started || !currentId) return;
    render();
  };

  Router.refreshHard = function () {
    if (!started || !currentId) return;
    render({ preserveFocus: false });
  };

  function onHashChange() {
    const id = resolveId(window.location.hash);
    if (!Router.get(id) || !Router.allowed(Router.get(id))) {
      currentId = firstAllowed();
      history.replaceState(null, "", "#/" + currentId);
      render({ preserveFocus: false });
      return;
    }
    currentId = id;
    render({ preserveFocus: false });
  }

  function closeMobileSidebar() {
    const sidebar = U.$("#sidebar");
    const overlay = U.$("#sidebarOverlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("show");
    document.body.classList.remove("sidebar-open");
  }

  Router.start = function () {
    closeMobileSidebar();
    if (!hashBound) {
      window.addEventListener("hashchange", onHashChange);
      hashBound = true;
    }
    const id = resolveId(window.location.hash);
    const route = Router.get(id);
    currentId = route && Router.allowed(route) ? id : firstAllowed();
    if (window.location.hash !== "#/" + currentId) {
      history.replaceState(null, "", "#/" + currentId);
    }
    started = true;
    render({ preserveFocus: false });
  };

  Router.stop = function () {
    started = false;
    currentId = null;
  };

  App.actions["nav:go"] = function (el) {
    const id = el.getAttribute("data-route");
    if (id) Router.go(id);
  };

  App.actions["nav:close-sidebar"] = function () { closeMobileSidebar(); };

  App.router = Router;
})(window.App);
