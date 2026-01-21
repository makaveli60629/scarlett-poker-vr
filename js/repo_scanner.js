// /js/repo_scanner.js — GitHub Pages repo scanner (V27)
const DEFAULT = { owner: "makaveli60629", repo: "scarlett-poker-vr", branch: "main", root: "js" };
function t(){ return (performance.now()/1000).toFixed(3); }

async function ghContents({owner, repo, path, branch}){
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}`);
  return res.json();
}

const isJs = (name) => /\.m?js$/i.test(name);
const isCandidate = (p) =>
  /\/modules\//.test(p) ||
  /\/scarlett1\//.test(p) ||
  /_module\.js$/i.test(p) ||
  /_system\.js$/i.test(p) ||
  /\/world_parts\//.test(p);

function pageBase(){ return new URL("./", window.location.href).href; }
function toSiteUrl(repoRelPath){ return new URL(repoRelPath, pageBase()).href; }

async function probe(url){
  try{
    const r = await fetch(url, { method:"GET", cache:"no-store" });
    return { ok:r.ok, status:r.status };
  } catch(e){
    return { ok:false, status:0, err:e?.message || String(e) };
  }
}

export async function scanRepo({ diagWrite, config } = {}){
  const cfg = { ...DEFAULT, ...(config||{}) };
  const discovered = [];
  const candidates = [];

  diagWrite?.(`[scan] ${t()} start owner=${cfg.owner} repo=${cfg.repo} branch=${cfg.branch} root=${cfg.root}`);

  const queue = [cfg.root];
  let reqs = 0;

  while (queue.length){
    const path = queue.shift();
    reqs++;
    if (reqs > 140) { diagWrite?.(`[scan] abort: too many requests (${reqs})`); break; }

    let items;
    try { items = await ghContents({ owner:cfg.owner, repo:cfg.repo, branch:cfg.branch, path }); }
    catch(e){ diagWrite?.(`[scan] WARN ${e?.message || e}`); continue; }

    if (Array.isArray(items)){
      for (const it of items){
        if (it.type === "dir") queue.push(it.path);
        else if (it.type === "file" && isJs(it.name)){
          discovered.push(it.path);
          if (isCandidate(it.path)) candidates.push(it.path);
        }
      }
    }
  }

  diagWrite?.(`[scan] discovered=${discovered.length} candidates=${candidates.length} apiRequests=${reqs}`);

  const present = [];
  const missing = [];
  for (const p of candidates){
    const url = toSiteUrl(p);
    const pr = await probe(url);
    (pr.ok ? present : missing).push({ path:p, url, status: pr.status });
  }

  diagWrite?.(`[scan] present=${present.length} missing=${missing.length}`);
  return { cfg, discovered, candidates, present, missing };
}
