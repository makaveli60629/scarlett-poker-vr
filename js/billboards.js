// /js/billboards.js — Yaw-only billboards (never tilt)

export function faceCameraYawOnly(obj3D, camera) {
  if (!obj3D || !camera) return;
  const pos = obj3D.getWorldPosition(obj3D.userData.__tmpV || (obj3D.userData.__tmpV = new camera.position.constructor()));
  const cam = camera.getWorldPosition(obj3D.userData.__tmpC || (obj3D.userData.__tmpC = new camera.position.constructor()));
  const dx = cam.x - pos.x;
  const dz = cam.z - pos.z;
  const yaw = Math.atan2(dx, dz);
  obj3D.rotation.set(0, yaw, 0);
}

export function makeNameTag({ THREE, text = "BOT", width = 1.6, height = 0.5 }) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(10,12,18,0.75)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(127,231,255,0.45)";
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  ctx.fillStyle = "rgba(232,236,255,0.95)";
  ctx.font = "bold 76px system-ui, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const geo = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "NameTag";
  mesh.userData.isBillboard = true;
  return mesh;
}
