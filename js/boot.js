// js/boot.js
(function () {
  const BUILD = "SCARLETT_FULL_1_9_BOOTSAFE";

  const diagPanel = document.getElementById("diagPanel");
  const btnDiag = document.getElementById("btnDiag");
  const btnHideHUD = document.getElementById("btnHideHUD");
  const btnTeleport = document.getElementById("btnTeleport");
  const btnReset = document.getElementById("btnReset");
  const btnEnterVR = document.getElementById("btnEnterVR");

  const SCARLETT_DIAG = {
    log(line) {
      const t = performance.now() / 1000;
      const msg = `[${t.toFixed(3)}] ${line}`;
      console.log(msg);
      if (diagPanel) {
        diagPanel.textContent += msg + "\n";
        diagPanel.scrollTop = diagPanel.scrollHeight;
      }
    }
  };

  window.SCARLETT_DIAG = SCARLETT_DIAG;

  SCARLETT_DIAG.log("booting…");
  SCARLETT_DIAG.log(`BUILD=${BUILD}`);

  // Diagnostics toggle
  if (btnDiag && diagPanel) {
    btnDiag.addEventListener("click", () => {
      const on = diagPanel.style.display !== "block";
      diagPanel.style.display = on ? "block" : "none";
    });
  }

  // Hide HUD
  if (btnHideHUD) {
    btnHideHUD.addEventListener("click", () => {
      const hud = document.getElementById("hud");
      if (!hud) return;
      hud.style.display = hud.style.display === "none" ? "block" : "none";
    });
  }

  // Teleport toggle (flag only; teleport system can read this later)
  window.SCARLETT_FLAGS = window.SCARLETT_FLAGS || {};
  window.SCARLETT_FLAGS.teleport = true;

  if (btnTeleport) {
    btnTeleport.addEventListener("click", () => {
      window.SCARLETT_FLAGS.teleport = !window.SCARLETT_FLAGS.teleport;
      btnTeleport.setAttribute("aria-pressed", window.SCARLETT_FLAGS.teleport ? "true" : "false");
      btnTeleport.textContent = window.SCARLETT_FLAGS.teleport ? "Teleport: ON" : "Teleport: OFF";
      SCARLETT_DIAG.log(`[teleport] ${window.SCARLETT_FLAGS.teleport ? "ON" : "OFF"}`);
    });
  }

  // Reset
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      const rig = document.getElementById("rig");
      if (!rig) return;
      rig.object3D.position.set(0, 0, 10);
      rig.object3D.rotation.set(0, 0, 0);
      SCARLETT_DIAG.log("[spawn] reset to 0,0,10");
    });
  }

  // Enter VR
  if (btnEnterVR) {
    btnEnterVR.addEventListener("click", async () => {
      try {
        const scene = document.getElementById("scene");
        if (!scene) return;
        SCARLETT_DIAG.log("[vr] enter requested…");
        await scene.enterVR();
        SCARLETT_DIAG.log("[vr] enterVR ✅");
      } catch (e) {
        SCARLETT_DIAG.log("[vr] enterVR failed ❌");
      }
    });
  }

  // Scene loaded
  window.addEventListener("DOMContentLoaded", () => {
    const scene = document.getElementById("scene");
    if (!scene) return;
    scene.addEventListener("loaded", () => {
      SCARLETT_DIAG.log("[scene] loaded ✅");
      // If world exists, build now (then index.html failsafe also runs)
      if (window.SCARLETT_WORLD && typeof window.SCARLETT_WORLD.build === "function") {
        try {
          window.SCARLETT_WORLD.build();
          SCARLETT_DIAG.log("[world] buildWorld() ✅");
        } catch (e) {
          SCARLETT_DIAG.log("[world] build threw ❌");
        }
      } else {
        SCARLETT_DIAG.log("[world] waiting for SCARLETT_WORLD.build…");
      }
    });
  });
})();
