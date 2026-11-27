import * as THREE from 'three';

// Handcrafted 3D Miniature Christmas Keepsakes & Physical 3D Vintage Greeting Card
// Nestled inside the hollow interiors of the 10 Special Mystery Gift Boxes!

function createMiniCardTexture(cardData) {
  const w = 256;
  const h = 340;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Warm heirloom parchment background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#fbf5e8');
  bg.addColorStop(1, '#e8d9bc');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Double gold filigree border
  ctx.strokeStyle = '#b88b3d';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  // Top gold 4-point star emblem
  ctx.fillStyle = '#c4933f';
  ctx.beginPath();
  ctx.moveTo(w / 2, 40);
  ctx.lineTo(w / 2 + 7, 56);
  ctx.lineTo(w / 2 + 22, 62);
  ctx.lineTo(w / 2 + 7, 68);
  ctx.lineTo(w / 2, 84);
  ctx.lineTo(w / 2 - 7, 68);
  ctx.lineTo(w / 2 - 22, 62);
  ctx.lineTo(w / 2 - 7, 56);
  ctx.closePath();
  ctx.fill();

  // Card Number & Title Calligraphy Representation
  ctx.fillStyle = '#7e5a2b';
  ctx.font = '600 16px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(cardData ? cardData.number : 'No. 01', w / 2, 112);

  ctx.fillStyle = '#2c1e14';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('MERRY', w / 2, 152);
  ctx.fillText('CHRISTMAS', w / 2, 180);

  // Decorative script lines
  ctx.strokeStyle = 'rgba(110, 82, 48, 0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const y = 206 + i * 16;
    ctx.beginPath();
    ctx.moveTo(52 + i * 8, y);
    ctx.lineTo(w - 52 - i * 8, y);
    ctx.stroke();
  }

  // Crimson wax seal with gold "Y"
  ctx.fillStyle = '#8e1622';
  ctx.beginPath();
  ctx.arc(w / 2, 282, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9434f';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#f5d694';
  ctx.font = 'italic bold 22px Georgia, serif';
  ctx.fillText('Y', w / 2, 290);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 1. Adorable 3D Plush Teddy Bear wearing a Festive Crimson Scarf
function createMiniTeddyBear() {
  const g = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({ color: '#9e683b', roughness: 0.92, metalness: 0.02 });
  const snoutMat = new THREE.MeshStandardMaterial({ color: '#d4a679', roughness: 0.88 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1b130e', roughness: 0.35, metalness: 0.1 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: '#9c1724', roughness: 0.85 });

  // Chubby seated torso
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), furMat);
  body.scale.set(1.0, 1.12, 0.92);
  body.position.y = 0.2;
  g.add(body);

  // Belly patch
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), snoutMat);
  belly.position.set(0, 0.19, 0.09);
  g.add(belly);

  // Cute round head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 12), furMat);
  head.position.y = 0.44;
  g.add(head);

  // Two round ears
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), furMat);
    ear.position.set(s * 0.115, 0.55, 0.0);
    const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), snoutMat);
    innerEar.position.set(s * 0.115, 0.55, 0.03);
    g.add(ear, innerEar);
  }

  // Snout + shiny button nose & eyes
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), snoutMat);
  snout.scale.set(1.15, 0.85, 0.9);
  snout.position.set(0, 0.415, 0.125);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), darkMat);
  nose.position.set(0, 0.435, 0.175);
  g.add(snout, nose);

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 8), darkMat);
    eye.position.set(s * 0.052, 0.465, 0.128);
    g.add(eye);
  }

  // Seated legs & hugging arms
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), furMat);
    leg.scale.set(0.95, 0.85, 1.35);
    leg.position.set(s * 0.12, 0.075, 0.11);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), snoutMat);
    paw.position.set(s * 0.12, 0.07, 0.185);
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), furMat);
    arm.scale.set(0.85, 1.2, 0.95);
    arm.position.set(s * 0.165, 0.25, 0.06);
    arm.rotation.z = s * 0.45;
    g.add(leg, paw, arm);
  }

  // Festive crimson scarf wrapped around neck with dangling tail
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.032, 8, 16), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.33;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.025), scarfMat);
  tail.position.set(0.07, 0.25, 0.12);
  tail.rotation.z = -0.2;
  g.add(scarf, tail);

  g.scale.setScalar(1.05);
  return g;
}

