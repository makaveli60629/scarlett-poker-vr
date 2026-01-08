// /js/store.js
// Scarlett VR Poker — Store System (kiosk + simple purchase logic)
//
// ✅ Creates a kiosk mesh with an interact collider (userData.isInteractable)
// ✅ Simple "open/close" store state + item list
// ✅ Creates chip meshes (visual) + emits events for your physics/chip logic
// ✅ Works with Controls.onInteract: if action == "OPEN_STORE" => store.toggle()
//
// Usage:
//   import { Store } from "./store.js";
//   const store = new Store({ THREE, scene });
//   scene.add(store.group);
//   controls.setInteractables([store.interactCollider]); // OR push into your interactables list
//   controls.onInteract = (hit) => store.handleInteract(hit);
//
//   // In your loop:
//   store.update(dt);

export class Store {
  constructor({
    THREE,
    scene,
    position = { x: 6, y: 0, z: -4 },
    rotationY = Math.PI / 2,
  }) {
    this.THREE = THREE;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.name = "StoreKiosk";
    this.group.position.set(position.x, position.y, position.z);
    this.group.rotation.y = rotationY;

    // Simple state
    this.isOpen = false;
    this.balance = 1000; // starter money for testing
    this.items = [
      { id: "chips_100", label: "$100 Chips (x5)", price: 100, type: "chips", value: 100, count: 5 },
      { id: "chips_500", label: "$500 Chips (x5)", price: 500, type: "chips", value: 500, count: 5 },
      { id: "chips_1000", label: "$1000 Chips (x3)", price: 1000, type: "chips", value: 1000, count: 3 },
    ];

    // Event callbacks
    this.onOpen = null;     // () => void
    this.onClose = null;    // () => void
    this.onPurchase = null; // ({item, success, reason}) => void
    this.onSpawnChip = null;// ({chipMesh, value}) => void

    // Build kiosk
    this._buildKiosk();

    // Small in-world indicator (no DOM)
    this._hint = this._makeHintTextPlane("STORE", 1.6, 0.55);
    this._hint.position.set(0, 1.35, 0.41);
    this.group.add(this._hint);

    // A simple "panel" that appears when open (still no DOM)
    this.panel = this._makePanel();
    this.panel.visible = false;
    this.panel.position.set(0, 1.05, 0.44);
    this.group.add(this.panel);

    // Spawn point for chips in front of kiosk
    this.spawnPoint = new THREE.Object3D();
    this.spawnPoint.position.set(0, 0.95, 1.0);
    this.group.add(this.spawnPoint);

    // Add to scene
    scene.add(this.group);
  }

