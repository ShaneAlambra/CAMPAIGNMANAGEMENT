/* ============================================================
   API CLIENT — thin AJAX (fetch) wrapper around the PHP REST API.
   Handles the JWT token (stored in localStorage) automatically.
   ============================================================ */
(function () {
  // Base URL of the API. Works under http://localhost/CAMPAIGNMANAGEMENT/
  const API_BASE = (function () {
    // strip the current file path down to the app root, then add /api
    const path = location.pathname.replace(/\/[^/]*$/, ""); // dir of current page
    return path.replace(/\/$/, "") + "/api";
  })();

  const TOKEN_KEY = "cadence_token";
  const USER_KEY  = "cadence_user";

  const Auth = {
    get token() { return localStorage.getItem(TOKEN_KEY); },
    set token(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); },
    get user() { try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; } },
    set user(u) { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); },
    isLoggedIn() { return !!this.token; },
    logout() { this.token = null; this.user = null; },
    /** Redirect to login if not authenticated. Call on protected pages. */
    guard() {
      if (!this.isLoggedIn()) { location.href = "login.html"; return false; }
      return true;
    },
  };

  /** Core request. Returns parsed JSON; throws {status, message, data} on error. */
  async function request(method, path, payload) {
    const opts = { method, headers: {} };
    if (Auth.token) opts.headers["Authorization"] = "Bearer " + Auth.token;
    if (payload !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(payload);
    }

    const res = await fetch(API_BASE + path, opts);
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON response */ }

    if (!res.ok) {
      // Token expired / invalid -> bounce to login (except on auth calls).
      if (res.status === 401 && !path.startsWith("/auth/")) {
        Auth.logout();
        location.href = "login.html";
      }
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // Expose a tidy API surface.
  window.API = {
    base: API_BASE,
    auth: Auth,
    get:    (p)    => request("GET", p),
    post:   (p, b) => request("POST", p, b),
    put:    (p, b) => request("PUT", p, b),
    del:    (p)    => request("DELETE", p),

    // ---- Auth shortcuts ----
    async login(email, password) {
      const r = await request("POST", "/auth/login", { email, password });
      Auth.token = r.token;
      Auth.user  = r.user;
      return r;
    },
    forgotPassword(email) { return request("POST", "/auth/forgot-password", { email }); },
    resetPassword(token, password) { return request("POST", "/auth/reset-password", { token, password }); },

    // ---- Generic resource factory (CRUD) ----
    // Builds {list,get,create,update,remove} for a resource path.
    resource(name) {
      const p = "/" + name;
      return {
        list:   (params) => request("GET", p + qs(params)),
        get:    (id)     => request("GET", p + "/" + id),
        create: (data)   => request("POST", p, data),
        update: (id, d)  => request("PUT", p + "/" + id, d),
        remove: (id)     => request("DELETE", p + "/" + id),
      };
    },

    // ---- Per-module clients ----
    campaigns:     null, // assigned below
    leads:         null,
    contacts:      null,
    budgets:       null,
    tasks:         null,
    events:        null,

    // Approvals: CRUD + approve/reject actions.
    approvals: {
      list:    (params) => request("GET", "/approvals" + qs(params)),
      create:  (data)   => request("POST", "/approvals", data),
      remove:  (id)     => request("DELETE", "/approvals/" + id),
      approve: (id)     => request("PUT", "/approvals/" + id + "/approve"),
      reject:  (id)     => request("PUT", "/approvals/" + id + "/reject"),
    },

    // Notifications: list + mark read/unread + mark all read + delete.
    notifications: {
      list:       (params) => request("GET", "/notifications" + qs(params)),
      markRead:   (id, unread = false) => request("PUT", "/notifications/" + id, { unread: unread ? 1 : 0 }),
      markAllRead:()       => request("POST", "/notifications/read-all"),
      remove:     (id)     => request("DELETE", "/notifications/" + id),
    },

    // Audit logs: read only.
    audit: { list: (params) => request("GET", "/audit" + qs(params)) },

    // Users + role matrix.
    users: {
      list:   (params) => request("GET", "/users" + qs(params)), // -> {users, roleMatrix}
      create: (data)   => request("POST", "/users", data),
      update: (id, d)  => request("PUT", "/users/" + id, d),
      remove: (id)     => request("DELETE", "/users/" + id),
      // Role permission matrix:
      getPermissions: ()                  => request("GET", "/users/permissions"),
      setPermission:  (area, role, allow) => request("PUT", "/users/permissions", { area, role, allow }),
    },

    // Settings (key/value).
    settings: {
      get:  ()     => request("GET", "/settings"),         // -> { key: value, ... }
      save: (data) => request("PUT", "/settings", data),   // upsert subset
    },

    // Analytics aggregates (read-only).
    analytics: { get: () => request("GET", "/analytics") },
  };

  // Wire up the simple CRUD resources via the factory.
  API.campaigns = API.resource("campaigns");
  API.leads     = API.resource("leads");
  API.contacts  = API.resource("contacts");
  API.budgets   = API.resource("budgets");
  API.tasks     = API.resource("tasks");
  API.events    = API.resource("events");

  /** Build a ?query=string from an object (skips empty values). */
  function qs(params) {
    if (!params) return "";
    const s = Object.entries(params)
      .filter(([, v]) => v !== "" && v != null)
      .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v))
      .join("&");
    return s ? "?" + s : "";
  }
})();
