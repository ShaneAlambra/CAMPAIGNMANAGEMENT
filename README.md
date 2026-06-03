# Cadence — Campaign Manager

A full-stack marketing **Campaign Management System** built with **PHP REST API + MySQL + AJAX (vanilla JavaScript)**. It lets a marketing team plan campaigns, track budgets, manage tasks, capture and nurture leads, run an approval workflow, and analyze performance — all from a single workspace.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Setup & Installation](#setup--installation)
5. [How Authentication Works (JWT)](#how-authentication-works-jwt)
6. [The Business Process — Campaign Lifecycle](#the-business-process--campaign-lifecycle)
7. [How the Modules Connect](#how-the-modules-connect)
8. [Cross-Cutting Modules](#cross-cutting-modules)
9. [Roles & Permissions](#roles--permissions)
10. [API Reference](#api-reference)
11. [Database Schema](#database-schema)
12. [Security Notes](#security-notes)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS (Bootstrap 5), vanilla JavaScript, Chart.js |
| **API** | PHP 8 REST API (no framework) |
| **Database** | MySQL / MariaDB (via XAMPP) |
| **Communication** | AJAX (`fetch`) with JSON |
| **Auth** | JWT (JSON Web Tokens, HS256) |
| **Data access** | PDO with prepared statements |

---

## Architecture Overview

The system has **three layers**. The browser never touches the database directly — every request goes through the PHP API.

```
┌─────────────────────────────────────────────────────────────┐
│  1. FRONTEND (Browser)          HTML + CSS + JavaScript      │
│     login.html, Campaign Manager.html, js/*.js               │
│                          ↕ AJAX (fetch + JWT token)          │
│  2. BACKEND (PHP REST API)      api/*.php                     │
│     Router → Auth check → Endpoint → SQL query               │
│                          ↕ PDO (prepared statements)         │
│  3. DATABASE (MySQL)            "cadence" database            │
│     campaigns, leads, users, settings, ... (13 tables)       │
└─────────────────────────────────────────────────────────────┘
```

**Why this matters:** Putting PHP in the middle means there is a single, controlled "door" (the API) that every request must pass through. Security (authentication + role checks) is enforced on the server, so it cannot be bypassed from the browser.

---

## Project Structure

```
CAMPAIGNMANAGEMENT/
├── Campaign Manager.html      # Main single-page app (the dashboard shell)
├── login.html                 # Sign-in page
├── forgot-password.html       # Password reset request page
├── README.md                  # This file
│
├── css/
│   ├── app.css                # Main app styles
│   └── auth.css               # Login / reset page styles
│
├── js/
│   ├── api.js                 # AJAX client — talks to the REST API, manages JWT
│   ├── app.js                 # Sidebar nav, router, role-based menu, data boot
│   ├── data.js                # In-browser data store (DB.*) + fallback mock data
│   ├── ui.js                  # Reusable UI helpers (tables, modals, toasts)
│   ├── modules1.js            # Dashboard, Campaigns, Leads, CRM, Budget
│   └── modules2.js            # Tasks, Calendar, Analytics, Roles, Approvals,
│                              #   Notifications, Audit, Settings
│
├── api/                       # ===== PHP REST API =====
│   ├── .htaccess              # Clean URLs + forwards the Authorization header
│   ├── index.php              # Front controller / router
│   ├── seed_passwords.php     # One-time helper to set demo passwords
│   │
│   ├── config/
│   │   └── db.php             # DB connection (PDO) + JWT secret/settings
│   │
│   ├── core/
│   │   ├── bootstrap.php      # Loads everything, sets up CORS + error handling
│   │   ├── response.php       # JSON response + request body helpers
│   │   ├── jwt.php            # JWT encode/decode (HS256)
│   │   ├── auth.php           # require_auth() / require_role() middleware
│   │   └── crud.php           # Generic CRUD engine (drives most endpoints)
│   │
│   └── endpoints/             # One file per resource
│       ├── auth.php           # login, me, forgot-password, reset-password
│       ├── campaigns.php      # Campaign CRUD
│       ├── leads.php          # Lead CRUD
│       ├── contacts.php       # CRM contact CRUD
│       ├── budgets.php        # Budget CRUD
│       ├── tasks.php          # Task CRUD
│       ├── events.php         # Calendar event CRUD
│       ├── approvals.php      # Approval CRUD + approve/reject
│       ├── notifications.php  # Notifications + mark read / mark all read
│       ├── audit.php          # Audit log (read-only)
│       ├── users.php          # User CRUD + role permission matrix
│       ├── settings.php       # Workspace/profile settings (key/value)
│       └── analytics.php      # Live aggregated metrics (read-only)
│
└── database/
    └── schema.sql             # Full schema + seed data (re-runnable)
```

---

## Setup & Installation

### Prerequisites
- **XAMPP** (or any Apache + PHP 8 + MySQL/MariaDB stack)
- The project placed in `htdocs/CAMPAIGNMANAGEMENT`

### Steps

1. **Start Apache and MySQL** from the XAMPP control panel.

2. **Create the database.** Import `database/schema.sql` using one of:
   - **phpMyAdmin:** open `http://localhost/phpmyadmin` → Import → choose `database/schema.sql`
   - **Command line:**
     ```bash
     mysql -u root < database/schema.sql
     ```
   This creates the `cadence` database, all tables, and seed data.

3. **Generate demo passwords.** The seed users are inserted with a placeholder hash. Run the helper once:
   - Open `http://localhost/CAMPAIGNMANAGEMENT/api/seed_passwords.php` in a browser.
   - This sets the password for **all** demo users to `campaign2026`.
   - **Delete `api/seed_passwords.php` afterward** (it's a dev convenience only).

4. **Open the app:**
   ```
   http://localhost/CAMPAIGNMANAGEMENT/login.html
   ```

### Demo Login
| Email | Password | Role |
|-------|----------|------|
| `maya.chen@acme.com` | `campaign2026` | Admin |
| `daniel.ross@acme.com` | `campaign2026` | Manager |
| `liam.obrien@acme.com` | `campaign2026` | Editor |
| `ava.thompson@acme.com` | `campaign2026` | Viewer |

> **Default DB credentials** (in `api/config/db.php`): host `127.0.0.1`, user `root`, no password — standard XAMPP. Change these if your MySQL setup differs.

---

## How Authentication Works (JWT)

The system uses **JWT (JSON Web Tokens)** — think of a token as a tamper-proof **ID card**.

### Login flow

```
① User submits email + password on login.html
        │  → API.login(email, password)
        ▼
② js/api.js sends POST /api/auth/login
        ▼
③ api/index.php (router) → endpoints/auth.php
        │  • Look up the user by email
        │  • password_verify() against the bcrypt hash in the DB
        │  • If correct → create a signed JWT (jwt_encode)
        │  • Record the sign-in in audit_logs
        ▼
④ Server returns { token, user }
        ▼
⑤ Browser stores the token in localStorage
        ▼
⑥ Redirect to "Campaign Manager.html" — logged in!
```

### What's inside a token

A JWT has three dot-separated parts: `header.payload.signature`

| Part | Contents | Example |
|------|----------|---------|
| Header | algorithm | `{"alg":"HS256"}` |
| Payload | **who you are** | `{"sub":1, "name":"Maya Chen", "role":"Admin", "exp":...}` |
| Signature | proof of authenticity | `HMAC-SHA256(header.payload, SECRET)` |

The signature is computed with a **secret key stored only on the server** (`JWT_SECRET` in `db.php`). If anyone tampers with the payload (e.g. changes `"role":"Viewer"` to `"role":"Admin"`), the signature no longer matches and the server rejects it. Tokens also expire after 8 hours (`JWT_TTL`).

### Every request after login

On every API call, `js/api.js` automatically attaches the token:

```
Authorization: Bearer eyJhbGci...
```

The server's `require_auth()` verifies the signature and expiry before doing anything. `require_role(['Admin','Manager'])` adds a second check for actions that need a higher role.

---

## The Business Process — Campaign Lifecycle

The system models the **complete life of a marketing campaign**, in six stages, plus an approval step that can happen at any point:

```
  PLAN           MONEY          WORK           RESULTS        SALES         REPORT
    │              │              │              │              │              │
┌───▼───┐    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
│CAMPAIGN│───▶│ BUDGET  │───▶│  TASKS  │───▶│  LEADS  │───▶│   CRM   │───▶│ANALYTICS│
│PLANNING│    │TRACKING │    │+CALENDAR│    │  MGMT   │    │CONTACTS │    │ REPORTS │
└────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                                   │
                          ┌────────▼────────┐
                          │   APPROVALS     │  ← can be required at any stage
                          └─────────────────┘
```

### Stage 1 — Campaign Planning (the start)
A campaign is the "head" of everything. It defines the **channel** (Email, PPC, Social, Display, Event), the **owner**, the **budget**, and **status** (Draft → Active → Paused → Completed). Every other module refers back to it.

### Stage 2 — Budget Tracking (the money)
Each campaign gets a budget line: `allocated`, `spent`, and `committed` (reserved). The system computes **Remaining = allocated − spent − committed** and shows a **burn rate** bar that turns yellow above 70% and red above 90%. Hitting a threshold triggers a notification.

### Stage 3 — Tasks & Calendar (the work)
To launch a campaign, the team creates tasks (`To Do → In Progress → Review → Done`) on a drag-and-drop Kanban board. Each task is tied to a campaign and an assignee. The Calendar surfaces task due dates and milestones.

### Stage 4 — Approvals (sign-off)
Before large spend or creative goes live, it goes through a multi-step approval workflow (e.g. `Owner → Manager → Finance`). The `stage` field tracks progress; approving jumps to the final stage, rejecting stops it. Only Admins/Managers can approve.

### Stage 5 — Lead Management (the results)
Once a campaign runs, **leads** arrive. Each lead has a **source** (matching a campaign channel), a **score** (0–100 = how "hot"), a **value**, and a **status** journey:

```
New → Contacted → Qualified → Proposal → (won → CRM) / Lost
```

A high score on a new lead triggers a "new high-value lead" notification.

### Stage 6 — CRM / Contacts (turning leads into customers)
A won lead becomes a **contact** that the team nurtures through stages:

```
Lead → Opportunity → Customer → (hopefully not) Churned
```

The account `value` typically grows as the relationship matures.

### Final — Analytics & Reports (the big picture)
Analytics aggregates everything: revenue, spend, **ROAS** (return on ad spend), ROI by channel, leads by source, and a conversion funnel. This answers the key question: *"Is our marketing profitable, and which channel works best?"*

---

## How the Modules Connect

There are **no formal foreign keys** — modules are linked by **shared text values** (so naming must stay consistent). The key links:

| Link | From | To | Meaning |
|------|------|-----|---------|
| `channel` ↔ `source` | campaigns | leads | which channel produced a lead |
| `name` ↔ `campaign` | campaigns | budgets, tasks | which campaign a budget/task belongs to |
| `owner` / `assignee` | all | users | who is responsible |
| `company` | leads | contacts | same account, lead → customer |
| everything | → | analytics | rolled up into reports |

**Example — "Summer Launch 2026" connects across tables:**

```
campaigns:  name="Summer Launch 2026"  channel=Email  owner="Maya Chen"  budget=48000
                │              │              │
                ▼              ▼              ▼
budgets:    campaign="Summer Launch 2026"  allocated=48000  spent=31200
tasks:      campaign="Summer Launch 2026"  assignee="Maya Chen"  status="In Progress"
leads:      source=Email  (attributable to Email campaigns)  owner="Maya Chen"
```

---

## Cross-Cutting Modules

Three modules run in the background across the entire system:

| Module | Purpose |
|--------|---------|
| **Audit Logs** | Records *every* change (who, what, when, IP) — a permanent, read-only trail. |
| **Notifications** | Automatic alerts (budget threshold, new high-value lead, approval results). |
| **Roles & Permissions** | Controls who can do what (Admin / Manager / Editor / Viewer). |

### End-to-end example

```
WEEK 1 — PLAN
  Maya creates "Summer Launch 2026" (Email, $48k)
    → AUDIT LOG: "Maya created campaign"
    → Budget line created: $48k allocated

WEEK 2 — PREP
  Tasks created: "Draft email copy", "A/B test subjects" (shown on Calendar)
  Liam submits an APPROVAL for $60k creative → status: Pending

WEEK 3 — LAUNCH
  Manager APPROVES the creative
    → AUDIT LOG: "Approved" → NOTIFICATION: "Contract approved"
  Campaign goes Active.

WEEK 4 — RESULTS
  LEADS arrive (source: Email)
    → Jordan Blake (score 92) becomes Qualified
    → NOTIFICATION: "New high-value lead"
  Budget hits 84% → NOTIFICATION: "Budget threshold reached" (yellow warning)

WEEK 5-6 — CLOSE
  Jordan (Northwind Co) is won → added to CRM as a Customer ($120k)

END — REPORT
  ANALYTICS shows ROAS 3.1×, Email is the top-ROI channel
    → Decision: increase Email budget next quarter
```

---

## Roles & Permissions

Both the **sidebar visibility** and the **API** enforce roles. The sidebar hides sections a role can't use; the backend independently blocks the data (so it's secure even if the UI is bypassed).

| Module | Admin | Manager | Editor | Viewer |
|--------|:-----:|:-------:|:------:|:------:|
| Dashboard, Calendar, Analytics, Notifications | ✓ | ✓ | ✓ | ✓ |
| Campaigns, Leads, CRM, Tasks | ✓ | ✓ | ✓ | ✗ |
| Budget, Approvals, Settings | ✓ | ✓ | ✗ | ✗ |
| Audit Logs, Roles & Permissions | ✓ | ✗ | ✗ | ✗ |

**Write rules on the API:**
- Create/Update: Admin, Manager, Editor
- Delete: Admin, Manager
- User management, audit logs, permission editing: **Admin only**
- Approve/Reject: Admin, Manager

The permission matrix is **editable** by Admins on the Roles & Permissions page (each cell is a clickable toggle).

---

## API Reference

Base URL: `http://localhost/CAMPAIGNMANAGEMENT/api`

All endpoints (except auth) require an `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Sign in → `{ token, user }` |
| GET | `/auth/me` | Get the current user |
| POST | `/auth/forgot-password` | Request a reset link |
| POST | `/auth/reset-password` | Reset password with a token |

### Standard CRUD resources
Each supports `GET` (list), `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`:

`/campaigns`, `/leads`, `/contacts`, `/budgets`, `/tasks`, `/events`, `/approvals`, `/users`

Most list endpoints accept filters via query string, e.g. `/campaigns?status=Active&channel=Email&q=summer`.

### Special actions
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/approvals/{id}/approve` | Approve a request |
| PUT | `/approvals/{id}/reject` | Reject a request |
| GET | `/notifications` | List notifications |
| PUT | `/notifications/{id}` | Mark one read/unread |
| POST | `/notifications/read-all` | Mark all read |
| GET | `/audit` | Audit log (Admin only, read-only) |
| GET | `/users/permissions` | Get the role matrix |
| PUT | `/users/permissions` | Toggle one cell (Admin only) |
| GET | `/settings` | Get all settings |
| PUT | `/settings` | Save a subset of settings |
| GET | `/analytics` | Live aggregated metrics |

### How routing works
`api/index.php` splits the URL into parts and maps the first segment to an endpoint file, then uses the HTTP method to decide the action:

| URL | Resource | HTTP Method | Action |
|-----|----------|-------------|--------|
| `/campaigns` | campaigns | GET | list all |
| `/campaigns` | campaigns | POST | create (INSERT) |
| `/campaigns/5` | campaigns | PUT | update id 5 (UPDATE) |
| `/campaigns/5` | campaigns | DELETE | delete id 5 (DELETE) |
| `/approvals/2/approve` | approvals | PUT | approve id 2 |

---

## Database Schema

The `cadence` database has **13 tables**:

| Table | Purpose |
|-------|---------|
| `users` | Login accounts + team roster (with bcrypt password hashes) |
| `campaigns` | Marketing campaigns |
| `leads` | Inbound leads with score/status |
| `contacts` | CRM contacts/accounts |
| `budgets` | Budget allocation & spend per campaign |
| `tasks` | Work items (Kanban) |
| `events` | Calendar events |
| `approvals` | Approval workflow (steps stored as JSON) |
| `notifications` | In-app alerts |
| `audit_logs` | Immutable activity trail |
| `role_permissions` | The role × area permission matrix |
| `settings` | Key/value store for profile & workspace settings |
| `password_resets` | Time-limited reset tokens (expire after 30 min) |

The full definition and seed data is in [`database/schema.sql`](database/schema.sql).

---

## Security Notes

- **Passwords** are hashed with `password_hash()` (bcrypt). Plain text is never stored.
- **SQL injection** is prevented by using **PDO prepared statements** (`?` placeholders) everywhere.
- **JWT signatures** prevent token tampering; tokens expire after 8 hours.
- **Authorization** is enforced server-side on every endpoint (`require_auth` / `require_role`), independent of the UI.
- **Audit logging** records every create/update/delete and login.
- **Forgot-password** does not reveal whether an email is registered (avoids account enumeration).

### Before deploying to production
- [ ] Change `JWT_SECRET` in `api/config/db.php` to a long random value.
- [ ] Set a real MySQL password and update `db.php`.
- [ ] Delete `api/seed_passwords.php`.
- [ ] Restrict CORS in `api/core/response.php` (currently `*` for local dev).
- [ ] Serve over HTTPS so tokens aren't sent in clear text.
- [ ] Wire `forgot-password` to a real mail service (it currently returns the token for local testing).

---

*Cadence Campaign Manager — built with PHP, MySQL, and vanilla JavaScript.*
