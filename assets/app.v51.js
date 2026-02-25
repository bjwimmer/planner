const BUILD_VERSION = "v51-test";
const DEFAULT_ORIENTATION_TEXT = "Planner Orientation Layer \u2014 Implementation Blueprint v1.0\n\nThis document defines the calm, structured, orientation-first homepage layer for the existing planner system. It is an additive front-layer, not a rebuild. All existing planner pages and logic remain intact.\n\nCore Design Intent\n\nTone: Relaxed, creative, open.\nEmotional Effect: Structured stillness.\nFunction: Orientation before execution.\nRule: One continuous vertical layout. No collapsible sections above the fold.\n\nHomepage Structure (Top to Bottom)\n\n1. NORTH STAR (Locked Section)\n\nAnchoring Sentence (locked, editable only during scheduled review):\n\n\u201cI finish my life in peace \u2014 no debt left behind, no burden passed forward, living comfortably enough to create and care for myself.\u201d\n\nPractical Bullet Conditions (locked):\n\n\u2022 No consumer debt.\n\n\u2022 Housing path resolved and documented.\n\n\u2022 Home simplified and document-ready.\n\n\u2022 Income baseline stable with protected creative time.\n\n2. 90-DAY GATE (Current Season)\n\nHeader format: By [Insert Date]\n\n\u2022 Housing decision path chosen.\n\n\u2022 Debt strategy documented and active.\n\n\u2022 Minimum viable home clear established.\n\n3. THIS WEEK (Maximum 3 Commitments)\n\nOnly 1\u20133 commitments allowed. Each must have a clear 'done' definition.\n\nExample placeholders:\n\n\u2022 [Commitment 1]\n\n\u2022 [Commitment 2]\n\n\u2022 [Commitment 3]\n\n4. TODAY (One Lever Only)\n\nSingle action that advances one weekly commitment. No additional task lists visible on homepage.\n\nNavigation Rules\n\nAll deeper planner pages remain intact.\nA simple 'Home' link is added to each deeper page.\nHomepage remains the browser default start page.\nNo metrics, widgets, progress bars, or dashboards added.\n\nVisual Tone Guidelines\n\nBackground: Warm cream or soft neutral.\nText: Dark slate or charcoal (not pure black).\nAccent hierarchy:\n\u2022 Deep muted teal for North Star.\n\u2022 Warm clay/amber for 90-Day Gate.\n\u2022 Soft sage or gray-blue for Weekly.\n\u2022 Subtle highlight for Today.\nTypography: Soft serif for headings; clean sans-serif for body.\n\nGuardrails\n\n\u2022 Homepage must fit on one screen without scrolling.\n\u2022 North Star text remains locked except during scheduled review.\n\u2022 No new sections added without revisiting structure intentionally.\n\u2022 This page serves orientation, not tracking.";


/* === planner-test safeguards (auto-generated) === */
const APP_FLAVOR = "planner-test";
const DEFAULT_TEST_GIST_ID = "4364e296d9592d9953ce71ee346a2766";

function ensureTestDefaults() {
  try {
    let cfg = null;
    // Read whatever might already be stored under the test key
    const raw = localStorage.getItem("planner.sync.v1");
    if (raw) {
      try { cfg = JSON.parse(raw); } catch(e) { cfg = {}; }
    } else {
      cfg = {};
    }
    if (!cfg.gistId) cfg.gistId = DEFAULT_TEST_GIST_ID;
    // Save ONLY to the planner-test key so we never touch production config.
    localStorage.setItem("planner.sync.v1", JSON.stringify(cfg));
  } catch(e) {}
}

function injectTestRibbon(){
  try {
    if (document.getElementById("testRibbon")) return;
    const d = document.createElement("div");
    d.id = "testRibbon";
    d.textContent = "TEST MODE";
    document.body.appendChild(d);
  } catch(e) {}
}

document.addEventListener("DOMContentLoaded", () => {
  ensureTestDefaults();
  injectTestRibbon();
});
/* === end planner-test safeguards === */

console.log('Planner build', BUILD_VERSION);

