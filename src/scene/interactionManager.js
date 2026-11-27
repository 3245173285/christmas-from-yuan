import * as THREE from 'three';

// Unified 3D Interactive Raycasting Manager
// Handles:
// 1. Star Topper click -> Golden Starlight Cascade Wave + Particle Fountain + Harp Glissando
// 2. Tree Ornaments click -> Physical Damped Pendulum Swing + Pentatonic Christmas Music Box Melody
// 3. 10 Special Gift Boxes hover & click -> Golden Aura Glow + Camera Zoom + Lid Open + Fairy Dust + Vintage Greeting Card
// 4. Night Sky click -> Summon Wishing Meteor + Chime | Aurora Brush -> Glowing Ripple Wave across Northern Lights!

export class InteractionManager {
  constructor({
    camera,
    domElement,
    christmasTree,
    skyAndAurora,
    magicParticles,
    cameraRig,
    audioEngine,
    giftCardModal,
    wishCardStudio
  }) {
    this.camera = camera;
    this.domElement = domElement;
    this.tree = christmasTree;
    this.sky = skyAndAurora;
    this.particles = magicParticles;
    this.cameraRig = cameraRig;
    this.audio = audioEngine;
    this.giftModal = giftCardModal;
    this.wishStudio = wishCardStudio;

    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.pointerDownPos = null;
    this.pendingCardTimer = null;

    this.bindEvents();
  }

  isModalBlocking() {
    return Boolean(this.giftModal?.isOpen || this.wishStudio?.isOpen);
  }

  isIntroBlocking() {
    const intro = document.getElementById('frost-intro');
    return intro && !intro.classList.contains('is-gone') && !intro.classList.contains('is-melting');
  }

