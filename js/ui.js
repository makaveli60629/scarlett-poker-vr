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
      panel.style.padding = "14px";
      panel.style.borderRadius = "16px";
      panel.style.border = "1px solid rgba(0,255,255,0.25)";
      panel.style.background = "rgba(0,0,0,0.75)";
      panel.style.color = "#fff";
      panel.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
      panel.style.width = "min(380px, 92vw)";
      panel.style.display = "none";

      const btnStyle = `
        width:100%;
        padding:14px;
        border-radius:14px;
        border:0;
        font-weight:900;
        font-size:14px;
      `;

      panel.innerHTML = `
        <div style="font-weight:1000;font-size:15px;margin-bottom:10px">Skylark Menu</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button id="btnLobby" style="${btnStyle}">Lobby</button>
          <button id="btnPoker" style="${btnStyle}">Poker</button>
          <button id="btnStore" style="${btnStyle}">Store</button>
          <button id="btnClose" style="${btnStyle}">Close</button>
        </div>

        <div style="opacity:.9;margin-top:10px;font-size:12px;line-height:1.4">
          <div><b>Teleport:</b> aim with <b>LEFT</b> controller, press <b>LEFT trigger</b></div>
          <div><b>Snap Turn:</b> use <b>RIGHT stick</b> (45°)</div>
          <div><b>Menu:</b> press <b>LEFT X</b> button</div>
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
    const hud = document.getElementById("hudLog");
    if (hud) hud.innerHTML += `<div style="opacity:.85">ℹ️ ${msg}</div>`;
  },
};

export default UI;
