import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CABIN_SITES, getTerrainHeight, WATER_LEVEL } from '../utils/noise.js';
import { createSmokePuffTexture, createWoodPlankTexture } from '../utils/textures.js';

// Picturesque Clustered Norwegian Fjord Village (15 diverse buildings + village chapel spire + warm streetlamps)
// Archetypes: village_church, rorbu_pier, townhouse, boathouse, grand_lodge, aframe, cottage

export class NorwegianCabins {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.windowMaterials = [];
    this.lanternMaterials = [];
    this.cabinLights = [];
    this.smokeEmitters = [];
    this.bobbingBoats = [];

    this.mats = {
      red: new THREE.MeshStandardMaterial({ map: createWoodPlankTexture('#7a201b'), roughness: 0.85, metalness: 0.04 }),
      ochre: new THREE.MeshStandardMaterial({ map: createWoodPlankTexture('#966828'), roughness: 0.85, metalness: 0.04 }),
      brown: new THREE.MeshStandardMaterial({ map: createWoodPlankTexture('#3d271a'), roughness: 0.88, metalness: 0.04 }),
      slate: new THREE.MeshStandardMaterial({ map: createWoodPlankTexture('#2e4254'), roughness: 0.85, metalness: 0.05 }),
      charred: new THREE.MeshStandardMaterial({ map: createWoodPlankTexture('#221f22'), roughness: 0.84, metalness: 0.06 }),
      cedar: new THREE.MeshStandardMaterial({ map: createWoodPlankTexture('#634129'), roughness: 0.82, metalness: 0.04 }),
      ivory: new THREE.MeshStandardMaterial({ map: createWoodPlankTexture('#d9d1c3'), roughness: 0.78, metalness: 0.03 }),
      trim: new THREE.MeshStandardMaterial({ color: '#ece8e0', roughness: 0.72 }),
      darkTimber: new THREE.MeshStandardMaterial({ color: '#241c17', roughness: 0.9 }),
      roofDark: new THREE.MeshStandardMaterial({ color: '#212630', roughness: 0.86 }),
      snow: new THREE.MeshStandardMaterial({ color: '#e4edf7', roughness: 0.72, metalness: 0.04 }),
      stone: new THREE.MeshStandardMaterial({ color: '#464a52', roughness: 0.94 }),
      firewood: new THREE.MeshStandardMaterial({ color: '#8f6c47', roughness: 0.9 }),
      boat: new THREE.MeshStandardMaterial({ color: '#563825', roughness: 0.78 }),
      oar: new THREE.MeshStandardMaterial({ color: '#9e774d', roughness: 0.8 }),
      bronze: new THREE.MeshStandardMaterial({ color: '#c4984c', metalness: 0.86, roughness: 0.28 }),
      goldSpire: new THREE.MeshStandardMaterial({ color: '#e8c46c', metalness: 0.88, roughness: 0.22 })
    };

    this.winAmber = new THREE.MeshStandardMaterial({
      color: '#ffbf6e',
      emissive: new THREE.Color('#ff8f2b'),
      emissiveIntensity: 2.3,
      roughness: 0.2,
      metalness: 0.1
    });
    this.winCandle = new THREE.MeshStandardMaterial({
      color: '#ffd48c',
      emissive: new THREE.Color('#ffaa42'),
      emissiveIntensity: 2.0,
      roughness: 0.22,
      metalness: 0.08
    });
    this.winWarmGold = new THREE.MeshStandardMaterial({
      color: '#ffe0a3',
      emissive: new THREE.Color('#ffbd58'),
      emissiveIntensity: 2.4,
      roughness: 0.2
    });
    this.lanternMat = new THREE.MeshStandardMaterial({
      color: '#ffebb8',
      emissive: new THREE.Color('#ffbe58'),
      emissiveIntensity: 3.0,
      roughness: 0.15
    });

    this.windowMaterials.push(this.winAmber, this.winCandle, this.winWarmGold);
    this.lanternMaterials.push(this.lanternMat);

    // Build all 15 clustered coastal village structures
    for (let i = 0; i < CABIN_SITES.length; i++) {
      const site = CABIN_SITES[i];
      const y = getTerrainHeight(site.x, site.z);
      const wallMat = this.mats[site.color] || this.mats.red;
      const winMat = i % 3 === 0 ? this.winAmber : i % 3 === 1 ? this.winCandle : this.winWarmGold;

      let built;
      switch (site.type) {
        case 'village_church':
          built = this.buildVillageChapel();
          break;
        case 'rorbu_pier':
          built = this.buildRorbuWithPier(wallMat);
          break;
        case 'townhouse':
          built = this.buildNordicTownhouse(wallMat, winMat);
          break;
        case 'boathouse':
          built = this.buildHarborBoathouse(wallMat, winMat);
          break;
        case 'grand_lodge':
          built = this.buildGrandNordicLodge(wallMat);
          break;
        case 'aframe':
          built = this.buildAFrameChalet(winMat);
          break;
        default:
          built = this.buildCozyTimberCottage(wallMat, winMat);
          break;
      }

      const building = built.group;
      building.position.set(site.x, y - 0.18, site.z);
      building.rotation.y = site.rotY;
      building.scale.setScalar(site.scale);
      this.group.add(building);

      building.updateMatrixWorld(true);
      if (built.chimneyLocal) {
        this.smokeEmitters.push(built.chimneyLocal.clone().applyMatrix4(building.matrixWorld));
      }
    }

    // Add warm Nordic village streetlamps + festive overhead catenary string lights + waterfront boardwalks + Extended Lakeside Rowing Platform!
    this.buildVillageStreetlampsAndFestoon();
    this.buildHarborBoardwalks();
    this.buildExtendedRowingPier(scene);
    this.buildTownSquareDetails();

