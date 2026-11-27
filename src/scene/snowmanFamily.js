import * as THREE from 'three';
import { getTerrainHeight } from '../utils/noise.js';
import { createSoftGlowTexture } from '../utils/textures.js';

// Charming Interactive Nordic Snowman Family (Papa Snowman with warm lantern + Baby Snowman with knit beanie)
// Lightweight geometry, zero extra PointLights (uses emissive glass + additive halo), joyful wobble & snow burst on click!

export class NordicSnowmanFamily {
  constructor(scene) {
    this.group = new THREE.Group();
    const x = -8.2;
    const z = 7.2;
    const y = getTerrainHeight(x, z);
    this.group.position.set(x, y - 0.06, z);
    this.group.rotation.y = 0.56; // Gently turned toward camera & hero Christmas tree
    scene.add(this.group);

    this.danceTimer = -1;
    this.hovered = false;
    this.glowTex = createSoftGlowTexture(128, 'rgba(255,240,196,0.95)', 'rgba(255,186,88,0.44)');

    this.mats = {
      snow: new THREE.MeshStandardMaterial({ color: '#eff6fc', roughness: 0.78, metalness: 0.02 }),
      coal: new THREE.MeshStandardMaterial({ color: '#1b2029', roughness: 0.65, metalness: 0.08 }),
      carrot: new THREE.MeshStandardMaterial({ color: '#ec7422', roughness: 0.58 }),
      blush: new THREE.MeshStandardMaterial({ color: '#f29aa2', roughness: 0.8 }),
      hat: new THREE.MeshStandardMaterial({ color: '#1a1e28', roughness: 0.84, metalness: 0.06 }),
      scarfRed: new THREE.MeshStandardMaterial({ color: '#a8182b', roughness: 0.88 }),
      scarfGold: new THREE.MeshStandardMaterial({ color: '#e6c068', roughness: 0.55, metalness: 0.35 }),
      beanieGreen: new THREE.MeshStandardMaterial({ color: '#1f5e3d', roughness: 0.88 }),
      twig: new THREE.MeshStandardMaterial({ color: '#4c3220', roughness: 0.94 }),
      iron: new THREE.MeshStandardMaterial({ color: '#242933', roughness: 0.52, metalness: 0.72 }),
      lanternGlass: new THREE.MeshStandardMaterial({
        color: '#ffe29c',
        emissive: new THREE.Color('#ffaa38'),
        emissiveIntensity: 2.2,
        roughness: 0.2
      })
    };

    this.papaPivot = this.buildPapaSnowman();
    this.group.add(this.papaPivot);

    this.babyPivot = this.buildBabySnowman();
    this.babyPivot.position.set(1.22, -0.02, 0.32);
    this.babyPivot.rotation.y = -0.34;
    this.group.add(this.babyPivot);

    // Soft grounded contact shadow beneath the snowman duo
    const shadowTex = createSoftGlowTexture(128, 'rgba(8,16,30,0.48)', 'rgba(8,16,30,0.18)');
    const shadowGeo = new THREE.PlaneGeometry(3.4, 2.3);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.set(0.55, 0.08, 0.14);
    this.group.add(shadow);

    // Generous invisible hit volume for effortless click/tap on both desktop & mobile
    this.hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.85, 2.45, 1.85),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.hitMesh.position.set(0.52, 1.15, 0.14);
    this.hitMesh.userData.isSnowmanFamily = true;
    this.group.add(this.hitMesh);
  }

  buildPapaSnowman() {
    const g = new THREE.Group();
    const m = this.mats;

    // 3 organically stacked snow spheres
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), m.snow);
    base.scale.set(1.06, 0.88, 1.04);
    base.position.y = 0.48;
    base.castShadow = true;
    base.receiveShadow = true;

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 12), m.snow);
    torso.scale.set(1.02, 0.92, 1.0);
    torso.position.y = 1.18;
    torso.castShadow = true;
    torso.receiveShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), m.snow);
    head.position.y = 1.74;
    head.castShadow = true;
    head.receiveShadow = true;
    g.add(base, torso, head);

    // 3 coal belly buttons
    const btnGeo = new THREE.SphereGeometry(0.042, 8, 8);
    for (const [by, bz] of [[1.32, 0.43], [1.16, 0.46], [1.0, 0.44]]) {
      const b = new THREE.Mesh(btnGeo, m.coal);
      b.position.set(0, by, bz);
      g.add(b);
    }

    // Face: eyes, rosy cheeks, carrot nose, cheerful coal smile
    const eyeGeo = new THREE.SphereGeometry(0.036, 8, 8);
    for (const sx of [-0.11, 0.11]) {
      const eye = new THREE.Mesh(eyeGeo, m.coal);
      eye.position.set(sx, 1.81, 0.28);
      g.add(eye);

      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), m.blush);
      cheek.scale.set(1.15, 0.72, 0.45);
      cheek.position.set(sx * 1.55, 1.72, 0.27);
      g.add(cheek);
    }

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.24, 10), m.carrot);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.74, 0.41);
    g.add(nose);

    const smileGeo = new THREE.SphereGeometry(0.022, 6, 6);
    for (let i = -2; i <= 2; i++) {
      const dot = new THREE.Mesh(smileGeo, m.coal);
      const x = i * 0.046;
      const y = 1.635 + Math.abs(i) * 0.016;
      dot.position.set(x, y, 0.295 - Math.abs(i) * 0.014);
      g.add(dot);
    }

    // Cozy crimson scarf + gold stripe + draping scarf tail
    const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.075, 10, 20), m.scarfRed);
    scarfRing.rotation.x = Math.PI / 2;
    scarfRing.position.y = 1.48;
    const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.44, 0.055), m.scarfRed);
    scarfTail.position.set(0.22, 1.28, 0.31);
    scarfTail.rotation.set(-0.18, 0.25, 0.22);
    const tailTrim = new THREE.Mesh(new THREE.BoxGeometry(0.156, 0.055, 0.06), m.scarfGold);
    tailTrim.position.set(0.255, 1.12, 0.34);
    tailTrim.rotation.copy(scarfTail.rotation);
    g.add(scarfRing, scarfTail, tailTrim);

    // Classic Nordic velvet top hat (slightly jauntily tilted!)
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0.02, 2.02, -0.02);
    hatGroup.rotation.set(-0.08, 0, -0.1);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.045, 16), m.hat);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.36, 16), m.hat);
    crown.position.y = 0.2;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.232, 0.228, 0.08, 16), m.scarfRed);
    band.position.y = 0.06;
    const hatSnow = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.242, 0.04, 16), m.snow);
    hatSnow.position.y = 0.39;
    hatGroup.add(brim, crown, band, hatSnow);
    g.add(hatGroup);

    // Organic wooden twig arms
    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.032, 0.72, 6), m.twig);
    rightArm.position.set(0.56, 1.32, 0.08);
    rightArm.rotation.set(0.15, 0, -1.12);
    g.add(rightArm);

    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.032, 0.76, 6), m.twig);
    leftArm.position.set(-0.58, 1.32, 0.14);
    leftArm.rotation.set(0.22, 0.12, 1.08);
    g.add(leftArm);

    // Miniature Wrought-Iron Warm Winter Lantern hanging gently from Papa's left twig hand!
    const lantern = new THREE.Group();
    lantern.position.set(-0.88, 1.18, 0.28);
    const lCap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.09, 6), m.iron);
    lCap.position.y = 0.14;
    const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.04, 6), m.iron);
    lBase.position.y = -0.11;
    const lGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.068, 0.2, 8), m.lanternGlass);
    lGlass.position.y = 0.01;
    lantern.add(lCap, lBase, lGlass);

    this.lanternHaloMat = new THREE.SpriteMaterial({
      map: this.glowTex,
      color: '#ffcf80',
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.lanternHalo = new THREE.Sprite(this.lanternHaloMat);
    this.lanternHalo.position.set(0, 0.01, 0);
    this.lanternHalo.scale.set(1.25, 1.25, 1);
    lantern.add(this.lanternHalo);

    this.lanternGroup = lantern;
    g.add(lantern);

    return g;
  }

  buildBabySnowman() {
    const g = new THREE.Group();
    const m = this.mats;

    const base = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), m.snow);
    base.scale.set(1.06, 0.88, 1.04);
    base.position.y = 0.32;
    base.castShadow = true;
    base.receiveShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12), m.snow);
    head.position.y = 0.82;
    head.castShadow = true;
    head.receiveShadow = true;
    g.add(base, head);

    // Cute knit pine-green winter beanie + fluffy snow pom-pom
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 8, 16), m.snow);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = 1.0;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), m.beanieGreen);
    cap.position.y = 0.99;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), m.snow);
    pom.position.set(0.03, 1.24, -0.04);
    g.add(cuff, cap, pom);

    // Mini scarf
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 8, 16), m.scarfRed);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.6;
    g.add(scarf);

    // Cheerful baby face
    const eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
    for (const sx of [-0.09, 0.09]) {
      const e = new THREE.Mesh(eyeGeo, m.coal);
      e.position.set(sx, 0.86, 0.24);
      g.add(e);

      const ch = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), m.blush);
      ch.scale.set(1.15, 0.72, 0.45);
      ch.position.set(sx * 1.48, 0.79, 0.23);
      g.add(ch);
    }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.16, 8), m.carrot);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.81, 0.33);
    g.add(nose);

    // Joyful raised little twig arms
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 0.42, 5), m.twig);
      arm.position.set(s * 0.4, 0.58, 0.06);
      arm.rotation.set(0.12, 0, s * -0.78);
      g.add(arm);
    }

    return g;
  }

  getHitMesh() {
    return this.hitMesh;
  }

  setHovered(val) {
    this.hovered = val;
  }

  triggerDance() {
    this.danceTimer = 0;
    this.group.updateMatrixWorld(true);
    return new THREE.Vector3(0.45, 1.45, 0.2).applyMatrix4(this.group.matrixWorld);
  }

  update(elapsedTime, dt, dayState) {
    const lf = dayState.treeLightFactor;
    const flicker = 0.92 + 0.08 * Math.sin(elapsedTime * 4.4);
    this.mats.lanternGlass.emissiveIntensity = (0.28 + lf * 2.35) * flicker;
    this.lanternHaloMat.opacity = (0.12 + lf * 0.62) * flicker;
    const hs = 1.15 + lf * 0.35 + (this.hovered ? 0.25 : 0);
    this.lanternHalo.scale.set(hs, hs, 1);

    // Gentle breeze sway on Papa's hanging lantern
    this.lanternGroup.rotation.z = Math.sin(elapsedTime * 1.9) * 0.08;

    // Cheerful damped wobble & little hop dance when clicked!
    if (this.danceTimer >= 0) {
      this.danceTimer += dt;
      const duration = 1.65;
      if (this.danceTimer >= duration) {
        this.danceTimer = -1;
        this.papaPivot.rotation.z = 0;
        this.papaPivot.position.y = 0;
        this.babyPivot.rotation.z = 0;
        this.babyPivot.position.y = -0.02;
      } else {
        const p = this.danceTimer / duration;
        const decay = Math.exp(-p * 2.8);
        this.papaPivot.rotation.z = Math.sin(this.danceTimer * 12.0) * 0.16 * decay;
        this.papaPivot.position.y = Math.abs(Math.sin(this.danceTimer * 6.0)) * 0.14 * decay;
        this.babyPivot.rotation.z = -Math.sin(this.danceTimer * 14.5) * 0.22 * decay;
        this.babyPivot.position.y = -0.02 + Math.abs(Math.sin(this.danceTimer * 7.5)) * 0.22 * decay;
      }
    } else {
      // Subtle cozy breathing sway when idle or hovered
      const swayAmp = this.hovered ? 0.045 : 0.015;
      this.papaPivot.rotation.z = Math.sin(elapsedTime * 1.4) * swayAmp;
      this.babyPivot.rotation.z = Math.cos(elapsedTime * 1.8) * swayAmp * 1.3;
    }
  }
}
