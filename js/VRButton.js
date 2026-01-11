// /js/VRButton.js — simple reliable VRButton (ESM)
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
    b.style.backdropFilter = "blur(8px)";
    b.style.zIndex = "9999";

    (async () => {
      if (!navigator.xr){
        b.textContent = "XR NOT FOUND";
        b.disabled = true;
        return;
      }
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      if (!ok){
        b.textContent = "VR NOT SUPPORTED";
        b.disabled = true;
        return;
      }
      b.onclick = async () => {
        try{
          const session = await navigator.xr.requestSession("immersive-vr", {
            optionalFeatures: ["local-floor","bounded-floor","local","hand-tracking","layers","dom-overlay"],
            domOverlay: { root: document.body }
          });
          renderer.xr.setSession(session);
        }catch(e){
          console.error(e);
        }
      };
    })();

    return b;
  }
};
