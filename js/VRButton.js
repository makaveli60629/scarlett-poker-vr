// /js/VRButton.js — VERBOSE VRButton (Quest diagnostics)
export const VRButton = {
  createButton(renderer){
    const b = document.createElement("button");
    b.id = "VRButton";
    b.textContent = "ENTER VR";
    b.style.position = "fixed";
    b.style.right = "18px";
    b.style.bottom = "18px";
    b.style.padding = "12px 16px";
    b.style.borderRadius = "14px";
    b.style.border = "1px solid rgba(255,255,255,.25)";
    b.style.background = "rgba(10,14,24,.65)";
    b.style.color = "#e8ecff";
    b.style.fontFamily = "system-ui,-apple-system,Segoe UI,Roboto,Arial";
    b.style.fontWeight = "900";
    b.style.letterSpacing = "0.5px";
    b.style.zIndex = "9999";

    const now = () => new Date().toTimeString().slice(0,8);
    const hudLog = (msg) => {
      try {
        if (window.__scarlettLog) window.__scarlettLog(msg);
        else console.log(msg);
      } catch { console.log(msg); }
    };
    const tag = (t, m) => hudLog(`[${now()}] [${t}] ${m}`);

    (async () => {
      if (!navigator.xr){
        b.textContent = "XR NOT FOUND";
        b.disabled = true;
        tag("VR", "navigator.xr missing ❌");
        return;
      }

      let ok = false;
      try{
        ok = await navigator.xr.isSessionSupported("immersive-vr");
      }catch(e){
        tag("VR", `isSessionSupported threw ❌ ${e?.message || e}`);
      }

      tag("VR", `isSessionSupported(immersive-vr) = ${ok}`);
      if (!ok){
        b.textContent = "VR NOT SUPPORTED";
        b.disabled = true;
        return;
      }

      b.onclick = async () => {
        tag("VR", "requestSession() …");
        try{
          const session = await navigator.xr.requestSession("immersive-vr", {
            optionalFeatures: [
              "local-floor","bounded-floor","local",
              "hand-tracking","layers","dom-overlay"
            ],
            domOverlay: { root: document.body }
          });

          session.addEventListener("end", () => tag("VR", "session ended"));
          tag("VR", "session started ✅");

          renderer.xr.setSession(session);
          tag("VR", "renderer.xr.setSession ✅");
        }catch(e){
          tag("VR", `requestSession FAILED ❌ ${e?.message || e}`);
          console.error(e);
        }
      };
    })();

    return b;
  }
};
