const BUILD_VERSION = "v53";
const DEFAULT_ORIENTATION_TEXT = "Planner Orientation Layer — Implementation Blueprint v1.0\n\nThis document defines the calm, structured, orientation-first homepage layer for the existing planner system. It is an additive front-layer, not a rebuild. All existing planner pages and logic remain intact.\n\nCore Design Intent\n\nTone: Relaxed, creative, open.\nEmotional Effect: Structured stillness.\nFunction: Orientation before execution.\nRule: One continuous vertical layout. No collapsible sections above the fold.\n\nHomepage Structure (Top to Bottom)\n\n1. NORTH STAR (Locked Section)\n\nAnchoring Sentence (locked, editable only during scheduled review):\n\n\"I finish my life in peace — no debt left behind, no burden passed forward, living comfortably enough to create and care for myself.\"\n\nPractical Bullet Conditions (locked):\n\n• No consumer debt.\n\n• Housing path resolved and documented.\n\n• Home simplified and document-ready.\n\n• Income baseline stable with protected creative time.\n\n2. 90-DAY GATE (Current Season)\n\nHeader format: By [Insert Date]\n\n• Housing decision path chosen.\n\n• Debt strategy documented and active.\n\n• Minimum viable home clear established.\n\n3. THIS WEEK (Maximum 3 Commitments)\n\nOnly 1–3 commitments allowed. Each must have a clear 'done' definition.\n\nExample placeholders:\n\n• [Commitment 1]\n\n• [Commitment 2]\n\n• [Commitment 3]\n\n4. TODAY (One Lever Only)\n\nSingle action that advances one weekly commitment. No additional task lists visible on homepage.\n\nNavigation Rules\n\nAll deeper planner pages remain intact.\nA simple 'Home' link is added to each deeper page.\nHomepage remains the browser default start page.\nNo metrics, widgets, progress bars, or dashboards added.\n\nVisual Tone Guidelines\n\nBackground: Warm cream or soft neutral.\nText: Dark slate or charcoal (not pure black).\nAccent hierarchy:\n• Deep muted teal for North Star.\n• Warm clay/amber for 90-Day Gate.\n• Soft sage or gray-blue for Weekly.\n• Subtle highlight for Today.\nTypography: Soft serif for headings; clean sans-serif for body.\n\nGuardrails\n\n• Homepage must fit on one screen without scrolling.\n• North Star text remains locked except during scheduled review.\n• No new sections added without revisiting structure intentionally.\n• This page serves orientation, not tracking.";

const DEFAULT_DOMAINS = ["Income","Financial","Home","Health","Relationships"];

/* === planner-test safeguards === */
const APP_FLAVOR = "planner-test";
const DEFAULT_TEST_GIST_ID = "4364e296d9592d9953ce71ee346a2766";

