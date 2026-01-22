// js/world.js
import * as THREE from "three";

const TABLE_Y = -0.8;          // table group local base within pit
const PIT_DEPTH = -1.2;        // lobby floor is y=0, pit bottom at -1.2
const FELT_Y = 0.41;           // cards/chips sit on felt plane
const PASSLINE_R = 1.8;        // betting boundary
const CHIP_GRAB_R = 0.10;      // fingertip proximity to “push” chip
const CARD_PEEK_R = 0.15;      // fingertip proximity to “peek” card
const PEEK_ANGLE = THREE.MathUtils.degToRad(30);

function makeMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.8,
    metalness: opts.metalness ?? 0.0,
    side: opts.side ?? THREE.FrontSide,
    map: opts.map ?? null,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1.0,
  });
}

/**
 * UPDATE 4.0 — Sunken Poker Centerpiece
 * Single parent THREE.Group: "Sunken_Poker_System"
 */
export function createSunkenPokerSystem({
  scene,
  renderer,
  textureLoader,
  assets = null, // optional: preloaded textures { feltTex, cardTex[52] }
}) {
  if (!scene) throw new Error("createSunkenPokerSystem: scene required");
  if (!renderer) throw new Error("createSunkenPokerSystem: renderer required");

  const main = new THREE.Group();
  main.name = "Sunken_Poker_System";

  // --- PIT (visual excavation ring + floor) ---
  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.2, 1.25, 48, 1, true),
    makeMat(0x101010, { roughness: 1.0, side: THREE.DoubleSide })
  );
  pitWall.position.y = PIT_DEPTH / 2; // center wall between 0 and -1.2
  main.add(pitWall);

  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(6.1, 6.1, 0.05, 48),
    makeMat(0x0b0b0b, { roughness: 1.0 })
  );
  pitFloor.position.y = PIT_DEPTH - 0.025;
  pitFloor.receiveShadow = true;
  main.add(pitFloor);

  // --- PEDESTAL ---
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(5.8, 6.0, 0.4, 48),
    makeMat(0x1a1a1a, { roughness: 0.9 })
  );
  pedestal.position.y = PIT_DEPTH;
  pedestal.receiveShadow = true;
  main.add(pedestal);

  // --- TABLE GROUP ---
  const tableGroup = new THREE.Group();
  tableGroup.position.y = TABLE_Y; // still within the pit world-space once main is at (0,0,0)

  // Felt texture
  const feltTex =
    assets?.feltTex ??
    (textureLoader
      ? textureLoader.load("assets/textures/poker_felt_passline.jpg")
      : null);

  const pokerSurface = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 0.1, 64),
    makeMat(0xffffff, {
      map: feltTex,
      roughness: 0.95,
    })
  );
  pokerSurface.position.y = FELT_Y;
  pokerSurface.name = "Poker_Surface";
  pokerSurface.receiveShadow = true;
  tableGroup.add(pokerSurface);

  // Rail (arm rest)
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.15, 20, 64),
    makeMat(0x111111, { roughness: 0.6 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.48;
  rail.castShadow = true;
  tableGroup.add(rail);

  // Dealer shoe (physical trigger box)
  const dealerShoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.2, 0.5),
    makeMat(0x000000, { metalness: 1.0, roughness: 0.2 })
  );
  dealerShoe.position.set(0, 0.55, 1.8);
  dealerShoe.name = "Dealer_Shoe_Box";
  dealerShoe.castShadow = true;
  tableGroup.add(dealerShoe);

  // Add table group to main
  main.add(tableGroup);

  // --- 8 CHAIRS + SEAT ANCHORS ---
  const seats = [];
  for (let i = 0; i < 8; i++) {
    const chair = new THREE.Group();
    chair.name = `Chair_${i}`;

    const mat = makeMat(0x8b0000, { roughness: 0.85 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), mat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.1), mat);
    back.position.set(0, 0.5, -0.4);
    chair.add(seat, back);

    const angle = (i / 8) * Math.PI * 2;
    const x = Math.cos(angle) * 3.8;
    const z = Math.sin(angle) * 3.8;
    chair.position.set(x, TABLE_Y, z);
    chair.lookAt(0, TABLE_Y, 0);

    // Seat anchor (hips/eyes reference)
    const seatAnchor = new THREE.Object3D();
    seatAnchor.name = "SeatAnchor";
    seatAnchor.position.set(0, 0.35, 0.35); // local offset: tweak if needed
    chair.add(seatAnchor);

    main.add(chair);

    seats.push({
      index: i,
      chair,
      seatAnchor,
      worldPos: new THREE.Vector3(),
    });
  }

  // --- STAIRS (lobby -> pit) ---
  const stairs = new THREE.Group();
  stairs.name = "Pit_Stairs";
  for (let i = 0; i < 6; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.2, 0.5),
      makeMat(0x333333, { roughness: 1.0 })
    );
    step.position.set(0, (PIT_DEPTH / 6) * i, 6.5 + i * 0.45);
    step.receiveShadow = true;
    stairs.add(step);
  }
  main.add(stairs);

  // --- 52 CARDS (flat, hidden until dealt) ---
  const cards = [];
  const cardGeo = new THREE.PlaneGeometry(0.15, 0.22);
  for (let i = 0; i < 52; i++) {
    const cardTex =
      assets?.cardTex?.[i] ??
      (textureLoader
        ? textureLoader.load(`assets/textures/cards/card_${i}.jpg`)
        : null);

    const card = new THREE.Mesh(
      cardGeo,
      makeMat(0xffffff, {
        map: cardTex,
        roughness: 0.85,
        side: THREE.DoubleSide,
      })
    );
    card.name = `Card_${i}`;
    card.rotation.x = -Math.PI / 2;
    card.position.set(0, FELT_Y, 0);
    card.visible = false;
    card.userData.isPeeked = false;
    tableGroup.add(card);
    cards.push(card);
  }

  // --- Basic chips (you can replace with your real chip meshes later) ---
  const chips = [];
  const chipGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24);
  for (let i = 0; i < 20; i++) {
    const chip = new THREE.Mesh(
      chipGeo,
      makeMat(0xe0e0e0, { roughness: 0.4, metalness: 0.1, emissive: 0x000000 })
    );
    chip.name = `Chip_${i}`;
    chip.rotation.x = Math.PI / 2;
    chip.position.set(
      (Math.random() - 0.5) * 0.8,
      FELT_Y,
      (Math.random() - 0.5) * 0.8
    );
    chip.userData.isBet = false;
    tableGroup.add(chip);
    chips.push(chip);
  }

  // --- HANDS-ONLY INTERACTION (chip push + card peek + shoe trigger) ---
  const hand0 = renderer.xr.getHand(0);
  const hand1 = renderer.xr.getHand(1);

  const tmpV = new THREE.Vector3();
  const tmpW = new THREE.Vector3();
  const lastTouch = new Map(); // object.uuid -> bool (edge detection)

  function getIndexTipWorld(hand) {
    // WebXR joint names vary by runtime; these are common:
    const tip =
      hand.getObjectByName("index-finger-tip") ||
      hand.getObjectByName("index_tip") ||
      hand.getObjectByName("index-finger-phalanx-tip");

    if (!tip) return null;
    tip.getWorldPosition(tmpW);
    return tmpW;
  }

  function setChipBetState(chip, isBet) {
    chip.userData.isBet = isBet;
    const mat = chip.material;
    if (mat && mat.emissive) {
      mat.emissive.setHex(isBet ? 0x00ff00 : 0x000000);
    }
  }

  function insidePassLine(objWorldPos) {
    // compute relative to table center in world
    pokerSurface.getWorldPosition(tmpV);
    const dx = objWorldPos.x - tmpV.x;
    const dz = objWorldPos.z - tmpV.z;
    return Math.sqrt(dx * dx + dz * dz) < PASSLINE_R;
  }

  function updateInteractions() {
    const hands = [hand0, hand1];

    for (const hand of hands) {
      if (!hand || !hand.visible) continue;
      const tipWorld = getIndexTipWorld(hand);
      if (!tipWorld) continue;

      // ---- CHIPS ----
      for (const chip of chips) {
        chip.getWorldPosition(tmpV);
        const d = tipWorld.distanceTo(tmpV);

        const touching = d < CHIP_GRAB_R;
        const wasTouching = lastTouch.get(chip.uuid) || false;

        if (touching) {
          // slide chip along felt plane: move in world then convert to local tableGroup
          const newWorld = new THREE.Vector3(tipWorld.x, tipWorld.y, tipWorld.z);

          // clamp Y to felt in world:
          // get felt world y by sampling pokerSurface world pos
          pokerSurface.getWorldPosition(tmpW);
          newWorld.y = tmpW.y; // keep flat on felt

          // convert world -> tableGroup local
          tableGroup.worldToLocal(newWorld);
          chip.position.set(newWorld.x, FELT_Y, newWorld.z);

          // bet check
          chip.getWorldPosition(tmpV);
          setChipBetState(chip, insidePassLine(tmpV));
        }

        lastTouch.set(chip.uuid, touching);

        // optional edge trigger: if (!wasTouching && touching) play sound here
      }

      // ---- CARDS (peek) ----
      for (const card of cards) {
        if (!card.visible) continue;
        card.getWorldPosition(tmpV);
        const d = tipWorld.distanceTo(tmpV);

        if (d < CARD_PEEK_R) {
          card.userData.isPeeked = true;
        } else {
          card.userData.isPeeked = false;
        }

        // Smooth peek animation (no physics engine needed)
        const target = card.userData.isPeeked ? (-Math.PI / 2 + PEEK_ANGLE) : -Math.PI / 2;
        card.rotation.x = THREE.MathUtils.lerp(card.rotation.x, target, 0.15);
      }

      // ---- DEALER SHOE TRIGGER (touch to deal) ----
      dealerShoe.getWorldPosition(tmpV);
      const shoeTouch = tipWorld.distanceTo(tmpV) < 0.12;
      const shoeWas = lastTouch.get(dealerShoe.uuid) || false;
      if (shoeTouch && !shoeWas) {
        // Hook: emit event to your poker logic
        window.dispatchEvent(new CustomEvent("scarlett:shoe_touch"));
      }
      lastTouch.set(dealerShoe.uuid, shoeTouch);
    }
  }

  // --- Minimal dealing helpers (you can wire this to your real state machine) ---
  function dealTwoToSeat(seatIndex) {
    const seat = seats[seatIndex];
    if (!seat) return;

    seat.seatAnchor.getWorldPosition(tmpV);
    // place 2 visible cards in front of that seat, on felt:
    const a = cards.find(c => !c.visible);
    const b = cards.find(c => !c.visible && c !== a);
    if (!a || !b) return;

    const center = new THREE.Vector3();
    pokerSurface.getWorldPosition(center);

    // direction from center to seat
    const dir = new THREE.Vector3().subVectors(tmpV, center).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);

    const p1 = center.clone().add(dir.clone().multiplyScalar(0.9)).add(right.clone().multiplyScalar(-0.10));
    const p2 = center.clone().add(dir.clone().multiplyScalar(0.9)).add(right.clone().multiplyScalar(+0.10));

    // set world positions -> local
    const place = (card, wp) => {
      card.visible = true;
      const lp = wp.clone();
      tableGroup.worldToLocal(lp);
      card.position.set(lp.x, FELT_Y, lp.z);
      // face the seat (rotate in Y so long edge points to player)
      card.rotation.set(-Math.PI / 2, Math.atan2(dir.x, dir.z) + Math.PI, 0);
    };

    place(a, p1);
    place(b, p2);
  }

  // Put it in the scene
  scene.add(main);

  // Return system API (clean modular unity)
  return {
    group: main,
    tableGroup,
    pokerSurface,
    dealerShoe,
    cards,
    chips,
    seats,
    update: updateInteractions,
    debug: { dealTwoToSeat },
  };
}