    // Consolidated warm village ambient point lights (2 wide harbor lights cover West & East village with 50% less per-pixel PBR light loops!)
    const villageLightAnchors = [
      { x: -48, z: -124, intensity: 34, dist: 84 },
      { x: 48, z: -128, intensity: 34, dist: 84 }
    ];
    for (const a of villageLightAnchors) {
      const y = getTerrainHeight(a.x, a.z);
      const pt = new THREE.PointLight('#ffa044', a.intensity, a.dist, 1.55);
      pt.position.set(a.x, y + 4.8, a.z + 4.5);
      scene.add(pt);
      this.cabinLights.push({ light: pt, baseIntensity: a.intensity });
    }

    // Pre-bake / batch-merge all static town, church, boardwalk & pier meshes by material (~500 draw calls -> ~16 draw calls!)
    this.bakeStaticTownMeshes();

    // Soft rising translucent chimney smoke plumes (selected 7 chimneys for clean graceful sky silhouettes)
    this.smokeTexture = createSmokePuffTexture(128);
    this.smokePuffs = [];
    const selectedEmitters = this.smokeEmitters.filter((_, idx) => idx % 2 === 0).slice(0, 7);
    const puffsPerChimney = 9;

    for (let eIdx = 0; eIdx < selectedEmitters.length; eIdx++) {
      const origin = selectedEmitters[eIdx];
      for (let p = 0; p < puffsPerChimney; p++) {
        const mat = new THREE.SpriteMaterial({
          map: this.smokeTexture,
          color: '#dae5f2',
          transparent: true,
          opacity: 0.18,
          depthWrite: false
        });
        const sprite = new THREE.Sprite(mat);
        this.group.add(sprite);
        this.smokePuffs.push({
          sprite,
          mat,
          origin,
          age: (p / puffsPerChimney) * 14.0,
          maxAge: 13.0 + (p % 3) * 1.4,
          seed: eIdx * 19.1 + p * 3.3
        });
      }
    }
  }

  addFramedWindow(parent, x, y, z, rotY, w, h, winMat, frameMat = this.mats.trim) {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    wg.rotation.y = rotY;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, h + 0.15, 0.09), frameMat);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), winMat);
    pane.position.z = 0.055;
    const mv = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.075), frameMat);
    mv.position.z = 0.048;
    const mh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.075), frameMat);
    mh.position.z = 0.048;
    wg.add(frame, pane, mv, mh);
    parent.add(wg);
  }

  addLantern(parent, x, y, z) {
    const lg = new THREE.Group();
    lg.position.set(x, y, z);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 6), this.mats.darkTimber);
    cap.position.y = 0.16;
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), this.lanternMat);
    lg.add(cap, bulb);
    parent.add(lg);
  }

  buildVillageStreetlampsAndFestoon() {
    const westLane = [
      [-70, -120], [-58, -116], [-45, -116], [-33, -120], [-24, -125],
      [-37, -132], [-50, -131], [-63, -134]
    ];
    const eastLane = [
      [22, -132], [32, -125], [43, -120], [54, -117], [66, -118],
      [75, -124], [61, -130], [49, -134], [36, -138]
    ];

    const poleGeo = new THREE.CylinderGeometry(0.055, 0.085, 3.4, 6);
    const bulbGeo = new THREE.SphereGeometry(0.11, 6, 6);
    const bulbPositions = [];

    const placeChain = (pts) => {
      const topPts = [];
      for (const [lx, lz] of pts) {
        const ly = getTerrainHeight(lx, lz);
        const lamp = new THREE.Group();
        lamp.position.set(lx, ly - 0.15, lz);
        const pole = new THREE.Mesh(poleGeo, this.mats.darkTimber);
        pole.position.y = 1.7;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.07, 0.07), this.mats.darkTimber);
        arm.position.set(0.18, 3.25, 0);
        lamp.add(pole, arm);
        this.addLantern(lamp, 0.36, 3.04, 0);
        this.group.add(lamp);
        topPts.push(new THREE.Vector3(lx, ly + 3.1, lz));
      }

      // Drape warm festive Christmas village string lights (catenary garlands) between adjacent streetlamps!
      for (let i = 0; i < topPts.length - 1; i++) {
        const a = topPts[i];
        const b = topPts[i + 1];
        if (a.distanceTo(b) > 20) continue;
        const bulbs = 6;
        for (let k = 1; k < bulbs; k++) {
          const t = k / bulbs;
          const sag = Math.sin(t * Math.PI) * 0.72;
          const p = new THREE.Vector3().lerpVectors(a, b, t);
          p.y -= sag;
          bulbPositions.push(p);
        }
      }
    };

    placeChain(westLane);
    placeChain(eastLane);

    // Instanced warm glowing village festival string-light bulbs
    const bulbInst = new THREE.InstancedMesh(bulbGeo, this.lanternMat, bulbPositions.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < bulbPositions.length; i++) {
      dummy.position.copy(bulbPositions[i]);
      dummy.updateMatrix();
      bulbInst.setMatrixAt(i, dummy.matrix);
    }
    bulbInst.instanceMatrix.needsUpdate = true;
    this.group.add(bulbInst);
  }

  buildHarborBoardwalks() {
    // Timber waterfront harbor boardwalk segments connecting the seaside buildings into a lively coastal town
    const segments = [
      { x: -58, z: -115, len: 24, rotY: 0.24 },
      { x: -37, z: -118, len: 22, rotY: -0.22 },
      { x: 35, z: -124, len: 24, rotY: 0.36 },
      { x: 57, z: -117, len: 22, rotY: -0.14 }
    ];
    for (const s of segments) {
      const y = getTerrainHeight(s.x, s.z);
      const boardY = Math.max(y + 0.25, -1.15);
      const walk = new THREE.Mesh(new THREE.BoxGeometry(s.len, 0.2, 2.2), this.mats.brown);
      walk.position.set(s.x, boardY, s.z);
      walk.rotation.y = s.rotY;
      this.group.add(walk);
    }
  }

  // Prominent Extended Wooden Lakeside Rowing Pier & Boat Platform jutting out from the village onto the fjord lake!
  buildExtendedRowingPier(scene) {
    const m = this.mats;
    const pierGroup = new THREE.Group();
    const deckY = WATER_LEVEL + 0.52;

    // Anchor at the village waterfront cove and angle gracefully out into the shimmering open fjord lake
    pierGroup.position.set(-28, 0, -118);
    pierGroup.rotation.y = 0.34;

    // 1. Long planked wooden walkway extending 26 meters into the lake (+Z in local coords)
    const walkLen = 25.0;
    const walkW = 3.2;
    const walkway = new THREE.Mesh(new THREE.BoxGeometry(walkW, 0.22, walkLen), m.brown);
    walkway.position.set(0, deckY, walkLen * 0.5);
    walkway.receiveShadow = true;
    walkway.castShadow = true;
    pierGroup.add(walkway);

    // Subtle snow-frosted timber edge curbs along the walkway
    for (const sx of [-walkW * 0.48, walkW * 0.48]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, walkLen), m.darkTimber);
      curb.position.set(sx, deckY + 0.14, walkLen * 0.5);
      pierGroup.add(curb);
    }

    // Double row of sturdy weathered pilings + mooring bollards along the jetty
    for (let z = 2.0; z <= walkLen; z += 4.4) {
      for (const sx of [-walkW * 0.44, walkW * 0.44]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.4, 7), m.darkTimber);
        pile.position.set(sx, deckY - 1.55, z);
        pierGroup.add(pile);

        // Raised mooring bollard cap above deck
        const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.62, 8), m.darkTimber);
        bollard.position.set(sx, deckY + 0.36, z);
        pierGroup.add(bollard);
      }
    }

    // 2. Expanded Lakeside Rowing Boat Platform at the far end of the pier (7.8m x 6.2m!)
    const platZ = walkLen + 2.9;
    const platW = 8.0;
    const platD = 6.2;
    const platform = new THREE.Mesh(new THREE.BoxGeometry(platW, 0.26, platD), m.cedar);
    platform.position.set(0, deckY + 0.02, platZ);
    platform.receiveShadow = true;
    platform.castShadow = true;
    pierGroup.add(platform);

    // Corner pilings & timber posts for the rowing platform
    for (const sx of [-platW * 0.45, 0, platW * 0.45]) {
      for (const sz of [platZ - platD * 0.44, platZ + platD * 0.44]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 4.6, 7), m.darkTimber);
        p.position.set(sx, deckY - 1.6, sz);
        pierGroup.add(p);
      }
    }

    // Lakeside wooden bench & stacked wooden rowing gear crate on the platform
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.62), m.brown);
    benchSeat.position.set(-1.9, deckY + 0.56, platZ + 1.8);
    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.48, 0.09), m.brown);
    benchBack.position.set(-1.9, deckY + 0.88, platZ + 2.08);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.72, 0.85), m.firewood);
    crate.position.set(2.4, deckY + 0.48, platZ - 1.6);
    pierGroup.add(benchSeat, benchBack, crate);

    // 3. Three Warm Glowing Nordic Pier Lantern Posts (mid-pier + twin platform corners)
    const pierLanternSpots = [
      [walkW * 0.44, 12.0],
      [-platW * 0.44, platZ + platD * 0.42],
      [platW * 0.44, platZ + platD * 0.42]
    ];
    for (const [lx, lz] of pierLanternSpots) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.85, 0.14), m.darkTimber);
      post.position.set(lx, deckY + 1.42, lz);
      pierGroup.add(post);
      this.addLantern(pierGroup, lx, deckY + 2.88, lz);
    }

    // 4. Two Handcrafted Wooden Rowing Boats with Resting Oars gently bobbing beside the platform!
    const buildRowboat = (bx, bz, rotY, phase) => {
      const boat = new THREE.Group();
      boat.position.set(bx, WATER_LEVEL + 0.14, bz);
      boat.rotation.y = rotY;

      // Sculpted wooden boat hull
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.42, 4.4, 10), m.boat);
      hull.rotation.x = Math.PI / 2;
      hull.scale.set(1.18, 1.0, 0.48);
      hull.castShadow = true;
      boat.add(hull);

      // Inner boat rim & 3 wooden rowing thwarts (benches)
      for (const tz of [-1.05, 0.0, 1.05]) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.07, 0.28), m.cedar);
        seat.position.set(0, 0.16, tz);
        boat.add(seat);
      }

      // Pair of wooden rowing oars resting diagonally across the boat
      for (const side of [-1, 1]) {
        const oarShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 2.9, 6), m.oar);
        oarShaft.rotation.x = Math.PI / 2 - 0.06;
        oarShaft.rotation.z = side * 0.14;
        oarShaft.position.set(side * 0.26, 0.25, 0.1);
        const oarBlade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.65), m.oar);
        oarBlade.position.set(side * 0.42, 0.2, 1.55);
        oarBlade.rotation.y = side * 0.14;
        boat.add(oarShaft, oarBlade);
      }

      pierGroup.add(boat);
      this.bobbingBoats.push({ boat, baseY: WATER_LEVEL + 0.14, phase });
    };

    buildRowboat(-platW * 0.65, platZ + 0.6, 0.12, 0.0);
    buildRowboat(platW * 0.64, platZ - 0.5, -0.18, 2.3);

    this.group.add(pierGroup);

    // Dedicated warm golden light over the extended lakeside rowing platform casting cozy reflection onto the lake!
    pierGroup.updateMatrixWorld(true);
    const platWorld = new THREE.Vector3(0, deckY + 3.2, platZ).applyMatrix4(pierGroup.matrixWorld);
    const pierLight = new THREE.PointLight('#ffaa4c', 18, 42, 1.55);
    pierLight.position.copy(platWorld);
    scene.add(pierLight);
    this.cabinLights.push({ light: pierLight, baseIntensity: 18 });
  }

  // Extra cozy Nordic village square details: stone churchyard wall & twin lit square spruce trees
  buildTownSquareDetails() {
    const m = this.mats;
    const sqTrees = [
      [-37, -126],
      [-51, -127],
      [44, -128]
    ];
    for (const [tx, tz] of sqTrees) {
      const ty = getTerrainHeight(tx, tz);
      const tg = new THREE.Group();
      tg.position.set(tx, ty - 0.1, tz);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.2, 6), m.darkTimber);
      trunk.position.y = 0.6;
      const pineMat = new THREE.MeshStandardMaterial({ color: '#1b3d28', roughness: 0.88 });
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.4, 8), pineMat);
      c1.position.y = 2.0;
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.2, 8), pineMat);
      c2.position.y = 3.3;
      const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.7, 8), pineMat);
      c3.position.y = 4.4;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), this.lanternMat);
      star.position.y = 5.35;
      tg.add(trunk, c1, c2, c3, star);
      this.group.add(tg);
    }
  }

  // Iconic Heritage Norwegian Bell-Tower Church (distinctive, refined, harmonious coastal landmark!)
  // Features: warm ivory-white clapboard nave, stone foundation, tall front bell-tower with golden clock face,
  // open arched glowing belfry housing a bronze church bell, snow-dusted slate spire & golden cross!
  buildVillageChapel() {
    const g = new THREE.Group();
    const m = this.mats;

    // Raised dressed-stone foundation & front entry steps
    const base = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.35, 10.2), m.stone);
    base.position.set(0, 0.55, -0.3);
    g.add(base);
    const steps = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.65, 1.5), m.stone);
    steps.position.set(0, 0.32, 5.15);
    g.add(steps);

    // Classic Heritage Ivory-White Norwegian Wooden Church Nave (stands out elegantly against dark forest!)
    const nave = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.85, 9.0), m.ivory);
    nave.position.set(0, 3.05, -0.4);
    nave.castShadow = true;
    g.add(nave);

    // Crisp dark-timber corner pilasters framing the nave
    for (const sx of [-3.2, 3.2]) {
      for (const sz of [-4.9, 4.1]) {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.9, 0.2), m.darkTimber);
        pil.position.set(sx, 3.05, sz);
        g.add(pil);
      }
    }

    // Steep Scandinavian Pitched Nave Roof + Thick Snow Blanket
    const gShape = new THREE.Shape();
    gShape.moveTo(-3.2, 0);
    gShape.lineTo(3.2, 0);
    gShape.lineTo(0, 3.4);
    gShape.closePath();
    const gGeo = new THREE.ExtrudeGeometry(gShape, { depth: 9.0, bevelEnabled: false });
    gGeo.translate(0, 4.95, -4.9);
    g.add(new THREE.Mesh(gGeo, m.ivory));

    const ang = Math.atan2(3.4, 3.2);
    const len = Math.hypot(3.2, 3.4) + 0.65;
    for (const s of [-1, 1]) {
      const rp = new THREE.Mesh(new THREE.BoxGeometry(len, 0.22, 9.7), m.roofDark);
      rp.position.set(s * 1.72, 6.55, -0.4);
      rp.rotation.z = -s * ang;
      g.add(rp);
      const sn = new THREE.Mesh(new THREE.BoxGeometry(len * 0.96, 0.28, 9.58), m.snow);
      sn.position.set(s * 1.72, 6.74, -0.4);
      sn.rotation.z = -s * ang;
      g.add(sn);
    }

    // Grand Front Square Bell Tower (钟楼) rising cleanly from the front entrance
    const towerLower = new THREE.Mesh(new THREE.BoxGeometry(3.15, 6.8, 3.15), m.ivory);
    towerLower.position.set(0, 7.6, 2.85);
    towerLower.castShadow = true;
    g.add(towerLower);

    // Horizontal stone/timber cornice molding separating tower shaft from open belfry
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.28, 3.55), m.roofDark);
    cornice.position.set(0, 11.05, 2.85);
    g.add(cornice);

    // Luminous Gold-Rimmed Circular Clock Face on the front & sides of the Bell Tower!
    const addClock = (cx, cy, cz, rotY) => {
      const cg = new THREE.Group();
      cg.position.set(cx, cy, cz);
      cg.rotation.y = rotY;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.1, 20), m.goldSpire);
      rim.rotation.x = Math.PI / 2;
      const dial = new THREE.Mesh(new THREE.CircleGeometry(0.66, 20), this.winWarmGold);
      dial.position.z = 0.06;
      const handH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.04), m.darkTimber);
      handH.position.set(0, 0.14, 0.08);
      const handM = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.5, 0.04), m.darkTimber);
      handM.position.set(0.14, 0.08, 0.09);
      handM.rotation.z = -0.95;
      cg.add(rim, dial, handH, handM);
      g.add(cg);
    };
    addClock(0, 9.45, 4.44, 0);
    addClock(1.6, 9.45, 2.85, Math.PI / 2);
    addClock(-1.6, 9.45, 2.85, -Math.PI / 2);

    // Open Glowing Belfry Gallery (钟室) with 4 corner pillars + suspended bronze church bell!
    const belfryY = 12.25;
    for (const bx of [-1.28, 1.28]) {
      for (const bz of [1.57, 4.13]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.25, 0.32), m.ivory);
        col.position.set(bx, belfryY, bz);
        g.add(col);
      }
    }
    // Warm backlit glow inside the belfry chamber so the bell silhouette gleams gently at night!
    const belfryCore = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.65, 1.75), this.winAmber);
    belfryCore.position.set(0, belfryY - 0.05, 2.85);
    g.add(belfryCore);

    // Sculpted Bronze Church Bell hanging visibly at center of belfry
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.62, 0.92, 12), m.bronze);
    bell.position.set(0, belfryY + 0.05, 2.85);
    g.add(bell);

    // Belfry upper cornice + Graceful Octagonal Slate-and-Snow Bell-Tower Spire!
    const topCornice = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.24, 3.45), m.roofDark);
    topCornice.position.set(0, 13.45, 2.85);
    g.add(topCornice);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.85, 6.2, 8), m.roofDark);
    spire.position.set(0, 16.65, 2.85);
    g.add(spire);

    const spireSnow = new THREE.Mesh(new THREE.ConeGeometry(1.68, 5.95, 8), m.snow);
    spireSnow.position.set(0, 16.82, 2.85);
    g.add(spireSnow);

    // Slender Golden Nordic Cross atop the Bell-Tower Spire
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.35, 0.11), m.goldSpire);
    crossV.position.set(0, 20.3, 2.85);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.11, 0.11), m.goldSpire);
    crossH.position.set(0, 20.55, 2.85);
    g.add(crossV, crossH);

    // Warm Glowing Tall Lancet Nave Windows (front + both sides)
    this.addFramedWindow(g, -2.1, 3.1, 4.14, 0, 0.74, 2.05, this.winWarmGold, m.darkTimber);
    this.addFramedWindow(g, 2.1, 3.1, 4.14, 0, 0.74, 2.05, this.winWarmGold, m.darkTimber);
    this.addFramedWindow(g, 0, 6.95, 4.44, 0, 0.85, 1.55, this.winAmber, m.darkTimber);
    for (const wz of [-3.2, -0.8, 1.6]) {
      this.addFramedWindow(g, 3.24, 3.15, wz, Math.PI / 2, 0.8, 2.0, this.winWarmGold, m.darkTimber);
      this.addFramedWindow(g, -3.24, 3.15, wz, -Math.PI / 2, 0.8, 2.0, this.winWarmGold, m.darkTimber);
    }

    // Arched Dark-Timber Church Portal & Twin Warm Entry Lanterns
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.38, 2.45, 0.18), m.darkTimber);
    door.position.set(0, 2.35, 4.42);
    g.add(door);
    this.addLantern(g, -1.05, 3.35, 4.68);
    this.addLantern(g, 1.05, 3.35, 4.68);

    return { group: g, chimneyLocal: null };
  }

  // Tall colorful Scandinavian Coastal Townhouse (Bergen/Lofoten harbor feel)
  buildNordicTownhouse(wallMat, winMat) {
    const g = new THREE.Group();
    const m = this.mats;

    const base = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.0, 5.4), m.stone);
    base.position.y = 0.4;
    g.add(base);

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 4.4, 5.0), wallMat);
    body.position.y = 3.05;
    body.castShadow = true;
    g.add(body);

    const gShape = new THREE.Shape();
    gShape.moveTo(-2.2, 0);
    gShape.lineTo(2.2, 0);
    gShape.lineTo(0, 2.1);
    gShape.closePath();
    const gGeo = new THREE.ExtrudeGeometry(gShape, { depth: 5.0, bevelEnabled: false });
    gGeo.translate(0, 5.25, -2.5);
    g.add(new THREE.Mesh(gGeo, wallMat));

    const ang = Math.atan2(2.1, 2.2);
    const len = Math.hypot(2.2, 2.1) + 0.4;
    for (const s of [-1, 1]) {
      const rp = new THREE.Mesh(new THREE.BoxGeometry(len, 0.16, 5.65), m.roofDark);
      rp.position.set(s * 1.22, 6.24, 0);
      rp.rotation.z = -s * ang;
      g.add(rp);
      const sn = new THREE.Mesh(new THREE.BoxGeometry(len * 0.96, 0.24, 5.58), m.snow);
      sn.position.set(s * 1.22, 6.4, 0);
      sn.rotation.z = -s * ang;
      g.add(sn);
    }

    for (const sx of [-2.2, 2.2]) {
      const corner = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.45, 0.14), m.trim);
      corner.position.set(sx, 3.05, 2.5);
      g.add(corner);
    }

    // Two stories of glowing windows on front AND side facades (looks rich even when angled sideways along the street!)
    this.addFramedWindow(g, -1.05, 2.25, 2.52, 0, 0.85, 1.0, winMat);
    this.addFramedWindow(g, 1.05, 2.25, 2.52, 0, 0.85, 1.0, winMat);
    this.addFramedWindow(g, -1.05, 4.15, 2.52, 0, 0.85, 1.0, this.winCandle);
    this.addFramedWindow(g, 1.05, 4.15, 2.52, 0, 0.85, 1.0, winMat);
    this.addFramedWindow(g, 0, 5.95, 2.52, 0, 0.7, 0.72, this.winAmber);
    // Warm glowing side windows so sideways-facing town houses illuminate the street & lake warmly
    this.addFramedWindow(g, 2.22, 2.25, -0.9, Math.PI / 2, 0.9, 1.0, this.winAmber);
    this.addFramedWindow(g, 2.22, 2.25, 1.0, Math.PI / 2, 0.9, 1.0, winMat);
    this.addFramedWindow(g, 2.22, 4.15, 0.05, Math.PI / 2, 0.9, 1.0, this.winCandle);
    this.addFramedWindow(g, -2.22, 2.25, -0.9, -Math.PI / 2, 0.9, 1.0, winMat);
    this.addFramedWindow(g, -2.22, 2.25, 1.0, -Math.PI / 2, 0.9, 1.0, this.winCandle);
    this.addFramedWindow(g, -2.22, 4.15, 0.05, -Math.PI / 2, 0.9, 1.0, this.winAmber);
    this.addLantern(g, 0, 2.75, 2.68);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.1, 0.62), m.stone);
    chimney.position.set(1.0, 6.65, -0.8);
    g.add(chimney);

    return { group: g, chimneyLocal: new THREE.Vector3(1.0, 7.75, -0.8) };
  }

  // Waterfront Harbor Boathouse (Naust)
  buildHarborBoathouse(wallMat, winMat) {
    const g = new THREE.Group();
    const m = this.mats;

    for (const px of [-2.4, 0, 2.4]) {
      for (const pz of [-2.0, 1.8, 3.8]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 2.2, 6), m.darkTimber);
        pile.position.set(px, -0.25, pz);
        g.add(pile);
      }
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 6.4), m.brown);
    deck.position.set(0, 0.8, 0.9);
    g.add(deck);

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.55, 4.4), wallMat);
    body.position.set(0, 2.15, -0.4);
    g.add(body);

    const gShape = new THREE.Shape();
    gShape.moveTo(-2.4, 0);
    gShape.lineTo(2.4, 0);
    gShape.lineTo(0, 1.75);
    gShape.closePath();
    const gGeo = new THREE.ExtrudeGeometry(gShape, { depth: 4.4, bevelEnabled: false });
    gGeo.translate(0, 3.42, -2.6);
    g.add(new THREE.Mesh(gGeo, wallMat));

    const ang = Math.atan2(1.75, 2.4);
    for (const s of [-1, 1]) {
      const rp = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.16, 5.1), m.roofDark);
      rp.position.set(s * 1.32, 4.24, -0.4);
      rp.rotation.z = -s * ang;
      g.add(rp);
      const sn = new THREE.Mesh(new THREE.BoxGeometry(3.28, 0.23, 5.02), m.snow);
      sn.position.set(s * 1.32, 4.4, -0.4);
      sn.rotation.z = -s * ang;
      g.add(sn);
    }

    const boatDoors = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 0.12), m.darkTimber);
    boatDoors.position.set(0, 1.9, 1.82);
    g.add(boatDoors);
    this.addFramedWindow(g, 0, 4.15, 1.82, 0, 0.9, 0.82, winMat);
    this.addFramedWindow(g, -1.65, 2.25, 1.82, 0, 0.68, 0.78, this.winAmber);
    this.addFramedWindow(g, 1.65, 2.25, 1.82, 0, 0.68, 0.78, this.winAmber);
    this.addLantern(g, 0, 3.15, 2.02);

    return { group: g, chimneyLocal: null };
  }

  // Lofoten Lakeside Rorbu on stilts + wooden pier + moored rowboat
  buildRorbuWithPier(wallMat) {
    const g = new THREE.Group();
    const m = this.mats;

    for (const px of [-3.4, -1.2, 1.2, 3.4]) {
      for (const pz of [-2.2, 0.2, 2.4, 4.6]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 2.4, 7), m.darkTimber);
        pile.position.set(px, -0.35, pz);
        g.add(pile);
      }
    }

    const deck = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.22, 6.2), m.brown);
    deck.position.set(0, 0.85, 0.9);
    g.add(deck);

    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 5.8), m.brown);
    pier.position.set(1.6, 0.72, 6.6);
    g.add(pier);

    const lanternPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), m.darkTimber);
    lanternPost.position.set(0.55, 1.9, 9.1);
    g.add(lanternPost);
    this.addLantern(g, 0.55, 3.05, 9.1);

    const boat = new THREE.Group();
    boat.position.set(-1.1, 0.15, 7.4);
    boat.rotation.y = 0.28;
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.28, 3.2, 8), m.boat);
    hull.rotation.x = Math.PI / 2;
    hull.scale.set(1.2, 1.0, 0.55);
    boat.add(hull);
    g.add(boat);

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.9, 4.2), wallMat);
    body.position.set(-0.9, 2.4, -0.4);
    body.castShadow = true;
    g.add(body);

    const gableShape = new THREE.Shape();
    gableShape.moveTo(-2.4, 0);
    gableShape.lineTo(2.4, 0);
    gableShape.lineTo(0, 1.85);
    gableShape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 4.2, bevelEnabled: false });
    gableGeo.translate(-0.9, 3.85, -2.5);
    g.add(new THREE.Mesh(gableGeo, wallMat));

    const angle = Math.atan2(1.85, 2.4);
    for (const s of [-1, 1]) {
      const rp = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.16, 4.95), m.roofDark);
      rp.position.set(-0.9 + s * 1.32, 4.72, -0.4);
      rp.rotation.z = -s * angle;
      g.add(rp);
      const sn = new THREE.Mesh(new THREE.BoxGeometry(3.38, 0.24, 4.88), m.snow);
      sn.position.set(-0.9 + s * 1.32, 4.88, -0.4);
      sn.rotation.z = -s * angle;
      g.add(sn);
    }

    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.25, 3.4), wallMat);
    wing.position.set(2.55, 2.05, -0.5);
    g.add(wing);
    const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 4.0), m.roofDark);
    wingRoof.position.set(2.65, 3.35, -0.5);
    wingRoof.rotation.z = -0.32;
    const wingSnow = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.22, 3.92), m.snow);
    wingSnow.position.set(2.65, 3.5, -0.5);
    wingSnow.rotation.z = -0.32;
    g.add(wingRoof, wingSnow);

    this.addFramedWindow(g, -2.0, 2.55, 1.72, 0, 1.0, 1.1, this.winAmber);
    this.addFramedWindow(g, 0.15, 2.55, 1.72, 0, 1.0, 1.1, this.winAmber);
    this.addFramedWindow(g, -0.9, 4.55, 1.72, 0, 0.78, 0.8, this.winCandle);
    this.addFramedWindow(g, 2.55, 2.2, 1.22, 0, 0.85, 0.88, this.winCandle);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.68, 2.2, 0.68), m.stone);
    chimney.position.set(-2.0, 5.1, -1.0);
    g.add(chimney);

    return { group: g, chimneyLocal: new THREE.Vector3(-2.0, 6.25, -1.0) };
  }

  // Dramatic Scandinavian A-Frame Chalet with glowing triangular glass façade
  buildAFrameChalet(winMat) {
    const g = new THREE.Group();
    const m = this.mats;

    const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.9, 7.2), m.stone);
    base.position.set(0, 0.35, 0.4);
    g.add(base);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.2, 7.8), m.cedar);
    deck.position.set(0, 0.88, 0.6);
    g.add(deck);

    const triShape = new THREE.Shape();
    triShape.moveTo(-3.0, 0);
    triShape.lineTo(3.0, 0);
    triShape.lineTo(0, 5.4);
    triShape.closePath();
    const bodyGeo = new THREE.ExtrudeGeometry(triShape, { depth: 5.2, bevelEnabled: false });
    bodyGeo.translate(0, 0.95, -2.6);
    g.add(new THREE.Mesh(bodyGeo, m.charred));

    const glassShape = new THREE.Shape();
    glassShape.moveTo(-2.25, 0.15);
    glassShape.lineTo(2.25, 0.15);
    glassShape.lineTo(0, 4.3);
    glassShape.closePath();
    const glassMesh = new THREE.Mesh(new THREE.ShapeGeometry(glassShape), winMat);
    glassMesh.position.set(0, 1.0, 2.64);
    g.add(glassMesh);

    const beamH1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.14), m.darkTimber);
    beamH1.position.set(0, 2.5, 2.68);
    const beamH2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.14), m.darkTimber);
    beamH2.position.set(0, 3.75, 2.68);
    const beamV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.25, 0.14), m.darkTimber);
    beamV.position.set(0, 3.2, 2.68);
    g.add(beamH1, beamH2, beamV);

    const slopeLen = Math.hypot(3.25, 5.7);
    const slopeAngle = Math.atan2(5.7, 3.25);
    for (const s of [-1, 1]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.22, 6.2), m.roofDark);
      roof.position.set(s * 1.64, 3.75, 0.05);
      roof.rotation.z = -s * slopeAngle;
      g.add(roof);
      const snow = new THREE.Mesh(new THREE.BoxGeometry(slopeLen * 0.96, 0.26, 6.12), m.snow);
      snow.position.set(s * 1.78, 3.86, 0.05);
      snow.rotation.z = -s * slopeAngle;
      g.add(snow);
    }

    this.addLantern(g, 1.6, 1.95, 4.25);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.4, 8), m.roofDark);
    pipe.position.set(-0.9, 5.5, -0.7);
    g.add(pipe);

    return { group: g, chimneyLocal: new THREE.Vector3(-0.9, 6.75, -0.7) };
  }

  // Grand Two-Story Cross-Gabled Norwegian Timber Lodge
  buildGrandNordicLodge(wallMat) {
    const g = new THREE.Group();
    const m = this.mats;

    const base = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.05, 6.2), m.stone);
    base.position.set(0, 0.45, 0);
    g.add(base);

    const body = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.55, 5.0), wallMat);
    body.position.set(0, 2.7, -0.3);
    body.castShadow = true;
    g.add(body);

    const gShape = new THREE.Shape();
    gShape.moveTo(-3.7, 0);
    gShape.lineTo(3.7, 0);
    gShape.lineTo(0, 2.35);
    gShape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gShape, { depth: 5.0, bevelEnabled: false });
    gableGeo.translate(0, 4.48, -2.8);
    g.add(new THREE.Mesh(gableGeo, m.cedar));

    const mainAngle = Math.atan2(2.35, 3.7);
    for (const s of [-1, 1]) {
      const rp = new THREE.Mesh(new THREE.BoxGeometry(4.85, 0.2, 5.9), m.roofDark);
      rp.position.set(s * 2.0, 5.56, -0.3);
      rp.rotation.z = -s * mainAngle;
      g.add(rp);
      const sn = new THREE.Mesh(new THREE.BoxGeometry(4.76, 0.28, 5.82), m.snow);
      sn.position.set(s * 2.0, 5.75, -0.3);
      sn.rotation.z = -s * mainAngle;
      g.add(sn);
    }

    const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.2, 1.9), m.darkTimber);
    porchFloor.position.set(0, 1.0, 2.85);
    g.add(porchFloor);

    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.16, 2.25), m.roofDark);
    porchRoof.position.set(0, 3.3, 2.95);
    porchRoof.rotation.x = 0.24;
    const porchSnow = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.22, 2.18), m.snow);
    porchSnow.position.set(0, 3.45, 2.95);
    porchSnow.rotation.x = 0.24;
    g.add(porchRoof, porchSnow);

    for (const px of [-3.5, -1.2, 1.2, 3.5]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 0.18), m.trim);
      col.position.set(px, 2.15, 3.72);
      g.add(col);
    }
    this.addLantern(g, 0.0, 3.0, 3.65);

    const woodStack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 0.55), m.firewood);
    woodStack.position.set(-2.4, 1.5, 2.45);
    g.add(woodStack);

    this.addFramedWindow(g, -2.15, 2.3, 2.24, 0, 1.22, 1.18, this.winAmber);
    this.addFramedWindow(g, 2.15, 2.3, 2.24, 0, 1.22, 1.18, this.winAmber);
    this.addFramedWindow(g, -1.35, 5.05, 2.24, 0, 0.9, 0.92, this.winCandle);
    this.addFramedWindow(g, 1.35, 5.05, 2.24, 0, 0.9, 0.92, this.winCandle);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.92, 3.1, 0.92), m.stone);
    chimney.position.set(2.0, 6.1, -1.1);
    g.add(chimney);

    return { group: g, chimneyLocal: new THREE.Vector3(2.0, 7.7, -1.1) };
  }

  // Cozy Heritage Cottage with side lean-to woodshed
  buildCozyTimberCottage(wallMat, winMat) {
    const g = new THREE.Group();
    const m = this.mats;

    const base = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.8, 4.2), m.stone);
    base.position.set(0, 0.3, 0);
    g.add(base);

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.9, 2.4, 3.8), wallMat);
    body.position.set(0, 1.88, 0);
    body.castShadow = true;
    g.add(body);

    const gableShape = new THREE.Shape();
    gableShape.moveTo(-2.45, 0);
    gableShape.lineTo(2.45, 0);
    gableShape.lineTo(0, 1.6);
    gableShape.closePath();
    const gGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 3.8, bevelEnabled: false });
    gGeo.translate(0, 3.08, -1.9);
    g.add(new THREE.Mesh(gGeo, wallMat));

    const ang = Math.atan2(1.6, 2.45);
    for (const s of [-1, 1]) {
      const rp = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.16, 4.55), m.roofDark);
      rp.position.set(s * 1.35, 3.82, 0);
      rp.rotation.z = -s * ang;
      g.add(rp);
      const sn = new THREE.Mesh(new THREE.BoxGeometry(3.28, 0.24, 4.48), m.snow);
      sn.position.set(s * 1.35, 3.98, 0);
      sn.rotation.z = -s * ang;
      g.add(sn);
    }

    const shed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.75, 2.8), m.brown);
    shed.position.set(-3.25, 1.5, -0.2);
    g.add(shed);
    const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 3.2), m.roofDark);
    shedRoof.position.set(-3.3, 2.52, -0.2);
    shedRoof.rotation.z = 0.3;
    const shedSnow = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.2, 3.12), m.snow);
    shedSnow.position.set(-3.3, 2.66, -0.2);
    shedSnow.rotation.z = 0.3;
    g.add(shedRoof, shedSnow);

    this.addFramedWindow(g, -1.1, 2.02, 1.93, 0, 1.0, 0.96, winMat);
    this.addFramedWindow(g, 1.15, 2.02, 1.93, 0, 1.0, 0.96, this.winAmber);
    this.addFramedWindow(g, 0, 3.68, 1.93, 0, 0.65, 0.65, this.winCandle);
    this.addFramedWindow(g, 2.48, 2.02, 0.0, Math.PI / 2, 1.05, 0.96, this.winAmber);
    this.addFramedWindow(g, -2.48, 2.02, 0.5, -Math.PI / 2, 0.95, 0.92, winMat);
    this.addLantern(g, 0.05, 2.5, 2.06);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.95, 0.62), m.stone);
    chimney.position.set(1.05, 4.1, -0.55);
    g.add(chimney);

    return { group: g, chimneyLocal: new THREE.Vector3(1.05, 5.1, -0.55) };
  }

  update(elapsedTime, dt, dayState) {
    const f = dayState.cabinLightFactor;

    for (let i = 0; i < this.windowMaterials.length; i++) {
      const mat = this.windowMaterials[i];
      const flicker = 0.95 + 0.05 * Math.sin(elapsedTime * (2.6 + i * 0.85) + i * 1.9);
      mat.emissiveIntensity = (0.04 + f * (2.65 - i * 0.2)) * flicker;
      mat.color.setHex(f > 0.22 ? (i === 0 ? 0xffcb80 : i === 1 ? 0xffdc9c : 0xffe4ad) : 0x3b495c);
    }

    for (const lm of this.lanternMaterials) {
      lm.emissiveIntensity = 0.08 + f * 3.2;
    }

    for (const c of this.cabinLights) {
      c.light.intensity = f * c.baseIntensity;
    }

    // Gently bob & rock the moored wooden rowing boats beside the extended lakeside boat platform!
    for (const b of this.bobbingBoats) {
      b.boat.position.y = b.baseY + Math.sin(elapsedTime * 1.45 + b.phase) * 0.065;
      b.boat.rotation.z = Math.sin(elapsedTime * 1.15 + b.phase * 1.3) * 0.045;
      b.boat.rotation.x = Math.cos(elapsedTime * 0.95 + b.phase) * 0.025;
    }

    for (const puff of this.smokePuffs) {
      puff.age += dt;
      if (puff.age >= puff.maxAge) {
        puff.age -= puff.maxAge;
      }
      const p = puff.age / puff.maxAge;
      const driftX = Math.sin(elapsedTime * 0.32 + puff.seed) * 1.5 * p + p * 6.0;
      const driftZ = Math.cos(elapsedTime * 0.26 + puff.seed) * 1.0 * p - p * 2.2;
      const riseY = p * 15.0;

      puff.sprite.position.set(
        puff.origin.x + driftX,
        puff.origin.y + riseY,
        puff.origin.z + driftZ
      );

      const scale = 1.0 + p * 4.8;
      puff.sprite.scale.set(scale, scale, 1);

      const fadeIn = Math.min(1, p * 4.2);
      const fadeOut = Math.pow(1 - p, 1.55);
      puff.mat.opacity = fadeIn * fadeOut * (0.16 + 0.12 * (1 - dayState.starIntensity * 0.35));
      puff.mat.color.copy(dayState.cloudTint).lerp(new THREE.Color('#eef4fa'), 0.55);
    }
  }

  // Startup Static Batching ("Pre-Baking" draw calls):
  // Merges ~500 static village/church/pier/streetlamp meshes sharing the same material into ~16 combined meshes!
  bakeStaticTownMeshes() {
    this.group.updateMatrixWorld(true);

    const dynamicRoots = new Set(this.bobbingBoats.map((b) => b.boat));
    const isUnderDynamic = (obj) => {
      let cur = obj;
      while (cur) {
        if (dynamicRoots.has(cur)) return true;
        cur = cur.parent;
      }
      return false;
    };

    const byMaterial = new Map();
    const meshesToRemove = [];

    this.group.traverse((obj) => {
      if (!obj.isMesh || obj.isInstancedMesh) return;
      if (isUnderDynamic(obj)) return;
      if (Array.isArray(obj.material)) return;

      const mat = obj.material;
      let geom = obj.geometry.clone();
      if (geom.index) geom = geom.toNonIndexed();
      geom.applyMatrix4(obj.matrixWorld);

      if (!geom.attributes.normal) geom.computeVertexNormals();
      if (!geom.attributes.uv) {
        const count = geom.attributes.position.count;
        geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      }
      for (const attrName of Object.keys(geom.attributes)) {
        if (attrName !== 'position' && attrName !== 'normal' && attrName !== 'uv') {
          geom.deleteAttribute(attrName);
        }
      }

      if (!byMaterial.has(mat)) byMaterial.set(mat, []);
      byMaterial.get(mat).push(geom);
      meshesToRemove.push(obj);
    });

    for (const m of meshesToRemove) {
      if (m.parent) m.parent.remove(m);
      m.geometry.dispose();
    }

    for (const [mat, geoms] of byMaterial.entries()) {
      const merged = mergeGeometries(geoms, false);
      for (const g of geoms) g.dispose();
      if (!merged) continue;
      const batchMesh = new THREE.Mesh(merged, mat);
      batchMesh.castShadow = false;
      batchMesh.receiveShadow = true;
      this.group.add(batchMesh);
    }
  }
}
