// /js/module_manager.js — staged loader (V27)
function asUrl(path){
  try { return (new URL(path)).href; } catch(_) {}
  let p = String(path).trim();
  if (p.startsWith("/")) p = p.slice(1);
  return new URL(p, new URL("./", window.location.href).href).href;
}

export async function loadModules(list, { diagWrite, ctx } = {}){
  const out = { ok: [], loaded: [], fail: [] };
  for (const item of list){
    const label = item.label || item.path || "module";
    const path = item.path;
    const url = asUrl(path);
    try{
      const mod = await import(url);
      out.loaded.push({ label, path, url });
      if (typeof mod.init === "function"){
        await mod.init(ctx || {});
        out.ok.push({ label, path, url });
        diagWrite?.(`[load] init OK: ${label}`);
      } else {
        diagWrite?.(`[load] loaded (no init): ${label}`);
      }
    } catch(e){
      out.fail.push({ label, path, url, reason: e?.message || String(e) });
      diagWrite?.(`[load] FAIL: ${label} (${e?.message || e})`);
    }
  }
  return out;
}

export function safeSet(){
  return [
    { label:"pip/jumbotron", path:"./js/modules/jumbotron.js" },
    { label:"audio", path:"./js/modules/audio.js" },
    { label:"bots", path:"./js/modules/bots.js" },
    { label:"cards", path:"./js/modules/cards.js" },
    { label:"chips", path:"./js/modules/chips.js" },
  ];
}

export function scarlett1Set(){
  return [
    { label:"scarlett1/index", path:"./js/scarlett1/index.js" },
  ];
}
