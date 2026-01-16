// /js/scarlett1/modules/world/lobby_hallways_module.js
// LOBBY + 4 HALLWAYS MODULE (FULL) — ROOT PATCHED

export function createLobbyHallwaysModule({
  lobbyRadius = 12.5,
  lobbyWallHeight = 4.2,
  lobbyFloorY = 0.0,

  hallCount = 4,
  hallLength = 10.5,
  hallWidth = 3.8,
  hallHeight = 3.1,

  doorWidth = 2.3,
  doorHeight = 2.6,
  doorDepth = 0.25,

  trimIntensity = 0.55,
} = {}) {
  let built = false;

  function mat(ctx, color, rough = 0.9, metal = 0.06) {
    return new ctx.THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  }
  function matGlow(ctx, color, emissive, ei) {
    return new ctx.THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.15,
      emissive: new ctx.THREE.Color(emissive),
      emissiveIntensity: ei,
    });
  }
  function ringLine(ctx, radius, y, color = 0x33ffff, seg = 160) {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      pts.push(new ctx.THREE.Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius));
    }
    const geo = new ctx.THREE.BufferGeometry().setFromPoints(pts);
    return new ctx.THREE.Line(geo, new ctx.THREE.LineBasicMaterial({ color }));
  }

  function buildDoor(ctx, parent, x, y, z, yaw, labelColor = 0x33ffff) {
    const THREE = ctx.THREE;

    const g = new THREE.Group();
    g.name = "DoorFrame";
    g.position.set(x, y, z);
    g.rotation.y = yaw;

    const frameMat = matGlow(ctx, 0x101020, 0x112244, 0.25);
    const neonMat = matGlow(ctx, 0x0f0f18, labelColor, trimIntensity);

    const postGeo = new THREE.BoxGeometry(0.18, doorHeight, doorDepth);
    const left = new THREE.Mesh(postGeo, frameMat);
    const right = new THREE.Mesh(postGeo, frameMat);
    left.position.set(-doorWidth * 0.5, doorHeight * 0.5, 0);
    right.position.set(doorWidth * 0.5, doorHeight * 0.5, 0);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth + 0.18, 0.18, doorDepth),
      frameMat
    );
    top.position.set(0, doorHeight, 0);

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth + 0.06, 0.06, 0.08),
      neonMat
    );
    strip.position.set(0, doorHeight + 0.10, doorDepth * 0.45);

    const portalPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(doorWidth, doorHeight),
      new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.0 })
    );
    portalPlane.position.set(0, doorHeight * 0.5, doorDepth * 0.51);
    portalPlane.userData.isDoorPortal = true;

    g.add(left, right, top, strip, portalPlane);
    parent.add(g);
    return { group: g, portalPlane };
  }

  return {
    name: "lobby_hallways",

    onEnable(ctx) {
      if (built) return;
      built = true;

      const THREE = ctx.THREE;

      // ROOT GROUP (toggle-safe)
      const root = new THREE.Group();
      root.name = "lobby_hallways_ROOT";
      ctx.scene.add(root);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(lobbyRadius, 96),
        mat(ctx, 0x08080d, 0.95, 0.02)
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = lobbyFloorY;
      root.add(floor);

      const wall = new THREE.Mesh(
        new THREE.CylinderGeometry(lobbyRadius, lobbyRadius, lobbyWallHeight, 128, 1, true),
        mat(ctx, 0x0b0b12, 0.85, 0.08)
      );
      wall.position.y = lobbyFloorY + lobbyWallHeight * 0.5;
      root.add(wall);

      root.add(ringLine(ctx, lobbyRadius - 0.15, lobbyFloorY + 0.03, 0x33ffff));
      root.add(ringLine(ctx, lobbyRadius - 0.25, lobbyFloorY + 1.80, 0xff66ff));
      root.add(ringLine(ctx, lobbyRadius - 0.35, lobbyFloorY + lobbyWallHeight - 0.35, 0x66aaff));

      const hallwayMat = mat(ctx, 0x0a0a12, 0.92, 0.06);
      const trimA = matGlow(ctx, 0x0f0f18, 0x33ffff, trimIntensity);
      const trimB = matGlow(ctx, 0x0f0f18, 0xff66ff, trimIntensity * 0.9);

      const halls = new THREE.Group();
      halls.name = "LobbyHallways";
      root.add(halls);

      const angles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
      const doorColors = [0x33ffff, 0xff66ff, 0x66aaff, 0xffcc33];

      for (let i = 0; i < hallCount; i++) {
        const a = angles[i % angles.length];

        const startR = lobbyRadius - 0.2;
        const midR = startR + hallLength * 0.5;

        const hx = Math.cos(a) * midR;
        const hz = Math.sin(a) * midR;
        const yaw = -a + Math.PI / 2;

        const hall = new THREE.Group();
        hall.name = `Hall_${i + 1}`;
        hall.position.set(hx, lobbyFloorY, hz);
        hall.rotation.y = yaw;

        const hFloor = new THREE.Mesh(
          new THREE.BoxGeometry(hallWidth, 0.08, hallLength),
          hallwayMat
        );
        hFloor.position.y = 0.04;
        hall.add(hFloor);

        const hCeil = new THREE.Mesh(
          new THREE.BoxGeometry(hallWidth, 0.08, hallLength),
          hallwayMat
        );
        hCeil.position.y = hallHeight;
        hall.add(hCeil);

        const wallGeo = new THREE.BoxGeometry(0.12, hallHeight, hallLength);
        const wL = new THREE.Mesh(wallGeo, hallwayMat);
        const wR = new THREE.Mesh(wallGeo, hallwayMat);
        wL.position.set(-hallWidth * 0.5, hallHeight * 0.5, 0);
        wR.position.set(hallWidth * 0.5, hallHeight * 0.5, 0);
        hall.add(wL, wR);

        const edgeGeo = new THREE.BoxGeometry(0.06, 0.05, hallLength * 0.98);
        const eL = new THREE.Mesh(edgeGeo, (i % 2 === 0) ? trimA : trimB);
        const eR = new THREE.Mesh(edgeGeo, (i % 2 === 0) ? trimA : trimB);
        eL.position.set(-hallWidth * 0.45, 0.06, 0);
        eR.position.set(hallWidth * 0.45, 0.06, 0);
        hall.add(eL, eR);

        const doorZ = hallLength * 0.5 - 0.35;
        buildDoor(ctx, hall, 0, 0, doorZ, 0, doorColors[i % doorColors.length]);

        halls.add(hall);
      }

      console.log("[lobby_hallways] built ✅ halls=", hallCount);
    },
  };
        }