// Basic HTML escape (global helper)
function escHtml(s){
  return String(s ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// Back-compat alias used in some modules
function esc(s){ return escHtml(s); }// --- Architecture lock: single source of truth for navigation ---
const NAV_ITEMS = [
  { href: "index.html", label: "Map" },
  { href: "quick-capture.html", label: "⚡ Quick Capture" },
  { href: "thread-registry.html", label: "Thread Registry" },
  { href: "strategic-life-map.html", label: "Strategic Life Map" },
  { href: "90-day-income-map.html", label: "90‑Day Income Map" },
  { href: "how-this-works.html", label: "How This Works" },
];

function ensureTopbarNav(){
  try{
    const nav = document.querySelector(".topbar .nav");
    if(!nav) return;
    // Rebuild nav consistently
    nav.innerHTML = NAV_ITEMS.map(it => `<a data-nav href="${it.href}">${escHtml(it.label)}</a>`).join("");
    // Highlight current
    const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    nav.querySelectorAll("a[data-nav]").forEach(a=>{
      const href = (a.getAttribute("href")||"").toLowerCase();
      if(href===here) a.classList.add("active");
    });
  }catch(e){}
}

// --- Self-reporting debug panel (TEST mode only) ---
const IS_TEST_MODE = false; // this build is for planner-test
window.__plannerDebug = window.__plannerDebug || {
  build: BUILD_VERSION,
  page: null,
  inits: {},
  errors: [],
  scriptSrc: [],
};

function dbgRefresh(){
  try{
    window.__plannerDebug.build = BUILD_VERSION;
    window.__plannerDebug.page = (document.body.getAttribute("data-page")||"").toLowerCase();
    window.__plannerDebug.scriptSrc = [...document.scripts].map(s=>s.src).filter(Boolean);
    const badge = document.querySelector("[data-build]");
    if(badge) badge.textContent = BUILD_VERSION;
  }catch(e){}
}

function dbgMarkInit(name){
  try{ window.__plannerDebug.inits[name] = (new Date()).toISOString(); }catch(e){}
}

function dbgAddError(err){
  try{
    const msg = typeof err === "string" ? err : (err && err.message) ? err.message : String(err);
    window.__plannerDebug.errors.push({ t: (new Date()).toISOString(), msg });
    window.__plannerDebug.errors = window.__plannerDebug.errors.slice(-10);
  }catch(e){}
}

function ensureDebugPanel(){
  try{
    if(!IS_TEST_MODE) return;
    if(document.getElementById("debugPanel")) return;
    const panel = document.createElement("div");
    panel.id = "debugPanel";
    panel.innerHTML = `
      <div class="dbg-head">
        <strong>Debug</strong>
        <button class="dbg-btn" data-dbg-toggle>▾</button>
      </div>
      <div class="dbg-body" data-dbg-body>
        <div><span class="dbg-k">Build:</span> <span data-dbg-build></span></div>
        <div><span class="dbg-k">Page:</span> <span data-dbg-page></span></div>
        <div><span class="dbg-k">JS:</span> <span data-dbg-js></span></div>
        <div><span class="dbg-k">Inits:</span> <span data-dbg-inits></span></div>
        <div><span class="dbg-k">Errors:</span> <span data-dbg-errors></span></div>
      </div>
    `;
    document.body.appendChild(panel);
    panel.querySelector("[data-dbg-toggle]").addEventListener("click", ()=>{
      const body = panel.querySelector("[data-dbg-body]");
      const isHidden = body.style.display==="none";
      body.style.display = isHidden ? "block" : "none";
      panel.querySelector("[data-dbg-toggle]").textContent = isHidden ? "▾" : "▸";
    });
  }catch(e){}
}

function dbgRenderPanel(){
  try{
    const p = document.getElementById("debugPanel");
    if(!p) return;
    p.querySelector("[data-dbg-build]").textContent = window.__plannerDebug.build || "";
    p.querySelector("[data-dbg-page]").textContent = window.__plannerDebug.page || "";
    const js = (window.__plannerDebug.scriptSrc||[]).slice(-1)[0] || "";
    p.querySelector("[data-dbg-js]").textContent = js.split("/").slice(-1)[0] || js;
    p.querySelector("[data-dbg-inits]").textContent = Object.keys(window.__plannerDebug.inits||{}).join(", ") || "(none)";
    const errs = (window.__plannerDebug.errors||[]).map(e=>e.msg).slice(-2).join(" | ");
    p.querySelector("[data-dbg-errors]").textContent = errs || "(none)";
  }catch(e){}
}

window.addEventListener("error", (ev)=>{ dbgAddError(ev.error || ev.message || "error"); dbgRenderPanel(); });
window.addEventListener("unhandledrejection", (ev)=>{ dbgAddError(ev.reason || "promise rejection"); dbgRenderPanel(); });


// Planner (Thread System) - localStorage-first, plus optional GitHub Gist sync.

const STORE_KEY = "planner-test.data.v1";
const SYNC_KEY  = "planner-test.sync.v1"; // {gistId, token, autoPull:true}
const AUTO_PULL_SESSION_KEY = "planner.autoPulled.v1";
const GIST_FILENAME = "planner-data.json";

function nowIso(){ return new Date().toISOString(); }
function uid(){ return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }

function defaultLifeMap(){
  const domains = ["Income","Financial","Home","Health","Relationships"];
  const emptyDomainsObj = ()=> Object.fromEntries(domains.map(d=>[d, []]));
  const lm = {
    version: 2,
    domains,
    defaultUrgency: "medium",
    horizons: {
      week:   { label: "This Week",   domains: emptyDomainsObj() },
      month:  { label: "This Month",  domains: emptyDomainsObj() },
      quarter:{ label: "3 Months",    domains: emptyDomainsObj() }
    }
  };

  // Preload Claude content into 3 Months, Medium urgency
  const now = nowIso();
  const mkGoal = (title, notes)=>({ id: uid(), title, notes: notes||"", urgency:"medium", createdAt: now, updatedAt: now, linkedThreadIds: [] });

  // Income
  lm.horizons.quarter.domains["Income"].push(
    mkGoal("Etsy", [
      "T-shirts for fundraising",
      "Cards",
      "Mugs",
      "New items",
      "Fundraising (Michael J. Fox / Parkinson’s Foundation)"
    ].join("\n")),
    mkGoal("Self-employment", [
      "Construction knowledge / instruction / lead-manager",
      "Craft options"
    ].join("\n"))
  );

  // Financial
  lm.horizons.quarter.domains["Financial"].push(
    mkGoal("Investigate health plan", ""),
    mkGoal("Budget & Bill Review", [
      "Cancel subscriptions",
      "Review all bills"
    ].join("\n"))
  );

  // Home
  lm.horizons.quarter.domains["Home"].push(
    mkGoal("Sell items", [
      "Tools",
      "Snowblower (get running)",
      "Hyundai (brakes)"
    ].join("\n")),
    mkGoal("Give away items", [
      "Clothing",
      "Miscellaneous kitchen items",
      "Miscellaneous household items"
    ].join("\n")),
    mkGoal("Sell house?", [
      "See clean out progress",
      "Research selling options (Full realtor vs Partial self-sell)"
    ].join("\n"))
  );

  // Health
  lm.horizons.quarter.domains["Health"].push(
    mkGoal("ADHD", [
      "Med change?",
      "Continue coaching"
    ].join("\n")),
    mkGoal("Parkinson’s", [
      "Exercise (Walking, E-biking)",
      "Handicap placard"
    ].join("\n"))
  );

  // Relationships (empty)
  return lm;
}

function ensureLifeMapSchema(st){
  if(!st.lifeMap){ st.lifeMap = defaultLifeMap(); return; }
  // migrate old schema (domains array) -> new schema
  if(st.lifeMap && Array.isArray(st.lifeMap.domains) && !st.lifeMap.horizons){
    const old = st.lifeMap.domains;
    st.lifeMap = defaultLifeMap();
    // Try to copy old notes into quarter domain titles if names roughly match
    old.forEach(d=>{
      const name = (d.name||"").toLowerCase();
      const notes = (d.notes||"").trim();
      if(!notes) return;
      const mapTo = name.includes("health") ? "Health"
        : (name.includes("home") ? "Home"
        : (name.includes("relat") ? "Relationships"
        : (name.includes("income")||name.includes("work") ? "Income"
        : (name.includes("fin") ? "Financial" : null))));
      if(mapTo){
        st.lifeMap.horizons.quarter.domains[mapTo].unshift({
          id: uid(), title: "Imported notes", notes, urgency:"medium",
          createdAt: nowIso(), updatedAt: nowIso(), linkedThreadIds:[]
        });
      }
    });
    return;
  }
  // Ensure required fields
  if(!st.lifeMap.version || st.lifeMap.version < 2){
    const fresh = defaultLifeMap();
    st.lifeMap = { ...fresh, ...st.lifeMap, version: 2 };
  }
  if(!st.lifeMap.horizons){ st.lifeMap.horizons = defaultLifeMap().horizons; }
  if(!st.lifeMap.domains){ st.lifeMap.domains = ["Income","Financial","Home","Health","Relationships"]; }
  const domains = st.lifeMap.domains;
  const ensureDomains = (h)=>{
    if(!h.domains) h.domains = {};
    domains.forEach(d=>{ if(!Array.isArray(h.domains[d])) h.domains[d]=[]; });
  };
  ensureDomains(st.lifeMap.horizons.week ||= {label:"This Week", domains:{}});
  ensureDomains(st.lifeMap.horizons.month ||= {label:"This Month", domains:{}});
  ensureDomains(st.lifeMap.horizons.quarter ||= {label:"3 Months", domains:{}});
}


function normalizeLifeMap(lm){
  // Accept older schemas and upgrade them to current lifeMap v2 with horizons {week, month, quarter}
  if(!lm || typeof lm !== 'object') return defaultLifeMap();

  // If horizons exist but use threeMonths key, normalize to quarter
  if(lm.horizons && typeof lm.horizons === 'object'){
    if(lm.horizons.threeMonths && !lm.horizons.quarter){
      lm.horizons.quarter = lm.horizons.threeMonths;
      delete lm.horizons.threeMonths;
    }
    // If it's already close to the current schema, normalize missing bits instead of resetting.
    if(!lm.domains) lm.domains = ["Income","Financial","Home","Health","Relationships"];
    // Domains can arrive as strings or objects; keep a simple string array.
    if(Array.isArray(lm.domains)){
      lm.domains = lm.domains
        .map(d => (typeof d === 'string') ? d : (d?.name || d?.title || d?.domain || ""))
        .map(s => String(s||"").trim())
        .filter(Boolean);
    }
    if(!lm.defaultUrgency) lm.defaultUrgency = "medium";

    // Ensure week/month/quarter exist and have a .domains object.
    const ensureH = (key, title) => {
      if(!lm.horizons[key] || typeof lm.horizons[key] !== 'object') lm.horizons[key] = { title, domains: {} };
      if(!lm.horizons[key].title) lm.horizons[key].title = title;
      if(!lm.horizons[key].domains || typeof lm.horizons[key].domains !== 'object') lm.horizons[key].domains = {};
    };
    ensureH('week', 'This week');
    ensureH('month', 'This month');
    ensureH('quarter', '3 months');

    // Ensure each domain key maps to an array for every horizon.
    const horizonKeys = ['week','month','quarter'];
    lm.domains.forEach(domainName=>{
      horizonKeys.forEach(hk=>{
        if(!Array.isArray(lm.horizons[hk].domains[domainName])) lm.horizons[hk].domains[domainName] = [];
      });
    });

    return lm;
  }

  // If domains are stored directly as an object map {Domain:[goals...]}
  if(lm.domains && !Array.isArray(lm.domains) && typeof lm.domains === 'object' && !lm.horizons){
    const fresh = defaultLifeMap();
    fresh.horizons.quarter.domains = Object.assign(fresh.horizons.quarter.domains, lm.domains);
    return fresh;
  }

  // If there's an array of domains with goals (old Claude-ish structure)
  if(Array.isArray(lm.domains) && !lm.horizons){
    const fresh = defaultLifeMap();
    // Try to import simple [{name:'Health', goals:[{title, notes:[..]}]}]
    try{
      lm.domains.forEach(d=>{
        const name = d.name || d.title || d.domain;
        if(!name) return;
        const normName = String(name).trim();
        const list = d.goals || d.items || [];
        if(!Array.isArray(list)) return;
        list.forEach(g=>{
          const title = g.title || g.name;
          if(!title) return;
          const notesArr = g.notes || g.sub || g.items || [];
          const notes = Array.isArray(notesArr) ? notesArr.join("\n") : (g.notesText || "");
          const now = nowIso();
          fresh.horizons.quarter.domains[normName] = fresh.horizons.quarter.domains[normName] || [];
          fresh.horizons.quarter.domains[normName].push({ id: uid(), title: String(title), notes: notes||"", urgency: (g.urgency||"medium"), createdAt: now, updatedAt: now, linkedThreadIds: [] });
        });
      });
      return fresh;
    }catch(e){
      return fresh;
    }
  }

  // Fallback
  return defaultLifeMap();
}

function defaultState(){
  return {
    meta: { createdAt: nowIso(), updatedAt: nowIso(), title: "Planner" },
    inbox: [], // {id, text, createdAt, status:'open'|'archived'}
    threads: [], // {id,title,status,domain,nextAction,notes,createdAt,updatedAt}
    weekly: { slot1: null, slot2: null, weekOf: null }, // weekOf ISO date (Monday)
    lifeMap: defaultLifeMap(),
    incomeMap: { startDate: null } // YYYY-MM-DD
  };
}

function normalizeStatus(s){
  const v = (s ?? "").toString().trim().toLowerCase();
  if(!v) return "active";
  if(v === "archive" || v === "archived" || v === "done" || v === "completed" || v === "complete") return "archived";
  if(v.includes("archiv")) return "archived";
  if(v.includes("done") || v.includes("complete")) return "archived";
  // keep legacy labels as-is, but treat them as active in filtering
  return s;
}
function normalizeThread(t){
  if(!t || typeof t !== "object") return null;
  // normalize id
  if(t.id === undefined || t.id === null) t.id = Date.now();
  // normalize title/name
  if(!t.title && t.name) t.title = t.name;
  if(!t.name && t.title) t.name = t.title;
  // normalize timestamps
  if(!t.updatedAt && t.lastTouched) t.updatedAt = t.lastTouched;
  if(!t.lastTouched && t.updatedAt) t.lastTouched = t.updatedAt;
  // normalize status
  t.status = normalizeStatus(t.status);
  return t;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return defaultState();
    const st = JSON.parse(raw);

    // minimal migration safety
    if(!st.meta) st.meta = { createdAt: nowIso(), updatedAt: nowIso(), title:"Planner" };
    if(!st.inbox) st.inbox = [];
    if(!st.threads) st.threads = [];
    if(!st.weekly) st.weekly = { slot1:null, slot2:null, weekOf:null };
    st.lifeMap = normalizeLifeMap(st.lifeMap);
    if(!st.incomeMap) st.incomeMap = { startDate:null };

    return st;
  }catch(e){
    console.warn("State load failed, resetting", e);
    return defaultState();
  }
}

function saveState(st){
  st.meta.updatedAt = nowIso();
  localStorage.setItem(STORE_KEY, JSON.stringify(st));
}

function setActiveNav(){
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach(a=>{
    const href = (a.getAttribute("href") || "").toLowerCase();
    if(href.endsWith(path)) a.classList.add("active");
  });
}

function renderFooter(st){
  const el = document.querySelector("[data-footer]");
  if(!el) return;
  el.innerHTML = `
    <div>Stored locally in your browser · <span class="mono">${STORE_KEY}</span></div>
    <div>Last saved: <span class="mono">${new Date(st.meta.updatedAt).toLocaleString()}</span></div>
  `;
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}

function escapeAttr(s){
  return escapeHtml(s);
}

function cssEscape(s){
  const v = String(s ?? "");
  return (window.CSS && CSS.escape) ? CSS.escape(v) : v.replace(/[^a-zA-Z0-9_\-]/g, "\\$&");
}

function mondayOf(date){
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function ymd(d){
  const pad=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function weekNumberFromStart(startYmd){
  if(!startYmd) return null;
  const start = new Date(startYmd + "T00:00:00");
  const today = new Date();
  const ms = today - start;
  const weeks = Math.floor(ms / (1000*60*60*24*7)) + 1;
  return weeks < 1 ? 1 : weeks;
}

// --- Export / Import ---
function exportJson(){
  const st = loadState();
  ensureLifeMapSchema(st);
  saveState(st);
  const blob = new Blob([JSON.stringify(st,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "planner-backup.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJsonFromFile(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const parsed = JSON.parse(reader.result);
        saveState(parsed);
        resolve(parsed);
      }catch(e){ reject(e); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// --- Sync config ---
function loadSync(){
  try{ return JSON.parse(localStorage.getItem(SYNC_KEY) || "null"); }
  catch{ return null; }
}
function saveSync(cfg){
  localStorage.setItem(SYNC_KEY, JSON.stringify(cfg));
}
function clearSync(){
  localStorage.removeItem(SYNC_KEY);
  sessionStorage.removeItem(AUTO_PULL_SESSION_KEY);
}
function isConnected(){
  const cfg = loadSync();
  return !!(cfg?.gistId && cfg?.token);
}

function parseIso(s){
  const t = Date.parse(s || "");
  return Number.isFinite(t) ? t : 0;
}

async function githubFetchGist(gistId, token){
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github+json"
    }
  });
  if(!res.ok) throw new Error(`Pull failed: ${res.status}`);
  return await res.json();
}

function findPlannerFile(gistJson){
  const files = Object.values(gistJson.files || {});
  if(!files.length) return null;
  // Prefer exact filename match to avoid collisions with older gists/files
  return files.find(f => (f.filename || "") === GIST_FILENAME) || null;
}

async function githubPull({force=false} = {}){
  const cfg = loadSync();
  if(!cfg?.gistId || !cfg?.token) throw new Error("Not connected. Add Gist ID and token in Sync.");

  const gist = await githubFetchGist(cfg.gistId, cfg.token);
  const file = findPlannerFile(gist);
  if(!file?.content) throw new Error(`${GIST_FILENAME} not found in this Gist.`);

  const remoteState = JSON.parse(file.content);
  const localState = loadState();
  const remoteUpdated = parseIso(remoteState?.meta?.updatedAt);
  const localUpdated  = parseIso(localState?.meta?.updatedAt);

  // Safety: only overwrite if remote is newer unless forced
  if(force || remoteUpdated >= localUpdated){
    saveState(remoteState);
    return {applied:true, reason: force ? "forced" : "remote-newer-or-equal", remoteUpdated, localUpdated};
  }
  return {applied:false, reason:"local-newer", remoteUpdated, localUpdated};
}

async function githubPush(){
  const cfg = loadSync();
  if(!cfg?.gistId || !cfg?.token) throw new Error("Not connected. Add Gist ID and token in Sync.");

  const st = loadState();
  ensureLifeMapSchema(st);
  saveState(st);

  const res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `token ${cfg.token}`,
      "Accept": "application/vnd.github+json"
    },
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(st, null, 2) }
      }
    })
  });

  if(!res.ok) throw new Error(`Push failed: ${res.status}`);
  return true;
}

