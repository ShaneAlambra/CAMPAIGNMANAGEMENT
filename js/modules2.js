/* ============================================================
   MODULES (part 2): Tasks, Calendar, Analytics, Roles,
   Approvals, Notifications, Audit Logs, Settings
   ============================================================ */
(function () {
  const M = window.MODULES = window.MODULES || {};
  const { h, esc, money, num, pill, userCell, avatar, bar, kpi, DataTable } = UI;

  function accent() { return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4f46e5"; }
  function palette() { return [accent(), "#0ea5e9", "#f59e0b", "#10b981", "#a855f7", "#ef4444", "#14b8a6", "#64748b"]; }
  const CH = { color: "#5b6472", grid: "#eef0f3", font: { family: getComputedStyle(document.body).fontFamily, size: 11 } };
  function baseOpts(extra) {
    return Object.assign({
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false }, ticks: { color: CH.color, font: CH.font } },
                y: { grid: { color: CH.grid }, ticks: { color: CH.color, font: CH.font }, border: { display: false } } }
    }, extra || {});
  }
  function chart(canvas, config) { const prev = Chart.getChart(canvas); if (prev) prev.destroy(); const c = new Chart(canvas.getContext("2d"), config); M._charts.push(c); return c; }

  function pageHead(title, sub, actionsHtml) {
    return `<div class="page-head"><div>
      <div class="breadcrumb-mini"><span class="text-accent">Acme Marketing</span> / ${esc(title)}</div>
      <h1>${esc(title)}</h1><div class="sub">${esc(sub)}</div></div>
      <div class="d-flex gap-2 align-items-center flex-wrap">${actionsHtml || ""}</div></div>`;
  }
  function card(title, bodyHtml, headRight) {
    return `<div class="card-soft"><div class="card-head"><h3>${title}</h3>${headRight||""}</div><div class="card-body-p">${bodyHtml}</div></div>`;
  }

  /* ---------------------------------------------------------- TASKS */
  M.tasks = function () {
    const STATUSES = ["To Do", "In Progress", "Review", "Done"];
    const el = h(`<div class="content-narrow">
      ${pageHead("Task Management", "Coordinate the work behind every campaign",
        `<div class="seg-tabs"><button data-view="board" class="active">Board</button><button data-view="list">List</button></div>
         <button class="btn btn-sm btn-accent" data-newtask><i class="bi bi-plus-lg"></i> New task</button>`)}
      <div id="task-body"></div></div>`);

    function taskForm(rec) {
      const isNew = !rec;
      rec = rec || { title:"", campaign:DB.campaigns[0].name, assignee:DB.owners[0], priority:"Medium", status:"To Do", due:"2026-06-10" };
      const body = h(`<form>
        ${UI.field("Task title", UI.input("title", rec.title))}
        ${UI.field("Campaign", UI.select("campaign", ["—"].concat(DB.campaigns.map(c=>c.name)), rec.campaign))}
        <div class="form-grid-2">${UI.field("Assignee", UI.select("assignee", DB.owners, rec.assignee), true)}${UI.field("Due date", UI.input("due", rec.due, "date"), true)}</div>
        <div class="form-grid-2">${UI.field("Priority", UI.select("priority", ["High","Medium","Low"], rec.priority), true)}${UI.field("Status", UI.select("status", STATUSES, rec.status), true)}</div>
      </form>`);
      UI.openModal({ title: isNew?"New task":"Edit task", sub: isNew?"Add a task to the board":esc(rec.title), body, wide:true,
        footer:[UI.btn("Cancel","btn-light",UI.closeModal), UI.btn(`<i class="bi bi-check-lg"></i> ${isNew?"Create":"Save"}`,"btn-accent",()=>{
          const g=n=>body.querySelector(`[name="${n}"]`).value;
          const data={title:g("title")||"New task",campaign:g("campaign"),assignee:g("assignee"),priority:g("priority"),status:g("status"),due:g("due")};
          (async()=>{try{
            if(isNew){const c=await API.tasks.create(data);DB.tasks.unshift(c);UI.toast("Task created","ok");}
            else{const u=await API.tasks.update(rec.id,data);Object.assign(rec,u);UI.toast("Task updated","ok");}
            UI.closeModal();renderView();
          }catch(err){UI.toast(err.message||"Save failed","del");}})();
        })]});
    }

    let view = "board";
    const bodyWrap = el.querySelector("#task-body");

    function renderBoard() {
      const cols = STATUSES.map(s => {
        const items = DB.tasks.filter(t => t.status === s);
        return `<div class="kan-col" data-col="${s}">
          <div class="kan-head">${s}<span class="cnt">${items.length}</span></div>
          ${items.map(t => `<div class="kan-card" draggable="true" data-id="${t.id}">
            <div class="kt">${esc(t.title)}</div>
            <div class="cell-sub">${esc(t.campaign)}</div>
            <div class="kmeta">${pill(t.priority)}<span class="d-flex align-items-center gap-1">${avatar(t.assignee)}<span class="cell-sub">${esc(t.due.slice(5))}</span></span></div>
          </div>`).join("") || `<div class="cell-sub" style="padding:8px;text-align:center">No tasks</div>`}
        </div>`;
      }).join("");
      bodyWrap.innerHTML = `<div class="kanban">${cols}</div>`;
      // drag & drop
      let dragId = null;
      bodyWrap.querySelectorAll(".kan-card").forEach(c => {
        c.addEventListener("dragstart", () => { dragId = c.dataset.id; c.style.opacity = ".4"; });
        c.addEventListener("dragend", () => c.style.opacity = "1");
        c.addEventListener("click", () => { const t = DB.tasks.find(x=>x.id==c.dataset.id); taskForm(t); });
      });
      bodyWrap.querySelectorAll(".kan-col").forEach(col => {
        col.addEventListener("dragover", e => { e.preventDefault(); col.style.background = "#e6e8ee"; });
        col.addEventListener("dragleave", () => col.style.background = "");
        col.addEventListener("drop", e => { e.preventDefault(); col.style.background = "";
          const t = DB.tasks.find(x=>x.id==dragId);
          if (t && t.status !== col.dataset.col) {
            const newStatus = col.dataset.col;
            t.status = newStatus; renderBoard();
            // Persist the move; revert on failure.
            API.tasks.update(t.id, { status: newStatus })
              .then(() => UI.toast(`Moved to “${newStatus}”`, "ok"))
              .catch(err => { UI.toast(err.message || "Move failed", "del"); });
          } else { renderBoard(); }
        });
      });
    }

    function renderList() {
      const table = DataTable({
        rows: DB.tasks, exportName:"tasks", title:"Task Management", pageSize:10,
        filters:[{key:"status",label:"Status",options:STATUSES},{key:"priority",label:"Priority",options:["High","Medium","Low"]}],
        columns:[
          { key:"title", label:"Task", render:r=>`<div class="cell-strong">${esc(r.title)}</div><div class="cell-sub">${esc(r.campaign)}</div>` },
          { key:"assignee", label:"Assignee", render:r=>userCell(r.assignee) },
          { key:"priority", label:"Priority", render:r=>pill(r.priority) },
          { key:"status", label:"Status", render:r=>pill(r.status) },
          { key:"due", label:"Due", render:r=>`<span class="cell-sub">${esc(r.due)}</span>` },
          { key:"_act", label:"", nosort:true, noexport:true, align:"right", render:r=>`<div class="row-actions"><button data-edit><i class="bi bi-pencil"></i></button><button data-del class="danger"><i class="bi bi-trash3"></i></button></div>` },
        ],
        rowEvents(root){root.querySelectorAll("tr[data-id]").forEach(tr=>{const rec=DB.tasks.find(t=>t.id==tr.dataset.id);
          tr.querySelector("[data-edit]")?.addEventListener("click",()=>taskForm(rec));
          tr.querySelector("[data-del]")?.addEventListener("click",()=>UI.confirmDelete(rec.title,async()=>{try{await API.tasks.remove(rec.id);DB.tasks.splice(DB.tasks.indexOf(rec),1);renderView();UI.toast("Task deleted","del");}catch(err){UI.toast(err.message||"Delete failed","del");}}));});}
      });
      bodyWrap.innerHTML = ""; bodyWrap.appendChild(table);
    }

    function renderView() { view === "board" ? renderBoard() : renderList(); }
    el.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => {
      view = b.dataset.view; el.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active", x===b)); renderView();
    }));
    el.querySelector("[data-newtask]").addEventListener("click", () => taskForm());
    renderView();
    return el;
  };

  /* ---------------------------------------------------------- CALENDAR */
  M.calendar = function () {
    const el = h(`<div class="content-narrow">
      ${pageHead("Calendar & Scheduling", "Plan launches, reviews and milestones",
        `<div class="d-flex align-items-center gap-1"><button class="icon-btn" data-prev><i class="bi bi-chevron-left"></i></button>
         <span id="cal-label" style="font-weight:600;min-width:130px;text-align:center"></span>
         <button class="icon-btn" data-next><i class="bi bi-chevron-right"></i></button></div>
         <button class="btn btn-sm btn-accent" data-newev><i class="bi bi-plus-lg"></i> New event</button>`)}
      <div class="card-soft card-body-p"><div id="cal-grid"></div></div></div>`);

    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    let monthIdx = 5, year = 2026; // June 2026
    const evColors = { blue:"pill-blue", amber:"pill-amber", red:"pill-red", green:"pill-green", purple:"pill-purple", gray:"pill-gray" };

    function daysInMonth(m, y) { return new Date(y, m+1, 0).getDate(); }
    function firstDow(m, y) { return new Date(y, m, 1).getDay(); }

    function evForm() {
      const body = h(`<form>
        ${UI.field("Event title", UI.input("title", ""))}
        <div class="form-grid-2">${UI.field("Date", UI.input("day", "2026-06-10", "date"), true)}${UI.field("Color", UI.select("color", ["blue","amber","red","green","purple","gray"], "blue"), true)}</div>
      </form>`);
      UI.openModal({ title:"New event", sub:"Schedule a calendar event", body,
        footer:[UI.btn("Cancel","btn-light",UI.closeModal), UI.btn(`<i class="bi bi-check-lg"></i> Add event`,"btn-accent",()=>{
          const g=n=>body.querySelector(`[name="${n}"]`).value;
          const d=new Date(g("day")); const data={ day:d.getDate(), title:g("title")||"Untitled", color:g("color") };
          (async()=>{try{
            const c=await API.events.create(data); DB.events.push(c);
            UI.closeModal(); renderCal(); UI.toast("Event added","ok");
          }catch(err){UI.toast(err.message||"Save failed","del");}})();
        })]});
    }

    function renderCal() {
      el.querySelector("#cal-label").textContent = months[monthIdx] + " " + year;
      const dim = daysInMonth(monthIdx, year), fd = firstDow(monthIdx, year);
      const isJune = monthIdx === 5 && year === 2026;
      let cells = "";
      const prevDim = daysInMonth((monthIdx+11)%12, year);
      for (let i = 0; i < fd; i++) cells += `<div class="cal-cell dim"><div class="cal-num">${prevDim - fd + i + 1}</div></div>`;
      for (let d = 1; d <= dim; d++) {
        const evs = isJune ? DB.events.filter(e => e.day === d) : [];
        const today = isJune && d === 3;
        cells += `<div class="cal-cell ${today?"today":""}"><div class="cal-num">${d}</div>
          ${evs.slice(0,3).map(e => `<div class="cal-ev pill ${evColors[e.color]}">${esc(e.title)}</div>`).join("")}
          ${evs.length>3?`<div class="cell-sub">+${evs.length-3} more</div>`:""}</div>`;
      }
      const total = fd + dim, trail = (7 - total % 7) % 7;
      for (let i = 1; i <= trail; i++) cells += `<div class="cal-cell dim"><div class="cal-num">${i}</div></div>`;
      const dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<div class="cal-dow">${d}</div>`).join("");
      el.querySelector("#cal-grid").innerHTML = `<div class="cal-grid">${dow}${cells}</div>`;
    }
    el.querySelector("[data-prev]").addEventListener("click", () => { monthIdx = (monthIdx+11)%12; if (monthIdx===11) year--; renderCal(); });
    el.querySelector("[data-next]").addEventListener("click", () => { monthIdx = (monthIdx+1)%12; if (monthIdx===0) year++; renderCal(); });
    el.querySelector("[data-newev]").addEventListener("click", evForm);
    renderCal();
    return el;
  };

  /* ---------------------------------------------------------- ANALYTICS */
  M.analytics = function () {
    const el = h(`<div class="content-narrow">
      ${pageHead("Analytics & Reports", "Cross-campaign performance insights",
        `<select class="form-select form-select-sm" style="width:auto"><option>Last 6 months</option><option>This year</option></select>
         <button class="btn btn-sm btn-light" data-xlsx><i class="bi bi-file-earmark-spreadsheet text-success"></i> Excel</button>
         <button class="btn btn-sm btn-light" data-pdf><i class="bi bi-file-earmark-pdf text-danger"></i> PDF</button>`)}
      <div class="section-grid grid-kpi" style="margin-bottom:16px" id="an-kpi"></div>
      <div class="section-grid grid-2-1" style="margin-bottom:16px">
        ${card("Revenue & spend", `<div class="chart-wrap chart-h-300"><canvas id="an-rev"></canvas></div>`,
          `<div class="d-flex gap-3"><span class="legend-row"><span class="sw" style="background:var(--accent)"></span>Revenue</span><span class="legend-row"><span class="sw" style="background:#cbd2dd"></span>Spend</span></div>`)}
        ${card("Conversion funnel", `<div class="chart-wrap chart-h-300"><canvas id="an-funnel"></canvas></div>`)}
      </div>
      <div class="section-grid grid-1-1">
        ${card("ROI by channel", `<div class="chart-wrap chart-h-260"><canvas id="an-roi"></canvas></div>`)}
        ${card("Leads by source", `<div class="chart-wrap chart-h-260"><canvas id="an-src"></canvas></div>`)}
      </div>
    </div>`);

    const ak = el.querySelector("#an-kpi");
    [
      kpi({ label:"Total revenue", value:"$1.84M", icon:"bi-graph-up-arrow", trend:"+22%" }),
      kpi({ label:"Marketing spend", value:"$248K", icon:"bi-cash-stack", trend:"+9%", trendDir:"up", iconBg:{bg:"#fef3e2",fg:"#ea580c"} }),
      kpi({ label:"Blended ROAS", value:"3.4×", icon:"bi-bullseye", trend:"+0.3×", iconBg:{bg:"#f0eafb",fg:"#7c3aed"} }),
      kpi({ label:"Conversion rate", value:"4.7%", icon:"bi-percent", trend:"+0.6pt", iconBg:{bg:"#e8f5ee",fg:"#16a34a"} }),
    ].forEach(c => ak.appendChild(c));

    el.querySelector("[data-xlsx]").addEventListener("click", () => UI.toast("Analytics report exported to Excel", "ok"));
    el.querySelector("[data-pdf]").addEventListener("click", () => UI.toast("Analytics report exported to PDF", "ok"));

    el._onMount = function () {
      const months = ["Jan","Feb","Mar","Apr","May","Jun"];
      chart(el.querySelector("#an-rev"), { type:"bar", data:{ labels:months, datasets:[
        { label:"Revenue", data:[210,260,290,320,380,380].map(x=>x*1000), backgroundColor:accent(), borderRadius:5, order:2 },
        { label:"Spend", data:[34,38,41,44,46,45].map(x=>x*1000), backgroundColor:"#cbd2dd", borderRadius:5, order:2 },
      ]}, options: baseOpts({ scales:{ x:{grid:{display:false},ticks:{color:CH.color,font:CH.font}}, y:{grid:{color:CH.grid},ticks:{color:CH.color,font:CH.font,callback:v=>"$"+(v/1000)+"k"},border:{display:false}} } }) });

      chart(el.querySelector("#an-funnel"), { type:"bar", indexAxis:"y",
        data:{ labels:["Impressions","Clicks","Leads","Qualified","Customers"], datasets:[{ data:[100,42,18,9,4.7], backgroundColor:["#c7cdd9", accent(), "#0ea5e9","#f59e0b","#16a34a"], borderRadius:5 }] },
        options:{ indexAxis:"y", responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:CH.grid},ticks:{color:CH.color,font:CH.font,callback:v=>v+"%"},border:{display:false}}, y:{grid:{display:false},ticks:{color:CH.color,font:CH.font}} } } });

      chart(el.querySelector("#an-roi"), { type:"bar",
        data:{ labels:["Email","PPC","Social","Display","Event"], datasets:[{ data:[5.6,3.8,2.1,1.4,2.2], backgroundColor:palette(), borderRadius:6, barThickness:34 }] },
        options: baseOpts({ scales:{ x:{grid:{display:false},ticks:{color:CH.color,font:CH.font}}, y:{grid:{color:CH.grid},ticks:{color:CH.color,font:CH.font,callback:v=>v+"×"},border:{display:false}} } }) });

      chart(el.querySelector("#an-src"), { type:"line",
        data:{ labels:["Jan","Feb","Mar","Apr","May","Jun"], datasets:[
          { label:"Email", data:[180,220,260,300,360,340], borderColor:accent(), tension:.38, borderWidth:2.5, pointRadius:0 },
          { label:"PPC", data:[120,140,160,190,240,260], borderColor:"#0ea5e9", tension:.38, borderWidth:2.5, pointRadius:0 },
          { label:"Social", data:[80,90,110,130,150,170], borderColor:"#f59e0b", tension:.38, borderWidth:2.5, pointRadius:0 },
        ]}, options: baseOpts({ plugins:{legend:{display:true,position:"top",labels:{boxWidth:10,boxHeight:10,font:CH.font,color:CH.color}}} }) });
    };
    return el;
  };

  /* ---------------------------------------------------------- ROLES & PERMISSIONS */
  M.roles = function () {
    const el = h(`<div class="content-narrow">
      ${pageHead("User Roles & Permissions", "Manage team access and what each role can do", "")}
      <div id="users-table" style="margin-bottom:16px"></div>
      ${card("Role permission matrix", `<div style="overflow-x:auto"><table class="dt matrix" id="matrix"></table></div>`,
        `<span class="cell-sub">4 roles · ${DB.roleMatrix.perms.length} permission areas</span>`)}
    </div>`);

    let table;
    function userForm(rec){
      const isNew=!rec;rec=rec||{name:"",email:"",role:"Editor",team:"Growth",status:"Invited",lastActive:"—"};
      const body=h(`<form>
        <div class="form-grid-2">${UI.field("Name",UI.input("name",rec.name),true)}${UI.field("Team",UI.input("team",rec.team),true)}</div>
        ${UI.field("Email",UI.input("email",rec.email,"email"))}
        <div class="form-grid-2">${UI.field("Role",UI.select("role",["Admin","Manager","Editor","Viewer"],rec.role),true)}${UI.field("Status",UI.select("status",["Active","Invited","Suspended"],rec.status),true)}</div>
      </form>`);
      UI.openModal({title:isNew?"Invite user":"Edit user",sub:isNew?"Add a teammate":esc(rec.name),body,wide:true,
        footer:[UI.btn("Cancel","btn-light",UI.closeModal),UI.btn(`<i class="bi bi-check-lg"></i> ${isNew?"Send invite":"Save"}`,"btn-accent",()=>{
          const g=n=>body.querySelector(`[name="${n}"]`).value;
          const data={name:g("name")||"New user",email:g("email"),role:g("role"),team:g("team"),status:g("status")};
          (async()=>{try{
            if(isNew){const c=await API.users.create(data);DB.users.unshift(c);UI.toast("Invitation sent","ok");}
            else{const u=await API.users.update(rec.id,data);Object.assign(rec,u);UI.toast("User updated","ok");}
            UI.closeModal();table.refresh();
          }catch(err){UI.toast(err.message||"Save failed","del");}})();
        })]});
    }

    table=DataTable({
      rows:DB.users, exportName:"users", title:"Users & Roles", pageSize:8,
      onAdd:()=>userForm(), addLabel:"Invite user",
      filters:[{key:"role",label:"Role",options:["Admin","Manager","Editor","Viewer"]},{key:"status",label:"Status",options:["Active","Invited","Suspended"]}],
      columns:[
        { key:"name", label:"User", render:r=>userCell(r.name, r.email) },
        { key:"team", label:"Team", render:r=>`<span class="cell-sub">${esc(r.team)}</span>` },
        { key:"role", label:"Role", render:r=>{const c={Admin:"purple",Manager:"blue",Editor:"green",Viewer:"gray"}[r.role];return `<span class="pill pill-${c}">${esc(r.role)}</span>`;} },
        { key:"status", label:"Status", render:r=>pill(r.status) },
        { key:"lastActive", label:"Last active", render:r=>`<span class="cell-sub">${esc(r.lastActive)}</span>` },
        { key:"_act", label:"", nosort:true, noexport:true, align:"right", render:r=>`<div class="row-actions"><button data-edit><i class="bi bi-pencil"></i></button><button data-del class="danger"><i class="bi bi-trash3"></i></button></div>` },
      ],
      rowEvents(root){root.querySelectorAll("tr[data-id]").forEach(tr=>{const rec=DB.users.find(u=>u.id==tr.dataset.id);
        tr.querySelector("[data-edit]")?.addEventListener("click",()=>userForm(rec));
        tr.querySelector("[data-del]")?.addEventListener("click",()=>UI.confirmDelete(rec.name,async()=>{try{await API.users.remove(rec.id);DB.users.splice(DB.users.indexOf(rec),1);table.refresh();UI.toast("User removed","del");}catch(err){UI.toast(err.message||"Delete failed","del");}}));});}
    });
    el.querySelector("#users-table").appendChild(table);

    const rm = DB.roleMatrix;
    el.querySelector("#matrix").innerHTML = `<thead><tr><th>Permission area</th>${rm.roles.map(r=>`<th class="no-sort">${r}</th>`).join("")}</tr></thead>
      <tbody>${rm.perms.map(p=>`<tr><td class="cell-strong">${p.area}</td>${p.vals.map(v=>`<td>${v?`<i class="bi bi-check-lg ck"></i>`:`<i class="bi bi-dash xk"></i>`}</td>`).join("")}</tr>`).join("")}</tbody>`;
    return el;
  };

  /* ---------------------------------------------------------- APPROVALS */
  M.approvals = function () {
    const el = h(`<div class="content-narrow">
      ${pageHead("Approval Workflow", "Review and sign off on creative, budget and contracts", "")}
      <div class="section-grid grid-kpi" style="margin-bottom:16px" id="ap-kpi"></div>
      <div id="ap-list"></div></div>`);

    function counts(){const c={Pending:0,Approved:0,Rejected:0};DB.approvals.forEach(a=>c[a.status]++);return c;}
    function renderKpi(){
      const c=counts();const ak=el.querySelector("#ap-kpi");ak.innerHTML="";
      [
        kpi({label:"Pending review",value:c.Pending,icon:"bi-hourglass-split",iconBg:{bg:"#fef3e2",fg:"#ea580c"}}),
        kpi({label:"Approved",value:c.Approved,icon:"bi-check2-circle",iconBg:{bg:"#e8f5ee",fg:"#16a34a"}}),
        kpi({label:"Rejected",value:c.Rejected,icon:"bi-x-circle",iconBg:{bg:"#fdecec",fg:"#dc2626"}}),
        kpi({label:"Total value",value:money(DB.approvals.reduce((s,a)=>s+a.amount,0)),icon:"bi-cash-stack"}),
      ].forEach(x=>ak.appendChild(x));
    }

    function steps(a){
      return `<div class="appr-steps">${a.steps.map((s,i)=>{
        const cls = a.status==="Rejected"&&i>=a.stage ? "wait" : i<a.stage?"done":i===a.stage&&a.status==="Pending"?"curr":i<a.stage||a.status==="Approved"?"done":"wait";
        const ic = cls==="done"?`<i class="bi bi-check-lg"></i>`:cls==="curr"?(i+1):(i+1);
        const conn = i<a.steps.length-1?`<div class="appr-conn ${(i<a.stage||a.status==="Approved")?"done":""}"></div>`:"";
        return `<div class="appr-step ${cls}"><div class="dotn">${ic}</div>${esc(s)}</div>${conn}`;
      }).join("")}</div>`;
    }

    function renderList(){
      const list=el.querySelector("#ap-list");
      list.innerHTML = `<div class="card-soft"><div class="card-head"><h3>Approval queue</h3>
        <button class="btn btn-sm btn-light" data-exp><i class="bi bi-download"></i> Export</button></div>
        <div style="overflow-x:auto"><table class="dt"><thead><tr><th>Request</th><th>Type</th><th>Requester</th><th style="text-align:right">Amount</th><th>Workflow</th><th>Status</th><th></th></tr></thead>
        <tbody>${DB.approvals.map(a=>`<tr data-id="${a.id}">
          <td class="cell-strong">${esc(a.item)}<div class="cell-sub">Submitted ${esc(a.submitted)}</div></td>
          <td><span class="cell-sub">${esc(a.type)}</span></td>
          <td>${userCell(a.requester)}</td>
          <td style="text-align:right">${money(a.amount)}</td>
          <td>${steps(a)}</td>
          <td>${pill(a.status)}</td>
          <td style="text-align:right">${a.status==="Pending"?`<div class="row-actions"><button data-ok title="Approve" style="color:#16a34a"><i class="bi bi-check-lg"></i></button><button data-no class="danger" title="Reject"><i class="bi bi-x-lg"></i></button></div>`:`<span class="cell-sub">—</span>`}</td>
        </tr>`).join("")}</tbody></table></div></div>`;
      list.querySelector("[data-exp]").addEventListener("click",()=>UI.toast("Approvals exported to PDF","ok"));
      list.querySelectorAll("tr[data-id]").forEach(tr=>{
        const a=DB.approvals.find(x=>x.id==tr.dataset.id);
        tr.querySelector("[data-ok]")?.addEventListener("click",async()=>{try{const u=await API.approvals.approve(a.id);Object.assign(a,u);renderKpi();renderList();UI.toast("Request approved","ok");}catch(err){UI.toast(err.message||"Action failed","del");}});
        tr.querySelector("[data-no]")?.addEventListener("click",async()=>{try{const u=await API.approvals.reject(a.id);Object.assign(a,u);renderKpi();renderList();UI.toast("Request rejected","del");}catch(err){UI.toast(err.message||"Action failed","del");}});
      });
    }
    renderKpi();renderList();
    return el;
  };

  /* ---------------------------------------------------------- NOTIFICATIONS */
  M.notifications = function () {
    const el = h(`<div class="content-narrow" style="max-width:820px">
      ${pageHead("Notifications", "Stay on top of alerts, mentions and updates",
        `<div class="seg-tabs"><button data-f="all" class="active">All</button><button data-f="unread">Unread</button></div>
         <button class="btn btn-sm btn-light" data-readall><i class="bi bi-check2-all"></i> Mark all read</button>`)}
      <div class="card-soft"><div id="notif-list"></div></div></div>`);

    let filter = "all";
    const colorMap = { green:"#16a34a", amber:"#ea580c", blue:"#0ea5e9", red:"#dc2626", purple:"#7c3aed" };
    const bgMap = { green:"#e8f5ee", amber:"#fef3e2", blue:"#e6f4fb", red:"#fdecec", purple:"#f0eafb" };

    function render(){
      const items = DB.notifications.filter(n => filter==="all" || n.unread);
      const list = el.querySelector("#notif-list");
      if (!items.length) { list.innerHTML = `<div style="text-align:center;padding:50px;color:var(--ink-soft)"><i class="bi bi-check2-circle" style="font-size:30px;display:block;margin-bottom:8px;opacity:.5"></i>You're all caught up</div>`; return; }
      list.innerHTML = items.map(n => `<div class="feed-item" data-id="${n.id}" style="padding:14px 16px;cursor:pointer;${n.unread?"background:rgba(var(--accent-rgb),.03)":""}">
        <div class="feed-ic" style="background:${bgMap[n.color]};color:${colorMap[n.color]}"><i class="bi ${n.icon}"></i></div>
        <div style="flex:1"><div class="ft"><b>${esc(n.title)}</b>${n.unread?` <span class="pdot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);vertical-align:middle;margin-left:4px"></span>`:""}</div>
        <div class="fm" style="font-size:12.5px;color:var(--ink-soft);margin-top:3px">${esc(n.body)}</div>
        <div class="fm">${esc(n.time)}</div></div></div>`).join("");
      list.querySelectorAll("[data-id]").forEach(r => r.addEventListener("click", () => { const n=DB.notifications.find(x=>x.id==r.dataset.id); if(!n.unread)return; n.unread=false; render(); window.updateBadges?.(); API.notifications.markRead(n.id,false).catch(()=>{}); }));
    }
    el.querySelectorAll("[data-f]").forEach(b => b.addEventListener("click", () => { filter=b.dataset.f; el.querySelectorAll("[data-f]").forEach(x=>x.classList.toggle("active",x===b)); render(); }));
    el.querySelector("[data-readall]").addEventListener("click", () => { DB.notifications.forEach(n=>n.unread=false); render(); window.updateBadges?.(); API.notifications.markAllRead().catch(()=>{}); UI.toast("All notifications marked read","ok"); });
    render();
    return el;
  };

  /* ---------------------------------------------------------- AUDIT LOGS */
  M.audit = function () {
    const el = h(`<div class="content-narrow">
      ${pageHead("Audit Logs", "Immutable record of every action across the workspace", "")}
      <div id="audit-table"></div></div>`);
    const typeColor = { update:"blue", export:"purple", system:"gray", create:"green", delete:"red", auth:"amber", approve:"green" };
    const table = DataTable({
      rows: DB.audit, exportName:"audit-log", title:"Audit Log", pageSize:10,
      filters:[{key:"type",label:"Type",options:["create","update","delete","export","auth","approve","system"]}],
      columns:[
        { key:"time", label:"Timestamp", render:r=>`<span class="cell-sub" style="font-variant-numeric:tabular-nums">${esc(r.time)}</span>` },
        { key:"user", label:"Actor", render:r=> r.user==="System"||r.user==="Finance Bot" ? `<span class="cell-user"><span class="cell-avatar" style="background:#64748b"><i class="bi bi-robot" style="font-size:11px"></i></span><span class="cell-strong">${esc(r.user)}</span></span>` : userCell(r.user) },
        { key:"action", label:"Action", render:r=>`<span class="cell-strong">${esc(r.action)}</span>` },
        { key:"target", label:"Target", render:r=>`<span class="cell-sub">${esc(r.target)}</span>` },
        { key:"type", label:"Type", render:r=>`<span class="pill pill-${typeColor[r.type]||"gray"}">${esc(r.type)}</span>` },
        { key:"ip", label:"IP", render:r=>`<span class="cell-sub" style="font-variant-numeric:tabular-nums">${esc(r.ip)}</span>` },
      ],
    });
    el.querySelector("#audit-table").appendChild(table);

    // Audit logs are loaded on demand (Admin only). Fetch fresh on mount.
    el._onMount = function () {
      API.audit.list()
        .then(rows => { if (Array.isArray(rows)) { DB.audit.length = 0; DB.audit.push(...rows); table.refresh(); } })
        .catch(err => UI.toast(err.message || "Could not load audit logs", "del"));
    };
    return el;
  };

  /* ---------------------------------------------------------- SETTINGS */
  M.settings = function () {
    const el = h(`<div class="content-narrow" style="max-width:760px">
      ${pageHead("Settings", "Workspace and profile preferences", "")}
      <div class="seg-tabs" style="margin-bottom:16px"><button data-s="profile" class="active">Profile</button><button data-s="workspace">Workspace</button><button data-s="security">Security</button></div>
      <div id="set-body"></div></div>`);
    const body = el.querySelector("#set-body");
    const panes = {
      profile: card("Profile", `<div class="d-flex align-items-center gap-3 mb-4">${avatar("Maya Chen","")} <div><div class="cell-strong" style="font-size:15px">Maya Chen</div><div class="cell-sub">Admin · Growth team</div></div><button class="btn btn-sm btn-light ms-auto">Change photo</button></div>
        <div class="form-grid-2">${UI.field("Full name",UI.input("n","Maya Chen"),true)}${UI.field("Email",UI.input("e","maya.chen@acme.com","email"),true)}</div>
        <div class="form-grid-2">${UI.field("Job title",UI.input("t","Director of Growth"),true)}${UI.field("Timezone",UI.select("tz",["PT","ET","GMT","CET"],"PT"),true)}</div>`),
      workspace: card("Workspace", `<div class="form-grid-2">${UI.field("Workspace name",UI.input("w","Acme Marketing"),true)}${UI.field("Default currency",UI.select("c",["USD — US Dollar ($)","EUR — Euro (€)","GBP — British Pound (£)","PHP — Philippine Peso (₱)","JPY — Japanese Yen (¥)","AUD — Australian Dollar (A$)","CAD — Canadian Dollar (C$)","SGD — Singapore Dollar (S$)","INR — Indian Rupee (₹)","AED — UAE Dirham (د.إ)"],"USD — US Dollar ($)"),true)}</div>
        ${UI.field("Fiscal year start",UI.select("fy",["January","April","July","October"],"January"))}
        <label class="d-flex align-items-center gap-2 mt-2" style="font-size:13px"><input type="checkbox" checked> Require approval for budgets over $10,000</label>`),
      security: card("Security", `<label class="d-flex align-items-center justify-content-between py-2" style="font-size:13px;border-bottom:1px solid var(--card-bd)"><span><b>Two-factor authentication</b><br><span class="cell-sub">Require 2FA for all admins</span></span><input type="checkbox" checked></label>
        <label class="d-flex align-items-center justify-content-between py-2" style="font-size:13px;border-bottom:1px solid var(--card-bd)"><span><b>Single sign-on (SSO)</b><br><span class="cell-sub">SAML via Okta</span></span><input type="checkbox" checked></label>
        <label class="d-flex align-items-center justify-content-between py-2" style="font-size:13px"><span><b>Session timeout</b><br><span class="cell-sub">Auto log-out after inactivity</span></span><select class="form-select form-select-sm" style="width:auto"><option>30 min</option><option>1 hr</option><option>4 hr</option></select></label>`),
    };
    function show(k){ body.innerHTML = panes[k]; body.appendChild(h(`<div class="d-flex justify-content-end gap-2 mt-3"><button class="btn btn-light btn-sm">Cancel</button><button class="btn btn-accent btn-sm" data-save><i class="bi bi-check-lg"></i> Save changes</button></div>`)); body.querySelector("[data-save]").addEventListener("click",()=>UI.toast("Settings saved","ok")); }
    el.querySelectorAll("[data-s]").forEach(b => b.addEventListener("click", () => { el.querySelectorAll("[data-s]").forEach(x=>x.classList.toggle("active",x===b)); show(b.dataset.s); }));
    show("profile");
    return el;
  };
})();
