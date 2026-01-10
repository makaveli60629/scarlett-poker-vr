// /js/ui.js — UI v5.2 (FULL FIXED)
// ✅ Buttons call ctx.rooms.setRoom(name) when available (instant + reliable)
// ✅ Falls back to dispatching "scarlett-room" if rooms not ready yet
// ✅ Teleport uses Controls.teleportToSpawn (if available)
// ✅ Reset is safe (no missing functions)

export const UI = {
  init(ctx) {
    const log = ctx.log || console.log;

    const wrap = document.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.left = "50%";
    wrap.style.top = "12px";
    wrap.style.transform = "translateX(-50%)";
    wrap.style.zIndex = "9999";
    wrap.style.pointerEvents = "auto";
    wrap.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    document.body.appendChild(wrap);

    const panel = document.createElement("div");
    panel.style.display = "inline-flex";
    panel.style.flexWrap = "wrap";
    panel.style.gap = "10px";
    panel.style.padding = "12px";
    panel.style.borderRadius = "18px";
    panel.style.background = "rgba(0,0,0,.55)";
    panel.style.border = "1px solid rgba(255,255,255,.10)";
    panel.style.backdropFilter = "blur(8px)";
    panel.style.maxWidth = "94vw";
    wrap.appendChild(panel);

    const makeBtn = (txt, onClick, opts = {}) => {
      const b = document.createElement("button");
      b.textContent = txt;
      b.style.padding = "10px 14px";
      b.style.borderRadius = "14px";
      b.style.border = "1px solid rgba(255,255,255,.18)";
      b.style.background = opts.accent ? "rgba(180,90,255,.25)" : "rgba(255,255,255,.08)";
      b.style.color = "#fff";
      b.style.fontWeight = "600";
      b.style.cursor = "pointer";
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { onClick?.(); } catch (err) { console.warn("[ui] click error", err); }
      });
      return b;
    };

    // ✅ Reliable room setter: direct call > event fallback
    const setRoom = (name) => {
      if (ctx.rooms?.setRoom) {
        ctx.rooms.setRoom(name);
        log(`[ui] room -> ${name} (direct)`);
        return;
      }
      window.dispatchEvent(new CustomEvent("scarlett-room", { detail: { name } }));
      log(`[ui] room -> ${name} (event fallback)`);
    };

    const enterVR = () => {
      window.dispatchEvent(new Event("scarlett-enter-vr"));
      log("[ui] enter vr -> event dispatched");
    };

    const teleportLobby = () => {
      // Best: use Controls teleport if present
      if (ctx.Controls?.teleportToSpawn) {
        ctx.Controls.teleportToSpawn("lobby_spawn", { standY: 1.65 });
        log("[ui] teleport -> lobby_spawn (Controls)");
        return;
      }
      // fallback: room
      setRoom("lobby");
    };

    const recenter = () => {
      // Recenter = just force lobby spawn again (stable)
      if (ctx.Controls?.forceStanding) {
        ctx.Controls.forceStanding("lobby_spawn");
        log("[ui] recenter -> Controls.forceStanding");
        return;
      }
      setRoom("lobby");
    };

    // Row 1
    panel.appendChild(makeBtn("Enter VR", enterVR, { accent: true }));
    panel.appendChild(makeBtn("Recenter", recenter));
    panel.appendChild(makeBtn("Teleport", teleportLobby));
    panel.appendChild(makeBtn("Move", () => log("[ui] move: handled by Controls/AndroidControls if present")));

    // Row 2
    panel.appendChild(makeBtn("Snap", () => {
      try {
        const a = document.createElement("a");
        a.download = `scarlett_${Date.now()}.png`;
        a.href = ctx.renderer?.domElement?.toDataURL?.("image/png") || "";
        a.click();
      } catch {
        log("[ui] snap unavailable");
      }
    }));

    panel.appendChild(makeBtn("Lobby", () => setRoom("lobby")));
    panel.appendChild(makeBtn("Scorpion", () => setRoom("scorpion"), { accent: true }));
    panel.appendChild(makeBtn("Store", () => setRoom("store")));
    panel.appendChild(makeBtn("Spectate", () => setRoom("spectator")));

    // Row 3
    panel.appendChild(makeBtn("Diagnostics", () => {
      window.dispatchEvent(new Event("scarlett-diag"));
      log("[ui] diagnostics event");
    }));

    panel.appendChild(makeBtn("Force Log", () => {
      window.dispatchEvent(new Event("scarlett-force-log"));
      log("[ui] force-log event");
    }));

    panel.appendChild(makeBtn("Help", () => alert(
      "Rooms:\n- Lobby / Scorpion / Store / Spectate\n\nIf you get stuck:\n- Press Recenter\n- Then Lobby\n- Then Scorpion"
    )));

    panel.appendChild(makeBtn("Reset", () => {
      // Hard reset to lobby + standing height
      if (ctx.Controls?.forceStanding) ctx.Controls.forceStanding("lobby_spawn");
      else setRoom("lobby");
      log("[ui] reset -> lobby (standing)");
    }, { accent: true }));

    log("[ui] init ✅ v5.2");
    return panel;
  },
};
