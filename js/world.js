import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createChipSpriteFactory } from './modules/chips_atlas.js';

const TABLE_Y = -0.8;
const PIT_DEPTH = -1.2;
const FELT_Y_LOCAL = 0.41;

const PASSLINE_R = 1.8;
const CHIP_GRAB_R = 0.10;
const CARD_PEEK_R = 0.15;
const PEEK_ANGLE = THREE.MathUtils.degToRad(30);

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.0,
    side: opts.side ?? THREE.FrontSide,
    map: opts.map ?? null,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1.0,
  });
}

function applyAtlasUVs(geo, atlasJson, frameName) {
  const frame = atlasJson?.frames?.[frameName];
  if (!frame) return false;

  const texW = atlasJson.meta.size.w;
  const texH = atlasJson.meta.size.h;

  const fx = frame.frame.x / texW;
  const fy = frame.frame.y / texH;
  const fw = frame.frame.w / texW;
  const fh = frame.frame.h / texH;

  const uvs = geo.attributes.uv;
  uvs.setXY(0, fx,      fy + fh);
  uvs.setXY(1, fx + fw, fy + fh);
  uvs.setXY(2, fx,      fy);
  uvs.setXY(3, fx + fw, fy);
  uvs.needsUpdate = true;
  return true;
}

function createAtlasCard({ atlasJson, facesTex, backTex, frameName }) {
  const geo = new THREE.PlaneGeometry(0.15, 0.22);
  applyAtlasUVs(geo, atlasJson, frameName);

  const frontMat = new THREE.MeshStandardMaterial({ map: facesTex, roughness: 0.85, side: THREE.FrontSide });
  const backMat  = new THREE.MeshStandardMaterial({ map: backTex,  roughness: 0.85, side: THREE.FrontSide });

  const g = new THREE.Group();
  const front = new THREE.Mesh(geo, frontMat);
  front.name = 'CardFront';

  const back = new THREE.Mesh(geo, backMat);
  back.name = 'CardBack';
  back.rotation.y = Math.PI;
  back.position.z = -0.0005;

  g.add(front, back);
  g.userData.peek = 0;
  g.userData.frameName = frameName;
  return g;
}

