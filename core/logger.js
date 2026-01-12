// /core/logger.js — FULL SAFE LOGGER (HUD + console)
export function createLogger({ maxLines = 120 } = {}) {
  const lines = [];
  const el = () => document.getElementById("hudLog");

  function log(msg) {
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    lines.push(line);
    if (lines.length > maxLines) lines.shift();
    console.log(line);
    const node = el();
    if (node) node.textContent = lines.slice(-maxLines).join("\n");
  }

  log.copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      log("[HUD] copied ✅");
    } catch (e) {
      log("[HUD] copy failed ❌ " + (e?.message || e));
    }
  };

  return log;
}
