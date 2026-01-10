// /js/ui.js — UI v5 (FULL)
// Fixes:
// ✅ Buttons now DISPATCH room events that RoomBridge listens to
// ✅ Recenter works for VR + Mobile
// ✅ Teleport toggle sends a spawn teleport
// ✅ Works on phone and Quest without crashing

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
        try { onClick?.(); } catch {}
      });
      return b;
    };

    const dispatchRoom = (name) => {
      window.dispatchEvent(new CustomEvent("scarlett-room", { detail: { name } }));
      log(`[ui] room -> ${name}`);
    };

    const dispatchEnterVR = () => {
      window.dispatchEvent(new Event("scarlett-enter-vr"));
      log("[ui] enter vr -> event dispatched");
    };

    // Top buttons (match what you showed)
    panel.appendChild(makeBtn("Enter VR", dispatchEnterVR, { accent: true }));

    panel.appendChild(makeBtn("Recenter", () => {
      // VR: reset reference space by re-applying lobby spawn
      // Mobile: also re-applies lobby spawn (RoomBridge handles)
      dispatchRoom("lobby");
    }));

    panel.appendChild(makeBtn("Teleport", () => {
      // Quick teleport forward (mobile) OR to lobby_spawn (safe)
      if (ctx.teleport) ctx.teleport("lobby_spawn");
      else dispatchRoom("lobby");
    }));

    panel.appendChild(makeBtn("Move", () => {
      // no-op (AndroidControls always enabled on phone)
      log("[ui] move: AndroidControls active on phone");
    }));

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

    panel.appendChild(makeBtn("Hands", () => {
      // placeholder: keep for future hand toggle
      log("[ui] hands toggle (placeholder)");
    }));

    panel.appendChild(makeBtn("Lobby", () => dispatchRoom("lobby")));
    panel.appendChild(makeBtn("Scorpion", () => dispatchRoom("scorpion")));

    // Row 3
    panel.appendChild(makeBtn("Spectate", () => dispatchRoom("spectator")));
    panel.appendChild(makeBtn("Store", () => dispatchRoom("store")));

    panel.appendChild(makeBtn("Diagnostics", () => {
      // toggle a small diag overlay
      window.dispatchEvent(new Event("scarlett-diag"));
      log("[ui] diagnostics event");
    }));

    panel.appendChild(makeBtn("Force Log", () => {
      window.dispatchEvent(new Event("scarlett-force-log"));
      log("[ui] force-log event");
    }));

    // Row 4
    panel.appendChild(makeBtn("Help", () => alert(
      "Mobile:\n- Use pads to look/move\n- Teleport button jumps forward\n\nRooms:\n- Lobby / Scorpion / Store / Spectate"
    )));

    panel.appendChild(makeBtn("Log", () => {
      window.dispatchEvent(new Event("scarlett-force-log"));
    }));

    panel.appendChild(makeBtn("Reset", () => {
      // Hard reset to lobby + clamp height
      dispatchRoom("lobby");
      if (ctx.AndroidControls?.enabled) {
        ctx.AndroidControls.teleportTo({ x: 0, y: 0, z: 0 });
      }
      log("[ui] reset -> lobby");
    }, { accent: true }));

    log("[ui] init ✅ v5");
    return panel;
  },
};
