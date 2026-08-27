import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Merged, single-draw-call low-poly geometries used for instanced armies. */

export function buildSoldierGeometry(): THREE.BufferGeometry {
  const body = new THREE.CapsuleGeometry(0.22, 0.55, 3, 6);
  body.translate(0, 0.6, 0);
  const head = new THREE.SphereGeometry(0.17, 8, 6);
  head.translate(0, 1.05, 0);
  const weapon = new THREE.BoxGeometry(0.06, 0.06, 0.7);
  weapon.translate(0.16, 0.7, 0.15);
  return mergeGeometries([body, head, weapon]) as THREE.BufferGeometry;
}

/** Two stacked cones read as a fuller pine silhouette than a single cone,
 * at zero extra draw calls since it's still one instanced geometry. */
export function buildPineLeafGeometry(): THREE.BufferGeometry {
  const lower = new THREE.ConeGeometry(1.1, 2.2, 7);
  lower.translate(0, 0, 0);
  const upper = new THREE.ConeGeometry(0.72, 1.7, 7);
  upper.translate(0, 1.35, 0);
  return mergeGeometries([lower, upper]) as THREE.BufferGeometry;
}

export function buildTankGeometry(): THREE.BufferGeometry {
  const hull = new THREE.BoxGeometry(0.9, 0.42, 1.5);
  hull.translate(0, 0.3, 0);
  const turret = new THREE.CylinderGeometry(0.32, 0.36, 0.3, 8);
  turret.translate(0, 0.66, -0.05);
  const barrel = new THREE.CylinderGeometry(0.05, 0.06, 1.0, 6);
  barrel.rotateX(Math.PI / 2);
  barrel.translate(0, 0.66, 0.75);
  const trackL = new THREE.BoxGeometry(0.22, 0.28, 1.6);
  trackL.translate(0.5, 0.16, 0);
  const trackR = trackL.clone();
  trackR.translate(-1.0, 0, 0);
  return mergeGeometries([hull, turret, barrel, trackL, trackR]) as THREE.BufferGeometry;
}
