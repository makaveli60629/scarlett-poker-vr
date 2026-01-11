// /js/table_factory.js — Scarlett TableFactory v1.0 (FULL, Quest-safe)
// ✅ Exports: { TableFactory } with TableFactory.create(ctx)
// ✅ Compatible with HybridWorld (expects TableFactory.create)
// ✅ Builds a good-looking casino poker table (felt + rail + trim) + chip trays + dealer spot
// ✅ Builds 8 chairs by default (or 6 if you pass seats: 6)
// ✅ Returns an object with { group, table, felt, chairs, seats } for PokerSim/Seat systems

export const TableFactory = (() => {
  function log(ctx, ...a) { try { (ctx.log || console.log)(...a); } catch (e) {} }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function makeMaterials(THREE) {
    const mat = {
      felt: new THREE.MeshStandardMaterial({
        color: 0x0f3a2a, roughness: 0.95, metalness: 0.0
      }),
      rail: new THREE.MeshStandardMaterial({
        color: 0x111117, roughness: 0.6, metalness: 0.1
      }),
      trim: new THREE.MeshStandardMaterial({
        color: 0x1a2042, roughness: 0.35, metalness: 0.25, emissive: 0x060818, emissiveIntensity: 0.35
      }),
      base: new THREE.MeshStandardMaterial({
        color: 0x0b0d14, roughness: 0.92, metalness: 0.05
      }),
      chip: new THREE.MeshStandardMaterial({
        color: 0x2a2f55, roughness: 0.4, metalness: 0.25, emissive: 0x060818, emissiveIntensity: 0.22
      }),
      chair: new THREE.MeshStandardMaterial({
        color: 0x141526, roughness: 0.85, metalness: 0.05
      }),
      chairCushion: new THREE.MeshStandardMaterial({
        color: 0x2b1b24, roughness: 0.85, metalness: 0.05
      })
    };
    return mat;
  }

  function add(obj, child) { obj.add(child); return child; }

  function makeRoundTable(THREE, mats, opts) {
    const g = new THREE.Group();
    g.name = "TableRound";

    const tableY = opts.tableY ?? 1.02;

    // Dimensions (tuned for VR scale)
    const feltR = opts.feltRadius ?? 2.05;
    const railR = feltR + (opts.railWidth ?? 0.34);
    const railH = opts.railHeight ?? 0.14;
    const feltH = opts.feltHeight ?? 0.07;

    // Felt disk
    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(feltR, feltR, feltH, 64, 1, false),
      mats.felt
    );
    felt.name = "Felt";
    felt.position.set(0, tableY, 0);
    felt.castShadow = false;
    felt.receiveShadow = true;
    add(g, felt);

    // Rail ring
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(railR, (opts.railTube ?? 0.14), 18, 96),
      mats.rail
    );
    rail.name = "Rail";
    rail.position.set(0, tableY + feltH * 0.45 + railH * 0.1, 0);
    rail.rotation.x = Math.PI / 2;
    add(g, rail);

    // Trim ring (glow-ish)
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(railR + 0.05, 0.04, 12, 96),
      mats.trim
    );
    trim.name = "TrimRing";
    trim.position.copy(rail.position);
    trim.rotation.x = Math.PI / 2;
    add(g, trim);

    // Table base (pedestal)
    const baseTop = new THREE.Mesh(
      new THREE.CylinderGeometry(railR * 0.95, railR * 0.95, 0.22, 48),
      mats.base
    );
    baseTop.name = "BaseTop";
    baseTop.position.set(0, tableY - 0.22, 0);
    add(g, baseTop);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.75, 0.9, 32),
      mats.base
    );
    pedestal.name = "Pedestal";
    pedestal.position.set(0, tableY - 0.78, 0);
    add(g, pedestal);

    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.1, 0.12, 36),
      mats.base
    );
    foot.name = "Foot";
    foot.position.set(0, 0.06, 0);
    add(g, foot);

    // Dealer chip tray (a simple bar) at "north" (negative Z)
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.06, 0.22),
      mats.chip
    );
    tray.name = "DealerTray";
    tray.position.set(0, tableY + 0.06, -feltR * 0.58);
    add(g, tray);

    // Dealer marker
    const dealer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.02, 24),
      mats.trim
    );
    dealer.name = "DealerButton";
    dealer.position.set(0, tableY + 0.06, -feltR * 0.36);
    add(g, dealer);

    // Light decal puck (fake spotlight)
    const puck = new THREE.Mesh(
      new THREE.CircleGeometry(railR * 1.05, 64),
      new THREE.MeshBasicMaterial({ color: 0x0a0c18, transparent: true, opacity: 0.35 })
    );
    puck.name = "TableShadowPuck";
    puck.rotation.x = -Math.PI / 2;
    puck.position.y = 0.01;
    add(g, puck);

    return { group: g, table: g, felt, railR, feltR, tableY };
  }

  function makeChairsAndSeats(THREE, mats, tableInfo, opts) {
    const chairs = [];
    const seats = [];

    const seatCount = opts.seats ?? 8;
    const radius = (tableInfo.railR ?? 2.35) + (opts.chairRadiusOffset ?? 1.1);
    const chairY = 0.0;

    const chair = (label) => {
      const cg = new THREE.Group();
      cg.name = `Chair_${label}`;

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.55, 16), mats.chair);
      leg.position.set(0, 0.28, 0);
      cg.add(leg);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.06, 18), mats.chair);
      base.position.set(0, 0.03, 0);
      cg.add(base);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44), mats.chairCushion);
      seat.position.set(0, 0.58, 0);
      cg.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.08), mats.chair);
      back.position.set(0, 0.84, -0.18);
      cg.add(back);

      return cg;
    };

    // distribute seats around table; leave a dealer gap near -Z
    // angle 0 => +Z, PI => -Z, we will bias away from -Z a bit
    const startAngle = opts.startAngle ?? (Math.PI * 0.15);

    for (let i = 0; i < seatCount; i++) {
      const t = i / seatCount;
      const ang = startAngle + t * Math.PI * 2;

      const x = Math.sin(ang) * radius;
      const z = Math.cos(ang) * radius;

      const c = chair(i + 1);
      c.position.set(x, chairY, z);

      // face table center
      const yaw = Math.atan2(-x, -z);
      c.rotation.y = yaw;

      chairs.push(c);

      // seat anchor: where player head/rig should be located when seated
      const seatAnchor = new THREE.Object3D();
      seatAnchor.name = `Seat_${i + 1}`;
      seatAnchor.position.set(
        Math.sin(ang) * (tableInfo.feltR * 0.92),
        tableInfo.tableY ?? 1.02,
        Math.cos(ang) * (tableInfo.feltR * 0.92)
      );

      // look toward center
      seatAnchor.lookAt(0, tableInfo.tableY ?? 1.02, 0);

      // metadata
      seatAnchor.userData = {
        index: i,
        label: `Seat ${i + 1}`,
        type: "seat",
        table: "main"
      };

      seats.push(seatAnchor);
    }

    return { chairs, seats };
  }

  function addTableLabels(THREE, tableInfo, opts) {
    // Tiny 3D “hashmarks” around felt (cheap & reliable vs CanvasTexture text)
    const g = new THREE.Group();
    g.name = "TableMarks";

    const count = opts.marks ?? 18;
    const r = (tableInfo.feltR ?? 2.05) * 0.78;
    const y = (tableInfo.tableY ?? 1.02) + 0.055;

    const mat = new THREE.MeshStandardMaterial({
      color: 0x1e2a5a, roughness: 0.45, metalness: 0.15, emissive: 0x040818, emissiveIntensity: 0.25
    });

    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.04), mat);
      m.position.set(Math.sin(ang) * r, y, Math.cos(ang) * r);
      m.rotation.y = ang;
      g.add(m);
    }
    return g;
  }

  async function create(ctx = {}) {
    const THREE = ctx.THREE;
    const root = ctx.root || ctx.scene;
    const opts = ctx.opts || ctx.OPTS || {};
    if (!THREE || !root) throw new Error("TableFactory.create: missing THREE or root/scene");

    const mats = makeMaterials(THREE);

    const g = new THREE.Group();
    g.name = "TableFactoryRoot";

    // position (defaults to lobby center)
    const px = opts.x ?? 0;
    const pz = opts.z ?? 0;
    g.position.set(px, 0, pz);
    g.rotation.y = opts.yaw ?? 0;
    root.add(g);

    // build round table (default)
    const tableInfo = makeRoundTable(THREE, mats, opts);
    g.add(tableInfo.group);

    // marks (subtle)
    g.add(addTableLabels(THREE, tableInfo, opts));

    // chairs + seat anchors
    const { chairs, seats } = makeChairsAndSeats(THREE, mats, tableInfo, opts);
    for (const c of chairs) g.add(c);
    for (const s of seats) g.add(s);

    // helpful tags for raycast / systems
    g.traverse((o) => {
      if (!o.userData) o.userData = {};
      o.userData.isTableFactory = true;
    });

    log(ctx, "[table_factory] create ✅", `seats=${seats.length}`);

    // return rich object (PokerSim can use table/felt; Seat system can use seats)
    return {
      group: g,
      table: tableInfo.table,
      felt: tableInfo.felt,
      chairs,
      seats,
      info: {
        type: "round",
        feltRadius: tableInfo.feltR,
        railRadius: tableInfo.railR,
        tableY: tableInfo.tableY
      }
    };
  }

  return { create };
})();

// Optional default export for compatibility with various import styles
export default TableFactory;
