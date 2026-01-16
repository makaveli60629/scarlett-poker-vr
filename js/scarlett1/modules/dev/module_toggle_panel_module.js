// /js/scarlett1/modules/dev/module_toggle_panel_module.js
// MODULE TOGGLE PANEL (FULL) — Modular Forever
// - Live enable/disable panel for major modules (no code edits each time)
// - "Disable" works by removing scene groups named "<moduleName>_ROOT"
// - "Enable" calls module.onEnable(ctx) again (idempotent modules are best)
// Requirements:
// - Modules should add their content under a root Group named `${module.name}_ROOT`
//   If a module doesn't yet, you can still use "disable" to remove by known group names.

export function createModuleTogglePanelModule({
  title = "MODULES",
} = {}) {
  let panel = null;

  function ensurePanel() {
    if (panel) return;

    panel = document.createElement("div");
    panel.setAttribute("data-hud", "1");
    panel.style.position = "fixed";
    panel.style.right = "12px";
    panel.style.bottom = "12px";
    panel.style.zIndex = "999999";
    panel.style.width = "260px";
    panel.style.maxWidth = "90vw";
    panel.style.padding = "12px";
    panel.style.borderRadius = "14px";
    panel.style.border = "1px solid rgba(255,255,255,0.16)";
    panel.style.background = "rgba(0,0,0,0.55)";
    panel.style.color = "white";
    panel.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    panel.style.fontSize = "12px";
    panel.style.backdropFilter = "blur(8px)";
    panel.style.webkitBackdropFilter = "blur(8px)";

    const hdr = document.createElement("div");
    hdr.textContent = title;
    hdr.style.fontWeight = "800";
    hdr.style.letterSpacing = "0.10em";
    hdr.style.marginBottom = "10px";
    panel.appendChild(hdr);

    const body = document.createElement("div");
    body.id = "scarlett_module_toggle_body";
    body.style.display = "grid";
    body.style.gridTemplateColumns = "1fr 64px";
    body.style.gap = "8px";
    panel.appendChild(body);

    const toggle = document.createElement("button");
    toggle.textContent = "toggle";
    toggle.style.position = "absolute";
    toggle.style.right = "10px";
    toggle.style.top = "10px";
    toggle.style.padding = "6px 8px";
    toggle.style.borderRadius = "10px";
    toggle.style.border = "1px solid rgba(255,255,255,0.18)";
    toggle.style.background = "rgba(20,20,30,0.7)";
    toggle.style.color = "white";
    toggle.style.cursor = "pointer";
    toggle.style.fontSize = "11px";
    panel.appendChild(toggle);

    let collapsed = false;
    toggle.onclick = () => {
      collapsed = !collapsed;
      body.style.display = collapsed ? "none" : "grid";
      panel.style.opacity = collapsed ? "0.75" : "1";
    };

    document.body.appendChild(panel);
  }

  function mkBtn(label) {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.padding = "8px 10px";
    b.style.borderRadius = "12px";
    b.style.border = "1px solid rgba(255,255,255,0.18)";
    b.style.background = "rgba(20,20,30,0.70)";
    b.style.color = "white";
    b.style.cursor = "pointer";
    b.style.fontSize = "12px";
    return b;
  }

  function findAndRemoveRoots(ctx, moduleName) {
    const target = `${moduleName}_ROOT`;
    const removals = [];

    ctx.scene.traverse((obj) => {
      if (obj?.name === target) removals.push(obj);
    });

    for (const obj of removals) {
      obj.parent?.remove(obj);
    }
    return removals.length;
  }

  function hasRoot(ctx, moduleName) {
    const target = `${moduleName}_ROOT`;
    let found = false;
    ctx.scene.traverse((obj) => {
      if (obj?.name === target) found = true;
    });
    return found;
  }

  function render(ctx) {
    ensurePanel();
    const body = panel.querySelector("#scarlett_module_toggle_body");
    if (!body) return;
    body.innerHTML = "";

    // We only toggle these "visual" modules, not XR core.
    const toggles = [
      { name: "lobby_hallways", label: "Lobby+Halls" },
      { name: "room_portals", label: "Room Portals" },
      { name: "door_teleport", label: "Door Teleport" },
      { name: "room_types", label: "Room Types" },
      { name: "nameplates", label: "Nameplates" },
      { name: "scorpion_theme", label: "Scorpion Theme" },
      { name: "spectator_stands", label: "Stands" },
      { name: "jumbotrons", label: "Jumbotrons" },
      { name: "showgame", label: "Showgame" },
    ];

    for (const t of toggles) {
      const label = document.createElement("div");
      label.textContent = t.label;
      label.style.opacity = "0.9";
      label.style.padding = "8px 0";
      body.appendChild(label);

      const on = hasRoot(ctx, t.name);
      const btn = mkBtn(on ? "ON" : "OFF");
      btn.style.background = on ? "rgba(60,160,90,0.55)" : "rgba(180,70,70,0.55)";

      btn.onclick = () => {
        // OFF -> remove roots
        if (hasRoot(ctx, t.name)) {
          const n = findAndRemoveRoots(ctx, t.name);
          console.log(`[module_toggle] disabled ${t.name} removed=${n}`);
        } else {
          // ON -> re-run onEnable for the module if available
          const mod = (ctx._moduleInstances || []).find(m => m.name === t.name);
          if (mod?.onEnable) {
            mod.onEnable(ctx);
            console.log(`[module_toggle] enabled ${t.name}`);
          } else {
            console.warn(`[module_toggle] can't enable ${t.name} (no instance)`);
          }
        }
        render(ctx);
      };

      body.appendChild(btn);
    }
  }

  return {
    name: "module_toggle_panel",

    onEnable(ctx) {
      ensurePanel();
      setTimeout(() => render(ctx), 250);
      setTimeout(() => render(ctx), 900);
      console.log("[module_toggle_panel] ready ✅");
    },

    update(ctx) {
      // Render occasionally if you want it always accurate; keep it cheap:
      // only refresh if panel exists and visible.
    },

    _render(ctx) { render(ctx); }
  };
}
