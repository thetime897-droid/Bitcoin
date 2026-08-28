import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Merged, single-draw-call low-poly geometries used for instanced armies,
 * emplacements and aircraft. Every unit faces +X in local space so a single
 * yaw of 0 or PI aims it at the enemy side. */

export function buildSoldierGeometry(): THREE.BufferGeometry {
  const body = new THREE.CapsuleGeometry(0.22, 0.55, 3, 6);
  body.translate(0, 0.6, 0);
  const head = new THREE.SphereGeometry(0.17, 8, 6);
  head.translate(0, 1.05, 0);
  const helmet = new THREE.SphereGeometry(0.2, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
  helmet.translate(0, 1.09, 0);
  // Rifle held forward along +X.
  const weapon = new THREE.BoxGeometry(0.72, 0.06, 0.06);
  weapon.translate(0.34, 0.72, 0.14);
  return mergeGeometries([body, head, helmet, weapon]) as THREE.BufferGeometry;
}

/** Two stacked cones read as a fuller pine silhouette than a single cone,
 * at zero extra draw calls since it's still one instanced geometry. */
export function buildPineLeafGeometry(): THREE.BufferGeometry {
  const lower = new THREE.ConeGeometry(1.1, 2.2, 7);
  const upper = new THREE.ConeGeometry(0.72, 1.7, 7);
  upper.translate(0, 1.35, 0);
  return mergeGeometries([lower, upper]) as THREE.BufferGeometry;
}

export function buildTankGeometry(): THREE.BufferGeometry {
  const hull = new THREE.BoxGeometry(1.6, 0.42, 0.95);
  hull.translate(0, 0.32, 0);
  const glacis = new THREE.BoxGeometry(0.5, 0.26, 0.9);
  glacis.translate(0.72, 0.46, 0);
  const turret = new THREE.CylinderGeometry(0.34, 0.4, 0.32, 8);
  turret.translate(-0.08, 0.68, 0);
  // Gun barrel pointing along +X (toward the enemy).
  const barrel = new THREE.CylinderGeometry(0.055, 0.07, 1.15, 6);
  barrel.rotateZ(Math.PI / 2);
  barrel.translate(0.7, 0.7, 0);
  const trackL = new THREE.BoxGeometry(1.72, 0.3, 0.24);
  trackL.translate(0, 0.17, 0.52);
  const trackR = trackL.clone();
  trackR.translate(0, 0, -1.04);
  return mergeGeometries([hull, glacis, turret, barrel, trackL, trackR]) as THREE.BufferGeometry;
}

/** Six-wheeled armoured personnel carrier - the bulk of each side's
 * vehicle line, lighter and boxier than a tank. Nose along +X. */
export function buildApcGeometry(): THREE.BufferGeometry {
  const hull = new THREE.BoxGeometry(1.9, 0.55, 0.92);
  hull.translate(0, 0.62, 0);
  const nose = new THREE.BoxGeometry(0.55, 0.36, 0.88);
  nose.rotateZ(-0.26);
  nose.translate(1.06, 0.5, 0);
  const cupola = new THREE.BoxGeometry(0.62, 0.3, 0.6);
  cupola.translate(-0.2, 1.02, 0);
  const mg = new THREE.CylinderGeometry(0.045, 0.045, 0.72, 5);
  mg.rotateZ(Math.PI / 2);
  mg.translate(0.24, 1.14, 0);
  const parts: THREE.BufferGeometry[] = [hull, nose, cupola, mg];
  for (const wx of [-0.62, 0.06, 0.72]) {
    for (const wz of [-0.52, 0.52]) {
      const wheel = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 10);
      wheel.rotateX(Math.PI / 2);
      wheel.translate(wx, 0.29, wz);
      parts.push(wheel);
    }
  }
  return mergeGeometries(parts) as THREE.BufferGeometry;
}

/** Towed field gun that sits at the back of a camp and lobs shells. Barrel
 * points along +X and is elevated, so shells leave on a visible arc. */
