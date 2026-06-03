/* ============================================================
   DATA — mock datasets for all modules
   Stored in a mutable DB object so CRUD ops persist in-session.
   ============================================================ */
(function () {
  const avatarColors = ["#4f46e5","#0891b2","#db2777","#ea580c","#16a34a","#7c3aed","#0d9488","#dc2626","#2563eb","#ca8a04"];
  function ac(name) {
    let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return avatarColors[Math.abs(h) % avatarColors.length];
  }
  function initials(name) {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  }

  const owners = ["Maya Chen","Daniel Ross","Priya Nair","Liam O'Brien","Sofia Marquez","Noah Kim","Ava Thompson","Ethan Wu"];

  const campaigns = [
    { id: 1, name: "Summer Launch 2026", channel: "Email", status: "Active", owner: "Maya Chen", budget: 48000, spent: 31200, leads: 1240, roi: 3.1, start: "2026-05-01", end: "2026-07-15", progress: 65 },
    { id: 2, name: "Q2 Product Webinar", channel: "Social", status: "Active", owner: "Daniel Ross", budget: 22000, spent: 18400, leads: 860, roi: 2.4, start: "2026-04-10", end: "2026-06-20", progress: 84 },
    { id: 3, name: "Retargeting — Cart Abandon", channel: "PPC", status: "Active", owner: "Priya Nair", budget: 15000, spent: 9700, leads: 540, roi: 4.2, start: "2026-05-20", end: "2026-08-01", progress: 41 },
    { id: 4, name: "Brand Awareness — APAC", channel: "Display", status: "Paused", owner: "Liam O'Brien", budget: 60000, spent: 22300, leads: 410, roi: 1.2, start: "2026-03-01", end: "2026-09-30", progress: 37 },
    { id: 5, name: "Spring Newsletter Series", channel: "Email", status: "Completed", owner: "Sofia Marquez", budget: 12000, spent: 12000, leads: 980, roi: 5.6, start: "2026-02-01", end: "2026-04-30", progress: 100 },
    { id: 6, name: "Influencer Collab — Fitness", channel: "Social", status: "Draft", owner: "Noah Kim", budget: 35000, spent: 0, leads: 0, roi: 0, start: "2026-07-01", end: "2026-09-15", progress: 0 },
    { id: 7, name: "Search — Branded Keywords", channel: "PPC", status: "Active", owner: "Ava Thompson", budget: 28000, spent: 16800, leads: 1120, roi: 3.8, start: "2026-04-01", end: "2026-12-31", progress: 60 },
    { id: 8, name: "Holiday Teaser", channel: "Display", status: "Draft", owner: "Ethan Wu", budget: 40000, spent: 0, leads: 0, roi: 0, start: "2026-10-15", end: "2026-12-24", progress: 0 },
    { id: 9, name: "Customer Win-back", channel: "Email", status: "Active", owner: "Maya Chen", budget: 9000, spent: 6300, leads: 320, roi: 2.9, start: "2026-05-05", end: "2026-06-30", progress: 70 },
    { id: 10, name: "LinkedIn Thought Leadership", channel: "Social", status: "Active", owner: "Daniel Ross", budget: 18000, spent: 7400, leads: 290, roi: 1.9, start: "2026-05-12", end: "2026-08-30", progress: 32 },
    { id: 11, name: "Trade Show — TechExpo", channel: "Event", status: "Completed", owner: "Priya Nair", budget: 54000, spent: 51800, leads: 670, roi: 2.2, start: "2026-03-18", end: "2026-03-22", progress: 100 },
    { id: 12, name: "Free Trial Push", channel: "PPC", status: "Paused", owner: "Sofia Marquez", budget: 25000, spent: 11200, leads: 480, roi: 1.6, start: "2026-04-22", end: "2026-07-22", progress: 45 },
  ];

  const leads = [
    { id: 1, name: "Jordan Blake", company: "Northwind Co", email: "j.blake@northwind.io", score: 92, status: "Qualified", source: "Email", value: 24000, owner: "Maya Chen", created: "2026-05-28" },
    { id: 2, name: "Rosa Mendez", company: "Brightpath", email: "rosa@brightpath.com", score: 78, status: "Contacted", source: "PPC", value: 12000, owner: "Daniel Ross", created: "2026-05-27" },
    { id: 3, name: "Wei Zhang", company: "Lumen Analytics", email: "wei.z@lumen.ai", score: 85, status: "Qualified", source: "Social", value: 38000, owner: "Priya Nair", created: "2026-05-26" },
    { id: 4, name: "Tomas Berg", company: "Fjord Labs", email: "tomas@fjordlabs.no", score: 41, status: "New", source: "Display", value: 6000, owner: "Liam O'Brien", created: "2026-05-26" },
    { id: 5, name: "Aisha Khan", company: "Vertex Retail", email: "a.khan@vertex.com", score: 67, status: "Contacted", source: "Email", value: 15500, owner: "Sofia Marquez", created: "2026-05-25" },
    { id: 6, name: "Marcus Hale", company: "Cobalt Mfg", email: "m.hale@cobalt.co", score: 88, status: "Proposal", source: "Event", value: 52000, owner: "Noah Kim", created: "2026-05-24" },
    { id: 7, name: "Lena Petrova", company: "Skyward SaaS", email: "lena@skyward.app", score: 73, status: "Qualified", source: "Social", value: 28000, owner: "Ava Thompson", created: "2026-05-23" },
    { id: 8, name: "Owen Carter", company: "Harbor Freight", email: "owen.c@harbor.com", score: 29, status: "New", source: "PPC", value: 4000, owner: "Ethan Wu", created: "2026-05-23" },
    { id: 9, name: "Nadia Rahman", company: "Pulse Health", email: "n.rahman@pulse.io", score: 81, status: "Proposal", source: "Email", value: 44000, owner: "Maya Chen", created: "2026-05-22" },
    { id: 10, name: "Diego Santos", company: "Andes Logistics", email: "diego@andes.cl", score: 55, status: "Contacted", source: "Display", value: 9800, owner: "Daniel Ross", created: "2026-05-21" },
    { id: 11, name: "Hannah Wells", company: "Meadow Foods", email: "hannah@meadow.com", score: 64, status: "New", source: "Social", value: 13000, owner: "Priya Nair", created: "2026-05-20" },
    { id: 12, name: "Sam Okafor", company: "Trailhead Inc", email: "sam.o@trailhead.io", score: 90, status: "Qualified", source: "Event", value: 60000, owner: "Liam O'Brien", created: "2026-05-19" },
    { id: 13, name: "Yuki Tanaka", company: "Sakura Tech", email: "yuki@sakuratech.jp", score: 76, status: "Contacted", source: "PPC", value: 21000, owner: "Sofia Marquez", created: "2026-05-18" },
    { id: 14, name: "Grace Miller", company: "Beacon Edu", email: "grace@beacon.edu", score: 48, status: "New", source: "Email", value: 7500, owner: "Noah Kim", created: "2026-05-17" },
  ];

  const contacts = [
    { id: 1, name: "Elaine Foster", company: "Northwind Co", title: "VP Marketing", email: "elaine@northwind.io", phone: "+1 415 555 0192", stage: "Customer", value: 120000, owner: "Maya Chen", lastTouch: "2026-05-29" },
    { id: 2, name: "Raj Patel", company: "Lumen Analytics", title: "Head of Growth", email: "raj@lumen.ai", phone: "+1 408 555 0148", stage: "Opportunity", value: 84000, owner: "Priya Nair", lastTouch: "2026-05-28" },
    { id: 3, name: "Clara Nilsson", company: "Fjord Labs", title: "CMO", email: "clara@fjordlabs.no", phone: "+47 22 555 019", stage: "Lead", value: 32000, owner: "Liam O'Brien", lastTouch: "2026-05-25" },
    { id: 4, name: "Victor Cruz", company: "Vertex Retail", title: "Director, Demand Gen", email: "victor@vertex.com", phone: "+1 312 555 0177", stage: "Customer", value: 156000, owner: "Sofia Marquez", lastTouch: "2026-05-30" },
    { id: 5, name: "Amara Diallo", company: "Pulse Health", title: "Growth Lead", email: "amara@pulse.io", phone: "+1 646 555 0123", stage: "Opportunity", value: 67000, owner: "Maya Chen", lastTouch: "2026-05-27" },
    { id: 6, name: "Felix Brandt", company: "Cobalt Mfg", title: "Marketing Manager", email: "felix@cobalt.co", phone: "+49 30 555 0166", stage: "Lead", value: 28000, owner: "Noah Kim", lastTouch: "2026-05-22" },
    { id: 7, name: "Ines Lopez", company: "Andes Logistics", title: "CEO", email: "ines@andes.cl", phone: "+56 2 555 0188", stage: "Churned", value: 0, owner: "Daniel Ross", lastTouch: "2026-04-30" },
    { id: 8, name: "Oscar Lindqvist", company: "Skyward SaaS", title: "VP Sales", email: "oscar@skyward.app", phone: "+46 8 555 0144", stage: "Customer", value: 98000, owner: "Ava Thompson", lastTouch: "2026-05-31" },
    { id: 9, name: "Bianca Rossi", company: "Meadow Foods", title: "Brand Director", email: "bianca@meadow.com", phone: "+39 06 555 0133", stage: "Opportunity", value: 51000, owner: "Priya Nair", lastTouch: "2026-05-26" },
    { id: 10, name: "Kwame Mensah", company: "Trailhead Inc", title: "Founder", email: "kwame@trailhead.io", phone: "+1 503 555 0111", stage: "Lead", value: 40000, owner: "Liam O'Brien", lastTouch: "2026-05-24" },
  ];

  const budgets = [
    { id: 1, campaign: "Summer Launch 2026", channel: "Email", allocated: 48000, spent: 31200, committed: 8000, quarter: "Q2" },
    { id: 2, campaign: "Q2 Product Webinar", channel: "Social", allocated: 22000, spent: 18400, committed: 2000, quarter: "Q2" },
    { id: 3, campaign: "Retargeting — Cart Abandon", channel: "PPC", allocated: 15000, spent: 9700, committed: 3000, quarter: "Q2" },
    { id: 4, campaign: "Brand Awareness — APAC", channel: "Display", allocated: 60000, spent: 22300, committed: 12000, quarter: "Q2" },
    { id: 5, campaign: "Search — Branded Keywords", channel: "PPC", allocated: 28000, spent: 16800, committed: 5000, quarter: "Q2" },
    { id: 6, campaign: "Trade Show — TechExpo", channel: "Event", allocated: 54000, spent: 51800, committed: 0, quarter: "Q1" },
    { id: 7, campaign: "Customer Win-back", channel: "Email", allocated: 9000, spent: 6300, committed: 1000, quarter: "Q2" },
    { id: 8, campaign: "LinkedIn Thought Leadership", channel: "Social", allocated: 18000, spent: 7400, committed: 4000, quarter: "Q2" },
    { id: 9, campaign: "Holiday Teaser", channel: "Display", allocated: 40000, spent: 0, committed: 0, quarter: "Q4" },
  ];

  const tasks = [
    { id: 1, title: "Draft email sequence copy", campaign: "Summer Launch 2026", assignee: "Maya Chen", priority: "High", status: "In Progress", due: "2026-06-05" },
    { id: 2, title: "Design webinar landing page", campaign: "Q2 Product Webinar", assignee: "Daniel Ross", priority: "High", status: "In Progress", due: "2026-06-04" },
    { id: 3, title: "Set up retargeting pixels", campaign: "Retargeting — Cart Abandon", assignee: "Priya Nair", priority: "Medium", status: "Done", due: "2026-05-30" },
    { id: 4, title: "Approve APAC creative", campaign: "Brand Awareness — APAC", assignee: "Liam O'Brien", priority: "High", status: "Review", due: "2026-06-06" },
    { id: 5, title: "Brief influencer partners", campaign: "Influencer Collab — Fitness", assignee: "Noah Kim", priority: "Medium", status: "To Do", due: "2026-06-10" },
    { id: 6, title: "QA tracking links", campaign: "Search — Branded Keywords", assignee: "Ava Thompson", priority: "Low", status: "To Do", due: "2026-06-12" },
    { id: 7, title: "Write holiday teaser script", campaign: "Holiday Teaser", assignee: "Ethan Wu", priority: "Low", status: "To Do", due: "2026-06-20" },
    { id: 8, title: "Segment win-back audience", campaign: "Customer Win-back", assignee: "Maya Chen", priority: "Medium", status: "Done", due: "2026-05-28" },
    { id: 9, title: "Schedule LinkedIn posts", campaign: "LinkedIn Thought Leadership", assignee: "Daniel Ross", priority: "Medium", status: "In Progress", due: "2026-06-07" },
    { id: 10, title: "Compile TechExpo lead list", campaign: "Trade Show — TechExpo", assignee: "Priya Nair", priority: "High", status: "Review", due: "2026-06-03" },
    { id: 11, title: "A/B test subject lines", campaign: "Summer Launch 2026", assignee: "Sofia Marquez", priority: "Medium", status: "To Do", due: "2026-06-09" },
    { id: 12, title: "Finalize Q3 budget request", campaign: "—", assignee: "Liam O'Brien", priority: "High", status: "In Progress", due: "2026-06-08" },
  ];

  const events = [
    { day: 2, title: "Win-back A/B test", color: "blue" },
    { day: 3, title: "TechExpo lead review", color: "amber" },
    { day: 4, title: "Webinar LP due", color: "red" },
    { day: 4, title: "Standup 9:30", color: "gray" },
    { day: 5, title: "Email copy due", color: "green" },
    { day: 6, title: "APAC creative review", color: "purple" },
    { day: 9, title: "Subject line test", color: "blue" },
    { day: 11, title: "Webinar goes live", color: "red" },
    { day: 12, title: "Tracking QA", color: "gray" },
    { day: 16, title: "Mid-month report", color: "amber" },
    { day: 18, title: "Influencer kickoff", color: "purple" },
    { day: 20, title: "Holiday script due", color: "green" },
    { day: 24, title: "Budget sync", color: "blue" },
    { day: 27, title: "Sprint retro", color: "gray" },
  ];

  const users = [
    { id: 1, name: "Maya Chen", email: "maya.chen@acme.com", role: "Admin", team: "Growth", status: "Active", lastActive: "2 min ago" },
    { id: 2, name: "Daniel Ross", email: "daniel.ross@acme.com", role: "Manager", team: "Demand Gen", status: "Active", lastActive: "18 min ago" },
    { id: 3, name: "Priya Nair", email: "priya.nair@acme.com", role: "Manager", team: "Events", status: "Active", lastActive: "1 hr ago" },
    { id: 4, name: "Liam O'Brien", email: "liam.obrien@acme.com", role: "Editor", team: "Brand", status: "Active", lastActive: "3 hr ago" },
    { id: 5, name: "Sofia Marquez", email: "sofia.marquez@acme.com", role: "Editor", team: "Lifecycle", status: "Active", lastActive: "Yesterday" },
    { id: 6, name: "Noah Kim", email: "noah.kim@acme.com", role: "Editor", team: "Social", status: "Invited", lastActive: "—" },
    { id: 7, name: "Ava Thompson", email: "ava.thompson@acme.com", role: "Viewer", team: "Analytics", status: "Active", lastActive: "5 hr ago" },
    { id: 8, name: "Ethan Wu", email: "ethan.wu@acme.com", role: "Viewer", team: "Paid Media", status: "Suspended", lastActive: "2 weeks ago" },
  ];

  const roleMatrix = {
    roles: ["Admin", "Manager", "Editor", "Viewer"],
    perms: [
      { area: "Campaigns", vals: [true, true, true, false] },
      { area: "Leads & CRM", vals: [true, true, true, false] },
      { area: "Budgets", vals: [true, true, false, false] },
      { area: "Approvals", vals: [true, true, false, false] },
      { area: "Reports & Export", vals: [true, true, true, true] },
      { area: "User Management", vals: [true, false, false, false] },
      { area: "Audit Logs", vals: [true, false, false, false] },
      { area: "Billing & Settings", vals: [true, false, false, false] },
    ]
  };

  const approvals = [
    { id: 1, item: "Brand Awareness — APAC creative", type: "Creative", requester: "Liam O'Brien", amount: 60000, submitted: "2026-05-31", stage: 2, status: "Pending", steps: ["Owner","Manager","Finance"] },
    { id: 2, item: "Holiday Teaser — $40k budget", type: "Budget", requester: "Ethan Wu", amount: 40000, submitted: "2026-05-30", stage: 1, status: "Pending", steps: ["Owner","Manager","Finance"] },
    { id: 3, item: "Influencer Collab contract", type: "Contract", requester: "Noah Kim", amount: 35000, submitted: "2026-05-29", stage: 3, status: "Approved", steps: ["Owner","Manager","Finance"] },
    { id: 4, item: "Q2 Webinar overspend +$2k", type: "Budget", requester: "Daniel Ross", amount: 2000, submitted: "2026-05-28", stage: 0, status: "Rejected", steps: ["Owner","Manager","Finance"] },
    { id: 5, item: "Free Trial Push — relaunch", type: "Campaign", requester: "Sofia Marquez", amount: 25000, submitted: "2026-05-27", stage: 2, status: "Pending", steps: ["Owner","Manager","Finance"] },
    { id: 6, item: "Search — keyword expansion", type: "Budget", requester: "Ava Thompson", amount: 8000, submitted: "2026-05-26", stage: 3, status: "Approved", steps: ["Owner","Manager","Finance"] },
  ];

  const notifications = [
    { id: 1, icon: "bi-check-circle-fill", color: "green", title: "Influencer contract approved", body: "Finance approved the $35k contract for Influencer Collab — Fitness.", time: "12 min ago", unread: true },
    { id: 2, icon: "bi-exclamation-triangle-fill", color: "amber", title: "Budget threshold reached", body: "Q2 Product Webinar has spent 84% of its allocated budget.", time: "1 hr ago", unread: true },
    { id: 3, icon: "bi-person-plus-fill", color: "blue", title: "New high-value lead", body: "Sam Okafor (Trailhead Inc) scored 90 — assigned to Liam O'Brien.", time: "2 hr ago", unread: true },
    { id: 4, icon: "bi-clock-fill", color: "red", title: "Task overdue", body: "“Compile TechExpo lead list” was due today and is still in Review.", time: "3 hr ago", unread: false },
    { id: 5, icon: "bi-chat-left-text-fill", color: "purple", title: "Comment on Summer Launch", body: "Maya Chen mentioned you on the email sequence draft.", time: "5 hr ago", unread: false },
    { id: 6, icon: "bi-graph-up", color: "green", title: "Weekly report ready", body: "Your performance report for May 25–31 is ready to view.", time: "Yesterday", unread: false },
    { id: 7, icon: "bi-x-circle-fill", color: "red", title: "Approval rejected", body: "Q2 Webinar overspend request was rejected by Finance.", time: "Yesterday", unread: false },
  ];

  const audit = [
    { id: 1, time: "2026-06-03 09:42", user: "Maya Chen", action: "Updated campaign", target: "Summer Launch 2026", type: "update", ip: "10.0.4.21" },
    { id: 2, time: "2026-06-03 09:18", user: "Daniel Ross", action: "Exported report", target: "Leads — May", type: "export", ip: "10.0.4.55" },
    { id: 3, time: "2026-06-03 08:51", user: "System", action: "Auto-paused campaign", target: "Free Trial Push", type: "system", ip: "—" },
    { id: 4, time: "2026-06-02 17:30", user: "Liam O'Brien", action: "Submitted for approval", target: "APAC creative", type: "create", ip: "10.0.4.12" },
    { id: 5, time: "2026-06-02 16:05", user: "Priya Nair", action: "Deleted lead", target: "Owen Carter", type: "delete", ip: "10.0.4.33" },
    { id: 6, time: "2026-06-02 14:22", user: "Ava Thompson", action: "Logged in", target: "—", type: "auth", ip: "10.0.4.78" },
    { id: 7, time: "2026-06-02 11:47", user: "Maya Chen", action: "Changed user role", target: "Noah Kim → Editor", type: "update", ip: "10.0.4.21" },
    { id: 8, time: "2026-06-02 10:09", user: "Finance Bot", action: "Approved budget", target: "Search keyword expansion", type: "approve", ip: "—" },
    { id: 9, time: "2026-06-01 18:33", user: "Ethan Wu", action: "Created campaign", target: "Holiday Teaser", type: "create", ip: "10.0.4.90" },
    { id: 10, time: "2026-06-01 15:12", user: "Sofia Marquez", action: "Updated budget", target: "Customer Win-back", type: "update", ip: "10.0.4.44" },
    { id: 11, time: "2026-06-01 09:05", user: "System", action: "Nightly data sync", target: "All campaigns", type: "system", ip: "—" },
    { id: 12, time: "2026-05-31 16:48", user: "Daniel Ross", action: "Rejected approval", target: "Q2 Webinar overspend", type: "delete", ip: "10.0.4.55" },
  ];

  // exposed
  window.DB = {
    campaigns, leads, contacts, budgets, tasks, events, users, roleMatrix, approvals, notifications, audit, owners,
    ac, initials,
    nextId(arr) { return Math.max(0, ...arr.map(r => r.id)) + 1; }
  };
})();
