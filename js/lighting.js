export function buildLighting(){
  const rig = document.getElementById("lightRig");
  if (!rig) return;
  rig.innerHTML = "";

  const hemi = document.createElement("a-entity");
  hemi.setAttribute("light", "type: hemisphere; intensity: 0.7; color: #cfe8ff; groundColor: #132033");
  rig.appendChild(hemi);

  const key = document.createElement("a-entity");
  key.setAttribute("light", "type: directional; intensity: 0.9; color: #ffffff");
  key.setAttribute("position", "8 14 6");
  rig.appendChild(key);

  const fill = document.createElement("a-entity");
  fill.setAttribute("light", "type: point; intensity: 1.0; distance: 30; decay: 2; color: #2bdcff");
  fill.setAttribute("position", "0 5 0");
  rig.appendChild(fill);

  const rim = document.createElement("a-entity");
  rim.setAttribute("light", "type: point; intensity: 0.8; distance: 25; decay: 2; color: #ff2bbd");
  rim.setAttribute("position", "-10 4 -10");
  rig.appendChild(rim);
}
