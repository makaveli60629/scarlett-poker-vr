export const UI = {
  root: null,
  visible: true,
  hub: null,

  init({ hub, onRecenter, onToggleHeightLock }) {
    this.hub = hub;

    // Let VRController call Controls via global bridge:
    window.__scarlettTeleportTo = (pos) => {
      // main.js will override this with Controls.teleportTo if available,
      // but if not, we still attempt a direct rig move if present
      window.__scarlettDirectTeleport?.(pos);
    };

    // A simple HTML overlay menu (works on Android + VR browser)
    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.left = "12px";
    root.style.top = "12px";
    root.style.zIndex = "10";
    root.style.pointerEvents = "auto";
    root.style.display = "flex";
    root.style.gap = "8px";
    root.style.alignItems = "center";

    const mkBtn = (txt, fn) => {
      const b = document.createElement("button");
      b.textContent = txt;
      b.style.padding = "8px 10px";
      b.style.borderRadius = "10px";
      b.style.border = "1px solid rgba(255,255,255,.2)";
      b.style.background = "rgba(0,0,0,.35)";
      b.style.color = "#fff";
      b.addEventListener("click", fn);
      return b;
    };

    const btnRecenter = mkBtn("Recenter Spawn", () => onRecenter?.());
    const btnHeight = mkBtn("Toggle Height Lock", () => onToggleHeightLock?.());
    const btnHide = mkBtn("Hide UI", () => {
      this.visible = !this.visible;
      root.style.opacity = this.visible ? "1" : "0";
      root.style.pointerEvents = this.visible ? "auto" : "none";
    });

    root.appendChild(btnRecenter);
    root.appendChild(btnHeight);
    root.appendChild(btnHide);

    document.body.appendChild(root);
    this.root = root;

    // VR toggle via keyboard M (desktop fallback)
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "m") btnHide.click();
    });

    hub?.addLine?.("✅ UI ready (buttons in top-left)");
  },

  update() {},
};