function ensureTestDefaults() {
  try {
    let cfg = null;
    const raw = localStorage.getItem("planner.sync.v1");
    if (raw) {
      try { cfg = JSON.parse(raw); } catch(e) { cfg = {}; }
    } else {
      cfg = {};
    }
    if (!cfg.gistId) cfg.gistId = DEFAULT_TEST_GIST_ID;
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

function escHtml(s){
  return String(s ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function esc(s){ return escHtml(s); }

// --- Navigation ---
const NAV_ITEMS = [
  { href: "index.html", label: "Map" },
  { href: "quick-capture.html", label: "⚡ Quick Capture" },
  { href: "strategic-life-map.html", label: "Strategic Life Map" },
  { href: "thread-registry.html", label: "Thread Registry" },
  { href: "90-day-income-map.html", label: "90‑Day Income Map" },
  { href: "how-this-works.html", label: "How This Works" },
];

function ensureTopbarNav(){
  try{
    const nav = document.querySelector(".topbar .nav");
    if(!nav) return;
    nav.innerHTML = NAV_ITEMS.map(it => `<a data-nav href="${it.href}">${escHtml(it.label)}</a>`).join("");
    const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    nav.querySelectorAll("a[data-nav]").forEach(a=>{
      const href = (a.getAttribute("href")||"").toLowerCase();
      if(href===here) a.classList.add("active");
    });
  }catch(e){}
}

// --- Debug ---
window.__plannerDebug = window.__plannerDebug || {
  build: BUILD_VERSION, page: null, inits: {}, errors: [], scriptSrc: [],
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
window.addEventListener("error", (ev)=>{ dbgAddError(ev.error || ev.message || "error"); });
window.addEventListener("unhandledrejection", (ev)=>{ dbgAddError(ev.reason || "promise rejection"); });

// --- Storage keys ---
const STORE_KEY = "planner-test.data.v1";
const SYNC_KEY  = "planner-test.sync.v1";
const AUTO_PULL_SESSION_KEY = "planner.autoPulled.v1";
const GIST_FILENAME = "planner-data.json";

function nowIso(){ return new Date().toISOString(); }
function uid(){ return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }

// --- Toast ---
function toast(msg, ms=1800){
  try{
    let t = document.getElementById('__toast');
    if(!t){
      t = document.createElement('div');
      t.id = '__toast';
      t.style.cssText = 'position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:999px;font-size:13px;z-index:99999;pointer-events:none;opacity:0;transition:opacity .2s';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t.__to);
    t.__to = setTimeout(()=>{ t.style.opacity='0'; }, ms);
  }catch(e){}
}

// --- Life Map defaults ---
function defaultLifeMap(){
  const domains = DEFAULT_DOMAINS.slice();
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

  const now = nowIso();
  const mkGoal = (title, notes)=>({ id: uid(), title, notes: notes||"", urgency:"medium", createdAt: now, updatedAt: now, linkedThreadIds: [] });

  lm.horizons.quarter.domains["Income"].push(
    mkGoal("Etsy", "T-shirts for fundraising\nCards\nMugs\nNew items\nFundraising (Michael J. Fox / Parkinson's Foundation)"),
    mkGoal("Self-employment", "Construction knowledge / instruction / lead-manager\nCraft options")
  );
  lm.horizons.quarter.domains["Financial"].push(
    mkGoal("Investigate health plan", ""),
    mkGoal("Budget & Bill Review", "Cancel subscriptions\nReview all bills")
  );
  lm.horizons.quarter.domains["Home"].push(
    mkGoal("Sell items", "Tools\nSnowblower (get running)\nHyundai (brakes)"),
    mkGoal("Give away items", "Clothing\nMiscellaneous kitchen items\nMiscellaneous household items"),
    mkGoal("Sell house?", "See clean out progress\nResearch selling options (Full realtor vs Partial self-sell)")
  );
  lm.horizons.quarter.domains["Health"].push(
    mkGoal("ADHD", "Med change?\nContinue coaching"),
    mkGoal("Parkinson's", "Exercise (Walking, E-biking)\nHandicap placard")
  );
  return lm;
}

function ensureLifeMapSchema(st){
  if(!st.lifeMap){ st.lifeMap = defaultLifeMap(); return; }
  if(st.lifeMap && Array.isArray(st.lifeMap.domains) && !st.lifeMap.horizons){
    const old = st.lifeMap.domains;
    st.lifeMap = defaultLifeMap();
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
  if(!st.lifeMap.version || st.lifeMap.version < 2){
    const fresh = defaultLifeMap();
    st.lifeMap = { ...fresh, ...st.lifeMap, version: 2 };
  }
  if(!st.lifeMap.horizons){ st.lifeMap.horizons = defaultLifeMap().horizons; }
  if(!st.lifeMap.domains){ st.lifeMap.domains = DEFAULT_DOMAINS.slice(); }
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
  if(!lm || typeof lm !== 'object') return defaultLifeMap();
  if(lm.horizons && typeof lm.horizons === 'object'){
    if(lm.horizons.threeMonths && !lm.horizons.quarter){
      lm.horizons.quarter = lm.horizons.threeMonths;
      delete lm.horizons.threeMonths;
    }
    if(!lm.domains) lm.domains = DEFAULT_DOMAINS.slice();
    if(Array.isArray(lm.domains)){
      lm.domains = lm.domains
        .map(d => (typeof d === 'string') ? d : (d?.name || d?.title || d?.domain || ""))
        .map(s => String(s||"").trim())
        .filter(Boolean);
    }
    if(!lm.defaultUrgency) lm.defaultUrgency = "medium";
    const ensureH = (key, title) => {
      if(!lm.horizons[key] || typeof lm.horizons[key] !== 'object') lm.horizons[key] = { label: title, domains: {} };
      if(!lm.horizons[key].label) lm.horizons[key].label = title;
      if(!lm.horizons[key].domains || typeof lm.horizons[key].domains !== 'object') lm.horizons[key].domains = {};
    };
    ensureH('week', 'This Week');
    ensureH('month', 'This Month');
    ensureH('quarter', '3 Months');
    const horizonKeys = ['week','month','quarter'];
    lm.domains.forEach(domainName=>{
      horizonKeys.forEach(hk=>{
        if(!Array.isArray(lm.horizons[hk].domains[domainName])) lm.horizons[hk].domains[domainName] = [];
      });
    });
    return lm;
  }
  if(lm.domains && !Array.isArray(lm.domains) && typeof lm.domains === 'object' && !lm.horizons){
    const fresh = defaultLifeMap();
    fresh.horizons.quarter.domains = Object.assign(fresh.horizons.quarter.domains, lm.domains);
    return fresh;
  }
  if(Array.isArray(lm.domains) && !lm.horizons){
    const fresh = defaultLifeMap();
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
    }catch(e){ return fresh; }
  }
  return defaultLifeMap();
}

function defaultState(){
  return {
    meta: { createdAt: nowIso(), updatedAt: nowIso(), title: "Planner" },
    inbox: [],
    threads: [],
    weekly: { slot1: null, slot2: null, weekOf: null },
    lifeMap: defaultLifeMap(),
    incomeMap: { startDate: null }
  };
}

function normalizeStatus(s){
  const v = (s ?? "").toString().trim().toLowerCase();
  if(!v) return "active";
  if(v === "archive" || v === "archived" || v === "done" || v === "completed" || v === "complete") return "archived";
  if(v.includes("archiv")) return "archived";
  if(v.includes("done") || v.includes("complete")) return "archived";
  return s;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return defaultState();
    const st = JSON.parse(raw);
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
function escapeAttr(s){ return escapeHtml(s); }

function mondayOf(date){
  const d = new Date(date);
  const day = d.getDay();
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

function daysSince(dateStr){
  if(!dateStr) return 999;
  const dt = new Date(dateStr);
  const now = new Date();
  return (now - dt)/(1000*60*60*24);
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

// --- Sync ---
function loadSync(){
  try{ return JSON.parse(localStorage.getItem(SYNC_KEY) || "null"); }
  catch{ return null; }
}
function saveSync(cfg){ localStorage.setItem(SYNC_KEY, JSON.stringify(cfg)); }
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
    headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github+json" }
  });
  if(!res.ok) throw new Error(`Pull failed: ${res.status}`);
  return await res.json();
}

function findPlannerFile(gistJson){
  const files = Object.values(gistJson.files || {});
  if(!files.length) return null;
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
    headers: { "Authorization": `token ${cfg.token}`, "Accept": "application/vnd.github+json" },
    body: JSON.stringify({ files: { [GIST_FILENAME]: { content: JSON.stringify(st, null, 2) } } })
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
  document.querySelectorAll("[data-close-sync]").forEach(b=>b.addEventListener("click", closeModal));

  const cfg = loadSync() || { gistId:"", token:"", autoPull:true };
  const gistIdEl = document.getElementById("syncGistId");
  const tokenEl  = document.getElementById("syncToken");
  const autoEl   = document.getElementById("syncAutoPull");
  const statusEl = document.getElementById("syncStatus");
  if(gistIdEl) gistIdEl.value = cfg.gistId || "";
  if(tokenEl)  tokenEl.value  = cfg.token  || "";
  if(autoEl)   autoEl.checked = cfg.autoPull !== false;

  const setStatus = (msg)=>{ if(statusEl) statusEl.textContent = msg; };

  const saveBtn  = document.getElementById("syncSave");
  const pullBtn  = document.getElementById("syncPull");
  const forceBtn = document.getElementById("syncForcePull");
  const pushBtn  = document.getElementById("syncPush");
  const clearBtn = document.getElementById("syncClear");

  if(saveBtn) saveBtn.onclick = ()=>{
    saveSync({ gistId:(gistIdEl?.value||"").trim(), token:(tokenEl?.value||"").trim(), autoPull:!!(autoEl?.checked) });
    setSyncIndicator(); setStatus("Saved.");
  };
  if(pullBtn) pullBtn.onclick = async ()=>{
    setStatus("Pulling…");
    try{
      const r = await githubPull({force:false});
      setStatus(r.applied ? "Pulled (applied remote state)." : "Pulled (kept local — local is newer).");
      setTimeout(()=>location.reload(), 250);
    }catch(e){ setStatus(e.message); }
  };
  if(forceBtn) forceBtn.onclick = async ()=>{
    if(!confirm("Force Pull will overwrite local data with the Gist data. Continue?")) return;
    setStatus("Force pulling…");
    try{ await githubPull({force:true}); setStatus("Done. Reloading…"); setTimeout(()=>location.reload(), 250); }
    catch(e){ setStatus(e.message); }
  };
  if(pushBtn) pushBtn.onclick = async ()=>{
    setStatus("Pushing…");
    try{ await githubPush(); setStatus("Pushed to Gist."); }
    catch(e){ setStatus(e.message); }
  };
  if(clearBtn) clearBtn.onclick = ()=>{
    if(!confirm("Clear sync settings on this device?")) return;
    clearSync(); setSyncIndicator(); setStatus("Cleared.");
  };
}

async function autoPullIfEnabled(){
  const cfg = loadSync();
  if(!(cfg?.gistId && cfg?.token && cfg.autoPull !== false)) return;
  if(sessionStorage.getItem(AUTO_PULL_SESSION_KEY) === "1") return;
  sessionStorage.setItem(AUTO_PULL_SESSION_KEY, "1");
  try{
    const r = await githubPull({force:false});
    if(r.applied) setTimeout(()=>location.reload(), 200);
  }catch(e){ console.warn("Auto-pull failed:", e); }
}

// --- Common init ---
function initCommon(){
  const st = loadState();
  ensureLifeMapSchema(st);
  saveState(st);
  setActiveNav();
  renderFooter(st);
  const expBtn = document.querySelector("[data-export]");
  if(expBtn) expBtn.addEventListener("click", exportJson);
  const impInput = document.querySelector("[data-import]");
  if(impInput){
    impInput.addEventListener("change", async (e)=>{
      const file = e.target.files?.[0];
      if(!file) return;
      try{ await importJsonFromFile(file); location.reload(); }
      catch(err){ alert("Import failed. Make sure it's a valid backup JSON."); console.error(err); }
    });
  }
  setSyncIndicator();
  wireModal();
  autoPullIfEnabled();
  return st;
}

// --- Domain color class ---
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

function cssEscape(s){
  return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_\-]/g, "\\$&");
}

// =============================================================
// --- Quick Capture ---
// =============================================================
function initQuickCapture(){
  dbgMarkInit('quickCapture');
  const st = initCommon();

  const form    = document.querySelector("#captureForm");
  const input   = document.querySelector("#captureText");
  const list    = document.querySelector("#inboxList");
  const clearBtn= document.querySelector("#archiveAll");

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

  render();
}

// =============================================================
// --- Thread Registry ---
// =============================================================
function initThreadRegistry(){
  dbgMarkInit('threadRegistry');
  const st = initCommon();

  const inboxEl   = document.querySelector("#registryInbox");
  const threadsEl = document.querySelector("#threadsList");
  const form      = document.querySelector("#newThreadForm");
  const focusThreadId = new URLSearchParams(location.search).get("focusThread");

  // Focus glow style
  (function(){
    const styleId = "threadRegistryFocusGlow";
    if(document.getElementById(styleId)) return;
    const s = document.createElement("style");
    s.id = styleId;
    s.textContent = `.focus-glow { outline: 3px solid rgba(255,180,0,.55); border-radius:14px; }`;
    document.head.appendChild(s);
  })();

  // Add thread button state
  const addBtn    = form ? form.querySelector('button[type="submit"]') : null;
  const titleInput= document.querySelector("#tTitle");
  function updateAddBtn(){
    if(!addBtn || !titleInput) return;
    const ok = (titleInput.value || "").trim().length > 0;
    addBtn.disabled = !ok;
    addBtn.style.opacity = ok ? "1" : ".55";
    addBtn.style.cursor  = ok ? "pointer" : "not-allowed";
  }
  if(titleInput){ titleInput.addEventListener("input", updateAddBtn); updateAddBtn(); }

  // Domain dropdown
  const domainSelect = document.querySelector("#tDomain");
  if(domainSelect){
    const domains = (st.lifeMap && Array.isArray(st.lifeMap.domains) && st.lifeMap.domains.length)
      ? st.lifeMap.domains : DEFAULT_DOMAINS;
    domainSelect.innerHTML = `<option value="">— none —</option>` +
      domains.map(d => `<option value="${escapeAttr(d)}">${escapeHtml(d)}</option>`).join("");
  }

  const slot1Sel = document.querySelector("#slot1");
  const slot2Sel = document.querySelector("#slot2");
  const weekOfEl = document.querySelector("#weekOf");

  function ensureWeekOf(){
    const mon  = mondayOf(new Date());
    const monY = ymd(mon);
    if(st.weekly.weekOf !== monY){ st.weekly.weekOf = monY; saveState(st); }
    if(weekOfEl) weekOfEl.textContent = mon.toLocaleDateString(undefined, {weekday:"long", year:"numeric", month:"short", day:"numeric"});
  }

  function threadOptionsHtml(selectedId){
    return [`<option value="">— none —</option>`].concat(
      st.threads
        .filter(t=>t.status!=="archived")
        .sort((a,b)=>a.title.localeCompare(b.title))
        .map(t=>`<option value="${t.id}" ${String(t.id)===String(selectedId)?"selected":""}>${escapeHtml(t.title)}</option>`)
    ).join("");
  }

  function renderWeeklySlots(){
    ensureWeekOf();
    if(slot1Sel){ slot1Sel.innerHTML = threadOptionsHtml(st.weekly.slot1); slot1Sel.onchange = ()=>{ st.weekly.slot1 = slot1Sel.value || null; saveState(st); renderFooter(st); render(); }; }
    if(slot2Sel){ slot2Sel.innerHTML = threadOptionsHtml(st.weekly.slot2); slot2Sel.onchange = ()=>{ st.weekly.slot2 = slot2Sel.value || null; saveState(st); renderFooter(st); render(); }; }
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
        st.threads.push({ id: uid(), title: it.text.slice(0,80), status:"active", domain:"", nextAction:"", notes: it.text, createdAt: nowIso(), updatedAt: nowIso() });
        it.status="archived";
        saveState(st); renderFooter(st); render();
      });
    });
    inboxEl.querySelectorAll("[data-append]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-append");
        const it = st.inbox.find(x=>String(x.id)===String(id));
        if(!it) return;
        const pick = prompt("Paste the exact thread title to append to:");
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

  function renderThreads(){
    const activeThreads = st.threads
      .filter(t=>t.status!=="archived")
      .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));

    threadsEl.innerHTML = activeThreads.length ? activeThreads.map(t=>{
      const inSlot = (String(st.weekly.slot1)===String(t.id) || String(st.weekly.slot2)===String(t.id));
      const pill = inSlot ? `<span class="pill good">Active this week</span>` : `<span class="pill">Backlog</span>`;
      const links = threadBacklinks(t.id);
      const backlinksHtml = links.length ? `<div class="meta" style="margin-top:6px; flex-wrap:wrap; gap:6px; display:flex">
        <span class="small" style="color:var(--muted); align-self:center">📍 Goals:</span>
        ${links.map(l=>`<a href="strategic-life-map.html?focusGoal=${encodeURIComponent(l.goalId)}" class="thread-link-pill" style="text-decoration:none"><span class="tlp-icon">🎯</span><span class="tlp-title">${escapeHtml(l.goalTitle)}</span><span class="tlp-status tls-idle">${escapeHtml(l.hLabel)}</span></a>`).join("")}
      </div>` : "";

      return `
        <div class="item ${domainClass(t.domain)}" data-thread-card="${t.id}" id="thread-${t.id}">
          <div class="domain-strip"></div>
          <strong>${escapeHtml(t.title)}</strong>
          <div class="meta">
            ${pill}
            ${t.domain ? `<span class="pill">${escapeHtml(t.domain)}</span>` : ""}
            <span class="mono">Updated: ${new Date(t.updatedAt).toLocaleString()}</span>
          </div>
          ${backlinksHtml}
          <div class="grid" style="margin-top:10px">
            <div>
              <label>Next micro-action (5–20 min)</label>
              <input value="${escapeHtml(t.nextAction || "")}" data-next="${t.id}" placeholder="Example: Open file and write 5 bullets"/>
            </div>
            <div>
              <label>Status</label>
              <select data-status="${t.id}">
                <option value="active"   ${t.status==="active"  ?"selected":""}>active</option>
                <option value="paused"   ${t.status==="paused"  ?"selected":""}>paused</option>
                <option value="done"     ${t.status==="done"    ?"selected":""}>done</option>
                <option value="archived" ${t.status==="archived"?"selected":""}>archived</option>
              </select>
            </div>
          </div>
          <label style="margin-top:10px">Notes</label>
          <textarea data-notes="${t.id}" placeholder="Context, constraints, next thoughts…">${escapeHtml(t.notes || "")}</textarea>
          <div class="row" style="margin-top:10px">
            <button class="btn primary" data-save="${t.id}">Save</button>
            <button class="btn"         data-edit="${t.id}">Edit</button>
            <button class="btn"         data-focus="${t.id}">Focus this week</button>
            <button class="btn warn"    data-copy="${t.id}">Copy micro-action</button>
            <button class="btn bad"     data-delete="${t.id}">Delete</button>
          </div>
        </div>
      `;
    }).join("") : `<p class="small">No threads yet. Create one below, or process the inbox.</p>`;

    // Focus scroll
    if(focusThreadId){
      const el = threadsEl.querySelector(`[data-thread-card="${cssEscape(focusThreadId)}"]`);
      if(el){ el.scrollIntoView({behavior:"smooth", block:"center"}); el.classList.add("focus-glow"); setTimeout(()=>el.classList.remove("focus-glow"), 1800); }
    }

    threadsEl.querySelectorAll("[data-save]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id  = btn.getAttribute("data-save");
        const th  = st.threads.find(x=>String(x.id)===String(id));
        if(!th) return;
        th.nextAction = document.querySelector(`[data-next="${id}"]`)?.value.trim() ?? "";
        th.notes      = document.querySelector(`[data-notes="${id}"]`)?.value.trim() ?? "";
        th.status     = document.querySelector(`[data-status="${id}"]`)?.value ?? "active";
        th.updatedAt  = nowIso();
        if(th.status==="archived"){
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
        try{ await navigator.clipboard.writeText(th.nextAction || ""); toast("Micro-action copied."); }
        catch{ alert("Couldn't access clipboard in this browser."); }
      });
    });

    threadsEl.querySelectorAll("[data-delete]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-delete");
        const th = st.threads.find(x=>String(x.id)===String(id));
        if(!th) return;
        if(!confirm(`Delete thread "${th.title || "this thread"}"?\n\nThis cannot be undone.`)) return;
        st.threads = st.threads.filter(x=>String(x.id)!==String(id));
        if(st.weekly?.slot1===id) st.weekly.slot1=null;
        if(st.weekly?.slot2===id) st.weekly.slot2=null;
        saveState(st); render();
      });
    });

    threadsEl.querySelectorAll("[data-edit]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-edit");
        const th = st.threads.find(x=>String(x.id)===String(id));
        if(!th) return;
        
        // Pre-fill form with thread data
        document.getElementById("tTitle").value = th.title || "";
        document.getElementById("tDomain").value = th.domain || "";
        document.getElementById("tNext").value = th.nextAction || "";
        
        // Update button state and text
        updateAddBtn();
        const submitBtn = form.querySelector('button[type="submit"]');
        if(submitBtn) submitBtn.textContent = "Update thread";
        
        // Scroll to form
        document.getElementById("tTitle").scrollIntoView({behavior: "smooth", block: "center"});
        document.getElementById("tTitle").focus();
        
        // Store ID so we know we're editing
        form.dataset.editingId = id;
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
    const title      = document.getElementById("tTitle").value.trim();
    const domain     = document.getElementById("tDomain").value.trim();
    const nextAction = document.getElementById("tNext").value.trim();
    if(!title) return;
    
    // Check if we're editing an existing thread
    const editingId = form.dataset.editingId;
    if(editingId){
      // Update existing thread
      const th = st.threads.find(x=>String(x.id)===String(editingId));
      if(th){
        th.title = title;
        th.domain = domain;
        th.nextAction = nextAction;
        th.updatedAt = nowIso();
      }
      delete form.dataset.editingId;
    } else {
      // Create new thread
      st.threads.push({ id: uid(), title, status:"active", domain, nextAction, notes:"", createdAt: nowIso(), updatedAt: nowIso() });
    }
    
    form.reset();
    
    // Reset button text
    const submitBtn = form.querySelector('button[type="submit"]');
    if(submitBtn) submitBtn.textContent = "Add thread";
    
    updateAddBtn();
    saveState(st); renderFooter(st); render();
  });

  render();
}

