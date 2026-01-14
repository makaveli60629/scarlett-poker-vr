// /js/boot.js — Scarlett Boot Diagnostics v4 (FULL)
// ✅ Always logs immediately
// ✅ GitHub Pages base-path safe
// ✅ Imports /js/index.js with cache-bust
// ✅ If import fails, fetches file + prints preview + common causes

(() => {
  const stamp = Date.now();

  // --- DOM refs (optional) ---
  const $log = document.getElementById("bootLogText");
  const $status = document.getElementById("bootStatus");

  const writeLine = (s) => {
    console.log(s);
    if ($log) {
      $log.textContent += (s + "\n");
      $log.scrollTop = $log.scrollHeight;
    }
  };

  const setStatus = (txt, cls) => {
    if (!$status) return;
    $status.textContent = txt;
    $status.className = "status " + (cls || "");
  };

  // --- Immediate proof boot ran ---
  writeLine(`[BOOT] boot.js loaded ✅ v4 stamp=${stamp}`);

  // --- Base path detection (GitHub pages safe) ---
  // Example: https://makaveli60629.github.io/scarlett-poker-vr/  -> base "/scarlett-poker-vr/"
  const path = location.pathname || "/";
  let base = "/";

  // If repo pages, path starts with "/scarlett-poker-vr/"
  if (path.includes("/scarlett-poker-vr/")) {
    base = "/scarlett-poker-vr/";
  } else {
    // best-effort: take first segment
    // "/myrepo/something" -> "/myrepo/"
    const seg = path.split("/").filter(Boolean)[0];
    base = seg ? `/${seg}/` : "/";
  }

  writeLine(`[BOOT] href=${location.href}`);
  writeLine(`[BOOT] secureContext=${window.isSecureContext}`);
  writeLine(`[BOOT] ua=${navigator.userAgent}`);
  writeLine(`[BOOT] base=${base}`);

  // --- Helpers ---
  async function fetchMeta(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      const txt = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        ct,
        preview: txt.slice(0, 260).replace(/\s+/g, " ").trim(),
        text: txt
      };
    } catch (e) {
      return { ok: false, status: 0, ct: "", preview: String(e), text: "" };
    }
  }

  // --- MAIN ---
  (async () => {
    setStatus("Loading…", "warn");

    const indexUrl = new URL(`${base}js/index.js?v=${stamp}`, location.origin).toString();
    writeLine(`[BOOT] importing ${indexUrl}`);

    try {
      await import(indexUrl);
      writeLine(`[BOOT] index.js imported ✅`);
      setStatus("Boot OK ✅", "good");
      return;
    } catch (e) {
      writeLine(`[BOOT] index.js import FAILED ❌ ${e?.message || e}`);
      setStatus("Import failed ❌ (see BOOT log)", "bad");
    }

    // If import fails, fetch file and show what GitHub actually served
    const meta = await fetchMeta(indexUrl);
    writeLine(`[BOOT] index.js fetch: ok=${meta.ok} status=${meta.status} ct=${meta.ct}`);
    writeLine(`[BOOT] index.js preview: ${meta.preview}`);

    // Common causes hints
    if (!meta.ok || meta.status === 404) {
      writeLine(`[HINT] 404: file path wrong OR file not in /js/ folder OR case mismatch (GitHub is case-sensitive).`);
    } else if (/text\/html/i.test(meta.ct) || /<!doctype|<html/i.test(meta.preview)) {
      writeLine(`[HINT] HTML returned (wrong path or 404 page). Check base path + filename case.`);
    } else {
      writeLine(`[HINT] JS served but import still failed. Usually: syntax error in index.js OR one dependency import 404.`);
      writeLine(`[HINT] Open DevTools console for the first syntax error line.`);
    }

    // Optional: attempt module script load to surface a clearer error in some browsers
    try {
      writeLine(`[BOOT] attempting fallback <script type="module"> load…`);
      const s = document.createElement("script");
      s.type = "module";
      s.src = indexUrl;
      s.onerror = () => writeLine(`[BOOT] module <script> onerror ❌ (dependency or syntax issue)`);
      document.head.appendChild(s);
    } catch (e) {
      writeLine(`[BOOT] fallback script failed: ${e?.message || e}`);
    }
  })();
})();
