/* =========================================================
   Kartu Stok — Profil, Lisensi, Cloud & Backup
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const store = App.store;

  function licenseState() {
    return App.auth.licenseStatus();
  }

  function storageSize() {
    try {
      const raw = localStorage.getItem(App.config.storageKeys.data) || "";
      return U.formatBytes(raw.length * 2);
    } catch (error) {
      return "-";
    }
  }

  function themeMode() {
    return App.ui.getThemeMode();
  }

  function themeSegment(mode, icon, label) {
    return '<button type="button" class="segment' + (themeMode() === mode ? " active" : "") + '" ' +
      'data-action="settings:theme" data-mode="' + U.escapeAttr(mode) + '">' +
      '<i class="fa-solid ' + U.escapeAttr(icon) + '"></i> ' + U.esc(label) + '</button>';
  }

  function profileCard() {
    const profile = store.profile();
    return '<div class="card">' +
      '<div class="card-head has-border">' +
        '<div class="card-title-wrap">' +
          '<div class="card-title"><i class="fa-solid fa-store"></i> Profil Usaha & Lisensi</div>' +
          '<div class="card-sub">Identitas toko yang tercetak pada seluruh dokumen dan terikat pada serial lisensi.</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body pad">' +
        '<form data-form-action="settings:save-profile" autocomplete="off">' +
          '<div class="form-grid">' +
            '<div class="field span-2">' +
              '<label class="field-label" for="cfgStoreName">Nama Toko / Perusahaan <span class="req">*</span></label>' +
              '<input id="cfgStoreName" name="storeName" class="input uppercase-input" value="' + U.escapeAttr(profile.storeName || "") + '" placeholder="NAMA TOKO" required>' +
              '<div class="field-hint">Mengubah nama toko akan membatalkan lisensi aktif sampai serial key baru dimasukkan.</div>' +
            '</div>' +
            '<div class="field span-2">' +
              '<label class="field-label" for="cfgAddress">Alamat Lengkap</label>' +
              '<input id="cfgAddress" name="address" class="input uppercase-input" value="' + U.escapeAttr(profile.address || "") + '" placeholder="JL. MERDEKA NO. 123">' +
            '</div>' +
            '<div class="field">' +
              '<label class="field-label" for="cfgCity">Kota & Provinsi</label>' +
              '<input id="cfgCity" name="city" class="input uppercase-input" value="' + U.escapeAttr(profile.city || "") + '" placeholder="PONTIANAK, KALBAR">' +
            '</div>' +
            '<div class="field">' +
              '<label class="field-label" for="cfgPhone">Telepon / WhatsApp</label>' +
              '<input id="cfgPhone" name="phone" class="input" value="' + U.escapeAttr(profile.phone || "") + '" placeholder="0812-3456-7890">' +
            '</div>' +
          '</div>' +
          '<div class="form-actions">' +
            '<button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Simpan Profil</button>' +
          '</div>' +
        '</form>' +
      '</div>' +
    '</div>';
  }

  function licenseCard() {
    const status = licenseState();
    return '<div class="card">' +
      '<div class="card-head has-border">' +
        '<div class="card-title-wrap">' +
          '<div class="card-title"><i class="fa-solid fa-key"></i> Status Lisensi</div>' +
          '<div class="card-sub">Verifikasi keabsahan serial key terhadap nama toko yang terdaftar.</div>' +
        '</div>' +
        '<span class="badge ' + (status.valid ? "badge-success" : "badge-danger") + '">' +
          '<i class="fa-solid ' + (status.valid ? "fa-circle-check" : "fa-circle-xmark") + '"></i> ' +
          (status.valid ? "Aktif" : "Belum aktif") +
        '</span>' +
      '</div>' +
      '<div class="card-body pad">' +
        '<div class="setting-row">' +
          '<div class="setting-copy">' +
            '<div class="setting-title">Terdaftar untuk</div>' +
            '<div class="setting-sub">' + U.esc(status.storeName || "BELUM ADA NAMA TOKO") + '</div>' +
          '</div>' +
          (status.master
            ? '<span class="badge badge-info">MASTER KEY</span>'
            : '<span class="setting-value">' + (status.valid ? "SERIAL VALID" : "SERIAL TIDAK COCOK") + '</span>') +
        '</div>' +
        '<div class="setting-row">' +
          '<div class="setting-copy">' +
            '<div class="setting-title">Kunci lisensi tersimpan</div>' +
            '<div class="setting-sub">' + (status.current ? "Tersimpan aman di profil perangkat ini." : "Belum ada serial key yang tersimpan.") + '</div>' +
          '</div>' +
          '<span class="badge ' + (status.current ? "badge-success" : "badge-neutral") + '">' + (status.current ? "ADA" : "KOSONG") + '</span>' +
        '</div>' +
        '<div class="form-actions" style="margin-top:12px">' +
          '<button type="button" class="btn btn-secondary" data-action="auth:refresh-license"><i class="fa-solid fa-shield-halved"></i> Cek Lisensi</button>' +
          '<button type="button" class="btn btn-primary" data-action="auth:show-activation"><i class="fa-solid fa-key"></i> Perbarui Serial</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function appearanceCard() {
    const resolved = App.ui.resolveTheme(themeMode());
    return '<div class="card">' +
      '<div class="card-head has-border">' +
        '<div class="card-title-wrap">' +
          '<div class="card-title"><i class="fa-solid fa-palette"></i> Tampilan</div>' +
          '<div class="card-sub">Pilih tema terang, gelap, atau ikuti preferensi sistem operasi.</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body pad">' +
        '<div class="setting-row">' +
          '<div class="setting-copy">' +
            '<div class="setting-title">Mode tema</div>' +
            '<div class="setting-sub">Tema aktif saat ini: <strong>' + (resolved === "dark" ? "Gelap" : "Terang") + '</strong></div>' +
          '</div>' +
          '<div class="segmented">' +
            themeSegment("light", "fa-sun", "Terang") +
            themeSegment("dark", "fa-moon", "Gelap") +
            themeSegment("system", "fa-display", "Sistem") +
          '</div>' +
        '</div>' +
        '<div class="info-banner mt-3"><i class="fa-solid fa-circle-info"></i><div>' +
          'Tekan <span class="kbd">Ctrl</span> + <span class="kbd">K</span> untuk membuka pencarian cepat, atau <span class="kbd">?</span> untuk melihat pintasan keyboard.' +
        '</div></div>' +
      '</div>' +
    '</div>';
  }

  function cloudCard() {
    const enabled = App.config.cloud.enabled;
    const lastSync = App.cloud.lastSync();
    return '<div class="card">' +
      '<div class="card-head has-border">' +
        '<div class="card-title-wrap">' +
          '<div class="card-title"><i class="fa-solid fa-cloud"></i> Sinkronisasi Cloud</div>' +
          '<div class="card-sub">Cadangkan data ke Supabase agar dapat diakses dari perangkat lain.</div>' +
        '</div>' +
        '<span class="badge ' + (enabled ? "badge-success" : "badge-neutral") + '">' + (enabled ? "AKTIF" : "NONAKTIF") + '</span>' +
      '</div>' +
      '<div class="card-body pad">' +
        '<div class="setting-row">' +
          '<div class="setting-copy">' +
            '<div class="setting-title">Status koneksi</div>' +
            '<div class="setting-sub">' + (enabled ? "Cloud siap digunakan sesuai konfigurasi aplikasi." : "Sinkronisasi cloud dinonaktifkan pada perangkat ini.") + '</div>' +
          '</div>' +
          '<span class="badge ' + (U.isOnline() ? "badge-success" : "badge-warning") + '">' + (U.isOnline() ? "ONLINE" : "OFFLINE") + '</span>' +
        '</div>' +
        '<div class="setting-row">' +
          '<div class="setting-copy">' +
            '<div class="setting-title">Sinkronisasi terakhir</div>' +
            '<div class="setting-sub">' + (lastSync ? U.esc(U.formatDateTime(lastSync)) : "Belum pernah disinkronkan dari perangkat ini.") + '</div>' +
          '</div>' +
          '<span class="setting-value">' + U.esc(lastSync ? lastSync.slice(-5) : "--:--") + '</span>' +
        '</div>' +
        '<div class="form-actions" style="margin-top:12px">' +
          '<button type="button" class="btn btn-primary" data-action="settings:sync"><i class="fa-solid fa-rotate"></i> Sinkronkan Sekarang</button>' +
          '<button type="button" class="btn ' + (enabled ? "btn-soft-danger" : "btn-secondary") + '" data-action="settings:toggle-cloud">' +
            '<i class="fa-solid ' + (enabled ? "fa-cloud-slash" : "fa-cloud") + '"></i> ' + (enabled ? "Nonaktifkan Cloud" : "Aktifkan Cloud") +
          '</button>' +
        '</div>' +
        '<div class="info-banner warning mt-3"><i class="fa-solid fa-triangle-exclamation"></i><div>' +
          'Menonaktifkan cloud hanya berlaku pada perangkat ini. Data lokal tetap utuh dan dapat diaktifkan kembali kapan saja.' +
        '</div></div>' +
      '</div>' +
    '</div>';
  }

  function dataCard() {
    return '<div class="card">' +
      '<div class="card-head has-border">' +
        '<div class="card-title-wrap">' +
          '<div class="card-title"><i class="fa-solid fa-database"></i> Backup & Pemulihan Data</div>' +
          '<div class="card-sub">Simpan cadangan JSON secara berkala untuk mengantisipasi kerusakan perangkat.</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body pad">' +
        '<div class="setting-row">' +
          '<div class="setting-copy">' +
            '<div class="setting-title">Ukuran data lokal</div>' +
            '<div class="setting-sub">' + store.products().length + ' barang · ' + store.mutations().length + ' mutasi · ' + store.opname().length + ' opname</div>' +
          '</div>' +
          '<span class="setting-value">' + U.esc(storageSize()) + '</span>' +
        '</div>' +
        '<div class="form-actions" style="margin-top:12px">' +
          '<button type="button" class="btn btn-primary" data-action="settings:backup"><i class="fa-solid fa-download"></i> Unduh Cadangan JSON</button>' +
          '<button type="button" class="btn btn-secondary" data-action="settings:restore"><i class="fa-solid fa-upload"></i> Pulihkan Cadangan</button>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div class="setting-row">' +
          '<div class="setting-copy">' +
            '<div class="setting-title">Draft stok opname</div>' +
            '<div class="setting-sub">Hapus hasil hitung fisik yang belum disimpan.</div>' +
          '</div>' +
          '<button type="button" class="btn btn-sm btn-ghost" data-action="settings:clear-draft"><i class="fa-solid fa-eraser"></i> Bersihkan</button>' +
        '</div>' +
        '<div class="setting-row">' +
          '<div class="setting-copy">' +
            '<div class="setting-title text-danger">Reset ke setelan pabrik</div>' +
            '<div class="setting-sub">Menghapus seluruh data lokal dan mengembalikan contoh data awal. Data cloud tidak ikut terhapus.</div>' +
          '</div>' +
          '<button type="button" class="btn btn-sm btn-soft-danger" data-action="settings:reset"><i class="fa-solid fa-trash-can"></i> Reset</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function accountCard() {
    const user = store.user();
    return '<div class="card">' +
      '<div class="card-head has-border">' +
        '<div class="card-title-wrap">' +
          '<div class="card-title"><i class="fa-solid fa-user-shield"></i> Akun & Sesi</div>' +
          '<div class="card-sub">Informasi akun yang sedang menggunakan aplikasi.</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body pad">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<span class="avatar">' + U.esc(U.initials(user ? user.name : "?")) + '</span>' +
          '<div style="min-width:0;flex:1">' +
            '<div class="setting-title">' + U.esc(user ? user.name : "TAMU") + '</div>' +
            '<div class="setting-sub">' + U.esc(user ? "@" + user.username + " · " + (user.role === "admin" ? "Administrator" : "Staf Gudang") : "Belum masuk") + '</div>' +
          '</div>' +
          '<span class="badge ' + (user && user.role === "admin" ? "badge-primary" : "badge-neutral") + '">' + (user ? (user.role === "admin" ? "ADMIN" : "STAF") : "-") + '</span>' +
        '</div>' +
        '<div class="form-actions" style="margin-top:16px">' +
          '<button type="button" class="btn btn-soft-danger" data-action="auth:logout"><i class="fa-solid fa-right-from-bracket"></i> Keluar dari Akun</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function aboutCard() {
    const status = licenseState();
    return '<div class="card">' +
      '<div class="card-body pad">' +
        '<div class="metric-inline">' +
          '<div class="mi"><div class="mi-label">Versi</div><div class="mi-value">' + U.esc(App.config.version) + '</div></div>' +
          '<div class="mi"><div class="mi-label">Edisi</div><div class="mi-value" style="font-size:11px">' + U.esc(App.config.edition) + '</div></div>' +
          '<div class="mi"><div class="mi-label">Lisensi</div><div class="mi-value" style="font-size:11px">' + (status.valid ? "VALID" : "BELUM AKTIF") + '</div></div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div class="fs-11 muted" style="line-height:1.7">' +
          '<strong>' + U.esc(App.config.appName) + '</strong><br>' +
          'Dikembangkan oleh <strong>' + U.esc(App.config.developer) + '</strong> &copy; ' + new Date().getFullYear() + '<br>' +
          'Penyimpanan: <span class="mono">' + U.esc(App.config.storageKeys.data) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function render() {
    const status = licenseState();
    return '<div class="page-stack">' +
      (status.valid
        ? '<div class="info-banner success"><i class="fa-solid fa-circle-check"></i><div>Lisensi aktif untuk <strong>' + U.esc(status.storeName) + '</strong>. Seluruh fitur administrasi tersedia.</div></div>'
        : '<div class="info-banner danger"><i class="fa-solid fa-triangle-exclamation"></i><div>Lisensi belum aktif. Perbarui serial key agar aplikasi dapat digunakan sepenuhnya.</div></div>') +
      '<div class="settings-grid">' +
        '<div class="settings-stack">' +
          profileCard() +
          licenseCard() +
          appearanceCard() +
        '</div>' +
        '<div class="settings-stack">' +
          cloudCard() +
          dataCard() +
          accountCard() +
          aboutCard() +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------------------------------------------------------
     Profile
     --------------------------------------------------------- */
  App.formActions["settings:save-profile"] = async function (form) {
    if (!App.auth.requireAdmin("mengubah profil usaha")) return;
    const get = function (name) {
      return form.querySelector('[name="' + name + '"]');
    };
    const storeName = U.upper((get("storeName") || {}).value);
    if (!storeName) {
      App.ui.toast("Nama toko wajib diisi.", "error", "Data belum lengkap");
      if (get("storeName")) get("storeName").focus();
      return;
    }
    const oldName = U.upper(store.profile().storeName);
    if (oldName !== storeName) {
      const ok = await App.ui.confirm({
        title: "Ubah nama toko?",
        message: "Nama toko berubah dari <strong>" + U.esc(oldName) + "</strong> menjadi <strong>" + U.esc(storeName) + "</strong>.",
        note: "Lisensi saat ini akan tidak berlaku. Anda harus memasukkan serial key baru yang sesuai dengan nama toko tersebut.",
        confirmText: "Ya, ubah nama",
        variant: "warning",
        icon: "fa-key"
      });
      if (!ok) {
        App.router.refreshHard();
        return;
      }
    }

    const data = store.get();
    data.profile.storeName = storeName;
    data.profile.address = U.upper((get("address") || {}).value);
    data.profile.city = U.upper((get("city") || {}).value);
    data.profile.phone = String((get("phone") || {}).value || "").trim();
    store.save();
    App.ui.toast("Profil usaha berhasil diperbarui.", "success", "Profil disimpan");

    if (!licenseState().valid) {
      setTimeout(function () {
        App.auth.showActivation("Nama toko berubah. Masukkan serial key baru untuk mengaktifkan kembali aplikasi.");
      }, 380);
    }
  };

  /* ---------------------------------------------------------
     Theme
     --------------------------------------------------------- */
  App.actions["settings:theme"] = function (el) {
    const mode = el.getAttribute("data-mode") || "system";
    App.ui.setThemeMode(mode);
    App.ui.toast("Tema " + (mode === "system" ? "mengikuti sistem" : (mode === "dark" ? "gelap" : "terang")) + " diterapkan.", "info", "Tampilan diperbarui");
  };

  /* ---------------------------------------------------------
     Cloud
     --------------------------------------------------------- */
  App.actions["settings:sync"] = function () {
    App.cloud.syncNow();
  };

  App.actions["settings:toggle-cloud"] = async function () {
    if (!App.auth.requireAdmin("mengubah konfigurasi cloud")) return;
    const enabled = App.config.cloud.enabled;
    const ok = await App.ui.confirm({
      title: enabled ? "Nonaktifkan sinkronisasi cloud?" : "Aktifkan sinkronisasi cloud?",
      message: enabled
        ? "Aplikasi akan berhenti mengirim dan mengambil data dari Supabase pada perangkat ini."
        : "Aplikasi akan kembali menyinkronkan data dengan Supabase pada perangkat ini.",
      note: "Halaman akan dimuat ulang agar perubahan konfigurasi berlaku.",
      confirmText: enabled ? "Ya, nonaktifkan" : "Ya, aktifkan",
      variant: enabled ? "warning" : "primary",
      icon: "fa-cloud"
    });
    if (!ok) return;
    try {
      if (enabled) localStorage.setItem(App.config.storageKeys.cloudOff, "1");
      else localStorage.removeItem(App.config.storageKeys.cloudOff);
    } catch (error) { /* ignore */ }
    App.ui.toast("Konfigurasi cloud diperbarui. Memuat ulang halaman...", "info", "Harap tunggu");
    setTimeout(function () { window.location.reload(); }, 900);
  };

  /* ---------------------------------------------------------
     Backup / restore / reset
     --------------------------------------------------------- */
  App.actions["settings:backup"] = function () {
    App.exports.backupJSON(store.get());
    App.ui.toast("File cadangan JSON berhasil diunduh.", "success", "Cadangan dibuat");
  };

  App.actions["settings:restore"] = function () {
    if (!App.auth.requireAdmin("memulihkan cadangan data")) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    input.addEventListener("change", function () {
      const file = input.files && input.files[0];
      if (file) handleRestoreFile(file);
      if (input.parentNode) input.parentNode.removeChild(input);
    });
    document.body.appendChild(input);
    input.click();
  };

  function handleRestoreFile(file) {
    const reader = new FileReader();
    reader.onload = async function (event) {
      const parsed = U.safeJSONParse(event.target.result, null);
      if (!parsed || typeof parsed !== "object" || (!Array.isArray(parsed.products) && !Array.isArray(parsed.mutasi))) {
        App.ui.toast("Berkas bukan cadangan Kartu Stok yang valid.", "error", "Pemulihan gagal");
        return;
      }
      const ok = await App.ui.confirm({
        title: "Pulihkan data dari cadangan?",
        message: "Cadangan berisi <strong>" + (parsed.products || []).length + " barang</strong> dan <strong>" + (parsed.mutasi || []).length + " mutasi</strong>.",
        note: "Seluruh data lokal saat ini akan digantikan oleh isi cadangan. Pastikan Anda sudah membuat cadangan terbaru.",
        confirmText: "Ya, pulihkan",
        variant: "warning",
        icon: "fa-upload"
      });
      if (!ok) return;

      const currentUser = store.user();
      const payload = Object.assign({}, parsed, { currentUser: currentUser });
      try {
        store.replace(payload);
        App.ui.toast("Data berhasil dipulihkan dari cadangan.", "success", "Pemulihan selesai");
        if (!licenseState().valid) {
          setTimeout(function () {
            App.auth.showActivation("Data cadangan menggunakan nama toko lain. Masukkan serial key yang sesuai.");
          }, 380);
        }
      } catch (error) {
        console.error("Restore gagal:", error);
        App.ui.toast("Data cadangan tidak dapat diproses.", "error", "Pemulihan gagal");
      }
    };
    reader.onerror = function () {
      App.ui.toast("Berkas tidak dapat dibaca.", "error", "Pemulihan gagal");
    };
    reader.readAsText(file);
  }

  App.actions["settings:clear-draft"] = function () {
    if (!App.auth.requireAdmin("membersihkan draft opname")) return;
    if (App.actions["opname:reset-draft"]) {
      App.actions["opname:reset-draft"]();
    } else {
      try { localStorage.removeItem(App.config.storageKeys.opnameDraft); } catch (error) { /* ignore */ }
      App.ui.toast("Draft opname lokal dibersihkan.", "success", "Draft dihapus");
    }
  };

  App.actions["settings:reset"] = async function () {
    if (!App.auth.requireAdmin("mereset seluruh data")) return;
    const typed = await App.ui.prompt({
      title: "Reset ke setelan pabrik",
      message: "Ketik RESET pada kolom di bawah untuk mengonfirmasi. Seluruh barang, mutasi, dan riwayat opname lokal akan dihapus.",
      label: "Konfirmasi",
      placeholder: "RESET",
      confirmText: "Lanjutkan",
      requiredMessage: "Ketik RESET untuk melanjutkan."
    });
    if (typed === null) return;
    if (U.upper(typed) !== "RESET") {
      App.ui.toast("Konfirmasi tidak cocok. Reset dibatalkan.", "warning", "Reset dibatalkan");
      return;
    }
    const ok = await App.ui.confirm({
      title: "Hapus seluruh data lokal?",
      message: "Tindakan ini <strong>tidak dapat dibatalkan</strong>. Buat cadangan terlebih dahulu apabila masih diperlukan.",
      note: "Data yang sudah tersinkron ke cloud tidak ikut terhapus.",
      confirmText: "Ya, reset sekarang",
      variant: "danger",
      icon: "fa-trash-can"
    });
    if (!ok) return;

    try {
      localStorage.removeItem(App.config.storageKeys.opnameDraft);
      localStorage.removeItem(App.config.storageKeys.lastSync);
    } catch (error) { /* ignore */ }
    store.reset({ sync: false, render: false });
    App.ui.renderUser();
    App.auth.showLogin();
    App.renderNotifications();
    App.ui.toast("Data lokal telah dikembalikan ke setelan pabrik.", "success", "Reset selesai");
  };

  App.router.register({
    id: "settings",
    label: "Pengaturan",
    subtitle: "Profil usaha, lisensi, tampilan, cloud, dan cadangan data",
    group: "Sistem",
    icon: "fa-gear",
    adminOnly: true,
    render: render
  });

  App.modules.settings = { render: render };
})(window.App);
