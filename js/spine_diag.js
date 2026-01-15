/* /js/scarlett1/spine_diag.js — Scarlett Diagnostics HUD (Permanent) v1.0
   - Works even if Three/world fails
   - Captures console logs automatically
   - Buttons: Copy Logs, Clear, Reload, Hide/Show HUD
   - Global: window.SpineDiag
*/
(() => {
  const S = {
    mounted:false,
    visible:true,
    status:"Booting...",
    lines:[],
    max:800,
    el:{ root:null, status:null, log:null, btnRow:null, hideBtn:null, pill:null }
  };

  const ts = () => {
    const d=new Date();
    return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+":"+String(d.getSeconds()).padStart(2,"0");
  };

  function mount(){
    if(S.mounted) return;
    S.mounted=true;

    const root=document.createElement("div");
    root.id="scarlettDiag";
    root.style.cssText=[
      "position:fixed","left:12px","top:12px","right:12px","max-width:760px",
      "z-index:999999","border-radius:16px","padding:14px",
      "background:rgba(10,16,28,0.92)","border:1px solid rgba(120,160,255,0.35)",
      "box-shadow:0 10px 30px rgba(0,0,0,0.55)","color:#eaf0ff",
      "font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif",
      "backdrop-filter:blur(8px)"
    ].join(";");

    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div>
          <div style="font-size:20px;font-weight:800;line-height:1.05;">Scarlett Diagnostics</div>
          <div id="sdStatus" style="opacity:0.9;margin-top:4px;font-size:14px;">${S.status}</div>
        </div>
        <button id="sdHide" style="min-width:140px;padding:12px 14px;font-weight:800;border-radius:12px;border:1px solid rgba(120,160,255,0.35);background:rgba(70,110,255,0.22);color:#eaf0ff;">
          Hide HUD
        </button>
      </div>
      <div id="sdBtns" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;"></div>
      <div style="margin-top:12px;padding:10px;border-radius:12px;border:1px solid rgba(120,160,255,0.18);background:rgba(0,0,0,0.30);">
        <div style="font-size:12px;opacity:0.85;margin-bottom:8px;">Logs (auto-captured)</div>
        <pre id="sdLog" style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.35;max-height:44vh;overflow:auto;"></pre>
      </div>
    `;
    document.body.appendChild(root);

    S.el.root=root;
    S.el.status=root.querySelector("#sdStatus");
    S.el.log=root.querySelector("#sdLog");
    S.el.btnRow=root.querySelector("#sdBtns");
    S.el.hideBtn=root.querySelector("#sdHide");

    S.el.hideBtn.addEventListener("click", () => api.toggle());

    api.addButton("Copy Logs", async () => {
      const text = api.exportText();
      try {
        await navigator.clipboard.writeText(text);
        api.log("Copied logs ✅");
      } catch (e) {
        window.prompt("Copy logs:", text);
      }
    });

    api.addButton("Clear", () => { S.lines.length=0; renderLog(); api.log("Cleared."); });
    api.addButton("Reload", () => { api.log("Reloading..."); location.reload(); });

    renderStatus(); renderLog();
  }

  function renderStatus(){ if(S.el.status) S.el.status.textContent=S.status; }
  function renderLog(){
    if(!S.el.log) return;
    S.el.log.textContent = S.lines.join("\n");
    S.el.log.scrollTop = S.el.log.scrollHeight;
  }

  function push(level,args){
    mount();
    const parts=args.map(a=>{
      try { return (typeof a==="string")?a:JSON.stringify(a); }
      catch { return String(a); }
    });
    S.lines.push(`[${ts()}] ${level}: ${parts.join(" ")}`);
    if(S.lines.length>S.max) S.lines.splice(0, S.lines.length-S.max);
    renderLog();
  }

  const orig = { log:console.log.bind(console), warn:console.warn.bind(console), error:console.error.bind(console) };
  function patchConsole(){
    if(console.__scarlettPatched) return;
    console.__scarlettPatched=true;
    console.log=(...a)=>{ orig.log(...a); push("LOG",a); };
    console.warn=(...a)=>{ orig.warn(...a); push("WARN",a); };
    console.error=(...a)=>{ orig.error(...a); push("ERR",a); };
    window.addEventListener("error",(e)=>push("ERR",[e.message||"window.error", e.filename, e.lineno, e.colno]));
    window.addEventListener("unhandledrejection",(e)=>push("ERR",["unhandledrejection", String(e.reason)]));
  }

  const api = {
    init(){
      mount(); patchConsole();
      api.log("Diagnostics ready ✅");
      api.log("href:", location.href);
      api.log("ua:", navigator.userAgent);
      api.log("secureContext:", !!window.isSecureContext);
      api.log("navigator.xr:", !!(navigator && navigator.xr));
    },
    setStatus(s){ S.status=String(s||""); mount(); renderStatus(); },
    log:(...a)=>push("LOG",a),
    warn:(...a)=>push("WARN",a),
    error:(...a)=>push("ERR",a),
    addButton(label, fn){
      mount();
      const b=document.createElement("button");
      b.textContent=label;
      b.style.cssText="padding:10px 12px;border-radius:12px;border:1px solid rgba(120,160,255,0.25);background:rgba(255,255,255,0.06);color:#eaf0ff;font-weight:800;";
      b.addEventListener("click",()=>{ try{ fn&&fn(); }catch(e){ api.error("Button error:", label, e); }});
      S.el.btnRow.appendChild(b);
      return b;
    },
    show(){
      mount(); S.visible=true; S.el.root.style.display=""; if(S.el.pill){ S.el.pill.remove(); S.el.pill=null; }
    },
    hide(){ mount(); S.visible=false; S.el.root.style.display="none"; },
    toggle(){
      mount();
      if(S.visible){
        S.visible=false; S.el.root.style.display="none";
        if(!S.el.pill){
          const p=document.createElement("button");
          p.textContent="Show HUD";
          p.id="scarlettDiagPill";
          p.style.cssText="position:fixed;left:12px;top:12px;z-index:999999;padding:10px 12px;border-radius:999px;border:1px solid rgba(120,160,255,0.35);background:rgba(70,110,255,0.22);color:#eaf0ff;font-weight:800;";
          document.body.appendChild(p);
          p.addEventListener("click",()=>{ p.remove(); S.el.pill=null; api.show(); });
          S.el.pill=p;
        }
      } else {
        api.show();
      }
    },
    exportText(){
      return [
        "Scarlett Diagnostics Export",
        `href=${location.href}`,
        `ua=${navigator.userAgent}`,
        `secureContext=${!!window.isSecureContext}`,
        `navigator.xr=${!!(navigator && navigator.xr)}`,
        "---- LOGS ----",
        S.lines.join("\n")
      ].join("\n");
    }
  };

  window.SpineDiag = api;

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ()=>api.init());
  else api.init();
})();
