const BUILD_VERSION = 'v13';
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
    const hasWeek = lm.horizons.week && lm.horizons.week.domains;
    const hasMonth = lm.horizons.month && lm.horizons.month.domains;
    const hasQuarter = lm.horizons.quarter && lm.horizons.quarter.domains;
    if(hasWeek && hasMonth && hasQuarter){
      if(!lm.domains) lm.domains = ["Income","Financial","Home","Health","Relationships"];
      if(!lm.defaultUrgency) lm.defaultUrgency = "medium";
      return lm;
    }
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
        const it = st.inbox.find(x=>x.id===id);
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
        .map(t=>`<option value="${t.id}" ${t.id===selectedId?"selected":""}>${escapeHtml(t.title)}</option>`)
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
        const it = st.inbox.find(x=>x.id===id);
        if(it){ it.status="archived"; saveState(st); renderFooter(st); render(); }
      });
    });

    inboxEl.querySelectorAll("[data-mkthread]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-mkthread");
        const it = st.inbox.find(x=>x.id===id);
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
        const it = st.inbox.find(x=>x.id===id);
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
      const inSlot = (st.weekly.slot1===t.id || st.weekly.slot2===t.id);
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
                <option value="archived">archived</option>
              </select>
            </div>
          </div>

          <label style="margin-top:10px">Notes</label>
          <textarea data-notes="${t.id}" placeholder="Context, constraints, next thoughts…">${escapeHtml(t.notes || "")}</textarea>

          <div class="row" style="margin-top:10px">
            <button class="btn primary" data-save="${t.id}">Save</button>
            <button class="btn" data-focus="${t.id}">Focus this week</button>
            <button class="btn warn" data-copy="${t.id}">Copy micro-action</button>
          </div>
        </div>
      `;
    }).join("") : `<p class="small">No threads yet. Create one below, or process the inbox.</p>`;

    threadsEl.querySelectorAll("[data-save]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-save");
        const th = st.threads.find(x=>x.id===id);
        if(!th) return;

        const next = document.querySelector(`[data-next="${id}"]`)?.value ?? "";
        const notes = document.querySelector(`[data-notes="${id}"]`)?.value ?? "";
        const status = document.querySelector(`[data-status="${id}"]`)?.value ?? "active";

        th.nextAction = next.trim();
        th.notes = notes.trim();
        th.status = status;
        th.updatedAt = nowIso();

        if(status==="archived"){
          if(st.weekly.slot1===id) st.weekly.slot1=null;
          if(st.weekly.slot2===id) st.weekly.slot2=null;
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
        const th = st.threads.find(x=>x.id===id);
        if(!th) return;
        try{
          await navigator.clipboard.writeText(th.nextAction || "");
          alert("Micro-action copied.");
        }catch{
          alert("Couldn’t access clipboard in this browser.");
        }
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
  const st = initCommon();

  const root = document.querySelector("#lifeMapRoot");
  if(!root) return;

  const horizons = ["week","month","quarter"];
  const domains = st.lifeMap.domains;

  function goalRow(hKey, domain, g){
    const dClass = domainClass(domain);
    const urgency = g.urgency || st.lifeMap.defaultUrgency || "medium";
    const notesLines = (g.notes||"").split("\n").filter(x=>x.trim());
    const mini = notesLines.slice(0,3).map(x=>`<li>${escapeHtml(x)}</li>`).join("");
    const more = notesLines.length>3 ? `<div class="small">+${notesLines.length-3} more</div>` : "";
    const leftBtn = (hKey!=="week") ? `<button class="btn" data-demote="${g.id}" data-h="${hKey}" data-d="${escapeAttr(domain)}">⬅</button>` : `<span></span>`;
    const rightBtn = (hKey!=="quarter") ? `<button class="btn" data-promote="${g.id}" data-h="${hKey}" data-d="${escapeAttr(domain)}">➡</button>` : `<span></span>`;
    return `
      <div class="goal ${dClass}">
        <div class="domain-strip"></div>
        <div class="goal-head">
          <div>
            <strong>${escapeHtml(g.title||"")}</strong>
            <div class="meta">
              <span class="pill ${urgencyPill(urgency)}">${urgencyLabel(urgency)}</span>
              <span class="pill">${escapeHtml(domain)}</span>
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
        saveState(st); renderFooter(st);
      });
    });

    root.querySelectorAll("[data-delete-goal]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-delete-goal");
        const hKey = btn.getAttribute("data-h");
        const domain = btn.getAttribute("data-d");
        if(!confirm("Delete this goal?")) return;
        const list = st.lifeMap.horizons[hKey].domains[domain];
        const idx = list.findIndex(x=>x.id===id);
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
        saveState(st); renderFooter(st);
        alert("Thread created. Go to Thread Registry to work it.");
      });
    });
  }

  function firstLine(txt){
    return (txt||"").split("\n").map(x=>x.trim()).find(Boolean) || "";
  }

  function findGoal(hKey, domain, id){
    const list = st.lifeMap.horizons[hKey]?.domains?.[domain] || [];
    return list.find(x=>x.id===id);
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
    const i = fromList.findIndex(x=>x.id===id);
    if(i<0) return;
    const [g] = fromList.splice(i,1);
    g.updatedAt = nowIso();
    st.lifeMap.horizons[toKey].domains[domain].unshift(g);

    saveState(st); renderFooter(st); render();
  }

  // Helpers for UI labels
  function urgencyLabel(u){ return u==="high"?"High":(u==="low"?"Low":"Medium"); }
  function urgencyPill(u){ return u==="high"?"bad":(u==="low"?"good":"warn"); }

  function cssEscape(s){
    return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_\-]/g, "\$&");
  }

  render();
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
  const page = document.body.getAttribute("data-page");
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