function setSyncIndicator(){
  const el = document.querySelector("[data-sync-indicator]");
  if(!el) return;
  if(isConnected()){
    el.textContent = "● Connected";
    el.style.color = "var(--good)";
  } else {
    el.textContent = "● Not connected";
    el.style.color = "var(--muted)";
  }
}

// --- Modal wiring ---
function openModal(){
  const back = document.getElementById("syncModalBackdrop");
  if(back) back.style.display = "flex";
}
function closeModal(){
  const back = document.getElementById("syncModalBackdrop");
  if(back) back.style.display = "none";
}
function wireModal(){
  const openBtn = document.querySelector("[data-open-sync]");
  if(openBtn) openBtn.addEventListener("click", openModal);
  const closeBtns = document.querySelectorAll("[data-close-sync]");
  closeBtns.forEach(b=>b.addEventListener("click", closeModal));

  const cfg = loadSync() || { gistId:"", token:"", autoPull:true };
  const gistIdEl = document.getElementById("syncGistId");
  const tokenEl  = document.getElementById("syncToken");
  const autoEl   = document.getElementById("syncAutoPull");
  const statusEl = document.getElementById("syncStatus");
  if(gistIdEl) gistIdEl.value = cfg.gistId || "";
  if(tokenEl) tokenEl.value = cfg.token || "";
  if(autoEl) autoEl.checked = cfg.autoPull !== false;

  const saveBtn = document.getElementById("syncSave");
  const pullBtn = document.getElementById("syncPull");
  const forceBtn= document.getElementById("syncForcePull");
  const pushBtn = document.getElementById("syncPush");
  const clearBtn= document.getElementById("syncClear");

  const setStatus = (msg)=>{ if(statusEl) statusEl.textContent = msg; };

  if(saveBtn) saveBtn.onclick = ()=>{
    const newCfg = {
      gistId: (gistIdEl?.value || "").trim(),
      token:  (tokenEl?.value || "").trim(),
      autoPull: !!(autoEl?.checked)
    };
    saveSync(newCfg);
    setSyncIndicator();
    setStatus("Saved.");
  };

  if(pullBtn) pullBtn.onclick = async ()=>{
    setStatus("Pulling…");
    try{
      const r = await githubPull({force:false});
      setStatus(r.applied ? "Pulled (applied remote state)." : "Pulled (kept local because local is newer).");
      setTimeout(()=>location.reload(), 250);
    }catch(e){ setStatus(e.message); }
  };

  if(forceBtn) forceBtn.onclick = async ()=>{
    if(!confirm("Force Pull will overwrite local data with the Gist data. Continue?")) return;
    setStatus("Force pulling…");
    try{
      await githubPull({force:true});
      setStatus("Force pull complete. Reloading…");
      setTimeout(()=>location.reload(), 250);
    }catch(e){ setStatus(e.message); }
  };

  if(pushBtn) pushBtn.onclick = async ()=>{
    setStatus("Pushing…");
    try{
      await githubPush();
      setStatus("Pushed to Gist.");
    }catch(e){ setStatus(e.message); }
  };

  if(clearBtn) clearBtn.onclick = ()=>{
    if(!confirm("Clear sync settings on this device? (Does not delete the gist.)")) return;
    clearSync();
    setSyncIndicator();
    setStatus("Cleared sync settings.");
  };
}

// --- Auto-pull (C mode): auto-pull on load, manual push ---
async function autoPullIfEnabled(){
  const cfg = loadSync();
  if(!(cfg?.gistId && cfg?.token && cfg.autoPull !== false)) return;

  // Only once per browser tab/session to avoid loops
  if(sessionStorage.getItem(AUTO_PULL_SESSION_KEY) === "1") return;
  sessionStorage.setItem(AUTO_PULL_SESSION_KEY, "1");

  try{
    const r = await githubPull({force:false});
    if(r.applied){
      setTimeout(()=>location.reload(), 200);
    }
  }catch(e){
    console.warn("Auto-pull failed:", e);
  }
}

// --- Page Initializers ---
function initCommon(){
  const st = loadState();
  ensureLifeMapSchema(st);
  saveState(st);
  setActiveNav();
  renderFooter(st);

  // export/import
  const expBtn = document.querySelector("[data-export]");
  if(expBtn) expBtn.addEventListener("click", exportJson);

  const impInput = document.querySelector("[data-import]");
  if(impInput){
    impInput.addEventListener("change", async (e)=>{
      const file = e.target.files?.[0];
      if(!file) return;
      try{
        await importJsonFromFile(file);
        location.reload();
      }catch(err){
        alert("Import failed. Make sure it's a valid backup JSON.");
        console.error(err);
      }
    });
  }

  setSyncIndicator();
  wireModal();
  autoPullIfEnabled();

  return st;
}

// --- Quick Capture ---
function initQuickCapture(){
  dbgMarkInit('common');
  const st = initCommon();

  (function(){
    const styleId = "threadRegistryFocusGlow";
    if(document.getElementById(styleId)) return;
    const s = document.createElement("style");
    s.id = styleId;
    s.textContent = `.focus-glow { outline: 3px solid rgba(255, 180, 0, .55); border-radius: 14px; }`;
    document.head.appendChild(s);
  })();

  const form = document.querySelector("#captureForm");
  const input = document.querySelector("#captureText");
  const list = document.querySelector("#inboxList");
  const clearBtn = document.querySelector("#archiveAll");

  function render(){
    const openItems = st.inbox.filter(i=>i.status!=="archived").sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    list.innerHTML = openItems.length ? openItems.map(i=>`
      <div class="item">
        <strong>${escapeHtml(i.text)}</strong>
        <div class="meta">
          <span class="pill">Inbox</span>
          <span class="mono">${new Date(i.createdAt).toLocaleString()}</span>
          <button class="btn" data-arch="${i.id}">Archive</button>
        </div>
      </div>
    `).join("") : `<p class="small">Inbox is empty. Nice.</p>`;

    list.querySelectorAll("[data-arch]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-arch");
        const it = st.inbox.find(x=>String(x.id)===String(id));
        if(it){ it.status="archived"; saveState(st); renderFooter(st); render(); }
      });
    });
  }

  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    st.inbox.push({ id: uid(), text, createdAt: nowIso(), status:"open" });
    input.value="";
    saveState(st); renderFooter(st); render();
  });

  clearBtn.addEventListener("click", ()=>{
    st.inbox.forEach(i=>i.status="archived");
    saveState(st); renderFooter(st); render();
  });
  // Show archived toggle
  const archToggle = document.querySelector('[data-toggle-archived]');
  if(archToggle){
    const st0 = loadState();
    archToggle.checked = !!(st0.ui && st0.ui.showArchived);
    archToggle.addEventListener('change', ()=>{
      const st = loadState();
      st.ui = st.ui || {};
      st.ui.showArchived = archToggle.checked;
      saveState(st);
      render();
    });
  }


  render();
}

// --- Thread Registry ---
// --- Domain auto-color mapping (UI only) ---
function domainClass(domainRaw){
  const d = (domainRaw || "").trim().toLowerCase();
  if(!d) return "domain-other";
  if(d.includes("health")) return "domain-health";
  if(d.includes("home") || d.includes("house")) return "domain-home";
  if(d.includes("work") || d.includes("income") || d.includes("money") || d.includes("job") || d.includes("career")) return "domain-work-income";
  if(d.includes("relationship") || d.includes("family") || d.includes("social")) return "domain-relationships";
  if(d.includes("creative") || d.includes("meaning") || d.includes("writing") || d.includes("art")) return "domain-creative-meaning";
  return "domain-other";
}

