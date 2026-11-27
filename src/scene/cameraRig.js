import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Cinematic Camera Rig with rock-solid OrbitControls + Smooth Focus Zoom for Gift Unboxing
// Uses native azimuth-only autoRotate so vertical pitch NEVER drifts upward!

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class CinematicCameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);

    this.camera.position.set(2.8, 5.2, 28.5);
    this.controls.target.set(0.0, 6.4, -2.0);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.rotateSpeed = 0.65;
    this.controls.zoomSpeed = 0.85;
    this.controls.enablePan = false;

    this.controls.minDistance = 4.2;
    this.controls.maxDistance = 58.0;
    this.controls.minPolarAngle = Math.PI * 0.22;
    this.controls.maxPolarAngle = Math.PI * 0.488;

    this.autoOrbit = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.26;

    // Smooth camera focus transition state (for zooming right up to clicked gift boxes!)
    this.savedCamPos = null;
    this.savedTarget = null;
    this.savedAutoOrbit = true;
    this.isFocused = false;

    this.transition = null;

    this.controls.update();
  }

  setAutoOrbit(enabled) {
    this.autoOrbit = enabled;
    if (!this.isFocused) {
      this.controls.autoRotate = enabled;
    }
  }

  // Smoothly glide camera down to intimate gift box close-up
  focusOn(destPos, destTarget, duration = 0.92) {
    if (!this.isFocused) {
      this.savedCamPos = this.camera.position.clone();
      this.savedTarget = this.controls.target.clone();
      this.savedAutoOrbit = this.autoOrbit;
    }
    this.isFocused = true;
    this.controls.autoRotate = false;
    this.controls.enabled = false;

    this.transition = {
      startPos: this.camera.position.clone(),
      startTarget: this.controls.target.clone(),
      endPos: destPos.clone(),
      endTarget: destTarget.clone(),
      elapsed: 0,
      duration,
      unlockControlsAtEnd: false
    };
  }

  // Smoothly return camera back to wide panoramic meadow view after closing greeting card
  returnFromFocus(duration = 0.95) {
    if (!this.isFocused || !this.savedCamPos || !this.savedTarget) return;

    this.transition = {
      startPos: this.camera.position.clone(),
      startTarget: this.controls.target.clone(),
      endPos: this.savedCamPos.clone(),
      endTarget: this.savedTarget.clone(),
      elapsed: 0,
      duration,
      unlockControlsAtEnd: true
    };
  }

  update(elapsedTime, dt = 0.016) {
    if (this.transition) {
      const tr = this.transition;
      tr.elapsed += dt;
      const p = Math.min(1, tr.elapsed / tr.duration);
      const e = easeInOutCubic(p);

      this.camera.position.lerpVectors(tr.startPos, tr.endPos, e);
      this.controls.target.lerpVectors(tr.startTarget, tr.endTarget, e);
      this.camera.lookAt(this.controls.target);

      if (p >= 1) {
        if (tr.unlockControlsAtEnd) {
          this.isFocused = false;
          this.controls.enabled = true;
          this.controls.autoRotate = this.autoOrbit;
        }
        this.transition = null;
      }
      return;
    }

    this.controls.update();
  }
}
