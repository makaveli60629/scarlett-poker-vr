const $ = (s) => document.querySelector(s);
const scene = $("#scene");
const logEl = $("#log");
const statusEl = $("#status");

function t(){ return (performance.now()/1000).toFixed(3); }
function log(msg){
  const line = `[${t()}] ${msg}`;
  if (logEl) {
    logEl.textContent = (logEl.textContent ? (logEl.textContent + "\n") : "") + line;
    const lines = logEl.textContent.split("\n");
    if (lines.length > 140) logEl.textContent = lines.slice(-140).join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  }
  console.log(line);
}
function setStatus(s){ if(statusEl) statusEl.textContent = s; }

$("#btnEnter")?.addEventListener("click", () => {
  if (scene?.enterVR) scene.enterVR();
  else scene.setAttribute("xr-mode-ui","enabled:true");
  log("enterVR pressed");
});
$("#btnDiag")?.addEventListener("click", () => {
  const open = logEl.style.display !== "block";
  logEl.style.display = open ? "block" : "none";
  log(`diag ${open ? "OPEN" : "CLOSED"}`);
});

AFRAME.registerComponent("avatar-rig", {
  init: function(){ log("[rig] ready"); }
});

AFRAME.registerComponent("avatar-manager", {
  init: function(){
    this.mode = "primitives";
    this.name = "PLAYER";
    this.avatar = null;

    this.head = document.getElementById("camera");
    this.left = document.getElementById("leftHand");
    this.right = document.getElementById("rightHand");

    this.setName($("#nameInput")?.value || "PLAYER");
    this.setMode($("#avatarSelect")?.value || "primitives");

    $("#avatarSelect")?.addEventListener("change", (e) => this.setMode(e.target.value));
    $("#nameInput")?.addEventListener("change", (e) => this.setName(e.target.value));

    scene.addEventListener("avatar-wave", () => this.wave());
    log("[avatar] manager init ✅");
  },

  setName: function(name){
    this.name = (name || "PLAYER").toString().slice(0, 16);
    if (this.avatar?.nameplate) this.avatar.nameplate.setAttribute("value", this.name);
    log(`[avatar] name=${this.name}`);
  },

  clearAvatar: function(){
    if (this.avatar?.root) this.el.removeChild(this.avatar.root);
    this.avatar = null;
  },

  setMode: function(mode){
    this.mode = mode;
    this.clearAvatar();

    if (mode === "glbA") this.avatar = buildGLBAvatar("avatarA", this.name);
    else if (mode === "glbB") this.avatar = buildGLBAvatar("avatarB", this.name);
    else this.avatar = buildPrimitiveAvatar(this.name);

    this.el.appendChild(this.avatar.root);
    log(`[avatar] mode=${mode} ✅`);
  },

  wave: function(){
    if (!this.avatar?.rightVisual) return;
    const v = this.avatar.rightVisual;
    v.setAttribute("animation__wave",
      "property: position; dir: alternate; dur: 220; loop: 8; to: 0.12 0.10 0; easing: easeInOutSine");
    log("[avatar] wave");
  },

  tick: function(){
    if (!this.avatar) return;
    const hp = this.head.object3D.getWorldPosition(new THREE.Vector3());
    const hr = this.head.object3D.getWorldQuaternion(new THREE.Quaternion());
    const rigObj = document.getElementById("rig").object3D;
    rigObj.worldToLocal(hp);
    this.avatar.headGroup.object3D.position.copy(hp);
    this.avatar.headGroup.object3D.quaternion.copy(hr);
    followHand(this.left, this.avatar.leftGroup);
    followHand(this.right, this.avatar.rightGroup);
  }
});

function followHand(handEl, groupEl){
  if (!handEl || !groupEl) return;
  const p = handEl.object3D.getWorldPosition(new THREE.Vector3());
  const q = handEl.object3D.getWorldQuaternion(new THREE.Quaternion());
  const rigObj = document.getElementById("rig").object3D;
  rigObj.worldToLocal(p);
  groupEl.object3D.position.copy(p);
  groupEl.object3D.quaternion.copy(q);
}

