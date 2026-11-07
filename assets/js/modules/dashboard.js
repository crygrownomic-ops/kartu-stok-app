/* =========================================================
   Kartu Stok — Dashboard Module
   ========================================================= */

(function (App) {
  "use strict";

  const U = App.utils;
  const store = App.store;

  let categoryChart = null;
  let movementChart = null;
  let lastRenderedKey = "";

  function statCard(options) {
    const o = options || {};
    return '<div class="stat-card ' + (o.accent || "") + '">' +
      '<div class="stat-top">' +
        '<div class="stat-label">' + U.esc(o.label) + '</div>' +
        '<div class="stat-icon ' + (o.tone || "") + '"><i class="fa-solid ' + U.escapeAttr(o.icon || "fa-box") + '"></i></div>' +
      '</div>' +
      '<div class="stat-value' + (o.currency ? " currency" : "") + '">' + o.value + '</div>' +
      '<div class="stat-foot">' + (o.foot || "") + '</div>' +
    '</div>';
  }

  function renderAlerts(stats) {
    const alerts = [];
    if (stats.expiredCount > 0) {
      alerts.push('<div class="alert alert-danger">' +
        '<div class="alert-icon"><i class="fa-solid fa-skull-crossbones"></i></div>' +
        '<div class="alert-copy"><div class="alert-title">' + stats.expiredCount + ' batch sudah expired</div>' +
          '<div class="alert-text">Batch kedaluwarsa perlu dipisahkan dari stok layak jual dan ditindaklanjuti.</div></div>' +
        '<div class="alert-action"><button type="button" class="btn btn-sm btn-soft-danger" data-action="dashboard:go" data-route="reports">Lihat laporan</button></div>' +
      '</div>');
    }
    if (stats.lowStockCount > 0) {
      alerts.push('<div class="alert alert-warning">' +
        '<div class="alert-icon"><i class="fa-solid fa-arrow-trend-down"></i></div>' +
        '<div class="alert-copy"><div class="alert-title">' + stats.lowStockCount + ' barang di bawah stok minimum</div>' +
          '<div class="alert-text">Segera lakukan pengadaan ulang agar operasional tidak terganggu.</div></div>' +
        '<div class="alert-action"><button type="button" class="btn btn-sm btn-soft-warning" data-action="dashboard:low-stock">Lihat barang</button></div>' +
      '</div>');
    }
    if (stats.soonCount > 0) {
      alerts.push('<div class="alert alert-info">' +
        '<div class="alert-icon"><i class="fa-solid fa-hourglass-half"></i></div>' +
        '<div class="alert-copy"><div class="alert-title">' + stats.soonCount + ' batch mendekati expired</div>' +
          '<div class="alert-text">Prioritaskan pengeluaran batch ini (metode FEFO) dalam 30 hari ke depan.</div></div>' +
        '<div class="alert-action"><button type="button" class="btn btn-sm btn-soft-primary" data-action="dashboard:go" data-route="reports">Lihat batch</button></div>' +
      '</div>');
    }
    if (!alerts.length) {
      alerts.push('<div class="alert alert-success">' +
        '<div class="alert-icon"><i class="fa-solid fa-circle-check"></i></div>' +
        '<div class="alert-copy"><div class="alert-title">Semua kondisi stok aman</div>' +
          '<div class="alert-text">Tidak ada barang di bawah minimum maupun batch yang mendekati expired.</div></div>' +
      '</div>');
    }
    return alerts.join("");
  }

  function renderRecent(mutations) {
    if (!mutations.length) {
      return '<div class="empty-state" style="padding:30px 20px">' +
        '<div class="empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>' +
        '<div class="empty-title">Belum ada aktivitas</div>' +
        '<div class="empty-text">Transaksi stok masuk dan keluar akan tampil di sini.</div>' +
      '</div>';
    }
    return '<div class="activity-list">' + mutations.map(function (m) {
      return '<div class="activity-item">' +
        '<div class="activity-icon ' + (m.type === "IN" ? "in" : "out") + '">' +
          '<i class="fa-solid ' + (m.type === "IN" ? "fa-arrow-down" : "fa-arrow-up") + '"></i>' +
        '</div>' +
        '<div class="activity-copy">' +
          '<div class="activity-title">' + U.esc(m.name) + '</div>' +
          '<div class="activity-sub">' + U.esc(U.formatDateTime(m.date)) + ' · ' + U.esc(m.user || "SYSTEM") + '</div>' +
        '</div>' +
        '<div class="activity-qty ' + (m.type === "IN" ? "text-success" : "text-danger") + '">' +
          (m.type === "IN" ? "+" : "−") + U.formatNumber(m.inputQty != null ? m.inputQty : m.qty, 2) + ' ' + U.esc(m.txUnit || "PCS") +
        '</div>' +
      '</div>';
    }).join("") + '</div>';
  }

  function renderTopProducts(products) {
    if (!products.length) {
      return '<div class="empty-state" style="padding:30px 20px">' +
        '<div class="empty-icon"><i class="fa-solid fa-box-open"></i></div>' +
        '<div class="empty-title">Belum ada barang</div>' +
        '<div class="empty-text">Tambahkan barang pada menu Master Barang.</div>' +
      '</div>';
    }
    return '<div class="mini-list" style="padding:2px 18px 14px">' + products.map(function (p, index) {
      const value = (Number(p.stock) || 0) * (Number(p.avgHpp) || 0);
      return '<div class="mini-list-item">' +
        '<div style="display:flex;align-items:center;gap:10px;min-width:0">' +
          '<span class="badge badge-neutral">' + (index + 1) + '</span>' +
          '<div style="min-width:0"><div class="name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px">' + U.esc(p.name) + '</div>' +
          '<div class="meta">' + U.esc(p.sku || "-") + ' · ' + U.esc(p.category || "-") + '</div></div>' +
        '</div>' +
        '<div style="text-align:right"><div class="name">' + U.formatCurrency(value) + '</div>' +
        '<div class="meta">' + U.formatNumber(p.stock, 2) + ' ' + U.esc(p.satuan || "PCS") + '</div></div>' +
      '</div>';
    }).join("") + '</div>';
  }

  function renderLowStockTable(products) {
    if (!products.length) {
      return '<div class="empty-state" style="padding:28px 20px">' +
        '<div class="empty-icon"><i class="fa-solid fa-circle-check"></i></div>' +
        '<div class="empty-title">Stok aman</div>' +
        '<div class="empty-text">Tidak ada barang di bawah batas minimum.</div>' +
      '</div>';
    }
    return '<div class="table-wrap"><table class="data-table" style="min-width:560px">' +
      '<thead><tr><th>Barang</th><th class="th-right">Stok</th><th class="th-right">Minimum</th><th class="th-right">Kekurangan</th></tr></thead>' +
      '<tbody>' + products.map(function (p) {
        const shortage = Math.max(0, (Number(p.minStock) || 0) - (Number(p.stock) || 0));
        return '<tr class="row-warning">' +
          '<td><div class="cell-main">' + U.esc(p.name) + '</div><div class="cell-sub mono">' + U.esc(p.sku || "-") + ' · ' + U.esc(p.warehouse || "-") + '</div></td>' +
          '<td class="qty text-danger">' + U.formatNumber(p.stock, 2) + ' ' + U.esc(p.satuan || "PCS") + '</td>' +
          '<td class="qty">' + U.formatNumber(p.minStock, 2) + '</td>' +
          '<td class="qty text-danger">' + U.formatNumber(shortage, 2) + '</td>' +
        '</tr>';
      }).join("") + '</tbody></table></div>';
  }

  function render() {
    const stats = store.stats();
    const user = store.user();
    const hour = new Date().getHours();
    const greeting = hour < 11 ? "Selamat pagi" : (hour < 15 ? "Selamat siang" : (hour < 18 ? "Selamat sore" : "Selamat malam"));
    const recent = store.recentMutations(6);
    const top = store.topValueProducts(5);

    lastRenderedKey = String(stats.mutationCount) + ":" + String(stats.itemCount) + ":" + String(stats.lowStockCount);

    return '<div class="page-stack">' +
      '<div class="section-grid" style="grid-template-columns:1.55fr 1fr">' +
        '<div class="card">' +
          '<div class="card-body pad">' +
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">' +
              '<div>' +
                '<div class="badge badge-primary" style="margin-bottom:8px"><i class="fa-solid fa-sparkles"></i> ' + U.esc(greeting) + '</div>' +
                '<h2 style="font-size:22px;letter-spacing:-0.03em">' + U.esc(user ? user.name : "Pengguna") + '</h2>' +
                '<p class="muted fs-12" style="margin-top:4px">' + U.esc(store.profile().storeName || App.config.appName) + ' · ' + U.esc(U.formatLongDate(new Date())) + '</p>' +
                '<p class="fs-11" style="margin-top:10px;color:var(--text-3);max-width:520px">' +
                  'Kelola persediaan, pantau pergerakan stok, dan cetak dokumen gudang dari satu tempat.' +
                '</p>' +
              '</div>' +
              '<div class="btn-group" style="align-self:flex-end">' +
                '<button type="button" class="btn btn-primary" data-action="dashboard:tx" data-type="IN"><i class="fa-solid fa-arrow-down"></i> Stok Masuk</button>' +
                '<button type="button" class="btn btn-secondary" data-action="dashboard:tx" data-type="OUT"><i class="fa-solid fa-arrow-up"></i> Stok Keluar</button>' +
              '</div>' +
            '</div>' +
            '<div class="metric-inline" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--divider)">' +
              '<div class="mi"><div class="mi-label">Transaksi Hari Ini</div><div class="mi-value">' + stats.todayMutationCount + '</div></div>' +
              '<div class="mi"><div class="mi-label">Total Mutasi</div><div class="mi-value">' + stats.mutationCount + '</div></div>' +
              '<div class="mi"><div class="mi-label">Opname</div><div class="mi-value">' + stats.opnameCount + '</div></div>' +
              '<div class="mi"><div class="mi-label">Kategori</div><div class="mi-value">' + stats.categoryCount + '</div></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head has-border">' +
            '<div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-bolt"></i> Aksi Cepat</div>' +
              '<div class="card-sub">Navigasi operasional harian</div></div>' +
          '</div>' +
          '<div class="card-body pad">' +
            '<div class="quick-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
              '<button type="button" class="quick-tile" data-action="dashboard:tx" data-type="IN"><div class="qt-icon success"><i class="fa-solid fa-arrow-down"></i></div><div class="qt-copy"><div class="qt-title">Stok Masuk</div><div class="qt-sub">Pembelian / retur</div></div></button>' +
              '<button type="button" class="quick-tile" data-action="dashboard:tx" data-type="OUT"><div class="qt-icon danger"><i class="fa-solid fa-arrow-up"></i></div><div class="qt-copy"><div class="qt-title">Stok Keluar</div><div class="qt-sub">Penjualan / rusak</div></div></button>' +
              '<button type="button" class="quick-tile" data-action="dashboard:go" data-route="opname"><div class="qt-icon warning"><i class="fa-solid fa-clipboard-check"></i></div><div class="qt-copy"><div class="qt-title">Stok Opname</div><div class="qt-sub">Hitung fisik</div></div></button>' +
              '<button type="button" class="quick-tile" data-action="dashboard:go" data-route="ledger"><div class="qt-icon"><i class="fa-solid fa-book"></i></div><div class="qt-copy"><div class="qt-title">Kartu Stok</div><div class="qt-sub">Ledger barang</div></div></button>' +
            '</div>' +
            '<div class="alert-stack" style="margin-top:14px">' + renderAlerts(stats) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="stat-grid">' +
        statCard({ label: "Jenis Barang", value: U.formatNumber(stats.itemCount), icon: "fa-boxes-stacked", foot: '<strong>' + stats.categoryCount + '</strong> kategori · <strong>' + stats.unitCount + '</strong> satuan' }) +
        statCard({ label: "Nilai Persediaan (HPP)", value: U.formatCurrency(stats.totalHpp), currency: true, icon: "fa-sack-dollar", tone: "success", accent: "accent-success", foot: '<span class="trend up"><i class="fa-solid fa-chart-line"></i> ' + U.formatNumber(stats.marginPercent, 1) + '% margin</span>' }) +
        statCard({ label: "Stok Menipis", value: U.formatNumber(stats.lowStockCount), icon: "fa-triangle-exclamation", tone: "warning", accent: "accent-warning", foot: '<strong>' + stats.outOfStockCount + '</strong> barang habis' }) +
        statCard({ label: "Batch Expired", value: U.formatNumber(stats.expiringCount), icon: "fa-hourglass-half", tone: "danger", accent: "accent-danger", foot: '<strong>' + stats.expiredCount + '</strong> expired · <strong>' + stats.soonCount + '</strong> segera' }) +
      '</div>' +

      '<div class="section-grid">' +
        '<div class="card">' +
          '<div class="card-head has-border"><div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-chart-column"></i> Pergerakan Stok 7 Hari</div><div class="card-sub">Total qty masuk dan keluar per hari</div></div></div>' +
          '<div class="card-body pad"><div class="chart-box"><canvas id="chartMovement"></canvas></div></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head has-border"><div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-chart-pie"></i> Komposisi Kategori</div><div class="card-sub">Proporsi kuantitas stok per kategori</div></div></div>' +
          '<div class="card-body pad"><div class="chart-box"><canvas id="chartCategory"></canvas></div></div>' +
        '</div>' +
      '</div>' +

      '<div class="section-grid">' +
        '<div class="card">' +
          '<div class="card-head has-border"><div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Aktivitas Terbaru</div><div class="card-sub">6 transaksi terakhir</div></div>' +
            '<div class="card-actions"><button type="button" class="btn btn-sm btn-ghost" data-action="dashboard:go" data-route="mutasi">Lihat semua <i class="fa-solid fa-arrow-right"></i></button></div>' +
          '</div>' +
          '<div class="card-body flush">' + renderRecent(recent) + '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head has-border"><div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-ranking-star"></i> Nilai Persediaan Tertinggi</div><div class="card-sub">Berdasarkan stok × HPP</div></div></div>' +
          '<div class="card-body flush">' + renderTopProducts(top) + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head has-border"><div class="card-title-wrap"><div class="card-title"><i class="fa-solid fa-triangle-exclamation"></i> Barang Perlu Pengadaan</div><div class="card-sub">Stok di bawah batas minimum</div></div>' +
          '<div class="card-actions"><button type="button" class="btn btn-sm btn-secondary" data-action="dashboard:low-stock">Kelola barang</button></div>' +
        '</div>' +
        '<div class="card-body flush">' + renderLowStockTable(stats.lowStockItems.slice(0, 5)) + '</div>' +
      '</div>' +
    '</div>';
  }

  function chartColors() {
    return ["#4f46e5", "#059669", "#0ea5e9", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#65a30d", "#db2777", "#475569"];
  }

  function mount() {
    if (!window.Chart) {
      ["chartMovement", "chartCategory"].forEach(function (id) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        const parent = canvas.parentNode;
        parent.innerHTML = '<div class="chart-fallback"><div><i class="fa-solid fa-chart-simple"></i>Visualisasi grafik tidak tersedia. Data tetap dapat dilihat pada tabel.</div></div>';
      });
      return;
    }

    if (categoryChart) { try { categoryChart.destroy(); } catch (e) { /* ignore */ } categoryChart = null; }
    if (movementChart) { try { movementChart.destroy(); } catch (e) { /* ignore */ } movementChart = null; }

    const movementCanvas = document.getElementById("chartMovement");
    if (movementCanvas) {
      const series = store.movementSeries(7);
      movementChart = new window.Chart(movementCanvas.getContext("2d"), {
        type: "bar",
        data: {
          labels: series.labels,
          datasets: [
            {
              label: "Masuk",
              data: series.inbound,
              backgroundColor: "rgba(5, 150, 105, 0.82)",
              borderRadius: 5,
              maxBarThickness: 22
            },
            {
              label: "Keluar",
              data: series.outbound,
              backgroundColor: "rgba(220, 38, 38, 0.75)",
              borderRadius: 5,
              maxBarThickness: 22
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 9, boxHeight: 9, usePointStyle: true, font: { size: 10 } } },
            tooltip: { intersect: false, mode: "index" }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { beginAtZero: true, grid: { color: "rgba(148,163,184,0.16)" }, ticks: { font: { size: 10 }, precision: 0 } }
          }
        }
      });
    }

    const categoryCanvas = document.getElementById("chartCategory");
    if (categoryCanvas) {
      const breakdown = store.categoryBreakdown();
      categoryChart = new window.Chart(categoryCanvas.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: breakdown.map(function (row) { return row.category; }),
          datasets: [{
            data: breakdown.map(function (row) { return row.value || row.qty; }),
            backgroundColor: chartColors(),
            borderWidth: 0,
            hoverOffset: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 9, boxHeight: 9, usePointStyle: true, font: { size: 10 } } },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return " " + context.label + ": " + U.formatCurrency(context.parsed);
                }
              }
            }
          }
        }
      });
    }
  }

  App.actions["dashboard:tx"] = function (el) {
    const type = el.getAttribute("data-type") === "OUT" ? "OUT" : "IN";
    App.modules.transactions.openModal(type);
  };

  App.actions["dashboard:go"] = function (el) {
    const route = el.getAttribute("data-route");
    if (route) App.router.go(route);
  };

  App.actions["dashboard:low-stock"] = function () {
    if (App.modules.products && App.modules.products.showLowStock) {
      App.modules.products.showLowStock();
    } else {
      App.router.go("products");
    }
  };

  App.router.register({
    id: "dashboard",
    label: "Dashboard",
    subtitle: "Ringkasan kondisi persediaan dan aktivitas gudang",
    group: "Utama",
    icon: "fa-gauge-high",
    render: render,
    mount: mount,
    badge: function () {
      const stats = store.stats();
      return stats.lowStockCount ? String(stats.lowStockCount) : null;
    }
  });

  App.modules.dashboard = {
    render: render,
    mount: mount,
    lastRenderedKey: function () { return lastRenderedKey; }
  };
})(window.App);
