/* =========================================================
   Kartu Stok — Authentication & License
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const Auth = {};

  /* ---------------------------------------------------------
     License
     --------------------------------------------------------- */
  Auth.generateLicenseKey = function (storeName) {
    const secret = App.config.passwordSalt;
    const str = U.upper(storeName) + secret;
    let h1 = 0;
    let h2 = 0;
    for (let i = 0; i < str.length; i += 1) {
      const ch = str.charCodeAt(i);
      h1 = ((h1 << 5) - h1) + ch;
      h1 |= 0;
      h2 = ((h2 << 7) - h2) + ch;
      h2 |= 0;
    }
    const hex1 = Math.abs(h1).toString(16).toUpperCase().padStart(8, "9");
    const hex2 = Math.abs(h2).toString(16).toUpperCase().padStart(8, "7");
    const combined = (hex1 + hex2).slice(0, 16);
    return combined.slice(0, 4) + "-" + combined.slice(4, 8) + "-" +
      combined.slice(8, 12) + "-" + combined.slice(12, 16);
  };

  Auth.licenseStatus = function () {
    const profile = App.store.profile();
    const storeName = U.upper(profile.storeName);
    const expected = Auth.generateLicenseKey(storeName);
    const current = U.upper(profile.licenseKey || "");
    const isMaster = current === U.upper(App.config.masterKey);
    return {
      valid: Boolean(storeName) && (current === expected || isMaster),
      storeName: storeName,
      expected: expected,
      current: current,
      master: isMaster
    };
  };

  Auth.isActivated = function () {
    return Auth.licenseStatus().valid;
  };

  /* ---------------------------------------------------------
     Screens
     --------------------------------------------------------- */
  function shellEl() { return U.$("#appShell"); }
  function authEl() { return U.$("#authScreen"); }
  function activationEl() { return U.$("#activationScreen"); }

  Auth.showLogin = function () {
    const shell = shellEl();
    const auth = authEl();
    const activation = activationEl();
    if (shell) shell.classList.add("hidden");
    if (activation) activation.classList.add("hidden");
    if (auth) auth.classList.remove("hidden");
    App.ui.renderUser();
    setTimeout(function () {
      const input = U.$("#loginUsername");
      if (input) input.focus();
    }, 90);
  };

  Auth.showActivation = function (message) {
    const shell = shellEl();
    const auth = authEl();
    const activation = activationEl();
    if (shell) shell.classList.add("hidden");
    if (auth) auth.classList.add("hidden");
    if (!activation) return;

    const status = Auth.licenseStatus();
    const label = U.$("#activationStoreName");
    if (label) label.textContent = status.storeName || "BELUM TERDAFTAR";
    const msg = U.$("#activationMessage");
    if (msg) {
      msg.textContent = message || "Aplikasi membutuhkan serial key yang terdaftar untuk dapat digunakan.";
      msg.classList.toggle("hidden", !message);
    }
    const input = U.$("#activationKey");
    if (input) {
      input.value = "";
      setTimeout(function () { input.focus(); }, 90);
    }
    activation.classList.remove("hidden");
  };

  Auth.enterApp = function () {
    if (!Auth.isActivated()) {
      Auth.showActivation();
      return;
    }
    const auth = authEl();
    const activation = activationEl();
    if (auth) auth.classList.add("hidden");
    if (activation) activation.classList.add("hidden");
    const shell = shellEl();
    if (shell) shell.classList.remove("hidden");

    App.ui.renderUser();
    App.router.start();
    App.cloud.bootstrap();
    App.renderNotifications();
  };

  /* ---------------------------------------------------------
     Login / logout
     --------------------------------------------------------- */
  function showFormError(target, message) {
    const el = typeof target === "string" ? U.$(target) : target;
    if (!el) return;
    const text = el.querySelector("span") || el;
    text.textContent = message || "";
    el.classList.remove("hidden");
    el.classList.remove("shake");
    // Restart the animation on repeated failures.
    void el.offsetWidth;
    el.classList.add("shake");
  }

  function hideFormError(target) {
    const el = typeof target === "string" ? U.$(target) : target;
    if (el) el.classList.add("hidden");
  }

  Auth.login = function (username, password) {
    if (!Auth.isActivated()) {
      Auth.showActivation();
      return false;
    }
    const user = String(username || "").trim().toLowerCase();
    const pass = String(password || "");
    const account = App.config.users.find(function (item) {
      return item.username === user && item.password === pass;
    });
    if (!account) {
      showFormError("#loginError", "Username atau password salah. Silakan coba kembali.");
      return false;
    }
    hideFormError("#loginError");
    const data = App.store.get();
    data.currentUser = { username: account.username, role: account.role, name: account.name };
    App.store.save({ sync: false, render: false });
    App.ui.renderUser();
    App.ui.toast("Selamat datang, " + account.name + ".", "success", "Berhasil masuk");
    Auth.enterApp();
    return true;
  };

  Auth.logout = async function () {
    const ok = await App.ui.confirm({
      title: "Keluar dari akun?",
      message: "Sesi Anda akan diakhiri. Data yang sudah disimpan tetap aman di perangkat ini.",
      confirmText: "Ya, keluar",
      variant: "danger",
      icon: "fa-right-from-bracket"
    });
    if (!ok) return;

    const data = App.store.get();
    data.currentUser = null;
    App.store.save({ sync: false, render: false });
    App.ui.renderUser();
    Auth.showLogin();
    App.ui.toast("Anda telah keluar dari sistem.", "info", "Sesi berakhir");
  };

  Auth.requireAdmin = function (actionLabel) {
    if (App.store.isAdmin()) return true;
    App.ui.toast(
      "Hanya Administrator yang dapat " + (actionLabel || "melakukan aksi ini") + ".",
      "error",
      "Akses ditolak"
    );
    return false;
  };

  /* ---------------------------------------------------------
     Binding
     --------------------------------------------------------- */
  Auth.init = function () {
    // Login form is handled through global delegation (data-form-action).
    const activationForm = U.$("#activationForm");
    if (activationForm && !activationForm.getAttribute("data-form-action")) {
      activationForm.setAttribute("data-form-action", "auth:activate");
    }

    const passwordToggle = U.$("[data-password-toggle]");
    if (passwordToggle && !passwordToggle.getAttribute("data-action")) {
      passwordToggle.setAttribute("data-action", "auth:toggle-password");
    }
  };

  /* ---------------------------------------------------------
     Global actions
     --------------------------------------------------------- */
  App.formActions["auth:login"] = function (form) {
    const username = (U.$("#loginUsername", form) || {}).value || "";
    const password = (U.$("#loginPassword", form) || {}).value || "";
    const ok = Auth.login(username, password);
    if (ok) {
      form.reset();
      const pw = U.$("#loginPassword", form);
      if (pw) pw.setAttribute("type", "password");
    }
  };

  App.formActions["auth:activate"] = function (form) {
    const input = U.$("#activationKey", form);
    const errorEl = U.$("#activationError");
    const key = U.upper(input ? input.value : "");
    const status = Auth.licenseStatus();

    if (!key) {
      showFormError(errorEl, "Masukkan serial key terlebih dahulu.");
      return;
    }
    if (key !== status.expected && key !== U.upper(App.config.masterKey)) {
      showFormError(errorEl, "Serial key tidak valid untuk nama toko ini.");
      if (input) {
        input.classList.add("error");
        input.focus();
      }
      return;
    }

    hideFormError(errorEl);
    const data = App.store.get();
    data.profile.licenseKey = key;
    App.store.save({ render: false });
    App.ui.toast("Lisensi berhasil diaktifkan.", "success", "Aktivasi berhasil");
    if (App.store.isLoggedIn()) Auth.enterApp();
    else Auth.showLogin();
  };

  App.actions["auth:logout"] = function () { Auth.logout(); };

  App.actions["auth:toggle-password"] = function (el) {
    const targetId = el.getAttribute("data-target") || "loginPassword";
    const input = document.getElementById(targetId);
    if (!input) return;
    const isPassword = input.getAttribute("type") === "password";
    input.setAttribute("type", isPassword ? "text" : "password");
    const icon = el.querySelector("i");
    if (icon) icon.className = "fa-solid " + (isPassword ? "fa-eye-slash" : "fa-eye");
    input.focus();
  };

  App.actions["auth:show-activation"] = function () {
    Auth.showActivation("Perbarui lisensi untuk melanjutkan penggunaan aplikasi.");
  };

  App.actions["auth:refresh-license"] = function () {
    const status = Auth.licenseStatus();
    if (status.valid) {
      App.ui.toast("Lisensi valid untuk " + status.storeName + ".", "success", "Lisensi aktif");
    } else {
      Auth.showActivation("Lisensi tidak valid. Masukkan serial key yang sesuai.");
    }
  };

  App.auth = Auth;
})(window.App);