function initThreadRegistry(){
  dbgMarkInit('common');
  const st = initCommon();

  const inboxEl = document.querySelector("#registryInbox");
  const threadsEl = document.querySelector("#threadsList");
  const form = document.querySelector("#newThreadForm");

  const focusThreadId = new URLSearchParams(location.search).get("focusThread");

  // --- Add thread UX: disable submit until title has text ---
  const addBtn = form ? form.querySelector('button[type="submit"]') : null;
  const titleInput = document.querySelector("#tTitle");
  function updateAddBtn(){
    if(!addBtn || !titleInput) return;
    const ok = (titleInput.value || "").trim().length > 0;
    addBtn.disabled = !ok;
    addBtn.style.opacity = ok ? "1" : ".55";
    addBtn.style.cursor = ok ? "pointer" : "not-allowed";
  }
  if(titleInput){
    titleInput.addEventListener("input", updateAddBtn);
    updateAddBtn();
  }

  // Domain dropdown: pull from Life Map domains so it stays consistent
  const domainSelect = document.querySelector("#tDomain");
  if(domainSelect){
    const domains = (st.lifeMap && Array.isArray(st.lifeMap.domains) && st.lifeMap.domains.length) ? st.lifeMap.domains : DEFAULT_DOMAINS;
    domainSelect.innerHTML = `<option value="">— none —</option>` + domains.map(d => `<option value="${escapeAttr(d)}">${escapeHtml(d)}</option>`).join("");
  }


  const slot1Sel = document.querySelector("#slot1");
  const slot2Sel = document.querySelector("#slot2");
  const weekOfEl = document.querySelector("#weekOf");

  function ensureWeekOf(){
    const mon = mondayOf(new Date());
    const monY = ymd(mon);
    if(st.weekly.weekOf !== monY){
      st.weekly.weekOf = monY;
      saveState(st);
    }
    weekOfEl.textContent = mon.toLocaleDateString(undefined, {weekday:"long", year:"numeric", month:"short", day:"numeric"});
  }

  function threadOptionsHtml(selectedId){
    const opts = [`<option value="">— none —</option>`].concat(
      st.threads
        .filter(t=>t.status!=="archived")
        .sort((a,b)=>a.title.localeCompare(b.title))
        .map(t=>`<option value="${t.id}" ${String(t.id)===String(selectedId)?"selected":""}>${escapeHtml(t.title)}</option>`)
    );
    return opts.join("");
  }

  function renderWeeklySlots(){
    ensureWeekOf();
    slot1Sel.innerHTML = threadOptionsHtml(st.weekly.slot1);
    slot2Sel.innerHTML = threadOptionsHtml(st.weekly.slot2);

    slot1Sel.onchange = ()=>{ st.weekly.slot1 = slot1Sel.value || null; saveState(st); renderFooter(st); render(); };
    slot2Sel.onchange = ()=>{ st.weekly.slot2 = slot2Sel.value || null; saveState(st); renderFooter(st); render(); };
  }

  function renderInbox(){
    const openItems = st.inbox.filter(i=>i.status!=="archived").sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    inboxEl.innerHTML = openItems.length ? openItems.map(i=>`
      <div class="item">
        <strong>${escapeHtml(i.text)}</strong>
        <div class="meta">
          <span class="pill">Inbox</span>
          <span class="mono">${new Date(i.createdAt).toLocaleString()}</span>
          <button class="btn good" data-mkthread="${i.id}">Make thread</button>
          <button class="btn" data-append="${i.id}">Append to…</button>
          <button class="btn" data-arch="${i.id}">Archive</button>
        </div>
      </div>
    `).join("") : `<p class="small">Inbox is empty.</p>`;

    inboxEl.querySelectorAll("[data-arch]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-arch");
        const it = st.inbox.find(x=>String(x.id)===String(id));
        if(it){ it.status="archived"; saveState(st); renderFooter(st); render(); }
      });
    });

    inboxEl.querySelectorAll("[data-mkthread]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-mkthread");
        const it = st.inbox.find(x=>String(x.id)===String(id));
        if(!it) return;
        const title = it.text.slice(0,80);
        const th = { id: uid(), title, status:"active", domain:"", nextAction:"", notes: it.text, createdAt: nowIso(), updatedAt: nowIso() };
        st.threads.push(th);
        it.status="archived";
        saveState(st); renderFooter(st); render();
      });
    });

    inboxEl.querySelectorAll("[data-append]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-append");
        const it = st.inbox.find(x=>String(x.id)===String(id));
        if(!it) return;
        const pick = prompt("Paste the exact thread title to append to (or cancel):");
        if(!pick) return;
        const th = st.threads.find(t=>t.title.toLowerCase()===pick.toLowerCase() && t.status!=="archived");
        if(!th){ alert("No matching thread found."); return; }
        th.notes = (th.notes ? th.notes + "\n\n" : "") + it.text;
        th.updatedAt = nowIso();
        it.status="archived";
        saveState(st); renderFooter(st); render();
      });
    });
  }

  function renderThreads(){
    function threadBacklinks(threadId){
      const links = [];
      const lm = st.lifeMap;
      if(!lm || !lm.horizons) return links;
      for(const [hKey,h] of Object.entries(lm.horizons)){
        for(const domain of (lm.domains||[])){
          const list = h.domains?.[domain] || [];
          for(const g of list){
            const ids = Array.isArray(g.linkedThreadIds) ? g.linkedThreadIds : (g.threadId?[g.threadId]:[]);
            if(ids.map(String).includes(String(threadId))){
              links.push({ hKey, hLabel: h.label, domain, goalId: g.id, goalTitle: g.title });
            }
          }
        }
      }
      return links;
    }


    const activeThreads = st.threads
      .filter(t=>t.status!=="archived")
      .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));

    threadsEl.innerHTML = activeThreads.length ? activeThreads.map(t=>{
      const inSlot = (String(st.weekly.slot1)===String(t.id) || String(st.weekly.slot2)===String(t.id));
      const pill = inSlot ? `<span class="pill good">Active this week</span>` : `<span class="pill">Backlog</span>`;
      return `
        <div class="item ${domainClass(t.domain)}" data-thread-card="${t.id}" id="thread-${t.id}">
          <div class="domain-strip"></div>
          <strong>${escapeHtml(t.title)}</strong>
          <div class="meta">
            ${pill}
            ${t.domain ? `<span class="pill">${escapeHtml(t.domain)}</span>` : ``}
            <span class="mono">Updated: ${new Date(t.updatedAt).toLocaleString()}</span>
          </div>
          ${(() => { const links = threadBacklinks(t.id); if(!links.length) return ``; const items = links.map(l=>`<a href="strategic-life-map.html?focusGoal=${encodeURIComponent(l.goalId)}" data-jump-goal="${escapeAttr(l.goalId)}" class="small" style="margin-right:10px">Linked: ${escapeHtml(l.domain)} → ${escapeHtml(l.goalTitle)} (${escapeHtml(l.hLabel)})</a>`).join(""); return `<div class="meta" style="margin-top:6px; flex-wrap:wrap">${items}</div>`; })()}

          <div class="grid" style="margin-top:10px">
            <div>
              <label>Next micro-action (5–20 min)</label>
              <input value="${escapeHtml(t.nextAction || "")}" data-next="${t.id}" placeholder="Example: Open file and write 5 bullets" />
            </div>
            <div>
              <label>Status</label>
              <select data-status="${t.id}">
                <option value="active" ${t.status==="active"?"selected":""}>active</option>
                <option value="paused" ${t.status==="paused"?"selected":""}>paused</option>
                <option value="done" ${t.status==="done"?"selected":""}>done</option>
                <option value="archived" ${t.status==='archived'?'selected':''}>archived</option>
              </select>
            </div>
          </div>

          <label style="margin-top:10px">Notes</label>
          <textarea data-notes="${t.id}" placeholder="Context, constraints, next thoughts…">${escapeHtml(t.notes || "")}</textarea>

          <div class="row" style="margin-top:10px">
            <button class="btn primary" data-save="${t.id}">Save</button>
            <button class="btn" data-focus="${t.id}">Focus this week</button>
            <button class="btn warn" data-copy="${t.id}">Copy micro-action</button>
            <button class="btn danger" data-delete="${t.id}">Delete</button>
          </div>
        </div>
      `;
    }).join("") : `<p class="small">No threads yet. Create one below, or process the inbox.</p>`;

    
    // Focus a specific thread if requested via URL (thread-registry.html?focusThread=ID)
    if(focusThreadId){
      const el = threadsEl.querySelector(`[data-thread-card="${cssEscape(focusThreadId)}"]`);
      if(el){
        el.scrollIntoView({behavior:"smooth", block:"center"});
        el.classList.add("focus-glow");
        setTimeout(()=>el.classList.remove("focus-glow"), 1800);
      }
    }