  updateNDC(clientX, clientY) {
    const rect = this.domElement.getBoundingClientRect();
    this.ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  bindEvents() {
    this.domElement.addEventListener('pointerdown', (e) => {
      if (this.isIntroBlocking() || this.isModalBlocking()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.pointerDownPos = { x: e.clientX, y: e.clientY, time: performance.now() };
    });

    this.domElement.addEventListener('pointermove', (e) => {
      if (this.isIntroBlocking() || this.isModalBlocking()) return;
      this.handleHoverAndAuroraBrush(e);
    }, { passive: true });

    this.domElement.addEventListener('pointerup', (e) => {
      if (!this.pointerDownPos || this.isIntroBlocking() || this.isModalBlocking()) {
        this.pointerDownPos = null;
        return;
      }
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      const dtMs = performance.now() - this.pointerDownPos.time;
      this.pointerDownPos = null;

      // Distinguish crisp click (< 7px movement) from OrbitControls camera drag!
      if (dist < 7 && dtMs < 480) {
        this.handleClick(e.clientX, e.clientY);
      }
    });
  }

  handleHoverAndAuroraBrush(e) {
    this.updateNDC(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.ndc, this.camera);

    // 0. Check Hover over 3D Hanging Wish Cards on the Christmas Tree
    const cardHits = this.raycaster.intersectObjects(this.tree.getHangingCardHitMeshes(), false);
    if (cardHits.length > 0) {
      const cardId = cardHits[0].object.userData.hangingCardId;
      this.tree.setHoveredHangingCard(cardId);
      this.tree.setHoveredGift(-1);
      this.tree.setStarHovered(false);
      this.domElement.style.cursor = 'pointer';
      return;
    }
    this.tree.setHoveredHangingCard(null);

    // 1. Check Hover over 10 Special Gift Boxes
    const giftHits = this.raycaster.intersectObjects(this.tree.getSpecialGiftHitMeshes(), false);
    if (giftHits.length > 0) {
      const idx = giftHits[0].object.userData.specialGiftIdx;
      this.tree.setHoveredGift(idx);
      this.tree.setStarHovered(false);
      this.domElement.style.cursor = 'pointer';
      return;
    }
    this.tree.setHoveredGift(-1);

    // 2. Check Hover over Star Topper
    const starHits = this.raycaster.intersectObject(this.tree.starHitMesh, false);
    if (starHits.length > 0) {
      this.tree.setStarHovered(true);
      this.domElement.style.cursor = 'pointer';
      return;
    }
    this.tree.setStarHovered(false);

    // 3. Check Hover over Tree Ornaments
    const ornHits = this.raycaster.intersectObjects(this.tree.ornamentMeshes, false);
    if (ornHits.length > 0) {
      this.domElement.style.cursor = 'pointer';
      return;
    }

    this.domElement.style.cursor = 'grab';
  }

  handleClick(clientX, clientY) {
    this.updateNDC(clientX, clientY);
    this.raycaster.setFromCamera(this.ndc, this.camera);

    // Priority 0: 3D Hanging Wish Cards on the Christmas Tree -> Sparkle Chime + Interactive 3D Reflective Card Viewer!
    const cardHits = this.raycaster.intersectObjects(this.tree.getHangingCardHitMeshes(), false);
    if (cardHits.length > 0 && this.wishStudio) {
      const cardId = cardHits[0].object.userData.hangingCardId;
      const card = this.tree.getHangingCardById(cardId);
      if (card) {
        this.audio.playGiftOpen();
        this.particles.emitOrnamentChime(cardHits[0].point);
        this.wishStudio.openViewer(card);
        return;
      }
    }

    // Priority 1: 10 Special Mystery Gift Boxes -> Zoom In + Lid Pop + Fairy Dust + Vintage Greeting Card!
    const giftHits = this.raycaster.intersectObjects(this.tree.getSpecialGiftHitMeshes(), false);
    if (giftHits.length > 0) {
      const idx = giftHits[0].object.userData.specialGiftIdx;
      const result = this.tree.openGift(idx);
      if (result) {
        this.audio.playGiftOpen();
        this.particles.emitGiftBurst(result.worldPos);
        this.cameraRig.focusOn(result.camPos, result.lookAt, 0.9);

        if (this.pendingCardTimer) clearTimeout(this.pendingCardTimer);
        this.pendingCardTimer = setTimeout(() => {
          this.giftModal.open(result.cardData, () => {
            // Smoothly close the gift box lid and glide camera back to wide panorama!
            this.tree.closeGift(idx);
            this.cameraRig.returnFromFocus(0.95);
            if (result.cardData.bonus === 'meteor_shower') {
              this.sky.summonMeteorShower();
              this.audio.playMeteorChime();
            } else if (result.cardData.bonus === 'star_finale') {
              const starPos = this.tree.triggerStarWave();
              this.particles.emitStarCascade(starPos);
              this.audio.playStarCascade();
            }
          });
        }, 680);
      }
      return;
    }

    // Priority 2: Tree-Top Golden Star -> Golden Starlight Wave + 420-Particle Cascade Fountain!
    const starHits = this.raycaster.intersectObject(this.tree.starHitMesh, false);
    if (starHits.length > 0) {
      const starPos = this.tree.triggerStarWave();
      this.particles.emitStarCascade(starPos);
      this.audio.playStarCascade();
      return;
    }

    // Priority 3: Hanging Ornaments (direct hit OR generous nearest-bauble snap on tree body!)
    const ornHits = this.raycaster.intersectObjects(this.tree.ornamentMeshes, false);
    let targetOrn = ornHits.length > 0 && typeof ornHits[0].instanceId === 'number'
      ? { mesh: ornHits[0].object, instanceId: ornHits[0].instanceId }
      : this.tree.findNearestOrnamentToRay(this.raycaster.ray, 0.72);

    if (targetOrn) {
      const res = this.tree.strikeOrnament(targetOrn.mesh, targetOrn.instanceId);
      if (res) {
        this.audio.playOrnamentNote(res.normalizedHeight);
        this.particles.emitOrnamentChime(res.worldPos);
      }
      return;
    }

    // Priority 4: Night Sky Click -> Summon Wishing Meteor right across clicked direction
    const ray = this.raycaster.ray;
    if (ray.direction.y > 0.04) {
      this.sky.summonMeteorAtDirection(ray.origin, ray.direction);
      this.audio.playMeteorChime();
    }
  }
}