AFRAME.registerComponent("avatar-hand", {
  schema: { hand: {type:"string"} },
  init: function(){
    const el = this.el;
    let laserOn = true;
    const setLaser = (on) => {
      laserOn = on;
      el.setAttribute("line", { opacity: laserOn ? 0.9 : 0.0 });
    };
    el.addEventListener("gripdown", () => setLaser(!laserOn));
  }
});

AFRAME.registerComponent("ui-button", {
  schema: { label: {type:"string"} },
  init: function(){
    const el = this.el;
    el.classList.add("clickable");
    el.setAttribute("text", `value: ${this.data.label}; align:center; color:#e8f7ff; width:2.2`);
    el.addEventListener("click", () => scene.emit("avatar-wave"));
  }
});

function buildPrimitiveAvatar(name){
  const root = document.createElement("a-entity");

  const headGroup = document.createElement("a-entity");
  const head = document.createElement("a-sphere");
  head.setAttribute("radius","0.11");
  head.setAttribute("material","color:#101820; roughness:1");
  headGroup.appendChild(head);

  const body = document.createElement("a-cylinder");
  body.setAttribute("radius","0.16");
  body.setAttribute("height","0.55");
  body.setAttribute("position","0 -0.38 0");
  body.setAttribute("material","color:#223245; roughness:1");
  headGroup.appendChild(body);

  const leftGroup = document.createElement("a-entity");
  const leftHand = document.createElement("a-sphere");
  leftHand.setAttribute("radius","0.055");
  leftHand.setAttribute("material","color:#bfefff; roughness:1; opacity:0.85");
  leftGroup.appendChild(leftHand);

  const rightGroup = document.createElement("a-entity");
  const rightHand = document.createElement("a-sphere");
  rightHand.setAttribute("radius","0.055");
  rightHand.setAttribute("material","color:#bfefff; roughness:1; opacity:0.85");
  rightGroup.appendChild(rightHand);

  const nameplate = document.createElement("a-text");
  nameplate.setAttribute("value", name);
  nameplate.setAttribute("align","center");
  nameplate.setAttribute("width","2.2");
  nameplate.setAttribute("color","#dfefff");
  nameplate.setAttribute("position","0 0.22 0");
  headGroup.appendChild(nameplate);

  root.appendChild(headGroup);
  root.appendChild(leftGroup);
  root.appendChild(rightGroup);

  return { root, headGroup, leftGroup, rightGroup, rightVisual: rightHand, nameplate };
}

function buildGLBAvatar(assetId, name){
  const asset = document.getElementById(assetId);
  if (!asset) {
    log(`[avatar] ${assetId} not found → fallback primitives`);
    return buildPrimitiveAvatar(name);
  }
  const root = document.createElement("a-entity");
  const headGroup = document.createElement("a-entity");
  const glb = document.createElement("a-entity");
  glb.setAttribute("gltf-model", `#${assetId}`);
  glb.setAttribute("scale","1 1 1");
  headGroup.appendChild(glb);

  const leftGroup = document.createElement("a-entity");
  const rightGroup = document.createElement("a-entity");

  const nameplate = document.createElement("a-text");
  nameplate.setAttribute("value", name);
  nameplate.setAttribute("align","center");
  nameplate.setAttribute("width","2.2");
  nameplate.setAttribute("color","#dfefff");
  nameplate.setAttribute("position","0 0.45 0");
  headGroup.appendChild(nameplate);

  root.appendChild(headGroup);
  root.appendChild(leftGroup);
  root.appendChild(rightGroup);
  return { root, headGroup, leftGroup, rightGroup, rightVisual: null, nameplate };
}

scene.addEventListener("loaded", () => {
  const secure = window.isSecureContext;
  const xr = !!navigator.xr;
  const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0;
  setStatus(`secure=${secure} xr=${xr} touch=${touch}`);
  log("scene loaded ✅");

  const left = document.getElementById("leftHand");
  const right = document.getElementById("rightHand");
  left.addEventListener("controllerconnected", () => log("[input] left controllerconnected"));
  right.addEventListener("controllerconnected", () => log("[input] right controllerconnected"));

  // Autoplay policies: unlock on first user gesture
  const unlock = () => {
    document.removeEventListener("click", unlock);
    log("[audio] unlocked by gesture ✅");
  };
  document.addEventListener("click", unlock, { once: true });
});
