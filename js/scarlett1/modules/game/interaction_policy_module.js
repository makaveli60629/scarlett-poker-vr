// /js/scarlett1/modules/game/interaction_policy_module.js
// INTERACTION POLICY MODULE (FULL) — Modular Forever
// - Centralizes what is grabbable (chips/dealer yes, cards no)
// - Provides Spectator Mode toggle via small DOM button
// - Works by overriding ctx.canGrab() (no changes needed in grab module)

export function createInteractionPolicyModule({
  allowTypes = ["chip", "dealerButton"],    // allowed grabbable types
  blockTypes = ["communityCard", "botCard"],// hard block
  spectatorModeDefault = false,             // if true, blocks ALL grabbing
} = {}) {
  let spectatorMode = !!spectatorModeDefault;
  let btn = null;

  function ensureButton() {
    if (btn) return;

    btn = document.createElement("button");
    btn.setAttribute("data-hud", "1");
    btn.textContent = spectatorMode ? "SPECTATE: ON" : "SPECTATE: OFF";

    btn.style.position = "fixed";
    btn.style.left = "12px";
    btn.style.top = "12px";
    btn.style.zIndex = "999999";
    btn.style.padding = "10px 12px";
    btn.style.borderRadius = "12px";
    btn.style.border = "1px solid rgba(255,255,255,0.16)";
    btn.style.background = "rgba(0,0,0,0.55)";
    btn.style.color = "white";
    btn.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    btn.style.fontSize = "13px";
    btn.style.backdropFilter = "blur(8px)";
    btn.style.webkitBackdropFilter = "blur(8px)";
    btn.style.cursor = "pointer";

    btn.onclick = () => {
      spectatorMode = !spectatorMode;
      btn.textContent = spectatorMode ? "SPECTATE: ON" : "SPECTATE: OFF";
    };

    document.body.appendChild(btn);
  }

  function getTypeFromChain(obj) {
    let o = obj;
    while (o) {
      const t = o.userData?.type;
      if (typeof t === "string" && t.length) return t;
      o = o.parent;
    }
    return "";
  }

  return {
    name: "interaction_policy",

    onEnable(ctx) {
      // Add spectator toggle button
      ensureButton();
      setTimeout(ensureButton, 250);
      setTimeout(ensureButton, 1000);

      // Override grab gate (single source of truth)
      ctx.canGrab = (obj) => {
        // Spectator mode blocks everything
        if (spectatorMode) return false;

        // Respect explicit grabbable flags on chain if present
        let o = obj;
        while (o) {
          if (o.userData && typeof o.userData.grabbable === "boolean") {
            if (o.userData.grabbable === false) return false;
            // if explicitly true, still apply type policy (below)
            break;
          }
          o = o.parent;
        }

        const type = getTypeFromChain(obj);

        // Hard blocks
        if (blockTypes.includes(type)) return false;

        // Allow list
        if (allowTypes.includes(type)) return true;

        // Default deny (keeps tables/chairs/cards safe)
        return false;
      };

      console.log("[interaction_policy] active ✅ spectator=", spectatorMode);
    },

    // Optional API
    setSpectatorMode(v) {
      spectatorMode = !!v;
      if (btn) btn.textContent = spectatorMode ? "SPECTATE: ON" : "SPECTATE: OFF";
    },
    isSpectatorMode() {
      return spectatorMode;
    },
  };
}
