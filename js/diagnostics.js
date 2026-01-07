export function createHub() {
  const el = document.getElementById("hub");
  const state = {
    lines: [],
    fps: 0,
    xr: false,
    left: false,
    right: false,
    rig: { x: 0, y: 0, z: 0 },
    lastErr: "",
  };

  const addLine = (s) => {
    state.lines.push(s);
    if (state.lines.length > 80) state.lines.shift();
    render();
  };

  const set = (patch) => {
    Object.assign(state, patch);
    render();
  };

  const render = () => {
    if (!el) return;
    const top =
`Scarlett Poker VR — HUB
XR: ${state.xr ? "ON" : "OFF"}   FPS: ${state.fps.toFixed(0)}
Controllers: L=${state.left ? "YES" : "NO"}  R=${state.right ? "YES" : "NO"}
Rig: x=${state.rig.x.toFixed(2)} y=${state.rig.y.toFixed(2)} z=${state.rig.z.toFixed(2)}
LastErr: ${state.lastErr || "(none)"}

LOAD LOG:
`;
    el.textContent = top + state.lines.join("\n");
  };

  addLine("✅ Hub online");
  return { addLine, set, state };
}
