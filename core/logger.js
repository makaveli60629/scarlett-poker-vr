// /core/logger.js — HUD Logger v2 (copy button support)
export function createLogger({ maxLines = 80 } = {}) {
  const pad = (n) => String(n).padStart(2, "0");
  const now = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const out = [];

  function render() {
    const el = document.getElementById("hud-log");
    if (el) el.textContent = out.slice(-maxLines).join("\n");
  }

  function log(msg) {
    const line = `[${now()}] ${msg}`;
    out.push(line);
    console.log(line);
    render();
  }

  log.copy = async () => {
    try {
      await navigator.clipboard.writeText(out.join("\n"));
      log("[HUD] copied ✅");
    } catch (e) {
      log("[HUD] copy failed ❌ " + (e?.message || e));
    }
  };

  // wire button if present
  const btn = document.getElementById("copyBtn");
  if (btn) btn.onclick = () => log.copy();

  return log;
}
