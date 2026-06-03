/* ============================================================
   UI — reusable components: pills, avatars, KPI cards, toasts,
   modal system, DataTable (search/filter/sort/paginate/export)
   ============================================================ */
(function () {
  const UI = {};

  // ---- element from html string ----
  UI.h = function (html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  UI.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  };
  UI.money = n => "$" + Number(n).toLocaleString("en-US");
  UI.num = n => Number(n).toLocaleString("en-US");

  // ---- status -> pill ----
  const PILLS = {
    Active: "green", Completed: "blue", Paused: "amber", Draft: "gray", Archived: "gray",
    Qualified: "green", Contacted: "amber", New: "blue", Proposal: "purple", Lost: "red",
    Customer: "green", Opportunity: "purple", Lead: "blue", Churned: "red",
    "In Progress": "amber", Done: "green", Review: "purple", "To Do": "gray",
    Pending: "amber", Approved: "green", Rejected: "red",
    High: "red", Medium: "amber", Low: "gray",
    Invited: "blue", Suspended: "red",
  };
  UI.pill = function (status) {
    const c = PILLS[status] || "gray";
    return `<span class="pill pill-${c}"><span class="pdot"></span>${UI.esc(status)}</span>`;
  };

  UI.avatar = function (name, cls) {
    const c = DB.ac(name);
    return `<span class="cell-avatar ${cls||""}" style="background:${c}">${UI.esc(DB.initials(name))}</span>`;
  };
  UI.userCell = function (name, sub) {
    return `<span class="cell-user">${UI.avatar(name)}<span><span class="cell-strong">${UI.esc(name)}</span>${sub?`<br><span class="cell-sub">${UI.esc(sub)}</span>`:""}</span></span>`;
  };
  UI.bar = function (pct, color) {
    return `<div class="d-flex align-items-center gap-2"><div class="bar-mini" style="flex:1"><span style="width:${Math.min(100,pct)}%;${color?`background:${color}`:""}"></span></div><span class="cell-sub" style="min-width:32px">${pct}%</span></div>`;
  };

  // ---- KPI card ----
  UI.kpi = function ({ label, value, icon, trend, trendDir, note, iconBg }) {
    const tr = trend != null ? `<div class="kpi-trend ${trendDir||"up"}"><i class="bi bi-arrow-${trendDir==="down"?"down":"up"}-right"></i>${trend}<span class="muted">${note||"vs last month"}</span></div>` : "";
    return UI.h(`<div class="kpi-card"><div class="kpi-top"><div class="kpi-icon" ${iconBg?`style="background:${iconBg.bg};color:${iconBg.fg}"`:""}><i class="bi ${icon}"></i></div></div><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${tr}</div>`);
  };

  // ---- Toasts ----
  let toastStack;
  UI.toast = function (msg, kind) {
    if (!toastStack) { toastStack = UI.h(`<div class="toast-stack"></div>`); document.body.appendChild(toastStack); }
    const ic = kind === "del" ? "bi-trash3-fill" : kind === "info" ? "bi-info-circle-fill" : "bi-check-circle-fill";
    const t = UI.h(`<div class="toast-msg ${kind||"ok"}"><i class="bi ${ic}"></i><span>${UI.esc(msg)}</span></div>`);
    toastStack.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .3s, transform .3s"; t.style.opacity = "0"; t.style.transform = "translateY(8px)"; setTimeout(() => t.remove(), 300); }, 2600);
  };

  // ---- Modal system ----
  let scrim;
  function ensureScrim() {
    if (!scrim) {
      scrim = UI.h(`<div class="modal-scrim"></div>`);
      scrim.addEventListener("mousedown", e => { if (e.target === scrim) UI.closeModal(); });
      document.body.appendChild(scrim);
      document.addEventListener("keydown", e => { if (e.key === "Escape" && scrim.classList.contains("open")) UI.closeModal(); });
    }
  }
  UI.openModal = function ({ title, sub, body, footer, wide, onMount }) {
    ensureScrim();
    const card = UI.h(`<div class="modal-card ${wide?"wide":""}">
      <div class="mc-head"><div><h3>${UI.esc(title)}</h3>${sub?`<div class="sub">${UI.esc(sub)}</div>`:""}</div>
      <button class="icon-btn" data-close style="margin:-6px -6px 0 0"><i class="bi bi-x-lg"></i></button></div>
      <div class="mc-body"></div>
      <div class="mc-foot"></div></div>`);
    const bodyEl = card.querySelector(".mc-body");
    if (typeof body === "string") bodyEl.innerHTML = body; else bodyEl.appendChild(body);
    const footEl = card.querySelector(".mc-foot");
    (footer || []).forEach(b => footEl.appendChild(b));
    card.querySelector("[data-close]").addEventListener("click", UI.closeModal);
    scrim.innerHTML = ""; scrim.appendChild(card); scrim.classList.add("open");
    if (onMount) onMount(bodyEl, card);
    return card;
  };
  UI.closeModal = function () { if (scrim) scrim.classList.remove("open"); };
  UI.btn = function (label, cls, onClick) {
    const b = UI.h(`<button class="btn ${cls}">${label}</button>`);
    if (onClick) b.addEventListener("click", onClick);
    return b;
  };
  UI.confirmDelete = function (name, onYes) {
    UI.openModal({
      title: "Delete item?",
      body: `<p style="margin:0;color:var(--ink-soft)">This will permanently remove <b style="color:var(--ink)">${UI.esc(name)}</b>. This action can’t be undone.</p>`,
      footer: [
        UI.btn("Cancel", "btn-light", UI.closeModal),
        UI.btn("<i class='bi bi-trash3'></i> Delete", "btn-danger", () => { UI.closeModal(); onYes(); })
      ]
    });
  };

  // ---- form field helpers (for modal forms) ----
  UI.field = function (label, inputHtml, half) {
    return `<div class="${half?"":"mb-3"}"><label class="form-label-sm d-block">${label}</label>${inputHtml}</div>`;
  };
  UI.input = (name, val, type) => `<input class="form-control" name="${name}" type="${type||"text"}" value="${UI.esc(val==null?"":val)}">`;
  UI.select = (name, opts, val) => `<select class="form-select" name="${name}">${opts.map(o => `<option ${o===val?"selected":""}>${UI.esc(o)}</option>`).join("")}</select>`;

  /* ============================================================
     DataTable
     cfg: { columns:[{key,label,render?,sort?,align?,nosort?}],
            rows, pageSize, search:true, filters:[{key,label,options}],
            exportName, title, onAdd, addLabel, selectable }
     ============================================================ */
  UI.DataTable = function (cfg) {
    const state = { q: "", sortKey: null, sortDir: 1, page: 1, filters: {}, pageSize: cfg.pageSize || 8 };
    const root = UI.h(`<div class="card-soft"></div>`);

    function filtered() {
      let rows = cfg.rows.slice();
      if (state.q) {
        const q = state.q.toLowerCase();
        rows = rows.filter(r => cfg.columns.some(c => {
          const v = r[c.key]; return v != null && String(v).toLowerCase().includes(q);
        }));
      }
      (cfg.filters || []).forEach(f => {
        if (state.filters[f.key] && state.filters[f.key] !== "All") rows = rows.filter(r => String(r[f.key]) === state.filters[f.key]);
      });
      if (state.sortKey) {
        rows.sort((a, b) => {
          let x = a[state.sortKey], y = b[state.sortKey];
          if (typeof x === "number" && typeof y === "number") return (x - y) * state.sortDir;
          return String(x).localeCompare(String(y)) * state.sortDir;
        });
      }
      return rows;
    }

    function render() {
      const rows = filtered();
      const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
      if (state.page > pages) state.page = pages;
      const pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);

      const filterCtrls = (cfg.filters || []).map(f =>
        `<select class="form-select form-select-sm" data-filter="${f.key}">
          <option ${!state.filters[f.key]||state.filters[f.key]==="All"?"selected":""}>All</option>
          ${f.options.map(o => `<option ${state.filters[f.key]===o?"selected":""}>${UI.esc(o)}</option>`).join("")}
         </select>`).join("");

      root.innerHTML = `
        <div class="dt-toolbar">
          ${cfg.search !== false ? `<div class="dt-search"><i class="bi bi-search"></i><input placeholder="Search…" value="${UI.esc(state.q)}" data-q></div>` : ""}
          ${filterCtrls}
          <div class="dt-spacer"></div>
          <button class="btn btn-sm btn-light" data-exp="csv" title="Export to Excel (CSV)"><i class="bi bi-file-earmark-spreadsheet text-success"></i> Excel</button>
          <button class="btn btn-sm btn-light" data-exp="pdf" title="Export to PDF"><i class="bi bi-file-earmark-pdf text-danger"></i> PDF</button>
          ${cfg.onAdd ? `<button class="btn btn-sm btn-accent" data-add><i class="bi bi-plus-lg"></i> ${cfg.addLabel || "New"}</button>` : ""}
        </div>
        <div style="overflow-x:auto">
        <table class="dt">
          <thead><tr>
            ${cfg.selectable ? `<th class="no-sort dt-checkbox"><input type="checkbox" data-all></th>` : ""}
            ${cfg.columns.map(c => `<th class="${c.nosort?"no-sort":""} ${state.sortKey===c.key?"sorted":""}" data-sort="${c.nosort?"":c.key}" style="${c.align?`text-align:${c.align}`:""}">${c.label}${!c.nosort?`<span class="sort-ind">${state.sortKey===c.key?(state.sortDir>0?"▲":"▼"):"⇅"}</span>`:""}</th>`).join("")}
          </tr></thead>
          <tbody>
            ${pageRows.length ? pageRows.map(r => `<tr data-id="${r.id}">
              ${cfg.selectable ? `<td class="dt-checkbox"><input type="checkbox" data-row></td>` : ""}
              ${cfg.columns.map(c => `<td style="${c.align?`text-align:${c.align}`:""}">${c.render ? c.render(r) : UI.esc(r[c.key])}</td>`).join("")}
            </tr>`).join("") : `<tr><td colspan="${cfg.columns.length + (cfg.selectable?1:0)}" style="text-align:center;padding:40px;color:var(--ink-soft)"><i class="bi bi-inbox" style="font-size:24px;display:block;margin-bottom:6px;opacity:.5"></i>No matching records</td></tr>`}
          </tbody>
        </table></div>
        <div class="dt-footer">
          <span>Showing ${rows.length ? (state.page-1)*state.pageSize+1 : 0}–${Math.min(state.page*state.pageSize, rows.length)} of ${rows.length}</span>
          <div class="dt-pages">
            <button data-pg="prev" ${state.page===1?"disabled":""}>‹</button>
            ${Array.from({length: pages}, (_, i) => i+1).filter(p => Math.abs(p-state.page)<3 || p===1 || p===pages).map((p, i, arr) => {
              const prev = arr[i-1];
              const gap = prev && p - prev > 1 ? `<button disabled>…</button>` : "";
              return gap + `<button data-pg="${p}" class="${p===state.page?"active":""}">${p}</button>`;
            }).join("")}
            <button data-pg="next" ${state.page===pages?"disabled":""}>›</button>
          </div>
        </div>`;
      wire();
    }

    function wire() {
      const q = root.querySelector("[data-q]");
      if (q) q.addEventListener("input", e => { state.q = e.target.value; state.page = 1; render(); setTimeout(()=>{ const n=root.querySelector("[data-q]"); n.focus(); n.setSelectionRange(n.value.length,n.value.length); },0); });
      root.querySelectorAll("[data-filter]").forEach(s => s.addEventListener("change", e => { state.filters[s.dataset.filter] = e.target.value; state.page = 1; render(); }));
      root.querySelectorAll("th[data-sort]").forEach(th => { if (th.dataset.sort) th.addEventListener("click", () => {
        if (state.sortKey === th.dataset.sort) state.sortDir *= -1; else { state.sortKey = th.dataset.sort; state.sortDir = 1; }
        render();
      });});
      root.querySelectorAll("[data-pg]").forEach(b => b.addEventListener("click", () => {
        const v = b.dataset.pg;
        if (v === "prev") state.page--; else if (v === "next") state.page++; else state.page = +v;
        render();
      }));
      const add = root.querySelector("[data-add]"); if (add) add.addEventListener("click", cfg.onAdd);
      root.querySelector("[data-exp='csv']").addEventListener("click", () => UI.exportCSV(cfg, filtered()));
      root.querySelector("[data-exp='pdf']").addEventListener("click", () => UI.exportPDF(cfg, filtered()));
      const all = root.querySelector("[data-all]");
      if (all) all.addEventListener("change", e => root.querySelectorAll("[data-row]").forEach(c => c.checked = e.target.checked));
      if (cfg.rowEvents) cfg.rowEvents(root);
    }

    render();
    root.refresh = render;
    return root;
  };

  // ---- export helpers ----
  function exportRows(cfg, rows) {
    const cols = cfg.columns.filter(c => !c.noexport);
    const header = cols.map(c => c.label);
    const data = rows.map(r => cols.map(c => {
      let v = c.exportVal ? c.exportVal(r) : r[c.key];
      return v == null ? "" : String(v);
    }));
    return { header, data };
  }
  UI.exportCSV = function (cfg, rows) {
    const { header, data } = exportRows(cfg, rows);
    const csv = [header, ...data].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (cfg.exportName || "export") + ".csv";
    a.click();
    UI.toast("Exported " + rows.length + " rows to Excel (CSV)", "ok");
  };
  UI.exportPDF = function (cfg, rows) {
    const { header, data } = exportRows(cfg, rows);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: header.length > 6 ? "landscape" : "portrait" });
    doc.setFontSize(14); doc.text(cfg.title || "Export", 14, 16);
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text("Generated " + new Date().toLocaleString() + "  ·  " + rows.length + " records", 14, 22);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4f46e5";
    doc.autoTable({
      head: [header], body: data, startY: 27, styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 249, 250] }, margin: { left: 14, right: 14 }
    });
    doc.save((cfg.exportName || "export") + ".pdf");
    UI.toast("Exported " + rows.length + " rows to PDF", "ok");
  };

  window.UI = UI;
})();
