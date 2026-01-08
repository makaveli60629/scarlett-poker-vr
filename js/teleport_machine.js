// /js/teleport_machine.js — Scarlett Portal (9.0) — NO imports, uses passed THREE

export function createTeleportMachine(THREE) {
  const api = {
    group: null,
    padCenter: new THREE.Vector3(0, 0, 3.6),

    build(scene, texLoader = null) {
      const g = new THREE.Group();
      g.name = "TeleportMachine";
      g.position.copy(api.padCenter);

      // --- base pad ---
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.0, 0.14, 36),
        new THREE.MeshStandardMaterial({ color: 0x0e1018, roughness: 0.85, metalness: 0.15 })
      );
      base.position.y = 0.07;
      g.add(base);

      // --- glowing rune disc (optional texture) ---
      let discMat = new THREE.MeshStandardMaterial({
        color: 0x55e7ff,
        emissive: 0x55e7ff,
        emissiveIntensity: 1.35,
        roughness: 0.35,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
      });

      if (texLoader) {
        try {
          const t = texLoader.load(
            "assets/textures/Teleport glow.jpg",
            (tt) => {
              tt.wrapS = tt.wrapT = THREE.RepeatWrapping;
              tt.repeat.set(1, 1);
              tt.colorSpace = THREE.SRGBColorSpace;
            },
            undefined,
            () => {}
          );
          discMat = new THREE.MeshStandardMaterial({
            map: t,
            color: 0xffffff,
            emissive: 0x55e7ff,
            emissiveIntensity: 1.1,
            roughness: 0.35,
            metalness: 0.0,
            transparent: true,
            opacity: 0.95
          });
        } catch {}
      }

      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.78, 48), discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.145;
      disc.name = "portalDisc";
      g.add(disc);

      // --- portal frame (matches your image vibe) ---
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x0c1020,
        roughness: 0.35,
        metalness: 0.55,
        emissive: 0x0a1a3a,
        emissiveIntensity: 0.45
      });

      const frame = new THREE.Group();
      frame.position.set(0, 0, -1.5);

      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.7, 0.35), frameMat);
      leftPillar.position.set(-1.1, 1.35, 0);
      const rightPillar = leftPillar.clone();
      rightPillar.position.x = 1.1;

      const topBar = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.35, 0.35), frameMat);
      topBar.position.set(0, 2.55, 0);

      frame.add(leftPillar, rightPillar, topBar);
      frame.name = "portalFrame";
      g.add(frame);

      // --- inner glow plane (soft) ---
      const portalGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1, 2.2),
        new THREE.MeshStandardMaterial({
          color: 0x9fefff,
          emissive: 0x9fefff,
          emissiveIntensity: 0.95,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide
        })
      );
      portalGlow.position.set(0, 1.35, -1.32);
      portalGlow.name = "portalGlow";
      g.add(portalGlow);

      // --- purple electricity line (top corners) ---
      const zapGeo = new THREE.BufferGeometry();
      const pts = new Float32Array(64 * 3);
      zapGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      const zap = new THREE.Line(
        zapGeo,
        new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.9 })
      );
      zap.position.set(0, 2.55, -1.32);
      zap.name = "portalZap";
      g.add(zap);

      // --- light ---
      const glowLight = new THREE.PointLight(0x8f3dff, 0.9, 7);
      glowLight.position.set(0, 1.8, -1.25);
      glowLight.name = "portalLight";
      g.add(glowLight);

      g.userData._t = 0;

      scene.add(g);
      api.group = g;
      return g;
    },

    tick(dt) {
      if (!api.group) return;
      const g = api.group;
      g.userData._t += dt;
      const t = g.userData._t;

      const disc = g.getObjectByName("portalDisc");
      const glow = g.getObjectByName("portalGlow");
      const zap = g.getObjectByName("portalZap");
      const light = g.getObjectByName("portalLight");

      if (disc) {
        disc.rotation.z += dt * 0.35;
        disc.material.emissiveIntensity = 1.05 + Math.sin(t * 4.0) * 0.25;
      }

      if (glow) glow.material.opacity = 0.16 + (Math.sin(t * 2.0) * 0.03);

      if (light) light.intensity = 0.75 + Math.sin(t * 6.0) * 0.20;

      if (zap) {
        const arr = zap.geometry.attributes.position.array;
        let idx = 0;

        // draw a crackly line between two top corners
        const A = { x: -1.05, y: 0.0, z: 0.0 };
        const B = { x:  1.05, y: 0.0, z: 0.0 };

        for (let i = 0; i < 64; i++) {
          const u = i / 63;
          const x = THREE.MathUtils.lerp(A.x, B.x, u);
          const y = Math.sin(t * 14 + i * 0.7) * 0.07 + (Math.random() - 0.5) * 0.02;
          const z = 0;
          arr[idx++] = x;
          arr[idx++] = y;
          arr[idx++] = z;
        }
        zap.geometry.attributes.position.needsUpdate = true;
      }
    },

    getSafeSpawn() {
      return {
        position: new THREE.Vector3(api.padCenter.x, 0, api.padCenter.z + 1.2),
        yaw: 0
      };
    }
  };

  return api;
}