threadsEl.querySelectorAll("[data-save]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-save");
        const th = st.threads.find(x=>String(x.id)===String(id));
        if(!th) return;

        const next = document.querySelector(`[data-next="${id}"]`)?.value ?? "";
        const notes = document.querySelector(`[data-notes="${id}"]`)?.value ?? "";
        const status = document.querySelector(`[data-status="${id}"]`)?.value ?? "active";

        th.nextAction = next.trim();
        th.notes = notes.trim();
        th.status = status;
        th.updatedAt = nowIso();

        if(status==="archived"){
          if(String(st.weekly.slot1)===String(id)) st.weekly.slot1=null;
          if(String(st.weekly.slot2)===String(id)) st.weekly.slot2=null;
        }

        saveState(st); renderFooter(st); render();
      });
    });

    threadsEl.querySelectorAll("[data-focus]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-focus");
        if(!st.weekly.slot1) st.weekly.slot1=id;
        else if(!st.weekly.slot2) st.weekly.slot2=id;
        else st.weekly.slot2=id;
        saveState(st); renderFooter(st); render();
      });
    });

    threadsEl.querySelectorAll("[data-copy]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const id = btn.getAttribute("data-copy");
        const th = st.threads.find(x=>String(x.id)===String(id));
        if(!th) return;
        try{
          await navigator.clipboard.writeText(th.nextAction || "");
          alert("Micro-action copied.");
        }catch{
          alert("Couldn’t access clipboard in this browser.");
        }
      });
    });

      threadsEl.querySelectorAll("[data-delete]").forEach(btn=>{
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-delete");
            const th = st.threads.find(x=>String(x.id)===String(id));
          if(!th) return;
          const ok = confirm(`Delete thread "${th.title || th.name || "this thread"}"?\n\nThis cannot be undone.`);
          if(!ok) return;
          st.threads = st.threads.filter(x=>String(x.id)!==String(id));
          // remove from weekly slots if present
          if(st.weekly && st.weekly.slot1===id) st.weekly.slot1=null;
          if(st.weekly && st.weekly.slot2===id) st.weekly.slot2=null;
          saveState(st);
          render();
        });
      });
  }

  function render(){
    renderWeeklySlots();
    renderInbox();
    renderThreads();
  }

  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const title = document.querySelector("#tTitle").value.trim();
    const domain = document.querySelector("#tDomain").value.trim();
    const nextAction = document.querySelector("#tNext").value.trim();
    if(!title) return;

    st.threads.push({
      id: uid(),
      title,
      status:"active",
      domain,
      nextAction,
      notes:"",
      createdAt: nowIso(),
      updatedAt: nowIso()
    });

    form.reset();
    saveState(st); renderFooter(st); render();
  });

  render();
}

// --- Strategic Life Map ---
function initLifeMap(){
  dbgMarkInit('common');
  const st = initCommon();

  const root = document.querySelector("#lifeMapRoot");
  if(!root) return;

  const focusGoalId = new URLSearchParams(location.search).get("focusGoal");
  let focusGoalDone = false;

  // Visual hierarchy: make nested goal stripes lighter than domain stripes (all domains).
  (function(){
    const styleId = "lifeMapStripeOpacity";
    if(document.getElementById(styleId)) return;
    const s = document.createElement("style");
    s.id = styleId;
    s.textContent = `
      /* Life Map: domain blocks (structure) vs goals (action) */
      #lifeMapRoot .domain-block > .domain-strip { opacity: 1 !important; }
      #lifeMapRoot .goal > .domain-strip { opacity: 0.45 !important; }
    `;
    document.head.appendChild(s);
  })();

  const horizons = ["week","month","quarter"];
  const domains = st.lifeMap.domains;

  function threadLinksHtml(g){
    const ids = Array.isArray(g.linkedThreadIds) ? g.linkedThreadIds : [];
    if(!ids.length) return '';
    const threads = ids.map(id => st.threads.find(t => String(t.id)===String(id))).filter(Boolean);
    if(!threads.length) return '';
    const pills = threads.map(t=>`<button class="pill" type="button" data-open-thread="${escapeAttr(t.id)}" title="Open in Thread Registry">🧵 ${escapeHtml(t.title)}</button>`).join(" ");
    return `<div class="meta" style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap">${pills}</div>`;
  }

  function attachThreadPickerHtml(g){
    const ids = new Set(Array.isArray(g.linkedThreadIds) ? g.linkedThreadIds.map(String) : []);
    const options = st.threads
      .filter(t=>t.status!=="archived")
      .filter(t=>!ids.has(String(t.id)))
      .map(t=>`<option value="${escapeAttr(t.id)}">${escapeHtml(t.title)}</option>`)
      .join("");
    if(!options) return '';
    return `
      <div style="margin-top:8px">
        <label class="small">Attach existing thread</label>
        <div class="row" style="gap:8px">
          <select data-attach-thread-select="${escapeAttr(g.id)}">${options}</select>
          <button class="btn" type="button" data-attach-thread="${escapeAttr(g.id)}">Attach</button>
        </div>
      </div>
    `;
  }


  function goalRow(hKey, domain, g){
    const dClass = domainClass(domain);
    const urgency = g.urgency || st.lifeMap.defaultUrgency || "medium";
    const notesLines = (g.notes||"").split("\n").filter(x=>x.trim());
    const mini = notesLines.slice(0,3).map(x=>`<li>${escapeHtml(x)}</li>`).join("");
    const more = notesLines.length>3 ? `<div class="small">+${notesLines.length-3} more</div>` : "";
    const leftBtn = (hKey!=="week") ? `<button class="btn" data-promote="${g.id}" data-h="${hKey}" data-d="${escapeAttr(domain)}">⬅</button>` : `<span></span>`;
    const rightBtn = (hKey!=="quarter") ? `<button class="btn" data-demote="${g.id}" data-h="${hKey}" data-d="${escapeAttr(domain)}">➡</button>` : `<span></span>`;
    return `
      <div class="goal ${dClass}" data-goal-card="${g.id}">
        <div class="domain-strip"></div>
        <div class="goal-head">
          <div>
            <strong>${escapeHtml(g.title||"")}</strong>
            <div class="meta">
              <!-- Urgency is edited via the dropdown below; keep the header clean to reduce visual noise. -->
              <span class="pill">${escapeHtml(domain)}</span>
              ${threadLinksHtml(g)}
            </div>
          </div>
          <div class="row" style="justify-content:flex-end; gap:8px">
            ${leftBtn}
            ${rightBtn}
          </div>
        </div>

        <div class="row" style="gap:10px; align-items:flex-start">
          <div style="flex:1 1 auto">
            <label>Notes / sub-items</label>
            <textarea data-notes="${g.id}" placeholder="One per line...">${escapeHtml(g.notes||"")}</textarea>
          </div>
          <div style="min-width:180px">
            <label>Urgency</label>
            <select data-urgency="${g.id}">
              <option value="low" ${urgency==="low"?"selected":""}>Low</option>
              <option value="medium" ${urgency==="medium"?"selected":""}>Medium</option>
              <option value="high" ${urgency==="high"?"selected":""}>High</option>
            </select>

            <div style="height:10px"></div>
            <button class="btn primary" data-save-goal="${g.id}" data-h="${hKey}" data-d="${escapeAttr(domain)}">Save</button>
            <div style="height:8px"></div>
            <button class="btn good" data-thread-from-goal="${g.id}" data-h="${hKey}" data-d="${escapeAttr(domain)}">🧵 Create Thread</button>
            ${attachThreadPickerHtml(g)}
            <div style="height:8px"></div>
            <button class="btn bad" data-delete-goal="${g.id}" data-h="${hKey}" data-d="${escapeAttr(domain)}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  function render(){
    root.innerHTML = `
      <div class="horizon-grid">
        ${horizons.map(hKey=>{
          const h = st.lifeMap.horizons[hKey];
          return `
            <div class="hcol">
              <div class="hcol-head">
                <h2>${escapeHtml(h.label)}</h2>
                <div class="kicker">Domains stay constant. Promote goals forward as they become urgent.</div>
              </div>

              ${domains.map(domain=>{
                const dClass = domainClass(domain);
                const list = h.domains[domain] || [];
                return `
                  <div class="domain-block ${dClass}">
                    <div class="domain-strip"></div>
                    <div class="domain-head">
                      <div>
                        <strong>${escapeHtml(domain)}</strong>
                        <span class="small">${list.length} goal${list.length===1?"":"s"}</span>
                      </div>
                      <div class="row" style="gap:8px; justify-content:flex-end">
                        <input class="mini-input" data-new-title="${hKey}::${escapeAttr(domain)}" placeholder="New goal title…">
                        <button class="btn primary" data-add-goal="${hKey}" data-d="${escapeAttr(domain)}">Add</button>
                      </div>
                    </div>

                    <div class="goal-list">
                      ${list.map(g=>goalRow(hKey, domain, g)).join("") || `<div class="small" style="padding:10px 0">No goals yet.</div>`}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          `;
        }).join("")}
      </div>
    `;

    // Wire add goal
    root.querySelectorAll("[data-add-goal]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const hKey = btn.getAttribute("data-add-goal");
        const domain = btn.getAttribute("data-d");
        const key = `${hKey}::${domain}`;
        const inp = root.querySelector(`[data-new-title="${cssEscape(key)}"]`);
        const title = (inp?.value||"").trim();
        if(!title){ alert("Type a goal title first."); inp?.focus?.(); return; }
        const now = nowIso();
        st.lifeMap.horizons[hKey].domains[domain].unshift({
          id: uid(), title, notes:"", urgency: st.lifeMap.defaultUrgency || "medium",
          createdAt: now, updatedAt: now, linkedThreadIds:[]
        });
        inp.value="";
        saveState(st); renderFooter(st); render();
      });
    });

    // Promote / demote
    root.querySelectorAll("[data-promote]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-promote");
        const hKey = btn.getAttribute("data-h");
        const domain = btn.getAttribute("data-d");
        moveGoal(id, hKey, domain, "promote");
      });
    });
    root.querySelectorAll("[data-demote]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-demote");
        const hKey = btn.getAttribute("data-h");
        const domain = btn.getAttribute("data-d");
        moveGoal(id, hKey, domain, "demote");
      });
    });

    // Save / delete / thread
    root.querySelectorAll("[data-save-goal]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-save-goal");
        const hKey = btn.getAttribute("data-h");
        const domain = btn.getAttribute("data-d");
        const g = findGoal(hKey, domain, id);
        if(!g) return;
        const notes = root.querySelector(`[data-notes="${cssEscape(id)}"]`)?.value ?? "";
        const urg = root.querySelector(`[data-urgency="${cssEscape(id)}"]`)?.value ?? "medium";
        g.notes = notes.trim();
        g.urgency = urg;
        g.updatedAt = nowIso();
        // Re-render so the UI immediately reflects updated urgency/notes.
        saveState(st); renderFooter(st); render();
      });
    });

    root.querySelectorAll("[data-delete-goal]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-delete-goal");
        const hKey = btn.getAttribute("data-h");
        const domain = btn.getAttribute("data-d");
        if(!confirm("Delete this goal?")) return;
        const list = st.lifeMap.horizons[hKey].domains[domain];
        const idx = list.findIndex(x=>String(x.id)===String(id));
        if(idx>=0){ list.splice(idx,1); saveState(st); renderFooter(st); render(); }
      });
    });

    root.querySelectorAll("[data-thread-from-goal]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-thread-from-goal");
        const hKey = btn.getAttribute("data-h");
        const domain = btn.getAttribute("data-d");
        const g = findGoal(hKey, domain, id);
        if(!g) return;

        const now = nowIso();
        const nextAction = firstLine(g.notes) || "First step: [describe 5–20 minute action]";
        const thread = { id: Date.now(), title: g.title, status: "Not started - ready to begin", domain, nextAction, notes: `Linked from Life Map (${st.lifeMap.horizons[hKey].label}).

${g.notes||""}`.trim(), createdAt: now, updatedAt: now };
        st.threads.unshift(thread);
        g.linkedThreadIds = Array.isArray(g.linkedThreadIds) ? g.linkedThreadIds : [];
        g.linkedThreadIds.unshift(thread.id);
        g.updatedAt = now;
        saveState(st); renderFooter(st); render();
        alert("Thread created. Go to Thread Registry to work it.");
      });
    // Open a linked thread in Thread Registry
    root.querySelectorAll("[data-open-thread]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const tid = btn.getAttribute("data-open-thread");
        if(!tid) return;
        location.href = `thread-registry.html?focusThread=${encodeURIComponent(tid)}`;
      });
    });

    // Attach an existing thread to this goal (supports multiple threads per goal)
    root.querySelectorAll("[data-attach-thread]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const goalId = btn.getAttribute("data-attach-thread");
        const sel = root.querySelector(`[data-attach-thread-select="${cssEscape(goalId)}"]`);
        const tid = sel ? sel.value : "";
        if(!tid) return;
        // Find goal by searching all horizons/domains
        let g = null;
        for(const hk of horizons){
          for(const d of domains){
            g = findGoal(hk, d, goalId);
            if(g) break;
          }
          if(g) break;
        }
        if(!g) return;
        g.linkedThreadIds = Array.isArray(g.linkedThreadIds) ? g.linkedThreadIds : [];
        if(!g.linkedThreadIds.map(String).includes(String(tid))){
          g.linkedThreadIds.unshift(tid);
          g.updatedAt = nowIso();
          saveState(st); renderFooter(st); render();
        }
      });
    });

    // If we were navigated here to focus a particular goal, scroll + highlight once.
    if(focusGoalId && !focusGoalDone){
      const el = root.querySelector(`[data-goal-card="${cssEscape(focusGoalId)}"]`);
      if(el){
        focusGoalDone = true;
        el.scrollIntoView({behavior:"smooth", block:"center"});
        el.classList.add("focus-glow");
        setTimeout(()=>el.classList.remove("focus-glow"), 1800);
      }
    }

    });
  }

  function firstLine(txt){
    return (txt||"").split("\n").map(x=>x.trim()).find(Boolean) || "";
  }

  function findGoal(hKey, domain, id){
    const list = st.lifeMap.horizons[hKey]?.domains?.[domain] || [];
    return list.find(x=>String(x.id)===String(id));
  }

  function moveGoal(id, hKey, domain, dir){
    const order = ["week","month","quarter"];
    const idx = order.indexOf(hKey);
    const target = dir==="promote" ? order[Math.max(0, idx-1)] : order[Math.min(order.length-1, idx+1)];
    // promote means toward week (more urgent): quarter -> month -> week
    const fromKey = hKey;
    const toKey = target;

    if(fromKey===toKey) return;

    const fromList = st.lifeMap.horizons[fromKey].domains[domain];
    const i = fromList.findIndex(x=>String(x.id)===String(id));
    if(i<0) return;
    const [g] = fromList.splice(i,1);
    g.updatedAt = nowIso();
    st.lifeMap.horizons[toKey].domains[domain].unshift(g);

    saveState(st); renderFooter(st); render();
  }

  // Helpers for UI labels
  function urgencyLabel(u){ return u==="high"?"High":(u==="low"?"Low":"Medium"); }
  function urgencyPill(u){ return u==="high"?"bad":(u==="low"?"good":"warn"); }

  render();
}


