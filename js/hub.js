// /js/hub.js — Minimal HUD logger
let hudEl = null;
let lines = [];

export function createHub(el) {
  hudEl = el;
  lines = [];
  render();
}

function pushLine(prefix, text) {
  const stamp = new Date().toLocaleTimeString();
  lines.push(`${prefix} [${stamp}] ${text}`);
  if (lines.length > 30) lines.shift();
  render();
}

function render() {
  if (!hudEl) return;
  hudEl.textContent = lines.join("\n");
}

export function hubOK(msg)   { pushLine("✅", msg); }
export function hubWarn(msg) { pushLine("⚠️", msg); }
export function hubFail(msg) { pushLine("❌", msg); }
