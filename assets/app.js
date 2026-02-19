const BUILD_VERSION = 'v28';
console.log('Planner build', BUILD_VERSION);

// Planner (Thread System) - localStorage-first, plus optional GitHub Gist sync.

const STORE_KEY = "planner.data.v1";
const SYNC_KEY  = "planner.sync.v1"; // {gistId, token, autoPull:true}
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
  return (s ?? "").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}

function escapeAttr(s){
  return escapeHtml(s);
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
  const st = initCommon();

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
  const st = initCommon();

  const inboxEl = document.querySelector("#registryInbox");
  const threadsEl = document.querySelector("#threadsList");
  const form = document.querySelector("#newThreadForm");

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
    const activeThreads = st.threads
      .filter(t=>t.status!=="archived")
      .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));

    threadsEl.innerHTML = activeThreads.length ? activeThreads.map(t=>{
      const inSlot = (String(st.weekly.slot1)===String(t.id) || String(st.weekly.slot2)===String(t.id));
      const pill = inSlot ? `<span class="pill good">Active this week</span>` : `<span class="pill">Backlog</span>`;
      return `
        <div class="item ${domainClass(t.domain)}">
          <div class="domain-strip"></div>
          <strong>${escapeHtml(t.title)}</strong>
          <div class="meta">
            ${pill}
            ${t.domain ? `<span class="pill">${escapeHtml(t.domain)}</span>` : ``}
            <span class="mono">Updated: ${new Date(t.updatedAt).toLocaleString()}</span>
          </div>

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
  const state = loadState();

  // Ensure minimal shape exists
  if(!state.lifeMap) state.lifeMap = { version: 2, domains: ["Income","Financial","Home","Health","Relationships"], defaultUrgency: "medium", horizons: {} };
  if(!Array.isArray(state.lifeMap.domains)) state.lifeMap.domains = ["Income","Financial","Home","Health","Relationships"];
  if(!state.lifeMap.horizons || typeof state.lifeMap.horizons !== "object") state.lifeMap.horizons = {};
  const horizons = [
    { key: "week", label: "This Week", open: true },
    { key: "month", label: "This Month", open: false },
    { key: "quarter", label: "3 Months", open: false },
  ];

  // normalize buckets: horizons[key].domains[domain] -> []
  horizons.forEach(h=>{
    if(!state.lifeMap.horizons[h.key]) state.lifeMap.horizons[h.key] = { domains: {} };
    if(!state.lifeMap.horizons[h.key].domains || typeof state.lifeMap.horizons[h.key].domains !== "object") state.lifeMap.horizons[h.key].domains = {};
    state.lifeMap.domains.forEach(d=>{
      if(!Array.isArray(state.lifeMap.horizons[h.key].domains[d])) state.lifeMap.horizons[h.key].domains[d] = [];
    });
  });

  saveState(state);

  const root = document.querySelector("#app") || document.body;

  const countIn = (hKey) => {
    const doms = state.lifeMap.horizons[hKey].domains;
    let n = 0;
    state.lifeMap.domains.forEach(d=> n += (doms[d]||[]).length);
    return n;
  };

  // Build HTML
  let html = `
    <div class="lm-stack">
      <div class="lm-topbar">
        <h1>Strategic Life Map</h1>
        <div class="lm-muted">Build ${BUILD_VERSION}</div>
      </div>
  `;

  horizons.forEach(h=>{
    const total = countIn(h.key);
    const hiCount = (() => {
      let c=0;
      const doms = state.lifeMap.horizons[h.key].domains;
      state.lifeMap.domains.forEach(d=>{
        (doms[d]||[]).forEach(g=>{
          const u = (g.urgency || state.lifeMap.defaultUrgency || "medium").toLowerCase();
          if(u==="high") c++;
        });
      });
      return c;
    })();

    html += `
      <details class="lm-horizon" ${h.open ? "open" : ""} data-horizon="${h.key}">
        <summary>
          <span>${h.label}</span>
          <span class="lm-hdr-meta">${total} goals${hiCount?` • ${hiCount} High`:``}</span>
        </summary>
        <div class="lm-body">
    `;

    state.lifeMap.domains.forEach(domain=>{
      const goals = state.lifeMap.horizons[h.key].domains[domain] || [];
      const high = goals.filter(g=>((g.urgency||state.lifeMap.defaultUrgency||"medium").toLowerCase()==="high")).length;
      html += `
        <details class="lm-domain" data-domain="${escapeAttr(domain)}" data-horizon="${h.key}">
          <summary>
            <span>${domain}</span>
            <span class="lm-domain-meta">${goals.length} goals${high?` • ${high} High`:``}</span>
          </summary>
          <div class="lm-domain-body">
            <div class="lm-addrow">
              <input type="text" placeholder="Add goal…" data-lm-new-title="${escapeAttr(h.key)}::${escapeAttr(domain)}" />
              <select data-lm-new-urgency="${escapeAttr(h.key)}::${escapeAttr(domain)}">
                <option value="high">High</option>
                <option value="medium" selected>Medium</option>
                <option value="low">Low</option>
              </select>
              <button class="btn" data-lm-add-goal="${escapeAttr(h.key)}::${escapeAttr(domain)}">Add</button>
            </div>
            <div class="lm-goals">
      `;

      if(goals.length===0){
        html += `<div class="lm-muted">No goals yet.</div>`;
      } else {
        goals.forEach(g=>{
          const title = g.title || g.name || "(untitled)";
          const urgency = (g.urgency || state.lifeMap.defaultUrgency || "medium").toLowerCase();
          const pill = urgency === "high" ? "High" : urgency === "low" ? "Low" : "Medium";
          html += `
            <div class="lm-card" data-lm-goal-card="${escapeAttr(h.key)}::${escapeAttr(domain)}::${escapeAttr(String(g.id))}">
              <div class="lm-card-top">
                <div>
                  <div class="lm-title">${escapeHtml(title)}</div>
                  ${g.notes ? `<div class="lm-muted">${escapeHtml(g.notes)}</div>` : ``}
                </div>
                <span class="lm-pill">${pill}</span>
              </div>
              <div class="lm-actions">
                <button class="btn" data-lm-demote="${escapeAttr(h.key)}::${escapeAttr(domain)}::${escapeAttr(String(g.id))}">←</button>
                <button class="btn" data-lm-promote="${escapeAttr(h.key)}::${escapeAttr(domain)}::${escapeAttr(String(g.id))}">→</button>
                <button class="btn" data-lm-edit="${escapeAttr(h.key)}::${escapeAttr(domain)}::${escapeAttr(String(g.id))}">Edit</button>
                <button class="btn danger" data-lm-delete="${escapeAttr(h.key)}::${escapeAttr(domain)}::${escapeAttr(String(g.id))}">Delete</button>
              </div>
            </div>
          `;
        });
      }

      html += `
            </div>
          </div>
        </details>
      `;
    });

    html += `
        </div>
      </details>
    `;
  });

  html += `</div>`;
  root.innerHTML = html;

  // Wire handlers (delegated)
  root.addEventListener("click", (ev) => {
    const el = ev.target;
    if(!(el instanceof HTMLElement)) return;

    const addKey = el.getAttribute("data-lm-add-goal");
    if(addKey){
      const [hKey, domain] = addKey.split("::");
      const titleEl = root.querySelector(`[data-lm-new-title="${CSS.escape(hKey)}::${CSS.escape(domain)}"]`);
      const urgEl = root.querySelector(`[data-lm-new-urgency="${CSS.escape(hKey)}::${CSS.escape(domain)}"]`);
      const title = (titleEl && "value" in titleEl) ? String(titleEl.value).trim() : "";
      const urgency = (urgEl && "value" in urgEl) ? String(urgEl.value).trim().toLowerCase() : (state.lifeMap.defaultUrgency||"medium");
      if(!title){ alert("Add a goal name first."); return; }
      const st = loadState();
      const bucket = st.lifeMap.horizons[hKey].domains[domain];
      bucket.push({ id: Date.now(), title, urgency, notes:"", createdAt: nowIso(), updatedAt: nowIso() });
      saveState(st);
      initLifeMap();
      return;
    }

    const parse = (v) => v ? v.split("::") : null;

    const del = parse(el.getAttribute("data-lm-delete"));
    if(del){
      const [hKey, domain, gid] = del;
      if(!confirm("Delete this goal? This cannot be undone.")) return;
      const st = loadState();
      const bucket = st.lifeMap.horizons[hKey].domains[domain] || [];
      st.lifeMap.horizons[hKey].domains[domain] = bucket.filter(g=>String(g.id)!==String(gid));
      saveState(st);
      initLifeMap();
      return;
    }

    const edit = parse(el.getAttribute("data-lm-edit"));
    if(edit){
      const [hKey, domain, gid] = edit;
      const st = loadState();
      const bucket = st.lifeMap.horizons[hKey].domains[domain] || [];
      const g = bucket.find(x=>String(x.id)===String(gid));
      if(!g) return;
      const title = prompt("Goal name:", g.title||"");
      if(title===null) return;
      g.title = title.trim();
      const notes = prompt("Notes (optional):", g.notes||"");
      if(notes===null) return;
      g.notes = notes;
      g.updatedAt = nowIso();
      saveState(st);
      initLifeMap();
      return;
    }

    const move = (fromKey, toKey, domain, gid) => {
      const st = loadState();
      const from = st.lifeMap.horizons[fromKey].domains[domain] || [];
      const idx = from.findIndex(x=>String(x.id)===String(gid));
      if(idx<0) return;
      const g = from.splice(idx,1)[0];
      g.updatedAt = nowIso();
      st.lifeMap.horizons[fromKey].domains[domain] = from;
      st.lifeMap.horizons[toKey].domains[domain].push(g);
      saveState(st);
      initLifeMap();
    };

    const prom = parse(el.getAttribute("data-lm-promote"));
    if(prom){
      const [hKey, domain, gid] = prom;
      if(hKey==="week") return;
      if(hKey==="month") move("month","week",domain,gid);
      if(hKey==="quarter") move("quarter","month",domain,gid);
      return;
    }

    const dem = parse(el.getAttribute("data-lm-demote"));
    if(dem){
      const [hKey, domain, gid] = dem;
      if(hKey==="quarter") return;
      if(hKey==="week") move("week","month",domain,gid);
      if(hKey==="month") move("month","quarter",domain,gid);
      return;
    }
  });
}


// --- Income Map ---
function initIncomeMap(){
  const st = initCommon();

  const startInput = document.querySelector("#startDate");
  const weekEl = document.querySelector("#weekNow");
  const checkpointsEl = document.querySelector("#checkpoints");

  startInput.value = st.incomeMap.startDate || "";

  function render(){
    const w = weekNumberFromStart(st.incomeMap.startDate);
    weekEl.textContent = w ? `Week ${w} of 12` : "Set a start date to compute your week.";
    const cp = [
      {w:4, label:"Week 4: tighten focus, drop non-earning distractions"},
      {w:6, label:"Week 6: commit to 1–2 income channels, build pipeline"},
      {w:8, label:"Week 8: evaluate traction; escalate if stalled"},
      {w:10, label:"Week 10: decision runway for next phase (SS / part-time / pivot)"}
    ];
    checkpointsEl.innerHTML = cp.map(x=>{
      const tone = w && w >= x.w ? "good" : "warn";
      return `<div class="item">
        <strong>${escapeHtml(x.label)}</strong>
        <div class="meta">
          <span class="pill ${tone}">${w && w>=x.w ? "Reached" : "Upcoming"}</span>
          ${w ? `<span class="pill">Current: Week ${w}</span>` : ``}
        </div>
      </div>`;
    }).join("");
  }

  startInput.addEventListener("change", ()=>{
    st.incomeMap.startDate = startInput.value || null;
    saveState(st); renderFooter(st); render();
  });

  render();
}

// --- Page router ---
document.addEventListener("DOMContentLoaded", ()=>{
  const page = (document.body.getAttribute("data-page")||"").toLowerCase();
  if(page==="quick") initQuickCapture();
  else if(page==="registry") initThreadRegistry();
  else if(page==="lifemap") initLifeMap();
  else if(page==="income") initIncomeMap();
  else initCommon();
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
      if(typeof initThreadRegistry === "function") initThreadRegistry();
    }catch(e){
      console.error("Auto-archive failed", e);
    }
  }
});
