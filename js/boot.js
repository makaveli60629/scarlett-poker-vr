// SCARLETT — BOOT ROUTER (XR-safe, cache-proof friendly)
// Build: SCARLETT_BOOT_ULTIMATE_v1_7

const BUILD = 'SCARLETT_BOOT_ULTIMATE_v1_7';

// ---- DIAG writer used by modules ----
(function initDiag(){
  const pre = document.getElementById('diagText');
  const hud = document.getElementById('diagHud');
  const t0 = performance.now();

  function stamp(){
    const d = new Date();
    return d.toLocaleTimeString();
  }

  window.__scarlettDiag = {
    lines: [],
    write(line){
      const s = `[${stamp()}] ${String(line)}`;
      this.lines.push(s);
      if (this.lines.length > 400) this.lines.splice(0, this.lines.length - 400);
      if (pre) pre.textContent = this.lines.join('\n');
      if (hud) hud.scrollTop = hud.scrollHeight;
      try{ console.log(s); }catch(_){ }
    },
    mark(key, val){
      this.write(`${key}=${val}`);
    },
    since(){ return (performance.now()-t0).toFixed(0)+'ms'; }
  };

  window.__scarlettDiagWrite = (msg)=>window.__scarlettDiag?.write(msg);
})();

const dwrite = (m)=>window.__scarlettDiagWrite?.(m);

// ---- Fingerprint ----
dwrite(`=== SCARLETT ADMIN DIAG REPORT ===`);
dwrite(`BUILD=${BUILD}`);
dwrite(`HREF=${location.href}`);
dwrite(`secureContext=${window.isSecureContext}`);
dwrite(`ua=${navigator.userAgent}`);
dwrite(`touch=${('ontouchstart' in window)} maxTouchPoints=${navigator.maxTouchPoints||0}`);

// ---- HUD sanity ("button blocked" style checks) ----
(function hudScan(){
  const ids = ['btnEnterVR','btnHideHUD','btnHideUI','btnTeleport','btnDiag','btnSticks','btnAudio'];
  dwrite('');
  dwrite('--- HUD / TOUCH ---');
  for (const id of ids){
    const el = document.getElementById(id);
    if (!el){ dwrite(`${id}=MISSING`); continue; }
    const r = el.getBoundingClientRect();
    const midx = r.left + r.width/2;
    const midy = r.top + r.height/2;
    const top = document.elementFromPoint(midx, midy);
    const blocked = top && top !== el && !el.contains(top);
    dwrite(`${id}=OK blocked=${blocked} top=${top ? (top.tagName.toLowerCase() + (top.id?('#'+top.id):'') + (top.className?('.'+String(top.className).split(' ').join('.')):'')) : 'null'}`);
  }
})();

// ---- Import engine front controller ----
(async function boot(){
  try{
    dwrite('');
    dwrite('--- PREFLIGHT: index.js ---');

    const url = new URL('./scarlett1/index.js', import.meta.url);
    // cache-bust friendly: allow ?v=... on top-level, otherwise stable
    const sp = new URL(location.href).searchParams;
    const v = sp.get('v') || sp.get('cb');
    if (v) url.searchParams.set('v', v);

    dwrite(`import ${url.toString()}`);
    const mod = await import(url.toString());
    await mod.start?.({ build: BUILD });
    dwrite('');
    dwrite('[status] ready ✅');
  } catch (err){
    dwrite('');
    dwrite('[status] BOOT FAILED ❌');
    dwrite(String(err?.stack||err));
    console.error(err);
  }
})();
