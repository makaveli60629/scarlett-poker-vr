import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { State } from "./state.js";

export const Store = {
  group: null,
  pedestals: [],
  raycaster: new THREE.Raycaster(),

  build(scene, textureLoader) {
    this.group = new THREE.Group();
    this.group.position.set(16, 0, 6); // Store area anchor

    // Room base
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.9 });
    const mkWall = (w,h,x,z,ry) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,0.2), wallMat);
      wall.position.set(x, h/2, z);
      wall.rotation.y = ry;
      wall.userData.collider = true;
      this.group.add(wall);
    };
    mkWall(10, 3, 0, -5, 0);
    mkWall(10, 3, 0,  5, 0);
    mkWall(10, 3, -5, 0, Math.PI/2);
    mkWall(10, 3,  5, 0, Math.PI/2);

    // Title sign
    const sign = this._textPlane("STORE", 1024, 256, "bold 120px system-ui");
    sign.position.set(0, 2.4, -4.7);
    this.group.add(sign);

    // Pedestals showroom (temporary)
    const items = State.storeItems.slice(0, 24); // display first 24
    const cols = 6;
    const spacing = 1.5;
    items.forEach((it, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;

      const ped = new THREE.Group();
      ped.position.set(-3.75 + c*spacing, 0, -2.8 + r*spacing);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.25, 18),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 })
      );
      base.position.y = 0.125;
      ped.add(base);

      const token = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x0aaaff, roughness: 0.45, metalness: 0.2, emissive: 0x001122 })
      );
      token.position.y = 0.55;
      token.userData.storeItemId = it.id;
      token.name = "storeToken";
      ped.add(token);

      const label = this._textPlane(
        `${it.name}\n${it.priceUSD ? `$${it.priceUSD}` : `${it.price} chips`}\nTap/Click to buy`,
        1024, 512, "bold 52px system-ui"
      );
      label.position.set(0, 1.05, 0);
      label.rotation.x = -0.18;
      ped.add(label);

      this.pedestals.push(token);
      this.group.add(ped);
    });

    // Lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    this.group.add(amb);

    const spot = new THREE.SpotLight(0xffffff, 1.2, 30, Math.PI/6, 0.3, 1);
    spot.position.set(0, 3, 0);
    spot.target.position.set(0, 0, 0);
    this.group.add(spot);
    this.group.add(spot.target);

    scene.add(this.group);
  },

  tryBuy(itemId) {
    const item = State.storeItems.find(i => i.id === itemId);
    if (!item) return { ok:false, msg:"Item missing" };
    if (State.owned.has(itemId)) return { ok:false, msg:"Already owned" };

    // Membership / Event chip are USD concept (stub for now)
    if (item.type === "membership") {
      State.membership = true;
      State.eventChips += 1; // gives 1 event chip free
      State.owned.add(itemId);
      return { ok:true, msg:"Membership activated + 1 Event Chip!" };
    }

    if (item.type === "eventChip") {
      State.eventChips += 1;
      State.owned.add(itemId);
      return { ok:true, msg:"+1 Event Chip added." };
    }

    // Chips bundles are free stub until payments exist
    if (item.type === "chips") {
      State.chips += (item.chips || 0);
      State.owned.add(itemId);
      return { ok:true, msg:`Added ${item.chips} chips.` };
    }

    // Cosmetic purchases cost chips
    if ((item.price || 0) > State.chips) {
      return { ok:false, msg:"Not enough chips" };
    }
    State.chips -= (item.price || 0);
    State.owned.add(itemId);
    return { ok:true, msg:`Purchased: ${item.name}` };
  },

  hitTest(origin, dir) {
    this.raycaster.set(origin, dir);
    const hits = this.raycaster.intersectObjects(this.pedestals, false);
    return hits.length ? hits[0].object : null;
  },

  _textPlane(text, w, h, font) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "#fff";
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lines = String(text).split("\n");
    const lineH = h / (lines.length + 1);
    lines.forEach((ln,i)=>{
      ctx.fillText(ln, w/2, lineH*(i+1));
    });

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), mat);
    return mesh;
  }
};