// 2. Magical Miniature Crystal Snow Globe with Tiny Pine Tree Inside
function createMiniSnowGlobe() {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: '#472818', roughness: 0.42, metalness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#e6c168', metalness: 0.9, roughness: 0.2 });
  const snowMat = new THREE.MeshStandardMaterial({ color: '#eef5fc', roughness: 0.7 });
  const treeMat = new THREE.MeshStandardMaterial({ color: '#1b5a36', roughness: 0.8 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#dff2ff',
    transparent: true,
    opacity: 0.32,
    roughness: 0.05,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04
  });

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.14, 16), baseMat);
  ped.position.y = 0.07;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.015, 8, 20), goldMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.135;
  const snowMound = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 14), snowMat);
  snowMound.position.y = 0.16;

  // Miniature pine tree inside the glass dome
  const t1 = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.16, 8), treeMat);
  t1.position.y = 0.26;
  const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 8), treeMat);
  t2.position.y = 0.34;
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), goldMat);
  star.position.y = 0.42;

  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), glassMat);
  globe.position.y = 0.33;

  g.add(ped, ring, snowMound, t1, t2, star, globe);
  g.scale.setScalar(1.08);
  return g;
}

// 3. Classic European Crimson & Gold Toy Drum with Crossed Drumsticks
function createMiniFestiveDrum() {
  const g = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color: '#9c1624', roughness: 0.38, metalness: 0.18 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#ebc66e', metalness: 0.88, roughness: 0.2 });
  const creamMat = new THREE.MeshStandardMaterial({ color: '#f3ebd8', roughness: 0.72 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#7d502d', roughness: 0.65 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.28, 20), redMat);
  body.position.y = 0.15;
  const topHead = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.02, 20), creamMat);
  topHead.position.y = 0.295;
  g.add(body, topHead);

  for (const ry of [0.02, 0.285]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.222, 0.018, 8, 24), goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = ry;
    g.add(rim);
  }

  // Zigzag gold cord lacing around drum body
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 5), goldMat);
    cord.position.set(Math.cos(a) * 0.225, 0.15, Math.sin(a) * 0.225);
    cord.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.35;
    g.add(cord);
  }

  // Pair of miniature wooden drumsticks resting crossed atop the drumhead
  for (const s of [-1, 1]) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.34, 6), woodMat);
    stick.rotation.z = Math.PI / 2;
    stick.rotation.y = s * 0.48;
    stick.position.set(0, 0.315, 0);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), creamMat);
    tip.position.set(s * 0.145, 0.318, -0.075);
    g.add(stick, tip);
  }

  g.scale.setScalar(1.05);
  return g;
}

// 4. Antique Gold & Mahogany Christmas Music Box with Star Finial
function createMiniMusicBox() {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: '#59281a', roughness: 0.35, metalness: 0.15 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#f0cd74',
    emissive: '#6e4c12',
    emissiveIntensity: 0.35,
    metalness: 0.92,
    roughness: 0.18
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.28), woodMat);
  base.position.y = 0.09;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.3), goldMat);
  trim.position.y = 0.185;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.024, 0.18, 8), goldMat);
  stem.position.y = 0.28;
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), goldMat);
  star.position.y = 0.4;
  star.scale.set(1, 1.35, 0.45);
  const crank = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 6, 12), goldMat);
  crank.position.set(0.21, 0.1, 0);
  crank.rotation.y = Math.PI / 2;

  g.add(base, trim, stem, star, crank);
  g.scale.setScalar(1.08);
  return g;
}