// --- Income Map ---
function initIncomeMap(){
  dbgMarkInit('common');
  const st = initCommon();

  const startInput = document.querySelector("#startDate");
  const weekEl = document.querySelector("#weekNow");
  const checkpointsEl = document.querySelector("#checkpoints");

  startInput.value = st.incomeMap.startDate || "";

  function render(){
  const w = weekNumberFromStart(st.incomeMap.startDate);
  weekEl.textContent = w ? `Week ${w} of 12` : `—`;

  const cps = [
    {week:4, title:"Tighten focus", detail:"Drop non-earning distractions", threadTitle:"Income runway — Week 4: tighten focus", nextAction:"Pick 1–2 income channels; pause one non-earning distraction."},
    {week:6, title:"Commit & pipeline", detail:"Commit to 1–2 channels, build pipeline", threadTitle:"Income runway — Week 6: commit & pipeline", nextAction:"Write next 3 outreach/listing steps; schedule first one today."},
    {week:8, title:"Evaluate traction", detail:"Escalate if stalled", threadTitle:"Income runway — Week 8: evaluate traction", nextAction:"Review wins/metrics; decide keep / adjust / stop one channel."},
    {week:10, title:"Decision runway", detail:"SS / part-time / pivot", threadTitle:"Income runway — Week 10: decision runway", nextAction:"Draft decision notes + 2 questions; book 1 call if needed."},
  ];

  checkpointsEl.innerHTML = cps.map(cp=>{
    const isUpcoming = w ? (w < cp.week) : true;
    const isNow = w ? (w >= cp.week && w < cp.week + 2) : false;

    return `
    <div class="card">
      <h3>Week ${cp.week}: ${cp.title}</h3>
      <div class="small">${cp.detail}</div>

      <div class="row" style="gap:8px; align-items:center; margin-top:10px; flex-wrap:wrap">
        <span class="pill ${isNow ? 'good' : (isUpcoming ? 'warn' : '')}" style="pointer-events:none">
          ${isNow ? 'Current window' : (isUpcoming ? 'Upcoming' : 'Passed')}
        </span>
        ${w ? `<span class="pill" style="pointer-events:none">Current: Week ${w}</span>` : ``}
        <button class="btn mini" data-mkthread="${cp.week}" title="Create a thread in the Registry">Make thread</button>
      </div>

      <div class="small" style="margin-top:10px"><span class="mono">Suggested micro-action:</span> ${escapeHtml(cp.nextAction)}</div>
    </div>`;
  }).join("");

  // Wire checkpoint -> thread creation
  checkpointsEl.querySelectorAll("[data-mkthread]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const wk = Number(btn.getAttribute("data-mkthread"));
      const cp = cps.find(x=>x.week===wk);
      if(!cp) return;

      const now = nowIso();
      const thread = {
        id: uid(),
        title: cp.threadTitle,
        status: "active",
        domain: "Income",
        nextAction: cp.nextAction,
        notes: `Created from Income Map checkpoint (Week ${wk}).\n\n${cp.detail}`,
        createdAt: now,
        updatedAt: now,
      };

      st.threads.push(thread);
      saveState();
      alert("Thread created in Thread Registry (domain: Income).");
    });
  });
}

    startInput.addEventListener("change", ()=>{
    st.incomeMap.startDate = startInput.value || null;
    saveState(st); renderFooter(st); render();
  });

  render();
}

// --- Page router ---
document.addEventListener("DOMContentLoaded", ()=>{
  dbgRefresh();
  ensureTopbarNav();
  if (new URLSearchParams(location.search).get("debug") === "1") ensureDebugPanel();
  dbgRenderPanel();
  const page = (document.body.getAttribute("data-page")||"").toLowerCase();
  if(page==="quick") { dbgMarkInit('quick'); initQuickCapture(); }
  else if(page==="registry") { dbgMarkInit('registry'); initThreadRegistry(); }
  else if(page==="morningmap" || page==="home") { dbgMarkInit('morningMap'); initMorningMap(); }
  else if(page==="lifemap") { dbgMarkInit('lifeMap'); initLifeMap(); }
  else if(page==="overview") { dbgMarkInit('overview'); initOverview(); }
  else if(page==="income") { dbgMarkInit('income'); initIncomeMap(); }
  else { dbgMarkInit('common'); initCommon(); }
});


document.addEventListener("DOMContentLoaded", ()=>{
  try{
    const el = document.querySelector("[data-build]");
    if(el) el.textContent = BUILD_VERSION;
  }catch(e){}
});

// Auto-archive: if status is set to archived, persist immediately (no Save click needed)
document.addEventListener("change", (ev) => {
  const sel = ev.target;
  if(!(sel instanceof HTMLSelectElement)) return;
  if(!sel.matches("[data-thread-status]")) return;
  const threadId = sel.getAttribute("data-thread-status");
  const val = (sel.value || "").toString().trim().toLowerCase();
  if(val === "archived" || val === "archive" || val === "done" || val === "completed" || val === "complete"){
    try{
      const st = loadState();
      const t = (st.threads || []).find(x => String(x.id) === String(threadId));
      if(t){
        t.status = "archived";
        t.lastTouched = nowIso();
        if(t.updatedAt !== undefined) t.updatedAt = t.lastTouched;
        saveState(st);
      }
      if(typeof initThreadRegistry === "function") dbgMarkInit('registry'); initThreadRegistry();
    }catch(e){
      console.error("Auto-archive failed", e);
    }
  }
});

function daysSince(dateStr){
  if(!dateStr) return 999;
  const dt = new Date(dateStr);
  const now = new Date();
  return (now - dt)/(1000*60*60*24);
}


