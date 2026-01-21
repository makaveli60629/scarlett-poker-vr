// /js/module_manager.js — staged loader (V27.1)
function asUrl(path){
  try { return (new URL(path)).href; } catch(_) {}
  let p = String(path).trim();
  if (p.startsWith("/")) p = p.slice(1);
  return new URL(p, new URL("./", window.location.href).href).href;
}

function markLoaded(label, url){
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT._loadedModules = window.SCARLETT._loadedModules || {};
  window.SCARLETT._loadedModules[label] = { url, t: Date.now() };
}
function isLoaded(label){
  return !!window.SCARLETT?._loadedModules?.[label];
}

export async function loadModules(list, { diagWrite, ctx, skipIfLoaded=true } = {}){
  const out = { ok: [], loaded: [], skipped: [], fail: [] };
  for (const item of list){
    const label = item.label || item.path || "module";
    const path = item.path;
    const url = asUrl(path);

    if (skipIfLoaded && isLoaded(label)){
      out.skipped.push({ label, path, url });
      diagWrite?.(`[load] skipped (already): ${label}`);
      continue;
    }

    try{
      const mod = await import(url);
      out.loaded.push({ label, path, url });
      markLoaded(label, url);

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
  return [{ label:"scarlett1/index", path:"./js/scarlett1/index.js" }];
}

// Auto Stage Builder (requires Scan Repo first)
function buildAutoStages(){
  const present = window.SCARLETT?.repoScan?.present || [];
  const paths = present.map(p => p.path || p).filter(Boolean);

  const excludeParts = [
    "js/app.js", "js/module_loader.js", "js/module_manager.js", "js/repo_scanner.js",
    "js/world.js", "js/move.js", "js/spawn.js", "js/android_pads.js",
    "boot.js", "boot1.js", "boot2.js",
  ];
  const isExcluded = (p) => excludeParts.some(x => p.toLowerCase().includes(x.toLowerCase()));
  const mk = (p) => ({ label: p.replace(/^js\//, ""), path: "./" + p });

  const stage2Keys = [
    "pip", "jumbotron", "stream", "playlist", "m3u", "channel", "tv",
    "ui", "hud", "menu", "button",
    "table", "poker", "seat", "chair", "dealer",
    "cards", "chips"
  ];

  const stage3Keys = [
    "avatar", "npc", "bystander", "guard",
    "store", "shop", "vip", "balcony", "stairs", "lobby",
    "lighting", "decor", "sign", "banner",
    "hand", "gesture", "interact", "grab"
  ];

  const stage2 = [];
  const stage3 = [];

  for (const p of paths){
    const pl = p.toLowerCase();
    if (!pl.endsWith(".js")) continue;
    if (isExcluded(pl)) continue;

    const hit2 = stage2Keys.some(k => pl.includes(k));
    const hit3 = stage3Keys.some(k => pl.includes(k));

    if (hit2) stage2.push(mk(p));
    else if (hit3) stage3.push(mk(p));
  }

  const order = (a,b) => {
    const pa=a.path, pb=b.path;
    const wa = pa.includes("/js/modules/") ? 0 : (pa.includes("/js/scarlett1/") ? 1 : 2);
    const wb = pb.includes("/js/modules/") ? 0 : (pb.includes("/js/scarlett1/") ? 1 : 2);
    return wa - wb || pa.localeCompare(pb);
  };
  stage2.sort(order);
  stage3.sort(order);

  return { stage2, stage3 };
}

export function autoStage2(){ return buildAutoStages().stage2; }
export function autoStage3(){ return buildAutoStages().stage3; }
