export const UI = {
  create(ctx) {
    this.ctx = ctx;

    let panel = document.getElementById("vrMenuPanel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "vrMenuPanel";
      panel.style.position = "fixed";
      panel.style.left = "12px";
      panel.style.bottom = "12px";
      panel.style.zIndex = "99999";
      panel.style.padding = "12px";
      panel.style.borderRadius = "14px";
      panel.style.border = "1px solid rgba(0,255,255,0.25)";
      panel.style.background = "rgba(0,0,0,0.72)";
      panel.style.color = "#fff";
      panel.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
      panel.style.width = "min(360px, 92vw)";
      panel.style.display = "none";

      panel.innerHTML = `
        <div style="font-weight:900;font-size:14px;margin-bottom:10px">Skylark Menu</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button id="btnLobby" style="padding:12px;border-radius:12px;border:0;font-weight:800">Lobby</button>
          <button id="btnPoker" style="padding:12px;border-radius:12px;border:0;font-weight:800">Poker</button>
          <button id="btnStore" style="padding:12px;border-radius:12px;border:0;font-weight:800">Store</button>
          <button id="btnClose" style="padding:12px;border-radius:12px;border:0;font-weight:800">Close</button>
        </div>

        <div style="opacity:.8;margin-top:10px;font-size:12px">
          Teleport-walk is ON. Use trigger/pinch to aim + teleport.
        </div>
      `;

      document.body.appendChild(panel);
    }

    this.panel = panel;

    const go = (room) => {
      const sp = ctx.spawns3D?.[room];
      if (sp) ctx.rig.position.set(sp.x, 0, sp.z);
    };

    panel.querySelector("#btnLobby").onclick = () => go("lobby");
    panel.querySelector("#btnPoker").onclick = () => go("poker");
    panel.querySelector("#btnStore").onclick = () => go("store");
    panel.querySelector("#btnClose").onclick = () => this.toggleMenu(false);

    // Desktop fallback
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "m") this.toggleMenu();
    });

    return this;
  },

  toggleMenu(force) {
    if (!this.panel) return;
    const show = (typeof force === "boolean") ? force : (this.panel.style.display === "none");
    this.panel.style.display = show ? "block" : "none";
  },

  toast(msg) {
    // lightweight: reuse HUD if present
    const hud = document.getElementById("hudLog");
    if (hud) hud.innerHTML += `<div style="opacity:.85">ℹ️ ${msg}</div>`;
  },
};

export default UI;
