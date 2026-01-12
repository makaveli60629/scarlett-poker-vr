// /js/nametags.js — Billboard tags (always face viewer) + 2 lines
export const NameTags = (() => {
  let THREE = null, camera = null;
  const targets = [];
  let active = null;

  function init(ctx) {
    THREE = ctx.THREE;
    camera = ctx.camera;
  }

  // data: { title, sub }
  function register(obj, data) {
    const tag = makeTagPlane(data?.title || "PLAYER", data?.sub || "");
    tag.visible = true;               // ✅ always visible at table per your request
    obj.add(tag);
    tag.position.set(0, 1.75, 0.0);
    targets.push({ obj, tag });
  }

  function update() {
    if (!camera) return;

    // Billboard every tag so it always faces the viewer
    const q = camera.getWorldQuaternion(new THREE.Quaternion());
    for (const t of targets) {
      t.tag.quaternion.copy(q);
    }
  }

  function makeTagPlane(title, sub) {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 192;
    const c = canvas.getContext("2d");

    c.clearRect(0, 0, canvas.width, canvas.height);

    // background
    c.fillStyle = "rgba(8,10,18,0.88)";
    roundRect(c, 10, 10, 748, 172, 28); c.fill();

    // border
    c.strokeStyle = "rgba(127,231,255,0.65)";
    c.lineWidth = 6;
    roundRect(c, 10, 10, 748, 172, 28); c.stroke();

    // accent
    c.fillStyle = "rgba(255,45,122,0.28)";
    c.fillRect(24, 24, 18, 144);

    // title
    c.fillStyle = "#e8ecff";
    c.font = "bold 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    c.fillText(title, 60, 86);

    // sub
    c.fillStyle = "rgba(232,236,255,0.85)";
    c.font = "bold 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    c.fillText(sub, 60, 142);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.10, 0.55), mat);
    plane.renderOrder = 999;
    return plane;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return { init, register, update };
})();
