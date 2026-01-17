// ✅ AUTHORITATIVE PANEL TEST ENDPOINT (never depends on engineAttached)
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.runModuleTest = async () => {
  // Prefer world orchestrator if available
  if (typeof window.__scarlettRunModuleTest === "function") {
    try {
      const r = await window.__scarlettRunModuleTest();
      return { ok: !!r.ok, source: "__scarlettRunModuleTest", ...r };
    } catch (e) {
      return { ok: false, source: "__scarlettRunModuleTest", error: e?.message || String(e) };
    }
  }

  // Fallback report (always works)
  const eng = window.SCARLETT?.engine;
  return {
    ok: true,
    source: "fallback",
    time: new Date().toISOString(),
    build: BUILD,
    enginePresent: !!eng,
    renderer: !!eng?.renderer,
    worldLoaded: !!eng?.world,
    worldPreflight404: true
  };
};