// =============================================================
// --- Strategic Life Map ---
// =============================================================
function initLifeMap(){
  dbgMarkInit('lifeMap');
  const st = initCommon();

  const root = document.querySelector("#lifeMapRoot");
  if(!root) return;

  const focusGoalId = new URLSearchParams(location.search).get("focusGoal");
  let focusGoalDone = false;

  // Stripe opacity style
  (function(){
    const styleId = "lifeMapStripeOpacity";
    if(document.getElementById(styleId)) return;
    const s = document.createElement("style");
    s.id = styleId;
    s.textContent = `
      #lifeMapRoot .domain-block > .domain-strip { opacity:1 !important; }
      #lifeMapRoot .goal > .domain-strip { opacity:0.45 !important; }
      .focus-glow { outline:3px solid rgba(255,180,0,.55); border-radius:14px; }
    `;
    document.head.appendChild(s);
  })();

  const horizons = ["week","month","quarter"];
  const domains  = st.lifeMap.domains;

  function threadStatusBadge(status){
    const s = (status||"active").toLowerCase();
    if(s==="archived"||s==="done"||s==="completed") return { label:"✓ Done",       cls:"tls-done"   };
    if(s==="paused")                                 return { label:"⏸ Paused",     cls:"tls-paused" };
    if(s.includes("not started"))                    return { label:"○ Not started",cls:"tls-idle"   };
    return                                                  { label:"● Active",     cls:"tls-active" };
  }

  function threadLinksHtml(g){
    const ids = Array.isArray(g.linkedThreadIds) ? g.linkedThreadIds : [];
    if(!ids.length) return '';
    const threads = ids.map(id => st.threads.find(t => String(t.id)===String(id))).filter(Boolean);
    if(!threads.length) return '';
    const pills = threads.map(t=>{
      const badge = threadStatusBadge(t.status);
      return `<button class="thread-link-pill" type="button" data-open-thread="${escapeAttr(String(t.id))}" title="Open in Thread Registry">`
        + `<span class="tlp-icon">🧵</span>`
        + `<span class="tlp-title">${escapeHtml(t.title)}</span>`
        + `<span class="tlp-status ${badge.cls}">${badge.label}</span>`
        + `</button>`;
    }).join("");
    return `<div class="thread-links-row">${pills}</div>`;
  }

  function attachThreadPickerHtml(g){
    const ids = new Set(Array.isArray(g.linkedThreadIds) ? g.linkedThreadIds.map(String) : []);
    const options = st.threads
      .filter(t=>t.status!=="archived" && !ids.has(String(t.id)))
      .map(t=>`<option value="${escapeAttr(String(t.id))}">${escapeHtml(t.title)}</option>`)
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
    const dClass  = domainClass(domain);
    const urgency = g.urgency || st.lifeMap.defaultUrgency || "medium";
    // ⬅ = more urgent = promote toward "week". ➡ = less urgent = demote toward "quarter".
    const leftLabel  = hKey==="month"   ? "← Week"    : "← Month";
    const rightLabel = hKey==="week"    ? "Month →"   : "Quarter →";
    const leftBtn  = (hKey!=="week")    ? `<button class="btn arrow-btn" data-promote="${g.id}" data-h="${hKey}" data-d="${escapeAttr(domain)}" title="Move to more urgent horizon">${leftLabel}</button>`  : `<span></span>`;
    const rightBtn = (hKey!=="quarter") ? `<button class="btn arrow-btn" data-demote="${g.id}"  data-h="${hKey}" data-d="${escapeAttr(domain)}" title="Move to less urgent horizon">${rightLabel}</button>` : `<span></span>`;
    return `
      <div class="goal ${dClass}" data-goal-card="${g.id}">
        <div class="domain-strip"></div>
        <div class="goal-head">
          <div>
            <strong>${escapeHtml(g.title||"")}</strong>
            <div class="meta">
              <span class="pill">${escapeHtml(domain)}</span>
            </div>
            ${threadLinksHtml(g)}
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
              <option value="low"    ${urgency==="low"   ?"selected":""}>Low</option>
              <option value="medium" ${urgency==="medium"?"selected":""}>Medium</option>
              <option value="high"   ${urgency==="high"  ?"selected":""}>High</option>
            </select>
            <div style="height:10px"></div>
            <button class="btn primary" data-save-goal="${g.id}" data-h="${hKey}" data-d="${escapeAttr(domain)}">Save</button>
            <div style="height:8px"></div>
            <button class="btn good"    data-thread-from-goal="${g.id}" data-h="${hKey}" data-d="${escapeAttr(domain)}">🧵 Create Thread</button>
            ${attachThreadPickerHtml(g)}
            <div style="height:8px"></div>
            <button class="btn bad"     data-delete-goal="${g.id}" data-h="${hKey}" data-d="${escapeAttr(domain)}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  function findGoal(hKey, domain, id){
    return (st.lifeMap.horizons[hKey]?.domains?.[domain] || []).find(x=>String(x.id)===String(id));
  }

  function moveGoal(id, hKey, domain, dir){
    const order  = ["week","month","quarter"];
    const idx    = order.indexOf(hKey);
    const toKey  = dir==="promote" ? order[Math.max(0, idx-1)] : order[Math.min(order.length-1, idx+1)];
    if(hKey===toKey) return;
    const fromList = st.lifeMap.horizons[hKey].domains[domain];
    const i = fromList.findIndex(x=>String(x.id)===String(id));
    if(i<0) return;
    const [g] = fromList.splice(i,1);
    g.updatedAt = nowIso();
    st.lifeMap.horizons[toKey].domains[domain].unshift(g);
    saveState(st); renderFooter(st); render();
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
                const list   = h.domains[domain] || [];
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

    // Add goal
    root.querySelectorAll("[data-add-goal]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const hKey   = btn.getAttribute("data-add-goal");
        const domain = btn.getAttribute("data-d");
        const key    = `${hKey}::${domain}`;
        const inp    = root.querySelector(`[data-new-title="${cssEscape(key)}"]`);
        const title  = (inp?.value||"").trim();
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
      btn.addEventListener("click", ()=>{ moveGoal(btn.getAttribute("data-promote"), btn.getAttribute("data-h"), btn.getAttribute("data-d"), "promote"); });
    });
    root.querySelectorAll("[data-demote]").forEach(btn=>{
      btn.addEventListener("click", ()=>{ moveGoal(btn.getAttribute("data-demote"), btn.getAttribute("data-h"), btn.getAttribute("data-d"), "demote"); });
    });

    // Save goal
    root.querySelectorAll("[data-save-goal]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id     = btn.getAttribute("data-save-goal");
        const hKey   = btn.getAttribute("data-h");
        const domain = btn.getAttribute("data-d");
        const g = findGoal(hKey, domain, id);
        if(!g) return;
        g.notes    = root.querySelector(`[data-notes="${cssEscape(id)}"]`)?.value.trim() ?? "";
        g.urgency  = root.querySelector(`[data-urgency="${cssEscape(id)}"]`)?.value ?? "medium";
        g.updatedAt = nowIso();
        saveState(st); renderFooter(st); render();
      });
    });

    // Delete goal
    root.querySelectorAll("[data-delete-goal]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id     = btn.getAttribute("data-delete-goal");
        const hKey   = btn.getAttribute("data-h");
        const domain = btn.getAttribute("data-d");
        if(!confirm("Delete this goal?")) return;
        const list = st.lifeMap.horizons[hKey].domains[domain];
        const idx  = list.findIndex(x=>String(x.id)===String(id));
        if(idx>=0){ list.splice(idx,1); saveState(st); renderFooter(st); render(); }
      });
    });

    // Create thread from goal
    root.querySelectorAll("[data-thread-from-goal]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id     = btn.getAttribute("data-thread-from-goal");
        const hKey   = btn.getAttribute("data-h");
        const domain = btn.getAttribute("data-d");
        const g = findGoal(hKey, domain, id);
        if(!g) return;
        const now        = nowIso();
        const nextAction = (g.notes||"").split("\n").map(x=>x.trim()).find(Boolean) || "First step: [describe 5–20 minute action]";
        const thread = {
          id: uid(), title: g.title, status: "active", domain, nextAction,
          notes: `Linked from Life Map (${st.lifeMap.horizons[hKey].label}).\n\n${g.notes||""}`.trim(),
          createdAt: now, updatedAt: now
        };
        st.threads.unshift(thread);
        g.linkedThreadIds = Array.isArray(g.linkedThreadIds) ? g.linkedThreadIds : [];
        g.linkedThreadIds.unshift(thread.id);
        // Deduplicate
        g.linkedThreadIds = [...new Set(g.linkedThreadIds.map(String))];
        g.updatedAt = now;
        saveState(st);
        location.href = `thread-registry.html?focusThread=${encodeURIComponent(thread.id)}`;
      });
    });

    // Open linked thread
    root.querySelectorAll("[data-open-thread]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const tid = btn.getAttribute("data-open-thread");
        if(tid) location.href = `thread-registry.html?focusThread=${encodeURIComponent(tid)}`;
      });
    });

    // Attach existing thread to goal
    root.querySelectorAll("[data-attach-thread]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const goalId = btn.getAttribute("data-attach-thread");
        const sel    = root.querySelector(`[data-attach-thread-select="${cssEscape(goalId)}"]`);
        const tid    = sel ? sel.value : "";
        if(!tid) return;
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
          // Deduplicate
          g.linkedThreadIds = [...new Set(g.linkedThreadIds.map(String))];
          g.updatedAt = nowIso();
          saveState(st); renderFooter(st); render();
        }
      });
    });

    // Focus goal scroll (from URL param)
    if(focusGoalId && !focusGoalDone){
      const el = root.querySelector(`[data-goal-card="${cssEscape(focusGoalId)}"]`);
      if(el){
        focusGoalDone = true;
        el.scrollIntoView({behavior:"smooth", block:"center"});
        el.classList.add("focus-glow");
        setTimeout(()=>el.classList.remove("focus-glow"), 1800);
      }
    }
  }

  render();
}

// =============================================================
// --- Income Map ---
// =============================================================
function initIncomeMap(){
  dbgMarkInit('incomeMap');
  const st = initCommon();

  const startInput    = document.querySelector("#startDate");
  const weekEl        = document.querySelector("#weekNow");
  const checkpointsEl = document.querySelector("#checkpoints");

  if(startInput) startInput.value = st.incomeMap.startDate || "";

  const cps = [
    {week:4,  title:"Tighten focus",     detail:"Drop non-earning distractions",        threadTitle:"Income runway — Week 4: tighten focus",     nextAction:"Pick 1–2 income channels; pause one non-earning distraction."},
    {week:6,  title:"Commit & pipeline", detail:"Commit to 1–2 channels, build pipeline",threadTitle:"Income runway — Week 6: commit & pipeline",  nextAction:"Write next 3 outreach/listing steps; schedule first one today."},
    {week:8,  title:"Evaluate traction", detail:"Escalate if stalled",                  threadTitle:"Income runway — Week 8: evaluate traction",  nextAction:"Review wins/metrics; decide keep / adjust / stop one channel."},
    {week:10, title:"Decision runway",   detail:"SS / part-time / pivot",               threadTitle:"Income runway — Week 10: decision runway",   nextAction:"Draft decision notes + 2 questions; book 1 call if needed."},
  ];

  function render(){
    const w = weekNumberFromStart(st.incomeMap.startDate);
    if(weekEl) weekEl.textContent = w ? `Week ${w} of 12` : `—`;

    checkpointsEl.innerHTML = cps.map(cp=>{
      const isNow      = w ? (w >= cp.week && w < cp.week + 2) : false;
      const isUpcoming = w ? (w < cp.week) : true;
      return `
        <div class="card">
          <h3>Week ${cp.week}: ${cp.title}</h3>
          <div class="small">${cp.detail}</div>
          <div class="row" style="gap:8px; align-items:center; margin-top:10px; flex-wrap:wrap">
            <span class="pill ${isNow ? 'good' : (isUpcoming ? 'warn' : '')}" style="pointer-events:none">
              ${isNow ? 'Current window' : (isUpcoming ? 'Upcoming' : 'Passed')}
            </span>
            ${w ? `<span class="pill" style="pointer-events:none">Current: Week ${w}</span>` : ""}
            <button class="btn mini" data-mkthread="${cp.week}" title="Create a thread in the Registry">Make thread</button>
          </div>
          <div class="small" style="margin-top:10px"><span class="mono">Suggested micro-action:</span> ${escapeHtml(cp.nextAction)}</div>
        </div>`;
    }).join("");

    checkpointsEl.querySelectorAll("[data-mkthread]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const wk = Number(btn.getAttribute("data-mkthread"));
        const cp = cps.find(x=>x.week===wk);
        if(!cp) return;
        const now = nowIso();
        st.threads.push({
          id: uid(), title: cp.threadTitle, status: "active", domain: "Income",
          nextAction: cp.nextAction,
          notes: `Created from Income Map checkpoint (Week ${wk}).\n\n${cp.detail}`,
          createdAt: now, updatedAt: now,
        });
        saveState(st);  // FIX: was saveState() — missing st argument
        toast("Thread created in Thread Registry (domain: Income).");
      });
    });
  }

  if(startInput){
    startInput.addEventListener("change", ()=>{
      st.incomeMap.startDate = startInput.value || null;
      saveState(st); renderFooter(st); render();
    });
  }

  render();
}

// =============================================================
// --- Morning Map ---
// =============================================================
function initMorningMap(){
  dbgMarkInit('morningMap');
  const container = document.querySelector('.container');
  if(!container) return;
  const st = loadState();
  ensureLifeMapSchema(st);

  st.meta = st.meta || {};
  if(!st.meta.systemNotesText) st.meta.systemNotesText = DEFAULT_ORIENTATION_TEXT;
  if(!st.meta.northStarText) st.meta.northStarText = "I'm building a peaceful, independent life with room to create and a stable home.\n\n• No consumer debt\n• Clear housing path\n• Sustainable, sufficient income\n• Time and space for creative work\n• Health managed deliberately";
  if(!st.meta.morningScratch)    st.meta.morningScratch    = '';
  if(!st.meta.ignitionIntent)    st.meta.ignitionIntent    = '';
  if(!st.meta.ignitionFirstMove) st.meta.ignitionFirstMove = '';
  if(!st.meta.ignitionTimebox)   st.meta.ignitionTimebox   = '10';
  if(!st.meta.mvdThreadId)       st.meta.mvdThreadId       = '';
  if(!st.meta.sparkNotes)        st.meta.sparkNotes        = '';

  setSyncIndicator();
  wireModal();
  autoPullIfEnabled();
  renderFooter(st);

  const threads = (st.threads || []).filter(t=>t.status!=="archived");
  const threadOptions = ['<option value="">—</option>'].concat(
    threads.map(t=>`<option value="${esc(String(t.id))}">${esc(t.title||'(untitled)')}</option>`)
  ).join('');

  container.innerHTML = `
    <div class="card hero">
      <div class="h1">Morning Map</div>
      <div class="muted">Orientation first. Execution second.</div>
    </div>

    <div class="quicklinksCard card">
      <div class="cardHeader">
        <div class="h2">Quick links</div>
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
          <div class="h2">Orientation layer</div>
        </div>
        <div class="northStarCard">
          <div class="h2" style="margin-bottom:6px">North Star</div>
          <div id="nsPreview" class="nsPreview"></div>
          <textarea id="nsText" class="nsText" spellcheck="false">${esc(st.meta.northStarText)}</textarea>
          <div class="row" style="margin-top:10px">
            <button class="btn primary" id="nsSave">Save</button>
            <div class="small muted">Keep this short. Read it in 5 seconds.</div>
          </div>
        </div>
        <div class="spacer"></div>
        <div class="card">
          <div class="row" style="justify-content:space-between; align-items:center">
            <div class="h2">System Notes</div>
          </div>
          <textarea id="notesText" class="notesText" spellcheck="false">${esc(st.meta.systemNotesText)}</textarea>
          <div class="row">
            <button class="btn" id="notesSave">Save</button>
          </div>
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <div class="h2">Focus strip</div>
          <div class="muted">Your two active threads for the week.</div>
          <div class="slot"><div class="small">Weekly Slot #1</div><select id="slot1">${threadOptions}</select></div>
          <div class="slot"><div class="small">Weekly Slot #2</div><select id="slot2">${threadOptions}</select></div>
          <div class="row"><button class="btn primary" id="slotsSave">Save</button></div>
        </div>

        <div class="card">
          <div class="h2">Ignition block</div>
          <div class="field">
            <label>Intent (one sentence)</label>
            <input id="igIntent" type="text" placeholder="Example: Make money progress in 10 minutes." value="${esc(st.meta.ignitionIntent)}"/>
          </div>
          <div class="field">
            <label>First move (physical, 60–120 seconds)</label>
            <input id="igMove" type="text" placeholder="Example: Open Etsy drafts and add one photo." value="${esc(st.meta.ignitionFirstMove)}"/>
          </div>
          <div class="field">
            <label>Timebox</label>
            <select id="igTimebox">
              ${['10','15','20','30'].map(v=>`<option value="${v}" ${st.meta.ignitionTimebox===v?'selected':''}>${v} min</option>`).join('')}
            </select>
          </div>
          <div class="row"><button class="btn primary" id="igSave">Save</button></div>
        </div>

        <div class="card">
          <div class="h2">MVD for today</div>
          <div class="field">
            <label>Today's MVD thread</label>
            <select id="mvdThread">${threadOptions}</select>
          </div>
          <div class="row"><button class="btn primary" id="mvdSave">Save</button></div>
        </div>

        <div class="card">
          <div class="h2">Scratchpad</div>
          <textarea id="mmScratch" class="scratch" placeholder="A quick note to future-you...">${esc(st.meta.morningScratch)}</textarea>
          <div class="row"><button class="btn primary" id="mmScratchSave">Save</button></div>
        </div>

        <div class="card">
          <div class="h2">Spark capture</div>
          <textarea id="sparkNotes" class="scratch" placeholder="One per line...">${esc(st.meta.sparkNotes)}</textarea>
          <div class="row"><button class="btn primary" id="sparkSave">Save</button></div>
        </div>
      </div>
    </div>
  `;

  // Set dropdown values
  const slot1El = document.getElementById('slot1');
  const slot2El = document.getElementById('slot2');
  const mvdEl   = document.getElementById('mvdThread');
  if(slot1El) slot1El.value = st.weeklySlots?.slot1 || '';
  if(slot2El) slot2El.value = st.weeklySlots?.slot2 || '';
  if(mvdEl)   mvdEl.value   = st.meta.mvdThreadId   || '';

  const updatePreview = ()=>{
    const first = (document.getElementById('nsText')?.value||'').split('\n').find(l=>l.trim())||'';
    const prev  = document.getElementById('nsPreview');
    if(prev) prev.textContent = first.trim();
  };
  updatePreview();
  document.getElementById('nsText')?.addEventListener('input', updatePreview);

  document.getElementById('nsSave')?.addEventListener('click',()=>{ st.meta.northStarText = document.getElementById('nsText').value; saveState(st); toast('Saved'); updatePreview(); });
  document.getElementById('notesSave')?.addEventListener('click',()=>{ st.meta.systemNotesText = document.getElementById('notesText').value; saveState(st); toast('Saved'); });
  document.getElementById('mmScratchSave')?.addEventListener('click',()=>{ st.meta.morningScratch = document.getElementById('mmScratch').value; saveState(st); toast('Saved'); });
  document.getElementById('sparkSave')?.addEventListener('click',()=>{ st.meta.sparkNotes = document.getElementById('sparkNotes').value; saveState(st); toast('Saved'); });
  document.getElementById('slotsSave')?.addEventListener('click',()=>{
    st.weeklySlots = st.weeklySlots || {};
    st.weeklySlots.slot1 = document.getElementById('slot1').value;
    st.weeklySlots.slot2 = document.getElementById('slot2').value;
    saveState(st); toast('Saved');
  });
  document.getElementById('igSave')?.addEventListener('click',()=>{
    st.meta.ignitionIntent    = document.getElementById('igIntent').value;
    st.meta.ignitionFirstMove = document.getElementById('igMove').value;
    st.meta.ignitionTimebox   = document.getElementById('igTimebox').value;
    saveState(st); toast('Saved');
  });
  document.getElementById('mvdSave')?.addEventListener('click',()=>{ st.meta.mvdThreadId = document.getElementById('mvdThread').value; saveState(st); toast('Saved'); });
}

// =============================================================
// --- Overview (simple read-only) ---
// =============================================================
function initOverview(){
  dbgMarkInit('overview');
  initCommon();
}

// =============================================================
// --- Page router ---
// =============================================================
document.addEventListener("DOMContentLoaded", ()=>{
  dbgRefresh();
  ensureTopbarNav();
  const page = (document.body.getAttribute("data-page")||"").toLowerCase();
  if     (page==="quick")                      { dbgMarkInit('quick');      initQuickCapture();  }
  else if(page==="registry")                   { dbgMarkInit('registry');   initThreadRegistry();}
  else if(page==="morningmap" || page==="home"){ dbgMarkInit('morningMap'); initMorningMap();    }
  else if(page==="lifemap")                    { dbgMarkInit('lifeMap');    initLifeMap();       }
  else if(page==="income")                     { dbgMarkInit('income');     initIncomeMap();     }
  else if(page==="overview")                   { dbgMarkInit('overview');   initOverview();      }
  else                                         { dbgMarkInit('common');     initCommon();        }
});

document.addEventListener("DOMContentLoaded", ()=>{
  try{ const el = document.querySelector("[data-build]"); if(el) el.textContent = BUILD_VERSION; }catch(e){}
});


// ===== BUILD STAMP =====
function injectBuildStamp() {
  // Avoid duplicates
  if (document.getElementById("build-stamp")) return;

  const stamp = document.createElement("div");
  stamp.id = "build-stamp";
  stamp.textContent = "Build " + (typeof BUILD_VERSION !== "undefined" ? BUILD_VERSION : "");
  document.body.appendChild(stamp);
}

// If DOMContentLoaded already fired (fast load / cache), inject immediately.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectBuildStamp);
} else {
  injectBuildStamp();
}

