export const WatchUI = {
  init(ctx) {
    this.ctx = ctx;
    this.create(ctx);
    return this;
  },

  create(ctx) {
    let w = document.getElementById("watchPanel");
    if (!w) {
      w = document.createElement("div");
      w.id = "watchPanel";
      w.style.position = "fixed";
      w.style.right = "12px";
      w.style.bottom = "12px";
      w.style.zIndex = "99998";
      w.style.padding = "12px";
      w.style.borderRadius = "14px";
      w.style.border = "1px solid rgba(0,255,255,0.25)";
      w.style.background = "rgba(0,0,0,0.72)";
      w.style.color = "#fff";
      w.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
      w.style.width = "min(320px, 86vw)";
      w.style.display = "none";

      const btn = (id, label) =>
        `<button id="${id}" style="width:100%;padding:12px;border-radius:12px;border:0;font-weight:900;margin:6px 0">${label}</button>`;

      w.innerHTML = `
        <div style="font-weight:1000;margin-bottom:8px">Watch</div>
        ${btn("wLobby","Go Lobby")}
        ${btn("wPoker","Go Poker")}
        ${btn("wStore","Go Store")}
        ${btn("wAudio","Toggle Audio")}
        ${btn("wClose","Close")}
        <div style="opacity:.85;font-size:12px;margin-top:8px">
          Action = GRIP (squeeze)
        </div>
      `;

      document.body.appendChild(w);
    }

    this.panel = w;

    const go = (room) => {
      const sp = ctx.spawns3D?.[room] || ctx.spawns?.[room];
      if (sp) {
        ctx.rig.position.set(sp.x ?? 0, 0, sp.z ?? 0);
        ctx.rig.rotation.set(0, 0, 0);
      }
    };

    w.querySelector("#wLobby").onclick = () => go("lobby");
    w.querySelector("#wPoker").onclick = () => go("poker");
    w.querySelector("#wStore").onclick = () => go("store");
    w.querySelector("#wAudio").onclick = () => {
      try {
        if (ctx.api?.audio?.toggle) ctx.api.audio.toggle(ctx);
      } catch {}
    };
    w.querySelector("#wClose").onclick = () => this.toggle(false);

    return this;
  },

  toggle(force) {
    if (!this.panel) return;
    const show = (typeof force === "boolean") ? force : (this.panel.style.display === "none");
    this.panel.style.display = show ? "block" : "none";
  },
};

export default WatchUI;