export function createSunkenPokerSystem({ scene, renderer, assets, audio, handTracker }) {
  const main = new THREE.Group();
  main.name = 'Sunken_Poker_System';

  const pitWall = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.2, 1.25, 48, 1, true),
    mat(0x101010, { side: THREE.DoubleSide, roughness: 1.0 })
  );
  pitWall.position.y = PIT_DEPTH / 2;
  main.add(pitWall);

  const pitFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(6.1, 6.1, 0.05, 48),
    mat(0x0b0b0b, { roughness: 1.0 })
  );
  pitFloor.position.y = PIT_DEPTH - 0.025;
  main.add(pitFloor);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(5.8, 6.0, 0.4, 48),
    mat(0x1a1a1a, { roughness: 0.95 })
  );
  pedestal.position.y = PIT_DEPTH;
  pedestal.name = 'Pedestal_Base';
  main.add(pedestal);

  const pedestalRoot = new THREE.Group();
  pedestalRoot.name = 'Pedestal_Root';
  pedestalRoot.position.y = PIT_DEPTH;
  main.add(pedestalRoot);

  const tableGroup = new THREE.Group();
  tableGroup.name = 'Poker_Table';
  tableGroup.position.y = TABLE_Y - PIT_DEPTH;
  pedestalRoot.add(tableGroup);

  const pokerSurface = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 0.1, 64),
    mat(0xffffff, { map: assets?.feltTex ?? null, roughness: 0.95 })
  );
  pokerSurface.position.y = FELT_Y_LOCAL;
  pokerSurface.name = 'Poker_Surface';
  tableGroup.add(pokerSurface);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.15, 20, 64),
    mat(0x111111, { roughness: 0.55 })
  );
  rail.rotation.x = Math.PI/2;
  rail.position.y = 0.48;
  rail.name = 'Padded_Rail';
  tableGroup.add(rail);

  const dealerShoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.2, 0.5),
    mat(0x000000, { metalness: 1.0, roughness: 0.2 })
  );
  dealerShoe.position.set(0, 0.55, 1.8);
  dealerShoe.name = 'Dealer_Shoe_Box';
  tableGroup.add(dealerShoe);

  const seats = [];
  for (let i = 0; i < 8; i++) {
    const chair = new THREE.Group();
    chair.name = `Chair_${i}`;
    const m = mat(0x8B0000, { roughness: 0.85 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), m);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.1), m);
    back.position.set(0, 0.5, -0.4);
    chair.add(seat, back);

    const angle = (i/8) * Math.PI*2;
    chair.position.set(Math.cos(angle)*3.8, TABLE_Y - PIT_DEPTH, Math.sin(angle)*3.8);
    chair.lookAt(0, TABLE_Y - PIT_DEPTH, 0);

    const seatAnchor = new THREE.Object3D();
    seatAnchor.name = 'SeatAnchor';
    seatAnchor.position.set(0, 0.35, 0.35);
    chair.add(seatAnchor);

    pedestalRoot.add(chair);
    seats.push({ index:i, chair, seatAnchor });
  }

  const stairs = new THREE.Group();
  stairs.name = 'Stairway';
  for (let i = 0; i < 6; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.2, 0.5),
      mat(0x333333, { roughness: 1.0 })
    );
    step.position.set(0, (PIT_DEPTH/6)*i, 6.5 + i*0.45);
    stairs.add(step);
  }
  main.add(stairs);

  const chandelier = new THREE.Group();
  chandelier.name = 'Grand_Chandelier';
  chandelier.position.set(0, 1.9 - PIT_DEPTH, 0);
  pedestalRoot.add(chandelier);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.06, 16, 64),
    mat(0xaa8844, { metalness: 0.7, roughness: 0.35 })
  );
  ring.rotation.x = Math.PI/2;
  chandelier.add(ring);

  const point = new THREE.PointLight(0xffffff, 1.6, 30);
  point.position.set(0, 0.15, 0);
  chandelier.add(point);

  for (let i = 0; i < 8; i++) {
    const a = (i/8)*Math.PI*2;
    const spot = new THREE.SpotLight(0xffffff, 0.55, 25, Math.PI/7, 0.5, 1);
    spot.position.set(Math.cos(a)*0.8, 0.2, Math.sin(a)*0.8);
    spot.target.position.set(Math.cos(a)*2.0, -1.2, Math.sin(a)*2.0);
    chandelier.add(spot);
    chandelier.add(spot.target);
  }

  const cards = [];
  const atlasJson = assets?.cardAtlasJson;
  const frames = atlasJson ? Object.keys(atlasJson.frames) : [];
  for (let i = 0; i < Math.min(52, frames.length); i++) {
    const card = createAtlasCard({
      atlasJson,
      facesTex: assets.cardFacesTex,
      backTex: assets.cardBackTex,
      frameName: frames[i],
    });
    card.name = `Card_${i}`;
    card.rotation.x = -Math.PI/2;
    card.position.set(0, FELT_Y_LOCAL, 0);
    card.visible = false;
    tableGroup.add(card);
    cards.push(card);
  }

  const chips = [];
  const chipSpriteFactory = createChipSpriteFactory(assets?.chipsTex ?? null);
  for (let i = 0; i < 24; i++) {
    let chip;
    if (chipSpriteFactory) {
      chip = chipSpriteFactory.createGenericChip();
      chip.name = `Chip_${i}`;
      chip.position.set((Math.random()-0.5)*0.9, FELT_Y_LOCAL+0.01, (Math.random()-0.5)*0.9);
    } else {
      const geo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24);
      chip = new THREE.Mesh(geo, mat(0xe0e0e0, { roughness: 0.35, metalness: 0.1, emissive: 0x000000 }));
      chip.rotation.x = Math.PI/2;
      chip.name = `Chip_${i}`;
      chip.position.set((Math.random()-0.5)*0.9, FELT_Y_LOCAL, (Math.random()-0.5)*0.9);
    }
    chip.userData.isBet = false;
    tableGroup.add(chip);
    chips.push(chip);
  }

  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const lastTouch = new Map();

  function pokerCenterWorld() {
    pokerSurface.getWorldPosition(tmpA);
    return tmpA;
  }

  function insidePassLine(worldPos) {
    const c = pokerCenterWorld();
    const dx = worldPos.x - c.x;
    const dz = worldPos.z - c.z;
    return Math.sqrt(dx*dx + dz*dz) < PASSLINE_R;
  }

  function setBet(chip, bet) {
    chip.userData.isBet = bet;
    if (chip.material?.emissive) chip.material.emissive.setHex(bet ? 0x00ff00 : 0x000000);
  }

  function update() {
    const hands = handTracker ? handTracker.getHands() : [renderer.xr.getHand(0), renderer.xr.getHand(1)];
    for (const hand of hands) {
      if (!hand || !hand.visible) continue;
      const tipWorld = handTracker ? handTracker.getTipWorld(hand, 'index') : null;
      if (!tipWorld) continue;

      dealerShoe.getWorldPosition(tmpB);
      const shoeTouch = tipWorld.distanceTo(tmpB) < 0.12;
      const shoeWas = lastTouch.get(dealerShoe.uuid) || false;
      if (shoeTouch && !shoeWas) {
        audio?.playAt?.('shoeDeal', tmpB);
        window.dispatchEvent(new CustomEvent('scarlett:shoe_touch'));
      }
      lastTouch.set(dealerShoe.uuid, shoeTouch);

      for (const chip of chips) {
        chip.getWorldPosition(tmpB);
        const d = tipWorld.distanceTo(tmpB);
        const touching = d < CHIP_GRAB_R;
        const was = lastTouch.get(chip.uuid) || false;

        if (touching) {
          pokerSurface.getWorldPosition(tmpA);
          const targetWorld = new THREE.Vector3(tipWorld.x, tmpA.y, tipWorld.z);
          const local = targetWorld.clone();
          tableGroup.worldToLocal(local);
          chip.position.set(local.x, FELT_Y_LOCAL, local.z);

          chip.getWorldPosition(tmpB);
          setBet(chip, insidePassLine(tmpB));
        }

        if (touching && !was) audio?.playAt?.('chipClack', tmpB);
        lastTouch.set(chip.uuid, touching);
      }

      for (const card of cards) {
        if (!card.visible) continue;
        card.getWorldPosition(tmpB);
        const d = tipWorld.distanceTo(tmpB);
        const peek = d < CARD_PEEK_R ? 1 : 0;
        card.userData.peek = THREE.MathUtils.lerp(card.userData.peek, peek, 0.18);
        const targetX = (-Math.PI/2) + (card.userData.peek * PEEK_ANGLE);
        card.rotation.x = THREE.MathUtils.lerp(card.rotation.x, targetX, 0.18);
      }
    }
  }

  function dealTwoToSeat(seatIndex) {
    const seat = seats[seatIndex];
    if (!seat) return;

    const center = new THREE.Vector3();
    pokerSurface.getWorldPosition(center);

    const seatPos = new THREE.Vector3();
    seat.seatAnchor.getWorldPosition(seatPos);

    const dir = new THREE.Vector3().subVectors(seatPos, center).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);

    const a = cards.find(c => !c.visible);
    const b = cards.find(c => !c.visible && c !== a);
    if (!a || !b) return;

    const p1 = center.clone().add(dir.clone().multiplyScalar(0.9)).add(right.clone().multiplyScalar(-0.10));
    const p2 = center.clone().add(dir.clone().multiplyScalar(0.9)).add(right.clone().multiplyScalar(+0.10));

    const place = (card, wp) => {
      card.visible = true;
      const lp = wp.clone();
      tableGroup.worldToLocal(lp);
      card.position.set(lp.x, FELT_Y_LOCAL, lp.z);
      card.rotation.set(-Math.PI/2, Math.atan2(dir.x, dir.z) + Math.PI, 0);
    };

    place(a, p1);
    place(b, p2);
    audio?.playAt?.('cardSlide', center);
  }

  scene.add(main);

  return {
    group: main,
    pedestal,
    pedestalRoot,
    tableGroup,
    pokerSurface,
    dealerShoe,
    chandelier,
    cards,
    chips,
    seats,
    update,
    debug: { dealTwoToSeat }
  };
}
