import * as THREE from 'three';
import { PALETTE } from './theme.js';

// A tiny procedural rocket + a canvas-texture callsign label, tuned for a
// bloomed projector scene. The label + trail carry textures/materials, so
// scene.js's dispose must cascade (it does — disposeObject3D traverses the group).
export function createShip({ callsign, color }) {
  const group = new THREE.Group();
  const tint = new THREE.Color(color);
  const mat = new THREE.MeshStandardMaterial({
    color: tint, metalness: 0.3, roughness: 0.45,
    emissive: tint.clone(), emissiveIntensity: 0.35, // low glow → blooms
  });

  // Tapered octagonal body + sharp nose read as a rocket silhouette at a
  // distance; low radial-segment count keeps the low-poly look intentional
  // rather than a smoothed-out blob.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.5, 8), mat);
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 8), mat);
  nose.position.y = 0.4;
  group.add(nose);
  for (const fin of makeFins(mat)) group.add(fin);

  // Exhaust trail — additive so it blooms; hidden until launch.
  const trailMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(PALETTE.ring), transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const trail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.6, 12), trailMat);
  trail.position.y = -0.55;
  trail.rotation.x = Math.PI; // taper points down, away from the nose
  trail.visible = false;
  group.add(trail);

  const label = makeLabel(callsign);
  label.position.y = 0.72;
  group.add(label);

  group.userData = { callsign, color, mat, trail, baseEmissive: 0.35 };
  return group;
}

export function setEmissiveBoost(group, intensity) {
  group.userData.mat.emissiveIntensity = intensity;
}

export function setTrail(group, on, scale = 1) {
  const { trail } = group.userData;
  trail.visible = on;
  trail.material.opacity = on ? 0.9 * scale : 0;
  trail.scale.set(1, Math.max(0.001, scale), 1);
}

export function setGrounded(group, on) {
  const { mat, baseEmissive, color } = group.userData;
  mat.emissive.set(on ? PALETTE.grounded : color);
  mat.emissiveIntensity = on ? 0.6 : baseEmissive;
}

// Four swept fins at the body's base — the detail that reads "rocket" instead
// of "cylinder" at small scale. Shared geometry, tinted with the body material.
function makeFins(mat) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.18);
  shape.lineTo(0.16, -0.02);
  shape.lineTo(0.05, -0.12);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false });
  geo.translate(0, 0, -0.015);

  const fins = [];
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(geo, mat);
    fin.position.y = -0.16;
    fin.rotation.y = (i / 4) * Math.PI * 2;
    fins.push(fin);
  }
  return fins;
}

// Projector-legible: big canvas, white fill with a dark stroke so the callsign
// reads over any ship tint and over the grid.
function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const label = '@' + text.slice(0, 15);
  ctx.font = '700 52px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 10; ctx.strokeStyle = PALETTE.labelOutline;
  ctx.strokeText(label, 256, 64);
  ctx.fillStyle = PALETTE.labelText;
  ctx.fillText(label, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(1.7, 0.42, 1);
  return sprite;
}
