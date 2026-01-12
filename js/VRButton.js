// /js/VRButton.js — Standalone VRButton (NO imports)
// Works on Quest/WebXR. No dependency on three/examples.

export const VRButton = {
  createButton(renderer) {
    const button = document.createElement("button");
    button.style.position = "fixed";
    button.style.left = "12px";
    button.style.bottom = "12px";
    button.style.padding = "12px 14px";
    button.style.borderRadius = "14px";
    button.style.border = "1px solid rgba(127,231,255,0.35)";
    button.style.background = "rgba(10,12,18,0.58)";
    button.style.color = "#e8ecff";
    button.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
    button.style.fontSize = "14px";
    button.style.cursor = "pointer";
    button.style.zIndex = "99999";
    button.style.backdropFilter = "blur(8px)";
    button.textContent = "ENTER VR";

    if (!navigator.xr || !navigator.xr.isSessionSupported) {
      button.textContent = "VR NOT AVAILABLE";
      button.disabled = true;
      button.style.opacity = "0.6";
      return button;
    }

    let currentSession = null;

    async function onSessionStarted(session) {
      currentSession = session;
      session.addEventListener("end", onSessionEnded);

      renderer.xr.enabled = true;
      await renderer.xr.setSession(session);

      button.textContent = "EXIT VR";
    }

    function onSessionEnded() {
      currentSession = null;
      button.textContent = "ENTER VR";
    }

    async function requestSession() {
      const sessionInit = {
        optionalFeatures: [
          "local-floor",
          "bounded-floor",
          "local",
          "viewer",
          "hand-tracking",
          "layers",
          "dom-overlay"
        ],
        domOverlay: { root: document.body }
      };

      const session = await navigator.xr.requestSession("immersive-vr", sessionInit);
      await onSessionStarted(session);
    }

    button.onclick = async () => {
      try {
        if (currentSession) return await currentSession.end();
        const ok = await navigator.xr.isSessionSupported("immersive-vr");
        if (!ok) {
          button.textContent = "VR NOT SUPPORTED";
          button.disabled = true;
          return;
        }
        await requestSession();
      } catch (e) {
        console.warn("[VRButton] requestSession failed:", e);
      }
    };

    navigator.xr.isSessionSupported("immersive-vr").then((supported) => {
      if (!supported) {
        button.textContent = "VR NOT SUPPORTED";
        button.disabled = true;
        button.style.opacity = "0.6";
      }
    });

    return button;
  }
};
