// /js/VRButton.js — minimal VRButton (ESM) for Three.js WebXR
export const VRButton = {
  createButton(renderer) {
    const button = document.createElement("button");
    button.id = "VRButton";
    button.textContent = "ENTER VR";
    button.style.position = "fixed";
    button.style.right = "18px";
    button.style.bottom = "18px";
    button.style.padding = "12px 16px";
    button.style.borderRadius = "14px";
    button.style.border = "1px solid rgba(255,255,255,.25)";
    button.style.background = "rgba(10,14,24,.65)";
    button.style.color = "#e8ecff";
    button.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    button.style.fontWeight = "700";
    button.style.letterSpacing = "0.5px";
    button.style.backdropFilter = "blur(8px)";
    button.style.zIndex = "9999";

    async function init() {
      if (!navigator.xr) {
        button.textContent = "XR NOT FOUND";
        button.disabled = true;
        return;
      }

      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      if (!ok) {
        button.textContent = "VR NOT SUPPORTED";
        button.disabled = true;
        return;
      }

      button.onclick = async () => {
        try {
          const session = await navigator.xr.requestSession("immersive-vr", {
            optionalFeatures: ["local-floor", "bounded-floor", "local", "hand-tracking", "layers", "dom-overlay"],
            domOverlay: { root: document.body }
          });
          renderer.xr.setSession(session);
        } catch (e) {
          console.error(e);
        }
      };
    }

    init();
    return button;
  }
};