function initMorningMap() {
  const container = document.querySelector('.container');
  const st = loadState();

  // Defaults
  st.meta = st.meta || {};
  if (!st.meta.systemNotesText) {
    st.meta.systemNotesText = st.meta.morningMapText || DEFAULT_ORIENTATION_TEXT;
  }
  if (!st.meta.northStarText) {
    st.meta.northStarText = `I’m building a peaceful, independent life with room to create and a stable home.

• No consumer debt
• Clear housing path
• Sustainable, sufficient income
• Time and space for creative work
• Health managed deliberately`;
  }
  // Back-compat
  if (!st.meta.morningMapText) st.meta.morningMapText = st.meta.systemNotesText;
  if (!st.meta.morningScratch) st.meta.morningScratch = '';
  if (!st.meta.ignitionIntent) st.meta.ignitionIntent = '';
  if (!st.meta.ignitionFirstMove) st.meta.ignitionFirstMove = '';
  if (!st.meta.ignitionTimebox) st.meta.ignitionTimebox = '10';
  if (!st.meta.mvdThreadId) st.meta.mvdThreadId = '';
  if (!st.meta.sparkNotes) st.meta.sparkNotes = '';

  // Thread list for dropdowns
  const threads = (st.threads || []).filter(t => !t.archived);
  const threadOptions = ['<option value="">—</option>'].concat(
    threads.map(t => `<option value="${esc(t.id)}">${esc(t.title || '(untitled)')}</option>`)
  ).join('');

  const focus1 = st.weeklySlots?.slot1 || '';
  const focus2 = st.weeklySlots?.slot2 || '';

  container.innerHTML = `
    <div class="card hero">
      <div class="h1">Morning Map</div>
      <div class="muted">Orientation first. Execution second.</div>
    </div>


    <div class="quicklinksCard card">
      <div class="cardHeader">
        <div class="h2">Quick links</div>
        <div class="muted">Jump to a page.</div>
      </div>
      <div class="quicklinksGrid">
        <a class="btn big" href="quick-capture.html">⚡ Quick Capture</a>
        <a class="btn big" href="thread-registry.html">Thread Registry</a>
        <a class="btn big" href="strategic-life-map.html">Strategic Life Map</a>
        <a class="btn big" href="90-day-income-map.html">90‑Day Income Map</a>
        <a class="btn big" href="how-this-works.html">How This Works</a>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="cardHeader">
          <div class="h2">
            Orientation layer
            <button class="helpIcon" data-pop="This is your steadying layer. Don’t optimize it daily. Edit during a scheduled review, then leave it alone.">?</button>
          </div>
          
        </div>

        <div class="northStarCard">
          <div class="h2" style="margin-bottom:6px">North Star</div>
          <div id="nsPreview" class="nsPreview"></div>
          <textarea id="nsText" class="nsText" spellcheck="false">${esc(st.meta.northStarText)}</textarea>
          <div class="row" style="margin-top:10px">
            <button class="btn primary" id="nsSave">Save</button>
            <button class="btn" id="nsReset">Reset</button>
            <div class="small muted">Keep this short. Read it in 5 seconds.</div>
          </div>
        </div>

        <div class="spacer"></div>

        <div class="card">
          <div class="row" style="justify-content:space-between; align-items:center">
            <div class="h2">System Notes (optional)</div>
            <div class="small muted">Scroll-only reference. Not part of your daily view.</div>
          </div>
          <textarea id="notesText" class="notesText" spellcheck="false">${esc(st.meta.systemNotesText)}</textarea>
          <div class="row">
            <button class="btn" id="notesSave">Save</button>
            <button class="btn" id="notesReset">Reset</button>
          </div>
        </div>
<div class="stack">
        <div class="card">
          <div class="h2">
            Focus strip
            <button class="helpIcon" data-pop="Pick your two active threads for the week. Everything else is allowed to wait.">?</button>
          </div>
          <div class="muted">Your two active threads for the week.</div>

          <div class="slot">
            <div class="small">Weekly Slot #1</div>
            <select id="slot1">${threadOptions}</select>
          </div>

          <div class="slot">
            <div class="small">Weekly Slot #2</div>
            <select id="slot2">${threadOptions}</select>
          </div>

          <div class="row">
            <button class="btn primary" id="slotsSave">Save</button>
            <div class="small muted">This only sets focus — it doesn’t move threads.</div>
          </div>
        </div>

        <div class="card">
          <div class="h2">
            Ignition block
            <button class="helpIcon" data-pop="Phase 1: a small, concrete ignition so you start moving before the mind negotiates. Keep it short and physical.">?</button>
          </div>

          <div class="field">
            <label>Intent (one sentence)</label>
            <input id="igIntent" type="text" placeholder="Example: Make money progress in 10 minutes." value="${esc(st.meta.ignitionIntent)}"/>
            <div class="hint">Rule: one sentence. No explanation.</div>
          </div>

          <div class="field">
            <label>First move (physical, 60–120 seconds)</label>
            <input id="igMove" type="text" placeholder="Example: Open Etsy drafts and add one photo." value="${esc(st.meta.ignitionFirstMove)}"/>
            <div class="hint">Rule: something your hands can do.</div>
          </div>

          <div class="field">
            <label>Timebox</label>
            <select id="igTimebox">
              ${['10','15','20','30'].map(v => `<option value="${v}" ${st.meta.ignitionTimebox===v?'selected':''}>${v} min</option>`).join('')}
            </select>
            <div class="hint">Rule: stop when the timer ends — success is starting.</div>
          </div>

          <div class="row">
            <button class="btn primary" id="igSave">Save</button>
            <div class="small muted">You can change this later — but try to run it once first.</div>
          </div>
        </div>

        <div class="card">
          <div class="h2">
            MVD for today
            <button class="helpIcon" data-pop="Phase 2: choose the Minimum Viable Direction for today — one thread that makes today count.">?</button>
          </div>

          <div class="field">
            <label>Today’s MVD thread</label>
            <select id="mvdThread">${threadOptions}</select>
            <div class="hint">Rule: choose one. If nothing fits, pick the least-wrong and move.</div>
          </div>

          <div class="row">
            <button class="btn primary" id="mvdSave">Save</button>
            <div class="small muted">This is an anchor, not a prison.</div>
          </div>
        </div>

        <div class="card">
          <div class="h2">
            Scratchpad
            <button class="helpIcon" data-pop="A small parking lot. If your brain is loud, put it here so you can keep moving.">?</button>
          </div>
          <textarea id="mmScratch" class="scratch" placeholder="A quick note to future-you...">${esc(st.meta.morningScratch)}</textarea>
          <div class="row">
            <button class="btn primary" id="mmScratchSave">Save</button>
          </div>
        </div>

        <div class="card">
          <div class="h2">
            Spark capture
            <button class="helpIcon" data-pop="Catch small ideas without turning them into projects. One line per spark.">?</button>
          </div>
          <textarea id="sparkNotes" class="scratch" placeholder="One per line...">${esc(st.meta.sparkNotes)}</textarea>
          <div class="row">
            <button class="btn primary" id="sparkSave">Save</button>
          </div>
        </div>
      </div>
    </div>

    <div class="popover" id="popover" aria-hidden="true">
      <div class="popoverInner">
        <div class="popoverText" id="popoverText"></div>
        <button class="btn" id="popoverClose">Close</button>
      </div>
    </div>
  `;

  // Set selected values
  const slot1El = document.getElementById('slot1');
  const slot2El = document.getElementById('slot2');
  const mvdEl = document.getElementById('mvdThread');
  if (slot1El) slot1El.value = focus1;
  if (slot2El) slot2El.value = focus2;
  if (mvdEl) mvdEl.value = st.meta.mvdThreadId || '';

  // Save handlers
  const saveAll = () => saveState(st);

  const updatePreview = () => {
    const t = document.getElementById('nsText')?.value || '';
    const first = (t.split('\n').find(l => l.trim()) || '').trim();
    const prev = document.getElementById('nsPreview');
    if (prev) prev.textContent = first;
  };
  updatePreview();
  document.getElementById('nsText')?.addEventListener('input', updatePreview);

  document.getElementById('nsSave')?.addEventListener('click', () => {
    st.meta.northStarText = document.getElementById('nsText').value;
    // keep back-compat field around
    if (!st.meta.systemNotesText) st.meta.systemNotesText = st.meta.morningMapText || DEFAULT_ORIENTATION_TEXT;
    saveAll(); toast('Saved');
    updatePreview();
  });

  document.getElementById('nsReset')?.addEventListener('click', () => {
    document.getElementById('nsText').value = "I’m building a peaceful, independent life with room to create and a stable home.\n\n• No consumer debt\n• Clear housing path\n• Sustainable, sufficient income\n• Time and space for creative work\n• Health managed deliberately";
    updatePreview();
  });

  document.getElementById('notesSave')?.addEventListener('click', () => {
    st.meta.systemNotesText = document.getElementById('notesText').value;
    // back-compat
    st.meta.morningMapText = st.meta.systemNotesText;
    saveAll(); toast('Saved');
  });

  document.getElementById('notesReset')?.addEventListener('click', () => {
    document.getElementById('notesText').value = DEFAULT_ORIENTATION_TEXT;
  });

  document.getElementById('mmScratchSave')?.addEventListener('click', () => {
    st.meta.morningScratch = document.getElementById('mmScratch').value;
    saveAll(); toast('Saved');
  });

  document.getElementById('sparkSave')?.addEventListener('click', () => {
    st.meta.sparkNotes = document.getElementById('sparkNotes').value;
    saveAll(); toast('Saved');
  });

  document.getElementById('slotsSave')?.addEventListener('click', () => {
    st.weeklySlots = st.weeklySlots || {};
    st.weeklySlots.slot1 = document.getElementById('slot1').value;
    st.weeklySlots.slot2 = document.getElementById('slot2').value;
    saveAll(); toast('Saved');
  });

  document.getElementById('igSave')?.addEventListener('click', () => {
    st.meta.ignitionIntent = document.getElementById('igIntent').value;
    st.meta.ignitionFirstMove = document.getElementById('igMove').value;
    st.meta.ignitionTimebox = document.getElementById('igTimebox').value;
    saveAll(); toast('Saved');
  });

  document.getElementById('mvdSave')?.addEventListener('click', () => {
    st.meta.mvdThreadId = document.getElementById('mvdThread').value;
    saveAll(); toast('Saved');
  });

  // Popover
  const pop = document.getElementById('popover');
  const popText = document.getElementById('popoverText');
  const closePop = () => {
    pop.setAttribute('aria-hidden', 'true');
    popText.textContent = '';
  };
  document.getElementById('popoverClose')?.addEventListener('click', closePop);
  pop?.addEventListener('click', (e) => { if (e.target === pop) closePop(); });

  document.querySelectorAll('.helpIcon').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.getAttribute('data-pop') || '';
      popText.textContent = t;
      pop.setAttribute('aria-hidden', 'false');
    });
  });
}


