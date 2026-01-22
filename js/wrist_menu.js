// js/wrist_menu.js
(function(){
  const D = window.SCARLETT_DIAG || { log: ()=>{} };

  function ensureAFrame(){
    if (!window.AFRAME) return false;
    return true;
  }
  if (!ensureAFrame()) return;

  // Simple wrist UI that works with gaze cursor or controller raycaster clicking.
  // Buttons are .uiTarget so your existing raycasters can hit them.
  AFRAME.registerComponent("wrist-menu", {
    init: function(){
      const el = this.el;

      // Root panel
      const panel = document.createElement("a-plane");
      panel.setAttribute("width", "0.22");
      panel.setAttribute("height", "0.12");
      panel.setAttribute("material", "color: #0b1220; opacity: 0.72; shader: flat");
      panel.classList.add("uiTarget");
      el.appendChild(panel);

      // Title
      const title = document.createElement("a-text");
      title.setAttribute("value", "WRIST MENU");
      title.setAttribute("align", "center");
      title.setAttribute("color", "#9fd4ff");
      title.setAttribute("width", "0.6");
      title.setAttribute("position", "0 0.038 0.002");
      el.appendChild(title);

      // Status line
      const status = document.createElement("a-text");
      status.setAttribute("value", "RADIO: (tap Play)");
      status.setAttribute("align", "center");
      status.setAttribute("color", "#eaf2ff");
      status.setAttribute("width", "0.75");
      status.setAttribute("position", "0 0.012 0.002");
      status.classList.add("radioStatus");
      el.appendChild(status);

      // Buttons row
      const mkBtn = (label, x, onClick) => {
        const b = document.createElement("a-plane");
        b.setAttribute("width", "0.06");
        b.setAttribute("height", "0.03");
        b.setAttribute("position", `${x} -0.032 0.003`);
        b.setAttribute("material", "color: #16243f; opacity: 0.9; shader: flat");
        b.classList.add("uiTarget");
        b.setAttribute("wrist-button", "");

        const t = document.createElement("a-text");
        t.setAttribute("value", label);
        t.setAttribute("align", "center");
        t.setAttribute("color", "#ffffff");
        t.setAttribute("width", "0.35");
        t.setAttribute("position", "0 0 0.002");
        b.appendChild(t);

        b.addEventListener("click", (ev)=>{
          ev.stopPropagation();
          try{ onClick(); }catch(e){ D.log(`[wrist] click error: ${e}`); }
        });
        el.appendChild(b);
        return b;
      };

      mkBtn("PLAY", -0.07, ()=>{
        window.SCARLETT_RADIO?.start();
        this._refresh();
      });
      mkBtn("NEXT", 0.00, ()=>{
        window.SCARLETT_RADIO?.next();
        window.SCARLETT_RADIO?.start();
        this._refresh();
      });
      mkBtn("MUTE", 0.07, ()=>{
        window.SCARLETT_RADIO?.toggleMute();
        this._refresh();
      });

      this.statusEl = status;

      // Update on VR enter for visibility
      const scene = document.querySelector("a-scene");
      if (scene){
        scene.addEventListener("enter-vr", ()=>{ this._refresh(); });
      }
      this._refresh();
    },

    _refresh: function(){
      const R = window.SCARLETT_RADIO;
      if (!this.statusEl) return;
      if (!R){
        this.statusEl.setAttribute("value","RADIO: (missing module)");
        return;
      }
      const st = R.current ? R.current.name : "—";
      const m = R.muted ? "MUTED" : "ON";
      const s = R.started ? "PLAYING" : "READY";
      this.statusEl.setAttribute("value", `RADIO: ${st}\n${s} • ${m}`);
    }
  });

  // Tiny press animation
  AFRAME.registerComponent("wrist-button", {
    init: function(){
      const el = this.el;
      el.addEventListener("mouseenter", ()=> el.setAttribute("material","color:#21406f; opacity:0.95; shader: flat"));
      el.addEventListener("mouseleave", ()=> el.setAttribute("material","color:#16243f; opacity:0.9; shader: flat"));
    }
  });

})();
