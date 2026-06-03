/* ============================================================
   MODULES (part 1): Dashboard, Campaigns, Leads, CRM, Budget
   Each module() returns a DOM element; if it needs charts it
   sets el._onMount() which the router calls after insertion.
   ============================================================ */
(function () {
  const M = window.MODULES = window.MODULES || {};
  const { h, esc, money, num, pill, userCell, avatar, bar, kpi, DataTable } = UI;

  function accent() { return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4f46e5"; }
  function accentRgba(a) { const rgb = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim() || "79, 70, 229"; return `rgba(${rgb}, ${a})`; }
  function palette() {
    const a = accent();
    return [a, "#0ea5e9", "#f59e0b", "#10b981", "#a855f7", "#ef4444", "#14b8a6", "#64748b"];
  }
  const CH = { color: "#5b6472", grid: "#eef0f3", font: { family: getComputedStyle(document.body).fontFamily, size: 11 } };
  function baseOpts(extra) {
    return Object.assign({
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false }, ticks: { color: CH.color, font: CH.font } },
                y: { grid: { color: CH.grid }, ticks: { color: CH.color, font: CH.font }, border: { display: false } } }
    }, extra || {});
  }
  M._charts = [];
  function chart(canvas, config) {
    const prev = Chart.getChart(canvas); if (prev) prev.destroy();
    const c = new Chart(canvas.getContext("2d"), config);
    M._charts.push(c); return c;
  }
  M.clearCharts = function () { M._charts.forEach(c => { try { c.destroy(); } catch (e) {} }); M._charts = []; };

  function pageHead(title, sub, actionsHtml) {
    return `<div class="page-head"><div>
      <div class="breadcrumb-mini"><span class="text-accent">Acme Marketing</span> / ${esc(title)}</div>
      <h1>${esc(title)}</h1><div class="sub">${esc(sub)}</div></div>
      <div class="d-flex gap-2 align-items-center">${actionsHtml || ""}</div></div>`;
  }
  function card(title, bodyHtml, headRight) {
    return `<div class="card-soft"><div class="card-head"><h3>${title}</h3>${headRight||""}</div><div class="card-body-p">${bodyHtml}</div></div>`;
  }

  /* ---------------------------------------------------------- DASHBOARD */
  M.dashboard = function () {
    const camps = DB.campaigns;
    const active = camps.filter(c => c.status === "Active").length;
    const totalLeads = DB.leads.length * 90 + 2400;
    const spent = DB.budgets.reduce((s, b) => s + b.spent, 0);
    const allocated = DB.budgets.reduce((s, b) => s + b.allocated, 0);
    const avgRoi = (camps.filter(c=>c.roi).reduce((s,c)=>s+c.roi,0)/camps.filter(c=>c.roi).length).toFixed(1);

    const el = h(`<div class="content-narrow">
      ${pageHead("Dashboard", "Marketing performance overview · May 2026",
        `<select class="form-select form-select-sm" style="width:auto"><option>Last 30 days</option><option>This quarter</option><option>Year to date</option></select>
         <button class="btn btn-sm btn-light" data-exp-dash><i class="bi bi-download"></i> Export</button>`)}
      <div class="section-grid grid-kpi" style="margin-bottom:16px" id="dash-kpi"></div>
      <div class="section-grid grid-2-1" style="margin-bottom:16px">
        ${card("Lead generation trend", `<div class="chart-wrap chart-h-260"><canvas id="ch-trend"></canvas></div>`,
          `<div class="d-flex gap-3"><span class="legend-row"><span class="sw" style="background:var(--accent)"></span>Leads</span><span class="legend-row"><span class="sw" style="background:#f59e0b"></span>Qualified</span></div>`)}
        ${card("Channel mix", `<div class="chart-wrap chart-h-200"><canvas id="ch-channel"></canvas></div><div id="ch-legend" style="margin-top:8px"></div>`)}
      </div>
      <div class="section-grid grid-2-1">
        ${card("Top campaigns", `<div id="dash-top"></div>`, `<a href="#" data-go="campaigns" class="btn btn-sm btn-light">View all</a>`)}
        ${card("Recent activity", `<div id="dash-feed"></div>`)}
      </div>
    </div>`);

    // KPI cards
    const kpiWrap = el.querySelector("#dash-kpi");
    [
      kpi({ label: "Active campaigns", value: active, icon: "bi-megaphone-fill", trend: "+2", note: "this month" }),
      kpi({ label: "Total leads", value: num(totalLeads), icon: "bi-people-fill", trend: "+14%", iconBg: { bg: "#e8f5ee", fg: "#16a34a" } }),
      kpi({ label: "Budget spent", value: money(spent), icon: "bi-cash-stack", trend: Math.round(spent/allocated*100)+"%", note: "of $"+num(allocated), trendDir: "up", iconBg: { bg: "#fef3e2", fg: "#ea580c" } }),
      kpi({ label: "Avg. ROI", value: avgRoi + "×", icon: "bi-graph-up-arrow", trend: "+0.4×", iconBg: { bg: "#f0eafb", fg: "#7c3aed" } }),
    ].forEach(c => kpiWrap.appendChild(c));

    // Top campaigns mini table
    const top = camps.filter(c=>c.status==="Active").sort((a,b)=>b.leads-a.leads).slice(0,5);
    el.querySelector("#dash-top").appendChild(h(`<table class="dt"><thead><tr><th>Campaign</th><th>Channel</th><th style="text-align:right">Leads</th><th style="text-align:right">ROI</th><th style="min-width:120px">Budget used</th></tr></thead>
      <tbody>${top.map(c=>`<tr><td class="cell-strong">${esc(c.name)}</td><td><span class="cell-sub">${esc(c.channel)}</span></td><td style="text-align:right">${num(c.leads)}</td><td style="text-align:right;color:#16a34a;font-weight:600">${c.roi}×</td><td>${bar(Math.round(c.spent/c.budget*100))}</td></tr>`).join("")}</tbody></table>`));

    // Feed
    const feedData = [
      { ic: "bi-megaphone-fill", c: "var(--accent)", bg: "var(--accent-soft)", t: "<b>Maya Chen</b> launched <b>Summer Launch 2026</b>", m: "12 minutes ago" },
      { ic: "bi-person-plus-fill", c: "#16a34a", bg: "#e8f5ee", t: "New qualified lead <b>Sam Okafor</b> (score 90)", m: "1 hour ago" },
      { ic: "bi-cash-stack", c: "#ea580c", bg: "#fef3e2", t: "Budget alert — <b>Q2 Webinar</b> at 84%", m: "1 hour ago" },
      { ic: "bi-check2-circle", c: "#7c3aed", bg: "#f0eafb", t: "<b>Influencer contract</b> approved by Finance", m: "2 hours ago" },
      { ic: "bi-pencil-square", c: "#0ea5e9", bg: "#e6f4fb", t: "<b>Daniel Ross</b> edited LinkedIn campaign", m: "3 hours ago" },
    ];
    el.querySelector("#dash-feed").innerHTML = feedData.map(f => `<div class="feed-item"><div class="feed-ic" style="background:${f.bg};color:${f.c}"><i class="bi ${f.ic}"></i></div><div><div class="ft">${f.t}</div><div class="fm">${f.m}</div></div></div>`).join("");

    el.querySelector("[data-exp-dash]").addEventListener("click", () => UI.toast("Dashboard summary exported to PDF", "ok"));
    el.querySelectorAll("[data-go]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); window.navTo(a.dataset.go); }));

    el._onMount = function () {
      const months = ["Jan","Feb","Mar","Apr","May","Jun"];
      chart(el.querySelector("#ch-trend"), {
        type: "line",
        data: { labels: months, datasets: [
          { label: "Leads", data: [620,780,910,1040,1280,1180], borderColor: accent(), backgroundColor: accentRgba(0.10), fill: true, tension: .38, borderWidth: 2.5, pointRadius: 0 },
          { label: "Qualified", data: [240,310,360,420,520,560], borderColor: "#f59e0b", backgroundColor: "transparent", fill: false, tension: .38, borderWidth: 2.5, pointRadius: 0, borderDash: [5,4] },
        ]}, options: baseOpts()
      });
      const chData = [
        { k: "Email", v: 38 }, { k: "PPC", v: 24 }, { k: "Social", v: 18 }, { k: "Display", v: 12 }, { k: "Event", v: 8 }
      ];
      chart(el.querySelector("#ch-channel"), {
        type: "doughnut",
        data: { labels: chData.map(d=>d.k), datasets: [{ data: chData.map(d=>d.v), backgroundColor: palette(), borderWidth: 2, borderColor: "#fff" }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { display: false } } }
      });
      el.querySelector("#ch-legend").innerHTML = chData.map((d,i) => `<div class="legend-row"><span class="sw" style="background:${palette()[i]}"></span>${d.k}<span class="val">${d.v}%</span></div>`).join("");
    };
    return el;
  };

  /* ---------------------------------------------------------- CAMPAIGNS */
  function campaignForm(rec) {
    const isNew = !rec;
    rec = rec || { name: "", channel: "Email", status: "Draft", owner: DB.owners[0], budget: 0, start: "", end: "" };
    const body = h(`<form id="camp-form">
      ${UI.field("Campaign name", UI.input("name", rec.name))}
      <div class="form-grid-2">
        ${UI.field("Channel", UI.select("channel", ["Email","PPC","Social","Display","Event"], rec.channel), true)}
        ${UI.field("Status", UI.select("status", ["Draft","Active","Paused","Completed"], rec.status), true)}
      </div>
      <div class="form-grid-2">
        ${UI.field("Owner", UI.select("owner", DB.owners, rec.owner), true)}
        ${UI.field("Budget (USD)", UI.input("budget", rec.budget, "number"), true)}
      </div>
      <div class="form-grid-2">
        ${UI.field("Start date", UI.input("start", rec.start, "date"), true)}
        ${UI.field("End date", UI.input("end", rec.end, "date"), true)}
      </div>
    </form>`);
    return { body, isNew, rec };
  }

  M.campaigns = function () {
    const el = h(`<div class="content-narrow">
      ${pageHead("Campaign Planning", "Plan, launch and track every marketing campaign", "")}
      <div id="camp-table"></div></div>`);

    let table;
    function openForm(existing) {
      const { body, isNew, rec } = campaignForm(existing);
      UI.openModal({
        title: isNew ? "New campaign" : "Edit campaign",
        sub: isNew ? "Set up a new marketing campaign" : esc(rec.name),
        body, wide: true,
        footer: [
          UI.btn("Cancel", "btn-light", UI.closeModal),
          UI.btn(`<i class="bi bi-check-lg"></i> ${isNew ? "Create campaign" : "Save changes"}`, "btn-accent", () => {
            const f = body; const g = n => f.querySelector(`[name="${n}"]`).value;
            const data = { name: g("name") || "Untitled campaign", channel: g("channel"), status: g("status"), owner: g("owner"), budget: +g("budget") || 0, start: g("start"), end: g("end") };
            // Persist to the backend via the REST API, then sync the in-memory list.
            (async () => {
              try {
                if (isNew) {
                  const created = await API.campaigns.create(data);
                  DB.campaigns.unshift(created);
                  UI.toast("Campaign created", "ok");
                } else {
                  const updated = await API.campaigns.update(existing.id, data);
                  Object.assign(existing, updated);
                  UI.toast("Campaign updated", "ok");
                }
                UI.closeModal(); table.refresh();
              } catch (err) {
                UI.toast(err.message || "Save failed", "del");
              }
            })();
          })
        ]
      });
    }

    table = DataTable({
      rows: DB.campaigns, exportName: "campaigns", title: "Campaign Planning", pageSize: 8,
      onAdd: () => openForm(), addLabel: "New campaign",
      filters: [
        { key: "status", label: "Status", options: ["Active","Paused","Completed","Draft"] },
        { key: "channel", label: "Channel", options: ["Email","PPC","Social","Display","Event"] },
      ],
      columns: [
        { key: "name", label: "Campaign", render: r => `<div class="cell-strong">${esc(r.name)}</div><div class="cell-sub">${esc(r.start)} → ${esc(r.end)}</div>` },
        { key: "channel", label: "Channel", render: r => `<span class="cell-sub">${esc(r.channel)}</span>` },
        { key: "status", label: "Status", render: r => pill(r.status) },
        { key: "owner", label: "Owner", render: r => userCell(r.owner) },
        { key: "budget", label: "Budget", align: "right", render: r => money(r.budget) },
        { key: "progress", label: "Progress", render: r => bar(r.progress) },
        { key: "roi", label: "ROI", align: "right", render: r => r.roi ? `<span style="color:#16a34a;font-weight:600">${r.roi}×</span>` : `<span class="empty-cell">—</span>` },
        { key: "_act", label: "", nosort: true, noexport: true, align: "right", render: r => `<div class="row-actions"><button data-edit><i class="bi bi-pencil"></i></button><button data-del class="danger"><i class="bi bi-trash3"></i></button></div>` },
      ],
      rowEvents(root) {
        root.querySelectorAll("tr[data-id]").forEach(tr => {
          const rec = DB.campaigns.find(c => c.id == tr.dataset.id);
          tr.querySelector("[data-edit]")?.addEventListener("click", () => openForm(rec));
          tr.querySelector("[data-del]")?.addEventListener("click", () => UI.confirmDelete(rec.name, async () => {
            try {
              await API.campaigns.remove(rec.id);
              DB.campaigns.splice(DB.campaigns.indexOf(rec), 1); table.refresh(); UI.toast("Campaign deleted", "del");
            } catch (err) {
              UI.toast(err.message || "Delete failed", "del");
            }
          }));
        });
      }
    });
    el.querySelector("#camp-table").appendChild(table);
    return el;
  };

  /* ---------------------------------------------------------- LEADS */
  M.leads = function () {
    const el = h(`<div class="content-narrow">
      ${pageHead("Lead Management", "Capture, score and route inbound leads", "")}
      <div class="section-grid grid-kpi" style="margin-bottom:16px" id="lead-kpi"></div>
      <div id="lead-table"></div></div>`);

    const lk = el.querySelector("#lead-kpi");
    const qd = DB.leads.filter(l=>l.status==="Qualified").length;
    const pipeline = DB.leads.reduce((s,l)=>s+l.value,0);
    [
      kpi({ label: "Total leads", value: DB.leads.length, icon: "bi-funnel-fill" }),
      kpi({ label: "Qualified", value: qd, icon: "bi-patch-check-fill", iconBg: { bg: "#e8f5ee", fg: "#16a34a" } }),
      kpi({ label: "Pipeline value", value: money(pipeline), icon: "bi-cash-coin", iconBg: { bg: "#fef3e2", fg: "#ea580c" } }),
      kpi({ label: "Avg. lead score", value: Math.round(DB.leads.reduce((s,l)=>s+l.score,0)/DB.leads.length), icon: "bi-speedometer2", iconBg: { bg: "#f0eafb", fg: "#7c3aed" } }),
    ].forEach(c => lk.appendChild(c));

    let table;
    function leadForm(rec) {
      const isNew = !rec;
      rec = rec || { name:"", company:"", email:"", score:50, status:"New", source:"Email", value:0, owner:DB.owners[0], created:"2026-06-03" };
      const body = h(`<form>
        <div class="form-grid-2">${UI.field("Full name", UI.input("name", rec.name), true)}${UI.field("Company", UI.input("company", rec.company), true)}</div>
        ${UI.field("Email", UI.input("email", rec.email, "email"))}
        <div class="form-grid-2">${UI.field("Status", UI.select("status",["New","Contacted","Qualified","Proposal","Lost"],rec.status), true)}${UI.field("Source", UI.select("source",["Email","PPC","Social","Display","Event"],rec.source), true)}</div>
        <div class="form-grid-2">${UI.field("Lead score", UI.input("score", rec.score, "number"), true)}${UI.field("Est. value (USD)", UI.input("value", rec.value, "number"), true)}</div>
        ${UI.field("Owner", UI.select("owner", DB.owners, rec.owner))}
      </form>`);
      UI.openModal({ title: isNew?"Add lead":"Edit lead", sub: isNew?"Manually create a lead":esc(rec.name), body, wide:true,
        footer: [UI.btn("Cancel","btn-light",UI.closeModal), UI.btn(`<i class="bi bi-check-lg"></i> ${isNew?"Add lead":"Save"}`,"btn-accent",()=>{
          const g=n=>body.querySelector(`[name="${n}"]`).value;
          const data={name:g("name")||"New lead",company:g("company"),email:g("email"),status:g("status"),source:g("source"),score:+g("score")||0,value:+g("value")||0,owner:g("owner")};
          (async()=>{try{
            if(isNew){const c=await API.leads.create(Object.assign({created:"2026-06-03"},data));DB.leads.unshift(c);UI.toast("Lead added","ok");}
            else{const u=await API.leads.update(rec.id,data);Object.assign(rec,u);UI.toast("Lead updated","ok");}
            UI.closeModal();table.refresh();
          }catch(err){UI.toast(err.message||"Save failed","del");}})();
        })]});
    }

    table = DataTable({
      rows: DB.leads, exportName:"leads", title:"Lead Management", pageSize:8, selectable:true,
      onAdd:()=>leadForm(), addLabel:"Add lead",
      filters:[{key:"status",label:"Status",options:["New","Contacted","Qualified","Proposal","Lost"]},{key:"source",label:"Source",options:["Email","PPC","Social","Display","Event"]}],
      columns:[
        { key:"name", label:"Lead", render:r=>userCell(r.name, r.company) },
        { key:"email", label:"Email", render:r=>`<span class="cell-sub">${esc(r.email)}</span>` },
        { key:"score", label:"Score", align:"right", render:r=>{const c=r.score>=80?"#16a34a":r.score>=60?"#ea580c":"#94a3b8";return `<span style="font-weight:700;color:${c}">${r.score}</span>`;} },
        { key:"status", label:"Status", render:r=>pill(r.status) },
        { key:"source", label:"Source", render:r=>`<span class="cell-sub">${esc(r.source)}</span>` },
        { key:"value", label:"Value", align:"right", render:r=>money(r.value) },
        { key:"owner", label:"Owner", render:r=>avatar(r.owner)+` <span class="cell-sub">${esc(r.owner.split(" ")[0])}</span>` },
        { key:"_act", label:"", nosort:true, noexport:true, align:"right", render:r=>`<div class="row-actions"><button data-edit><i class="bi bi-pencil"></i></button><button data-del class="danger"><i class="bi bi-trash3"></i></button></div>` },
      ],
      rowEvents(root){root.querySelectorAll("tr[data-id]").forEach(tr=>{const rec=DB.leads.find(l=>l.id==tr.dataset.id);
        tr.querySelector("[data-edit]")?.addEventListener("click",()=>leadForm(rec));
        tr.querySelector("[data-del]")?.addEventListener("click",()=>UI.confirmDelete(rec.name,async()=>{try{await API.leads.remove(rec.id);DB.leads.splice(DB.leads.indexOf(rec),1);table.refresh();UI.toast("Lead deleted","del");}catch(err){UI.toast(err.message||"Delete failed","del");}}));});}
    });
    el.querySelector("#lead-table").appendChild(table);
    return el;
  };

  /* ---------------------------------------------------------- CRM */
  M.crm = function () {
    const el = h(`<div class="content-narrow">
      ${pageHead("CRM — Contacts & Accounts", "Your relationships across the customer lifecycle", "")}
      <div class="section-grid grid-2-1" style="margin-bottom:16px">
        ${card("Pipeline by stage", `<div class="chart-wrap chart-h-200"><canvas id="ch-crm"></canvas></div>`)}
        ${card("Lifecycle breakdown", `<div id="crm-legend"></div>`)}
      </div>
      <div id="crm-table"></div></div>`);

    let table;
    function contactForm(rec){
      const isNew=!rec;
      rec=rec||{name:"",company:"",title:"",email:"",phone:"",stage:"Lead",value:0,owner:DB.owners[0],lastTouch:"2026-06-03"};
      const body=h(`<form>
        <div class="form-grid-2">${UI.field("Name",UI.input("name",rec.name),true)}${UI.field("Job title",UI.input("title",rec.title),true)}</div>
        <div class="form-grid-2">${UI.field("Company",UI.input("company",rec.company),true)}${UI.field("Stage",UI.select("stage",["Lead","Opportunity","Customer","Churned"],rec.stage),true)}</div>
        <div class="form-grid-2">${UI.field("Email",UI.input("email",rec.email,"email"),true)}${UI.field("Phone",UI.input("phone",rec.phone),true)}</div>
        <div class="form-grid-2">${UI.field("Account value (USD)",UI.input("value",rec.value,"number"),true)}${UI.field("Owner",UI.select("owner",DB.owners,rec.owner),true)}</div>
      </form>`);
      UI.openModal({title:isNew?"New contact":"Edit contact",sub:isNew?"Add someone to your CRM":esc(rec.name),body,wide:true,
        footer:[UI.btn("Cancel","btn-light",UI.closeModal),UI.btn(`<i class="bi bi-check-lg"></i> ${isNew?"Create":"Save"}`,"btn-accent",()=>{
          const g=n=>body.querySelector(`[name="${n}"]`).value;
          const data={name:g("name")||"New contact",title:g("title"),company:g("company"),stage:g("stage"),email:g("email"),phone:g("phone"),value:+g("value")||0,owner:g("owner")};
          (async()=>{try{
            if(isNew){const c=await API.contacts.create(Object.assign({lastTouch:"2026-06-03"},data));DB.contacts.unshift(c);UI.toast("Contact created","ok");}
            else{const u=await API.contacts.update(rec.id,data);Object.assign(rec,u);UI.toast("Contact updated","ok");}
            UI.closeModal();table.refresh();crmChart();
          }catch(err){UI.toast(err.message||"Save failed","del");}})();
        })]});
    }

    table=DataTable({
      rows:DB.contacts, exportName:"contacts", title:"CRM Contacts", pageSize:8,
      onAdd:()=>contactForm(), addLabel:"New contact",
      filters:[{key:"stage",label:"Stage",options:["Lead","Opportunity","Customer","Churned"]}],
      columns:[
        { key:"name", label:"Contact", render:r=>userCell(r.name, r.title) },
        { key:"company", label:"Company", render:r=>`<span class="cell-strong">${esc(r.company)}</span>` },
        { key:"email", label:"Email", render:r=>`<span class="cell-sub">${esc(r.email)}</span><br><span class="cell-sub">${esc(r.phone)}</span>` },
        { key:"stage", label:"Stage", render:r=>pill(r.stage) },
        { key:"value", label:"Account value", align:"right", render:r=>r.value?money(r.value):`<span class="empty-cell">—</span>` },
        { key:"owner", label:"Owner", render:r=>avatar(r.owner)+` <span class="cell-sub">${esc(r.owner.split(" ")[0])}</span>` },
        { key:"lastTouch", label:"Last touch", render:r=>`<span class="cell-sub">${esc(r.lastTouch)}</span>` },
        { key:"_act", label:"", nosort:true, noexport:true, align:"right", render:r=>`<div class="row-actions"><button data-edit><i class="bi bi-pencil"></i></button><button data-del class="danger"><i class="bi bi-trash3"></i></button></div>` },
      ],
      rowEvents(root){root.querySelectorAll("tr[data-id]").forEach(tr=>{const rec=DB.contacts.find(c=>c.id==tr.dataset.id);
        tr.querySelector("[data-edit]")?.addEventListener("click",()=>contactForm(rec));
        tr.querySelector("[data-del]")?.addEventListener("click",()=>UI.confirmDelete(rec.name,async()=>{try{await API.contacts.remove(rec.id);DB.contacts.splice(DB.contacts.indexOf(rec),1);table.refresh();crmChart();UI.toast("Contact deleted","del");}catch(err){UI.toast(err.message||"Delete failed","del");}}));});}
    });
    el.querySelector("#crm-table").appendChild(table);

    function stageCounts(){const s={Lead:0,Opportunity:0,Customer:0,Churned:0};DB.contacts.forEach(c=>s[c.stage]++);return s;}
    let crmC;
    function crmChart(){
      const s=stageCounts();const labels=Object.keys(s);const data=Object.values(s);
      const cols=["#0ea5e9", accent(), "#16a34a", "#ef4444"];
      if(crmC){crmC.data.datasets[0].data=data;crmC.update();}
      el.querySelector("#crm-legend").innerHTML=labels.map((l,i)=>`<div class="legend-row"><span class="sw" style="background:${cols[i]}"></span>${l}<span class="val">${data[i]}</span></div>`).join("");
      return {labels,data,cols};
    }

    el._onMount=function(){
      const {labels,data,cols}=crmChart();
      crmC=chart(el.querySelector("#ch-crm"),{type:"bar",data:{labels,datasets:[{data,backgroundColor:cols,borderRadius:6,barThickness:38}]},options:baseOpts()});
    };
    return el;
  };

  /* ---------------------------------------------------------- BUDGET */
  M.budget = function () {
    const allocated=DB.budgets.reduce((s,b)=>s+b.allocated,0);
    const spent=DB.budgets.reduce((s,b)=>s+b.spent,0);
    const committed=DB.budgets.reduce((s,b)=>s+b.committed,0);
    const remaining=allocated-spent-committed;
    const el=h(`<div class="content-narrow">
      ${pageHead("Budget Tracking", "Allocations, spend and burn across campaigns", "")}
      <div class="section-grid grid-kpi" style="margin-bottom:16px" id="bud-kpi"></div>
      <div class="section-grid grid-2-1" style="margin-bottom:16px">
        ${card("Allocated vs. spent by campaign", `<div class="chart-wrap chart-h-300"><canvas id="ch-bud"></canvas></div>`)}
        ${card("Spend by channel", `<div class="chart-wrap chart-h-200"><canvas id="ch-budch"></canvas></div><div id="bud-legend" style="margin-top:8px"></div>`)}
      </div>
      <div id="bud-table"></div></div>`);

    const bk=el.querySelector("#bud-kpi");
    [
      kpi({label:"Total allocated",value:money(allocated),icon:"bi-wallet2"}),
      kpi({label:"Spent",value:money(spent),icon:"bi-credit-card-fill",trend:Math.round(spent/allocated*100)+"%",note:"of budget",iconBg:{bg:"#fef3e2",fg:"#ea580c"}}),
      kpi({label:"Committed",value:money(committed),icon:"bi-hourglass-split",iconBg:{bg:"#f0eafb",fg:"#7c3aed"}}),
      kpi({label:"Remaining",value:money(remaining),icon:"bi-piggy-bank-fill",iconBg:{bg:"#e8f5ee",fg:"#16a34a"}}),
    ].forEach(c=>bk.appendChild(c));

    let table;
    function budForm(rec){
      const isNew=!rec;rec=rec||{campaign:"",channel:"Email",allocated:0,spent:0,committed:0,quarter:"Q2"};
      const body=h(`<form>
        ${UI.field("Campaign",UI.input("campaign",rec.campaign))}
        <div class="form-grid-2">${UI.field("Channel",UI.select("channel",["Email","PPC","Social","Display","Event"],rec.channel),true)}${UI.field("Quarter",UI.select("quarter",["Q1","Q2","Q3","Q4"],rec.quarter),true)}</div>
        <div class="form-grid-2">${UI.field("Allocated (USD)",UI.input("allocated",rec.allocated,"number"),true)}${UI.field("Spent (USD)",UI.input("spent",rec.spent,"number"),true)}</div>
        ${UI.field("Committed (USD)",UI.input("committed",rec.committed,"number"))}
      </form>`);
      UI.openModal({title:isNew?"New budget line":"Edit budget",sub:isNew?"Allocate budget to a campaign":esc(rec.campaign),body,wide:true,
        footer:[UI.btn("Cancel","btn-light",UI.closeModal),UI.btn(`<i class="bi bi-check-lg"></i> ${isNew?"Add":"Save"}`,"btn-accent",()=>{
          const g=n=>body.querySelector(`[name="${n}"]`).value;
          const data={campaign:g("campaign")||"New line",channel:g("channel"),quarter:g("quarter"),allocated:+g("allocated")||0,spent:+g("spent")||0,committed:+g("committed")||0};
          (async()=>{try{
            if(isNew){const c=await API.budgets.create(data);DB.budgets.unshift(c);UI.toast("Budget line added","ok");}
            else{const u=await API.budgets.update(rec.id,data);Object.assign(rec,u);UI.toast("Budget updated","ok");}
            UI.closeModal();table.refresh();
          }catch(err){UI.toast(err.message||"Save failed","del");}})();
        })]});
    }

    table=DataTable({
      rows:DB.budgets, exportName:"budgets", title:"Budget Tracking", pageSize:8,
      onAdd:()=>budForm(), addLabel:"New line",
      filters:[{key:"channel",label:"Channel",options:["Email","PPC","Social","Display","Event"]},{key:"quarter",label:"Quarter",options:["Q1","Q2","Q3","Q4"]}],
      columns:[
        { key:"campaign", label:"Campaign", render:r=>`<span class="cell-strong">${esc(r.campaign)}</span>` },
        { key:"channel", label:"Channel", render:r=>`<span class="cell-sub">${esc(r.channel)}</span>` },
        { key:"quarter", label:"Qtr", render:r=>`<span class="pill pill-gray">${esc(r.quarter)}</span>` },
        { key:"allocated", label:"Allocated", align:"right", render:r=>money(r.allocated) },
        { key:"spent", label:"Spent", align:"right", render:r=>money(r.spent) },
        { key:"_burn", label:"Burn", nosort:true, render:r=>{const p=Math.round(r.spent/(r.allocated||1)*100);const col=p>90?"#ef4444":p>70?"#f59e0b":accent();return bar(p,col);}, exportVal:r=>Math.round(r.spent/(r.allocated||1)*100)+"%" },
        { key:"_rem", label:"Remaining", align:"right", nosort:true, render:r=>money(r.allocated-r.spent-r.committed), exportVal:r=>r.allocated-r.spent-r.committed },
        { key:"_act", label:"", nosort:true, noexport:true, align:"right", render:r=>`<div class="row-actions"><button data-edit><i class="bi bi-pencil"></i></button><button data-del class="danger"><i class="bi bi-trash3"></i></button></div>` },
      ],
      rowEvents(root){root.querySelectorAll("tr[data-id]").forEach(tr=>{const rec=DB.budgets.find(b=>b.id==tr.dataset.id);
        tr.querySelector("[data-edit]")?.addEventListener("click",()=>budForm(rec));
        tr.querySelector("[data-del]")?.addEventListener("click",()=>UI.confirmDelete(rec.campaign,async()=>{try{await API.budgets.remove(rec.id);DB.budgets.splice(DB.budgets.indexOf(rec),1);table.refresh();UI.toast("Budget line deleted","del");}catch(err){UI.toast(err.message||"Delete failed","del");}}));});}
    });
    el.querySelector("#bud-table").appendChild(table);

    el._onMount=function(){
      const b=DB.budgets.slice(0,8);
      chart(el.querySelector("#ch-bud"),{type:"bar",data:{labels:b.map(x=>x.campaign.length>16?x.campaign.slice(0,15)+"…":x.campaign),datasets:[
        {label:"Allocated",data:b.map(x=>x.allocated),backgroundColor:"#e0e3e9",borderRadius:5},
        {label:"Spent",data:b.map(x=>x.spent),backgroundColor:accent(),borderRadius:5},
      ]},options:baseOpts({plugins:{legend:{display:true,position:"top",labels:{boxWidth:10,boxHeight:10,font:CH.font,color:CH.color}}}})});
      const byCh={};DB.budgets.forEach(x=>byCh[x.channel]=(byCh[x.channel]||0)+x.spent);
      const labels=Object.keys(byCh),data=Object.values(byCh);
      chart(el.querySelector("#ch-budch"),{type:"doughnut",data:{labels,datasets:[{data,backgroundColor:palette(),borderWidth:2,borderColor:"#fff"}]},options:{responsive:true,maintainAspectRatio:false,cutout:"60%",plugins:{legend:{display:false}}}});
      el.querySelector("#bud-legend").innerHTML=labels.map((l,i)=>`<div class="legend-row"><span class="sw" style="background:${palette()[i]}"></span>${l}<span class="val">${money(data[i])}</span></div>`).join("");
    };
    return el;
  };
})();
