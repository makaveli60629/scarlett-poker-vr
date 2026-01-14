// /js/boot.js — Scarlett Boot Diagnostics v1.1 (FULL + On-Screen Log)
// Goal: Identify WHY dynamic import fails on Quest by probing the entire import graph
// and showing results ON SCREEN (no devtools needed).

(() => {
  const stamp = Date.now();

  // Use LET so we can wrap these to also print on-screen.
  let log = (...a) => console.log("[BOOT]", ...a);
  let warn = (...a) => console.warn("[BOOT]", ...a);
  let err = (...a) => console.error("[BOOT]", ...a);

  // --- FORCE BOOT LOGS ON SCREEN (Quest-safe) ---
  // This overlay appears on top of your app and shows BOOT logs even in VR.
  const overlay = document.createElement("pre");
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = "100%";
  overlay.style.maxHeight = "55%";
  overlay.style.overflow = "auto";
  overlay.style.background = "rgba(0,0,0,0.86)";
  overlay.style.color = "#0f0";
  overlay.style.fontSize = "12px";
  overlay.style.zIndex = "99999";
  overlay.style.padding = "8px";
  overlay.style.whiteSpace = "pre-wrap";
  overlay.style.pointerEvents = "none"; // don't block your UI
  overlay.textContent = "[BOOT SCREEN LOG]\n";
  // Wait for body
  (document.body ? Promise.resolve() : new Promise(r => window.addEventListener("DOMContentLoaded", r, { once: true })))
    .then(() => document.body.appendChild(overlay))
    .catch(() => {});

  function screenLine(...a) {
    try {
      overlay.textContent += a.join(" ") + "\n";
      overlay.scrollTop = overlay.scrollHeight;
    } catch {}
  }

  // Mirror console logs into on-screen overlay
  const _log = log, _warn = warn, _err = err;
  log = (...a) => { _log(...a); screenLine(...a); };
  warn = (...a) => { _warn(...a); screenLine("WARN:", ...a); };
  err = (...a) => { _err(...a); screenLine("ERR:", ...a); };

  // --- base path detection (GitHub Pages repo sites) ---
  // Example: https://makaveli60629.github.io/scarlett-poker-vr/ -> base "/scarlett-poker-vr/"
  const path = location.pathname;
  const base = (path.includes("/scarlett-poker-vr/"))
    ? "/scarlett-poker-vr/"
    : (path.endsWith("/") ? path : path.replace(/[^/]+$/, ""));

  log(`href=${location.href}`);
  log(`secureContext=${window.isSecureContext}`);
  log(`ua=${navigator.userAgent}`);
  log(`base=${base}`);

  // Entry module (what we are trying to import)
  const entry = new URL(`${base}js/index.js?v=${stamp}`, location.origin).toString();

  // --- helpers ---
  async function fetchMeta(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      const txt = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        contentType: ct,
        preview: txt.slice(0, 240).replace(/\s+/g, " ").trim(),
        text: txt
      };
    } catch (e) {
      return { ok: false, status: 0, statusText: String(e), contentType: "", preview: "", text: "" };
    }
  }

  function extractImports(jsText) {
    // Crude but effective: grab module specifiers in static imports + dynamic import() + export-from.
    const specs = new Set();

    // import ... from "x"
    jsText.replace(/import\s+[^'"]*?from\s*['"]([^'"]+)['"]/g, (_, s) => (specs.add(s), ""));
    // import("x")
    jsText.replace(/import\(\s*['"]([^'"]+)['"]\s*\)/g, (_, s) => (specs.add(s), ""));
    // export ... from "x"
    jsText.replace(/export\s+[^'"]*?from\s*['"]([^'"]+)['"]/g, (_, s) => (specs.add(s), ""));

    return [...specs];
  }

  function resolveSpecifier(spec) {
    // Leave full URLs alone
    if (/^(https?:)?\/\//.test(spec)) return spec;
    if (spec.startsWith("data:")) return spec;

    // Resolve relative-to-entry for ./ and ../
    if (spec.startsWith("./") || spec.startsWith("../")) {
      return new URL(spec, entry).toString();
    }

    // Fix absolute "/js/..." into "/scarlett-poker-vr/js/..."
    if (spec.startsWith("/js/")) {
      return new URL(`${base}${spec.replace(/^\//, "")}`, location.origin).toString();
    }

    // If it’s "/scarlett-poker-vr/..." already
    if (spec.startsWith("/scarlett-poker-vr/")) {
      return new URL(spec, location.origin).toString();
    }

    // Other absolute-root paths
    if (spec.startsWith("/")) return new URL(spec, location.origin).toString();

    // Bare specifier (e.g. "three") cannot be resolved without importmap
    return spec;
  }

  async function probeDependencies(entryText) {
    const specs = extractImports(entryText);
    log(`index.js imports found: ${specs.length}`);

    const rows = [];
    for (const s of specs) {
      const isBare =
        !s.startsWith("/") &&
        !s.startsWith("./") &&
        !s.startsWith("../") &&
        !/^(https?:)?\/\//.test(s) &&
        !s.startsWith("data:");

      if (isBare) {
        rows.push({
          spec: s,
          url: "(bare specifier)",
          ok: false,
          status: "—",
          note: "Needs importmap or CDN URL"
        });
        continue;
      }

      const u = resolveSpecifier(s);
      const meta = await fetchMeta(u);

      const looksHtml =
        /text\/html/i.test(meta.contentType) ||
        meta.preview.startsWith("<!doctype") ||
        meta.preview.startsWith("<html");

      const note = looksHtml ? "HTML returned (wrong path / 404 page)" : "";
      rows.push({ spec: s, url: u, ok: meta.ok, status: `${meta.status}`, note });
    }

    log("Dependency probe results:");
    rows.forEach(r => {
      const tag = r.ok ? "✅" : "❌";
      log(`${tag} ${r.spec} -> ${r.url} (${r.status}) ${r.note || ""}`.trim());
    });

    return rows.filter(r => !r.ok);
  }

  async function start() {
    log(`importing ${entry} …`);

    // 1) Try dynamic import normally
    try {
      await import(entry);
      log("index.js imported ✅");
      return;
    } catch (e) {
      err("import FAILED ❌", e?.message || e);
    }

    // 2) Fetch index.js and show what actually came back
    const meta = await fetchMeta(entry);
    err(`index.js fetch meta: ok=${meta.ok} status=${meta.status} ct=${meta.contentType} ${meta.statusText || ""}`.trim());
    if (meta.preview) err(`index.js preview: ${meta.preview}`);

    // If index.js itself returned HTML, that's already the bug.
    if (/text\/html/i.test(meta.contentType) || meta.preview.startsWith("<!doctype") || meta.preview.startsWith("<html")) {
      err("index.js is returning HTML, not JS. That usually means a wrong path or GitHub 404 page.");
    }

    // 3) Probe dependencies if we got text back
    if (meta.text) {
      const bad = await probeDependencies(meta.text);
      if (bad.length) {
        err(`Found ${bad.length} failing imports. Fix those paths/case first.`);
        err("Most common causes: wrong capitalization (GitHub is case-sensitive), /js/... absolute paths, missing files.");
      } else {
        warn("All fetched imports look OK by URL fetch.");
        warn("If it still fails, likely: (1) runtime error inside a module, (2) wrong MIME from server, or (3) bare import like 'three' without importmap.");
      }
    }

    // 4) Fallback: append as module script (sometimes surfaces a clearer error)
    warn("Attempting fallback <script type=module> load (for clearer errors) …");
    const s = document.createElement("script");
    s.type = "module";
    s.src = entry;
    s.onerror = (ev) => err("Module <script> onerror ❌", ev?.message || ev);
    document.head.appendChild(s);
  }

  // Start ASAP
  start();
})();
