// /core/logger.js — Scarlett Logger (FULL)
// Minimal, fast, Android friendly. Writes to #hud-log if present.

export function createLogger({ maxLines = 80 } = {}) {
  const pad = (n) => String(n).padStart(2, "0");
  const now = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const out = [];
  function write(m) {
    const line = `[${now()}] ${m}`;
    out.push(line);
    if (out.length > maxLines * 3) out.splice(0, out.length - maxLines * 2);
    console.log(line);

    const el = document.getElementById("hud-log");
    if (el) el.textContent = out.slice(-maxLines).join("\n");

    if (typeof window.__HTML_LOG === "function") {
      try { window.__HTML_LOG(line); } catch {}
    }
  }

  write.copy = async () => {
    try {
      await navigator.clipboard.writeText(out.join("\n"));
      write("[HUD] copied ✅");
    } catch (e) {
      write("[HUD] copy failed ❌ " + (e?.message || e));
    }
  };

  return write;
}