export function buildCannonGeometry(): THREE.BufferGeometry {
  const barrel = new THREE.CylinderGeometry(0.13, 0.17, 3.1, 8);
  barrel.rotateZ(Math.PI / 2);
  barrel.rotateZ(-0.34); // muzzle elevation
  barrel.translate(1.15, 1.28, 0);
  const breech = new THREE.BoxGeometry(0.62, 0.52, 0.5);
  breech.translate(0.02, 0.86, 0);
  const cradle = new THREE.BoxGeometry(0.42, 0.9, 0.34);
  cradle.rotateZ(0.22);
  cradle.translate(-0.1, 0.5, 0);
  const trailL = new THREE.BoxGeometry(1.9, 0.16, 0.16);
  trailL.rotateY(0.22);
  trailL.translate(-0.95, 0.2, 0.34);
  const trailR = new THREE.BoxGeometry(1.9, 0.16, 0.16);
  trailR.rotateY(-0.22);
  trailR.translate(-0.95, 0.2, -0.34);
  const wheelL = new THREE.CylinderGeometry(0.44, 0.44, 0.16, 12);
  wheelL.rotateX(Math.PI / 2);
  wheelL.translate(0, 0.44, 0.62);
  const wheelR = wheelL.clone();
  wheelR.translate(0, 0, -1.24);
  const shield = new THREE.BoxGeometry(0.1, 0.86, 1.15);
  shield.translate(0.42, 0.86, 0);
  return mergeGeometries([
    barrel, breech, cradle, trailL, trailR, wheelL, wheelR, shield,
  ]) as THREE.BufferGeometry;
}

/** Delta-wing jet, nose along +X. */
export function buildJetGeometry(): THREE.BufferGeometry {
  const fuselage = new THREE.CylinderGeometry(0.26, 0.34, 3.4, 8);
  fuselage.rotateZ(Math.PI / 2);
  const nose = new THREE.ConeGeometry(0.26, 1.1, 8);
  nose.rotateZ(-Math.PI / 2);
  nose.translate(2.25, 0, 0);
  const canopy = new THREE.SphereGeometry(0.24, 8, 6);
  canopy.scale(2.1, 0.62, 0.86);
  canopy.translate(0.75, 0.24, 0);
  const wingL = new THREE.BoxGeometry(1.5, 0.09, 2.3);
  wingL.translate(-0.35, -0.02, 1.35);
  const wingR = wingL.clone();
  wingR.translate(0, 0, -2.7);
  const tailFin = new THREE.BoxGeometry(0.85, 0.85, 0.09);
  tailFin.translate(-1.5, 0.5, 0);
  const stabL = new THREE.BoxGeometry(0.7, 0.08, 0.8);
  stabL.translate(-1.55, 0, 0.5);
  const stabR = stabL.clone();
  stabR.translate(0, 0, -1.0);
  return mergeGeometries([
    fuselage, nose, canopy, wingL, wingR, tailFin, stabL, stabR,
  ]) as THREE.BufferGeometry;
}

/** Helicopter airframe (rotors are separate so they can spin). Nose +X. */
export function buildHelicopterGeometry(): THREE.BufferGeometry {
  const cabin = new THREE.SphereGeometry(0.62, 10, 8);
  cabin.scale(1.5, 0.92, 1);
  const boom = new THREE.CylinderGeometry(0.13, 0.2, 2.3, 7);
  boom.rotateZ(Math.PI / 2);
  boom.translate(-1.5, 0.16, 0);
  const tailFin = new THREE.BoxGeometry(0.42, 0.72, 0.08);
  tailFin.translate(-2.4, 0.5, 0);
  const mast = new THREE.CylinderGeometry(0.1, 0.1, 0.42, 6);
  mast.translate(0, 0.72, 0);
  const skidL = new THREE.BoxGeometry(1.7, 0.08, 0.08);
  skidL.translate(0, -0.78, 0.5);
  const skidR = skidL.clone();
  skidR.translate(0, 0, -1.0);
  const strutL = new THREE.BoxGeometry(0.08, 0.34, 0.08);
  strutL.translate(0.35, -0.6, 0.5);
  const strutR = strutL.clone();
  strutR.translate(0, 0, -1.0);
  // Stub wing with rocket pods.
  const podL = new THREE.CylinderGeometry(0.14, 0.14, 0.7, 6);
  podL.rotateZ(Math.PI / 2);
  podL.translate(0.1, -0.2, 0.78);
  const podR = podL.clone();
  podR.translate(0, 0, -1.56);
  return mergeGeometries([
    cabin, boom, tailFin, mast, skidL, skidR, strutL, strutR, podL, podR,
  ]) as THREE.BufferGeometry;
}

/** Flat cross of blades, spun around Y by the aircraft update. */
export function buildRotorGeometry(radius: number): THREE.BufferGeometry {
  const a = new THREE.BoxGeometry(radius * 2, 0.04, 0.17);
  const b = new THREE.BoxGeometry(0.17, 0.04, radius * 2);
  return mergeGeometries([a, b]) as THREE.BufferGeometry;
}

/** Sandbag/barricade block used along the contested frontline. */
export function buildBarricadeGeometry(): THREE.BufferGeometry {
  const base = new THREE.BoxGeometry(0.5, 0.42, 1.5);
  const top = new THREE.BoxGeometry(0.42, 0.34, 1.1);
  top.translate(0, 0.36, 0);
  return mergeGeometries([base, top]) as THREE.BufferGeometry;
}
