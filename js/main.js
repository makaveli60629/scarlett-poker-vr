// --- HUB TOOL: find who imports "three" (bare specifier) -----------------
async function hubFindBareThreeImports() {
  const filesToScan = [
    "./main.js",
    "./world.js",
    "./bots.js",
    "./avatar_rig.js",
    "./teleport_machine.js",
    "./teleport.js",
    "./controllers.js",
    "./poker.js",
    "./ui.js",
    "./hud.js",
  ];

  const needles = [
    `from "three"`,
    `from 'three'`,
    `import("three")`,
    `import('three')`,
    `"three"`, // catch-all
    `'three'`,
  ];

  log("🔎 [hub] Scanning JS files for bare 'three' imports...");

  const hits = [];

  for (const f of filesToScan) {
    try {
      const url = new URL(f, import.meta.url).toString();
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        log(`⚠️ [hub] skip ${f} (HTTP ${res.status})`);
        continue;
      }
      const text = await res.text();
      const lines = text.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (needles.some((n) => line.includes(n))) {
          // Only flag lines that are actually imports of three
          const isBareThreeImport =
            line.includes(`from "three"`) ||
            line.includes(`from 'three'`) ||
            line.includes(`import("three")`) ||
            line.includes(`import('three')`);

          if (isBareThreeImport) {
            hits.push({ file: f, line: i + 1, code: line.trim() });
          }
        }
      }
    } catch (e) {
      log(`⚠️ [hub] error scanning ${f}: ${(e && e.message) || e}`);
    }
  }

  if (!hits.length) {
    log("✅ [hub] No bare 'three' imports found in scanned files.");
    log("If you still see the error, it means the bad import is in a JS file NOT listed above.");
    log("Add the missing filename to filesToScan and run again.");
    return;
  }

  log("❌ [hub] FOUND bare 'three' imports:");
  for (const h of hits) {
    log(`   -> ${h.file}:${h.line}  ${h.code}`);
  }
}

// Run from Hub button by dispatching this event:
window.addEventListener("scarlett-find-three", () => {
  hubFindBareThreeImports();
  log("✅ [hub] find-three triggered");
});
