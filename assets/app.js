// Runway / Thread System - localStorage-first, zero backend.

const STORE_KEY = "runwaySystem.v1";

function nowIso(){ return new Date().toISOString(); }
function uid(){ return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }

function defaultState(){
  return {
    meta: { createdAt: nowIso(), updatedAt: nowIso(), title: "Runway System" },
    inbox: [], // {id, text, createdAt, status:'open'|'archived'}
    threads: [], // {id,title,status,domain,nextAction,notes,createdAt,updatedAt}
    weekly: { slot1: null, slot2: null, weekOf: null }, // weekOf ISO date (Monday)
    lifeMap: { domains: [
      { id: uid(), name:"Health", notes:"" },
      { id: uid(), name:"Work / Income", notes:"" },
      { id: uid(), name:"Relationships", notes:"" },
      { id: uid(), name:"Home / Environment", notes:"" },
      { id: uid(), name:"Creative / Meaning", notes:"" }
    ]},
    incomeMap: { startDate: null } // YYYY-MM-DD
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return defaultState();
    const st = JSON.parse(raw);
    // minimal migration safety
    if(!st.meta) st.meta = { createdAt: nowIso(), updatedAt: nowIso(), title:"Runway System" };
    if(!st.inbox) st.inbox = [];
    if(!st.threads) st.threads = [];
    if(!st.weekly) st.weekly = { slot1:null, slot2:null, weekOf:null };
    if(!st.lifeMap) st.lifeMap = defaultState().lifeMap;
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
  const blob = new Blob([JSON.stringify(st,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "runway-system-backup.json";
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

// --- Page Initializers ---
function initCommon(){
  const st = loadState();
  setActiveNav();
  renderFooter(st);

  // global export/import hooks if present
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
function initThreadRegistry(){
  const st = initCommon();

  const inboxEl = document.querySelector("#registryInbox");
  const threadsEl = document.querySelector("#threadsList");
  const form = document.querySelector("#newThreadForm");

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
        <div class="item">
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
  const domainsEl = document.querySelector("#domains");

  function render(){
    domainsEl.innerHTML = st.lifeMap.domains.map(d=>`
      <div class="item">
        <strong>${escapeHtml(d.name)}</strong>
        <label>Notes / current focus</label>
        <textarea data-domain="${d.id}">${escapeHtml(d.notes||"")}</textarea>
        <div class="row" style="margin-top:10px">
          <button class="btn primary" data-save="${d.id}">Save</button>
        </div>
      </div>
    `).join("");

    domainsEl.querySelectorAll("[data-save]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-save");
        const dom = st.lifeMap.domains.find(x=>x.id===id);
        const val = document.querySelector(`[data-domain="${id}"]`)?.value ?? "";
        dom.notes = val.trim();
        saveState(st); renderFooter(st);
      });
    });
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
