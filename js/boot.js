// /js/boot.js — Scarlett Boot Diagnostics v1.0
// Goal: Identify WHY dynamic import fails on Quest by probing the entire import graph.

(() => {
  const stamp = Date.now();
  const log = (...a) => console.log(`[BOOT]`, ...a);
  const warn = (...a) => console.warn(`[BOOT]`, ...a);
  const err = (...a) => console.error(`[BOOT]`, ...a);

  // --- base path detection (works on GitHub Pages repo sites) ---
  // Example: https://makaveli60629.github.io/scarlett-poker-vr/  -> base "/scarlett-poker-vr/"
  const path = location.pathname;
  const base = (path.includes("/scarlett-poker-vr/"))
    ? "/scarlett-poker-vr/"
    : (path.endsWith("/") ? path : path.replace(/[^/]+$/, "")); // best-effort

  log(`href=${location.href}`);
  log(`secureContext=${window.isSecureContext}`);
  log(`ua=${navigator.userAgent}`);
  log(`base=${base}`);

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
        preview: txt.slice(0, 220).replace(/\s+/g, " ").trim(),
        text: txt
      };
    } catch (e) {
      return { ok: false, status: 0, statusText: String(e), contentType: "", preview: "", text: "" };
    }
  }

  function extractImports(jsText) {
    // crude but effective: grab module specifiers in static imports
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
    // Leave full URLs + bare specifiers alone (CDN, etc.)
    if (/^(https?:)?\/\//.test(spec)) return spec;
    if (spec.startsWith("data:")) return spec;

    // Resolve relative-to-entry for ./ and ../
    if (spec.startsWith("./") || spec.startsWith("../")) {
      return new URL(spec, entry).toString();
    }

    // If someone used absolute "/js/..." on GitHub Pages, fix it into "/scarlett-poker-vr/js/..."
    if (spec.startsWith("/js/")) {
      return new URL(`${base}${spec.replace(/^\//, "")}`, location.origin).toString();
    }

    // If it’s "/scarlett-poker-vr/..." already
    if (spec.startsWith("/scarlett-poker-vr/")) {
      return new URL(spec, location.origin).toString();
    }

    // For other absolute-root paths, keep as-is
    if (spec.startsWith("/")) return new URL(spec, location.origin).toString();

    // Bare specifier (e.g. "three") cannot be resolved without importmap — keep as-is
    return spec;
  }

  async function probeDependencies(entryText) {
    const specs = extractImports(entryText);
    log(`index.js imports found: ${specs.length}`);

    const rows = [];
    for (const s of specs) {
      // skip bare specifiers (they will fail unless importmap exists)
      const isBare = !s.startsWith("/") && !s.startsWith("./") && !s.startsWith("../") && !/^(https?:)?\/\//.test(s);
      if (isBare) {
        rows.push({ spec: s, url: "(bare specifier)", ok: false, status: "—", note: "Needs importmap or CDN URL" });
        continue;
      }

      const u = resolveSpecifier(s);
      const meta = await fetchMeta(u);
      const looksHtml = /text\/html/i.test(meta.contentType) || meta.preview.startsWith("<!doctype") || meta.preview.startsWith("<html");
      const note = looksHtml ? "HTML returned (wrong path / 404 page)" : "";

      rows.push({ spec: s, url: u, ok: meta.ok, status: `${meta.status}`, note });
    }

    // Print a readable summary (no tables in Quest sometimes, so keep it simple)
    log("Dependency probe results:");
    rows.forEach(r => {
      const tag = r.ok ? "✅" : "❌";
      console.log(`[BOOT] ${tag} ${r.spec} -> ${r.url} (${r.status}) ${r.note || ""}`.trim());
    });

    // Return failures
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
      err("import FAILED ❌", e);
    }

    // 2) Fetch index.js and show what actually came back
    const meta = await fetchMeta(entry);
    err(`index.js fetch meta: ok=${meta.ok} status=${meta.status} ct=${meta.contentType}`);
    if (meta.preview) err(`index.js preview: ${meta.preview}`);

    // 3) Probe its dependency URLs if we got text back
    if (meta.text) {
      const bad = await probeDependencies(meta.text);
      if (bad.length) {
        err(`Found ${bad.length} failing imports. Fix those paths/case first.`);
      } else {
        warn("All fetched imports look OK by URL fetch. If it still fails, likely MIME or module parsing/runtime error inside a dependency.");
      }
    }

    // 4) Fallback: append as module script (sometimes surfaces a clearer error in console)
    warn("Attempting fallback <script type=module> load (for clearer console errors) …");
    const s = document.createElement("script");
    s.type = "module";
    s.src = entry;
    s.onerror = (ev) => err("Module <script> onerror ❌", ev);
    document.head.appendChild(s);
  }

  start();
})();