// 5. Adorable Miniature Snowman with Top Hat, Carrot Nose & Crimson Scarf
function createMiniSnowman() {
  const g = new THREE.Group();
  const snowMat = new THREE.MeshStandardMaterial({ color: '#f2f7fc', roughness: 0.72 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1b1c22', roughness: 0.55 });
  const carrotMat = new THREE.MeshStandardMaterial({ color: '#eb6a24', roughness: 0.65 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: '#a81826', roughness: 0.85 });

  const bot = new THREE.Mesh(new THREE.SphereGeometry(0.175, 14, 12), snowMat);
  bot.position.y = 0.15;
  const mid = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), snowMat);
  mid.position.y = 0.34;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), snowMat);
  head.position.y = 0.5;
  g.add(bot, mid, head);

  // Scarf
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.025, 8, 16), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.42;
  g.add(scarf);

  // Carrot nose & coal eyes/buttons
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.09, 8), carrotMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.5, 0.12);
  g.add(nose);

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), darkMat);
    eye.position.set(s * 0.036, 0.525, 0.084);
    g.add(eye);
  }
  for (const by of [0.31, 0.37]) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), darkMat);
    btn.position.set(0, by, 0.124);
    g.add(btn);
  }

  // Cute miniature black top hat with crimson ribbon
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.018, 14), darkMat);
  brim.position.y = 0.585;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.078, 0.11, 14), darkMat);
  crown.position.y = 0.64;
  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.079, 0.079, 0.024, 14), scarfMat);
  hatBand.position.y = 0.6;
  g.add(brim, crown, hatBand);

  g.scale.setScalar(0.95);
  return g;
}

// Build complete interior ensemble: cute 3D miniature gift + physical 3D embossed vintage greeting card!
export function createGiftInterior(specialIdx, boxW, boxH, boxD, cardData) {
  const interior = new THREE.Group();

  // 1. Choose one of 5 adorable handcrafted 3D miniature keepsakes
  const builders = [
    createMiniTeddyBear,
    createMiniSnowGlobe,
    createMiniFestiveDrum,
    createMiniMusicBox,
    createMiniSnowman
  ];
  const keepsake = builders[specialIdx % builders.length]();
  // Position keepsake cozily on the left-front side of the hollow box velvet cushion
  keepsake.position.set(-boxW * 0.17, 0.08, boxD * 0.06);
  keepsake.rotation.y = 0.28;
  keepsake.scale.multiplyScalar(1.22);
  interior.add(keepsake);

  // 2. Physical 3D Vintage Greeting Card tucked right inside the box beside the keepsake!
  const cardTex = createMiniCardTexture(cardData);
  const cardFrontMat = new THREE.MeshStandardMaterial({
    map: cardTex,
    roughness: 0.65,
    metalness: 0.08
  });
  const cardEdgeMat = new THREE.MeshStandardMaterial({
    color: '#d9b56c',
    roughness: 0.4,
    metalness: 0.55
  });
  const cardBackMat = new THREE.MeshStandardMaterial({
    color: '#efe3ca',
    roughness: 0.78
  });

  const cardW = boxW * 0.44;
  const cardH = boxH * 0.76;
  const cardGeo = new THREE.BoxGeometry(cardW, cardH, 0.022);
  const cardMesh = new THREE.Mesh(cardGeo, [
    cardEdgeMat, cardEdgeMat, cardEdgeMat, cardEdgeMat, cardFrontMat, cardBackMat
  ]);

  // Pivot card so when closed it tucks completely inside the box; when opened it rises proudly nestled inside the box!
  const cardClosedY = cardH * 0.5 + 0.05;
  const cardOpenY = boxH * 0.92;
  cardMesh.position.set(boxW * 0.18, cardClosedY, -boxD * 0.04);
  cardMesh.rotation.set(-0.22, -0.18, -0.04);
  interior.add(cardMesh);

  return {
    interior,
    keepsake,
    cardMesh,
    cardClosedY,
    cardOpenY
  };
}