function initOverview(){
function initHome(){
  const root = document.getElementById('homeRoot');
  if(!root) return;

  const ORIENT_KEY = STORE_KEY.replace('.data.', '.orient.');
  const nowIso = () => new Date().toISOString();

  const DEFAULTS = {
    northStar: "Keep it short. Keep it true. Keep it kind. Build what lasts.\n\n(Unlock to edit.)",
    ninetyDayTarget: "",
    ninetyDayTop3: ["","",""],
    weekCommitments: ["","",""],
    todayLever: "",
    notes: ""
  };

  function load(){
    try{
      const raw = localStorage.getItem(ORIENT_KEY);
      if(!raw) return {...DEFAULTS, _meta:{unlockedUntil:0}};
      const obj = JSON.parse(raw);
      return {...DEFAULTS, ...obj, _meta:{...(obj._meta||{}), unlockedUntil: (obj._meta?.unlockedUntil||0)}};
    }catch(e){
      return {...DEFAULTS, _meta:{unlockedUntil:0}};
    }
  }

  function save(state){
    const out = {...state};
    out._meta = out._meta || {};
    out._meta.updatedAt = nowIso();
    localStorage.setItem(ORIENT_KEY, JSON.stringify(out));
    document.querySelectorAll('[data-last-saved]').forEach(el=>el.textContent = new Date().toLocaleString());
  }

  function isUnlocked(state){
    return (state?._meta?.unlockedUntil||0) > Date.now();
  }

  function requestUnlock(state){
    const code = prompt('Type UNLOCK to edit North Star (10 minutes):');
    if((code||'').trim().toUpperCase() !== 'UNLOCK') return state;
    state._meta = state._meta || {};
    state._meta.unlockedUntil = Date.now() + 10*60*1000;
    save(state);
    render(state);
    return state;
  }

  function esc(s){
    return String(s ?? '').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }

  function render(state){
    const unlocked = isUnlocked(state);

    root.innerHTML = `
      <div class="homeStack">
        <div class="card homeCard">
          <div class="homeHeader">
            <div>
              <div class="homeTitle">North Star</div>
              <div class="homeSub">Static on purpose. One job: keep you oriented.</div>
            </div>
            <button class="btn ${unlocked?'good':''}" id="homeUnlock">${unlocked?'Unlocked (10m)':'Unlock to edit'}</button>
          </div>
          <textarea class="homeArea" id="homeNorthStar" ${unlocked?'':'readonly'} rows="3">${esc(state.northStar)}</textarea>
        </div>

        <div class="card homeCard">
          <div class="homeHeader">
            <div>
              <div class="homeTitle">Quick links</div>
              <div class="homeSub">Jump straight to the page you need.</div>
            </div>
          </div>
          <div class="tabs" style="justify-content:flex-start; gap:10px; flex-wrap:wrap">
            <a class="tab" href="index.html">Map</a>
            <a class="tab" href="quick-capture.html">Quick Capture</a>
            <a class="tab" href="thread-registry.html">Thread Registry</a>
            <a class="tab" href="strategic-life-map.html">Strategic Life Map</a>
            <a class="tab" href="90-day-income-map.html">90-Day Income Map</a>
            <a class="tab" href="how-this-works.html">How This Works</a>
          </div>
        </div>

        <div class="card homeCard">
          <div class="homeHeader">
            <div>
              <div class="homeTitle">90‑Day Gate</div>
              <div class="homeSub">The next meaningful window. Top 3 keeps it honest.</div>
            </div>
          </div>

          <div class="homeRow">
            <label class="homeLabel">Target date</label>
            <input class="homeInput" id="home90Date" type="date" value="${esc(state.ninetyDayTarget)}"/>
          </div>

          <div class="homeGrid3">
            <div>
              <label class="homeLabel">Top 3 (90 days)</label>
              <input class="homeInput" id="home90_1" placeholder="1)" value="${esc(state.ninetyDayTop3[0]||'')}"/>
              <input class="homeInput" id="home90_2" placeholder="2)" value="${esc(state.ninetyDayTop3[1]||'')}"/>
              <input class="homeInput" id="home90_3" placeholder="3)" value="${esc(state.ninetyDayTop3[2]||'')}"/>
            </div>
            <div>
              <label class="homeLabel">Notes</label>
              <textarea class="homeArea" id="home90Notes" rows="4" placeholder="Constraints, blockers, reality checks…">${esc(state.notes)}</textarea>
            </div>
          </div>
        </div>

        <div class="card homeCard">
          <div class="homeHeader">
            <div>
              <div class="homeTitle">This Week</div>
              <div class="homeSub">A few commitments you can actually carry.</div>
            </div>
          </div>

          <div class="homeGrid3">
            <div>
              <label class="homeLabel">Weekly commitments (3)</label>
              <input class="homeInput" id="homeW_1" placeholder="1)" value="${esc(state.weekCommitments[0]||'')}"/>
              <input class="homeInput" id="homeW_2" placeholder="2)" value="${esc(state.weekCommitments[1]||'')}"/>
              <input class="homeInput" id="homeW_3" placeholder="3)" value="${esc(state.weekCommitments[2]||'')}"/>
            </div>
            <div>
              <label class="homeLabel">Today’s lever</label>
              <input class="homeInput" id="homeToday" placeholder="The one move that makes today real…" value="${esc(state.todayLever)}"/>
              <div class="small" style="margin-top:8px">Tip: if this feels fuzzy, open <span class="mono">Quick Capture</span> and dump noise first.</div>
            </div>
          </div>

          <div class="row" style="justify-content:flex-end; margin-top:10px; gap:10px">
            <button class="btn good" id="homeSave">Save</button>
            <button class="btn warn" id="homeReset">Reset (this page)</button>
          </div>
        </div>
      </div>
    `;

    const $ = (id)=>document.getElementById(id);

    $('homeUnlock')?.addEventListener('click', ()=>{ requestUnlock(state); });

    function collect(){
      const next = {...state};
      next.northStar = $('homeNorthStar')?.value ?? next.northStar;
      next.ninetyDayTarget = $('home90Date')?.value ?? '';
      next.ninetyDayTop3 = [ $('home90_1')?.value||'', $('home90_2')?.value||'', $('home90_3')?.value||'' ];
      next.weekCommitments = [ $('homeW_1')?.value||'', $('homeW_2')?.value||'', $('homeW_3')?.value||'' ];
      next.todayLever = $('homeToday')?.value ?? '';
      next.notes = $('home90Notes')?.value ?? '';
      return next;
    }

    $('homeSave')?.addEventListener('click', ()=>{ const next = collect(); save(next); });

    $('homeReset')?.addEventListener('click', ()=>{
      if(!confirm('Reset only the Morning Map page content? (Your planner data stays intact.)')) return;
      const next = {...DEFAULTS, _meta:{unlockedUntil:0}};
      save(next);
      render(next);
    });

    // lightweight autosave: on blur
    root.querySelectorAll('input,textarea').forEach(el=>{
      el.addEventListener('blur', ()=>{ save(collect()); });
    });
  }

  const state = load();
  render(state);
  document.querySelectorAll('[data-last-saved]').forEach(el=>el.textContent = new Date().toLocaleString());
}

  const state = loadState();
  const root = document.body;
  const activeThreads = (state.threads||[]).filter(t=>t.status!=="archived");

  const urgencyOrder = {high:0, medium:1, low:2};
  activeThreads.sort((a,b)=>{
    const ua = urgencyOrder[(a.urgency||'medium').toLowerCase()] ?? 1;
    const ub = urgencyOrder[(b.urgency||'medium').toLowerCase()] ?? 1;
    if(ua!==ub) return ua-ub;
    return new Date(b.lastTouched||0)-new Date(a.lastTouched||0);
  });

  const domains = state.lifeMap?.domains||[];

  let html = '<div style="display:flex;gap:30px;padding:30px;">';
  html += '<div style="flex:3;">';

  const top = activeThreads.slice(0,2);
  html += '<div class="card" style="margin-bottom:18px;">';
  html += '<h2>🎯 Strategic Arc</h2>';
  if(top.length===0){
    html += '<div>No active direction.</div>';
  }else{
    top.forEach(t=>{
      html += `<div style="margin-bottom:10px;">
        <strong>${t.title||t.name}</strong>
        <div style="opacity:0.6;font-size:12px;">${t.domain||''}</div>
      </div>`;
    });
  }
  html += '</div>';

  const horizons = [
    {key:"week", label:"This Week"},
    {key:"month", label:"This Month"},
    {key:"quarter", label:"3 Months"}
  ];

  horizons.forEach((h,i)=>{
    const defaultOpen = (h.key==="week");
    html += `<div style="margin-bottom:20px;">
      <details ${defaultOpen?'open':''}>
        <summary style="font-size:18px;font-weight:bold;cursor:pointer;">
          ${h.label}
        </summary>`;

    domains.forEach(d=>{
      const domainThreads = activeThreads.filter(t=>t.domain===d);
      if(domainThreads.length===0) return;

      html += `<div style="margin-left:15px;margin-top:10px;">
        <strong>${d}</strong>
        <ul style="margin-top:5px;">`;

      domainThreads.forEach(t=>{
        const stalled = daysSince(t.lastTouched)>14;
        const dot = stalled ? "🟠" : "●";
        html += `<li style="margin-bottom:4px;opacity:${stalled?0.6:1};">
          ${dot} ${t.title||t.name}
        </li>`;
      });

      html += '</ul></div>';
    });

    html += '</details></div>';
  });

  html += '</div>';

  const completedWeek = (state.threads||[]).filter(t=>{
    if(t.status!=="archived") return false;
    return daysSince(t.lastTouched)<=7;
  }).length;

  const high = activeThreads.filter(t=>(t.urgency||'').toLowerCase()==='high').length;
  const med = activeThreads.filter(t=>(t.urgency||'').toLowerCase()==='medium').length;
  const low = activeThreads.filter(t=>(t.urgency||'').toLowerCase()==='low').length;

  html += '<div style="flex:1;border-left:1px solid #333;padding-left:20px;">';
  html += '<h3>Momentum</h3>';
  html += `<div>Movement (7d): ${completedWeek}</div>`;
  html += `<div>Intent → H:${high} M:${med} L:${low}</div>`;
  html += '</div>';

  html += '</div>';
  root.innerHTML = html;
}