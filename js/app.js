/* ============================================================
   APP — sidebar nav, router, topbar, mobile, badges
   ============================================================ */
(function () {
  const { h, esc } = UI;

  const NAV = [
    { section: "Main" },
    { key: "dashboard", label: "Dashboard", icon: "bi-grid-1x2-fill" },
    { key: "campaigns", label: "Campaign Planning", icon: "bi-megaphone-fill" },
    { key: "leads", label: "Lead Management", icon: "bi-funnel-fill" },
    { key: "crm", label: "CRM", icon: "bi-person-rolodex" },
    { section: "Operations" },
    { key: "budget", label: "Budget Tracking", icon: "bi-cash-stack" },
    { key: "tasks", label: "Task Management", icon: "bi-kanban-fill" },
    { key: "calendar", label: "Calendar", icon: "bi-calendar3" },
    { key: "approvals", label: "Approvals", icon: "bi-check2-square", badge: "approvals" },
    { section: "Insights" },
    { key: "analytics", label: "Analytics & Reports", icon: "bi-bar-chart-line-fill" },
    { key: "audit", label: "Audit Logs", icon: "bi-clock-history" },
    { section: "Administration" },
    { key: "roles", label: "Roles & Permissions", icon: "bi-shield-lock-fill" },
    { key: "notifications", label: "Notifications", icon: "bi-bell-fill", badge: "notifications" },
    { key: "settings", label: "Settings", icon: "bi-gear-fill" },
  ];

  function badgeCount(kind) {
    if (kind === "notifications") return DB.notifications.filter(n => n.unread).length;
    if (kind === "approvals") return DB.approvals.filter(a => a.status === "Pending").length;
    return 0;
  }

  function buildSidebar() {
    const nav = document.querySelector(".nav-scroll");
    nav.innerHTML = NAV.map(item => {
      if (item.section) return `<div class="sidebar-section">${item.section}</div>`;
      const bc = item.badge ? badgeCount(item.badge) : 0;
      return `<div class="nav-item" data-key="${item.key}"><i class="bi ${item.icon}"></i><span>${item.label}</span>${bc ? `<span class="nav-badge" data-badge="${item.badge}">${bc}</span>` : ""}</div>`;
    }).join("");
    nav.querySelectorAll(".nav-item").forEach(n => n.addEventListener("click", () => { navTo(n.dataset.key); closeMobile(); }));
  }

  window.updateBadges = function () {
    document.querySelectorAll("[data-badge]").forEach(b => {
      const c = badgeCount(b.dataset.badge);
      if (c) b.textContent = c; else b.remove();
    });
    const bell = document.querySelector("#bell-dot");
    if (bell) bell.style.display = badgeCount("notifications") ? "block" : "none";
    // rebuild sidebar badges that might have appeared
    const nav = document.querySelector(".nav-scroll");
    NAV.filter(i => i.badge).forEach(i => {
      const item = nav.querySelector(`.nav-item[data-key="${i.key}"]`);
      if (!item) return;
      let badge = item.querySelector("[data-badge]");
      const c = badgeCount(i.badge);
      if (c && !badge) { item.insertAdjacentHTML("beforeend", `<span class="nav-badge" data-badge="${i.badge}">${c}</span>`); }
      else if (c && badge) badge.textContent = c;
      else if (!c && badge) badge.remove();
    });
  };

  let current = null;
  window.navTo = function (key) {
    if (!MODULES[key]) key = "dashboard";
    current = key;
    if (MODULES.clearCharts) MODULES.clearCharts();
    document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.key === key));
    const content = document.querySelector("#content");
    content.innerHTML = "";
    const el = MODULES[key]();
    content.appendChild(el);
    if (el._onMount) requestAnimationFrame(() => el._onMount());
    content.scrollTop = 0;
    document.querySelector(".main-col").scrollTop = 0;
    window.scrollTo(0, 0);
    if (location.hash !== "#" + key) history.replaceState(null, "", "#" + key);
    updateBadges();
  };
  window.navToCurrent = function () { if (current) navTo(current); };

  // mobile sidebar
  function openMobile() { document.querySelector(".sidebar").classList.add("open"); document.querySelector(".scrim-mobile").classList.add("show"); }
  function closeMobile() { document.querySelector(".sidebar").classList.remove("open"); document.querySelector(".scrim-mobile").classList.remove("show"); }

  document.addEventListener("DOMContentLoaded", async () => {
    buildSidebar();
    document.querySelector(".menu-toggle").addEventListener("click", openMobile);
    document.querySelector(".scrim-mobile").addEventListener("click", closeMobile);
    document.querySelector("#bell-btn").addEventListener("click", () => navTo("notifications"));
    document.querySelector("#gear-btn").addEventListener("click", () => navTo("settings"));

    // Load all live data from the REST API (replaces the hardcoded mocks).
    // Helper: replace an array's contents in place so existing references stay valid.
    const replace = (arr, items) => { if (Array.isArray(items)) { arr.length = 0; arr.push(...items); } };
    try {
      if (window.API) {
        const [campaigns, leads, contacts, budgets, tasks, events, approvals, notifications, usersResp] =
          await Promise.all([
            API.campaigns.list().catch(() => null),
            API.leads.list().catch(() => null),
            API.contacts.list().catch(() => null),
            API.budgets.list().catch(() => null),
            API.tasks.list().catch(() => null),
            API.events.list().catch(() => null),
            API.approvals.list().catch(() => null),
            API.notifications.list().catch(() => null),
            API.users.list().catch(() => null),       // Admin-only; may 403
          ]);
        replace(DB.campaigns, campaigns);
        replace(DB.leads, leads);
        replace(DB.contacts, contacts);
        replace(DB.budgets, budgets);
        replace(DB.tasks, tasks);
        replace(DB.events, events);
        replace(DB.approvals, approvals);
        replace(DB.notifications, notifications);
        if (usersResp && usersResp.users) {
          replace(DB.users, usersResp.users);
          if (usersResp.roleMatrix) Object.assign(DB.roleMatrix, usersResp.roleMatrix);
        }
        // Refresh owner list from live users (used by form dropdowns).
        if (DB.users.length) { DB.owners.length = 0; DB.owners.push(...DB.users.map(u => u.name)); }
      }
    } catch (err) {
      console.warn("Could not load data from API, falling back to mock data:", err.message);
    }

    // top search jumps to leads/campaigns demo
    const start = (location.hash || "#dashboard").slice(1);
    navTo(start);
  });
})();