  _buildKiosk() {
    const THREE = this.THREE;

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.1, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.35, roughness: 0.65 })
    );
    base.position.y = 0.55;
    base.castShadow = true;
    base.receiveShadow = true;
    this.group.add(base);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.55),
      new THREE.MeshStandardMaterial({
        color: 0x0d0d0d,
        emissive: 0x7b2cff,
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0.95,
      })
    );
    sign.position.set(0, 1.35, 0.405);
    this.group.add(sign);

    // Interact collider
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.8, 1.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    col.position.set(0, 0.85, 0.15);
    col.userData.isInteractable = true;
    col.userData.action = "OPEN_STORE";
    col.userData.storeId = "main_store";
    this.group.add(col);

    this.interactCollider = col;
  }

  // ---------- Public ----------
  handleInteract(hit) {
    const obj = hit?.object;
    const action = obj?.userData?.action;
    if (action === "OPEN_STORE") {
      this.toggle();
      return true;
    }
    if (action?.startsWith?.("BUY_")) {
      const id = action.slice(4);
      this.buy(id);
      return true;
    }
    return false;
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.panel.visible = true;
    this._hint.material.emissiveIntensity = 2.0;
    this.onOpen?.();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.panel.visible = false;
    this._hint.material.emissiveIntensity = 1.2;
    this.onClose?.();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  buy(itemId) {
    const item = this.items.find((x) => x.id === itemId);
    if (!item) {
      this.onPurchase?.({ item: null, success: false, reason: "Item not found" });
      return false;
    }
    if (this.balance < item.price) {
      this.onPurchase?.({ item, success: false, reason: "Not enough balance" });
      return false;
    }

    this.balance -= item.price;

    if (item.type === "chips") {
      for (let i = 0; i < item.count; i++) {
        const chip = this.createChipMesh({ value: item.value });
        chip.position.copy(this.spawnPoint.getWorldPosition(new this.THREE.Vector3()));
        chip.position.x += (Math.random() - 0.5) * 0.12;
        chip.position.z += (Math.random() - 0.5) * 0.12;
        chip.position.y += 0.06 + i * 0.01;

        // NOTE: this is visual only. Your physics system can replace/attach rigid bodies.
        this.scene.add(chip);
        this.onSpawnChip?.({ chipMesh: chip, value: item.value });
      }
    }

    this.onPurchase?.({ item, success: true, reason: "" });
    return true;
  }

  update(dt) {
    // Soft pulse on the hint + panel
    const t = performance.now() * 0.002;
    if (this._hint?.material) {
      this._hint.material.emissiveIntensity = (this.isOpen ? 2.0 : 1.2) + Math.sin(t) * 0.25;
    }
    if (this.panel?.children?.length) {
      this.panel.rotation.z = Math.sin(t * 0.6) * 0.01;
    }
  }

  // ---------- UI Meshes ----------
  _makePanel() {
    const THREE = this.THREE;

    const g = new THREE.Group();
    g.name = "StorePanel";

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.8),
      new THREE.MeshStandardMaterial({
        color: 0x101010,
        emissive: 0x2b0a4d,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.95,
      })
    );
    g.add(bg);

    // Create three "buy buttons" as meshes
    const btnW = 0.48, btnH = 0.22;
    const xs = [-0.52, 0.0, 0.52];
    const labels = ["BUY 100", "BUY 500", "BUY 1000"];
    const actions = ["BUY_chips_100", "BUY_chips_500", "BUY_chips_1000"];

    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(
        new THREE.PlaneGeometry(btnW, btnH),
        new THREE.MeshStandardMaterial({
          color: 0x141414,
          emissive: 0x7b2cff,
          emissiveIntensity: 1.0,
          transparent: true,
          opacity: 0.92,
        })
      );
      btn.position.set(xs[i], 0.0, 0.01);
      btn.userData.isInteractable = true;
      btn.userData.action = actions[i];
      btn.name = labels[i];
      g.add(btn);

      // text overlay
      const txt = this._makeHintTextPlane(labels[i], btnW, btnH);
      txt.position.set(xs[i], 0.0, 0.02);
      txt.material.emissiveIntensity = 0.0;
      g.add(txt);
    }

    // balance line (visual placeholder)
    const bal = this._makeHintTextPlane("BALANCE", 0.7, 0.18);
    bal.position.set(0, -0.28, 0.02);
    g.add(bal);

    return g;
  }

  _makeHintTextPlane(text, w, h) {
    // No fonts dependency: draw text to a canvas texture
    const THREE = this.THREE;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "bold 92px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // glow stroke
    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(155,77,255,0.85)";
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);

    // fill
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      emissive: 0x7b2cff,
      emissiveIntensity: 1.2,
      roughness: 0.6,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.renderOrder = 10;
    return mesh;
  }

  // ---------- Chip Mesh (visual) ----------
  createChipMesh({ value = 100, radius = 0.022, thickness = 0.008 } = {}) {
    const THREE = this.THREE;

    const geo = new THREE.CylinderGeometry(radius, radius, thickness, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x202020,
      metalness: 0.1,
      roughness: 0.45,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
    });

    const chip = new THREE.Mesh(geo, mat);
    chip.rotation.x = Math.PI / 2;
    chip.castShadow = true;
    chip.receiveShadow = true;

    chip.userData.isChip = true;
    chip.userData.value = value;

    // Optional: slightly different look by value
    if (value >= 1000) {
      chip.material.emissive = new THREE.Color(0x7b2cff);
      chip.material.emissiveIntensity = 0.35;
    }

    return chip;
  }
  }
