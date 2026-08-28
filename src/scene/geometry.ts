import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Merged, single-draw-call low-poly geometries for the instanced armies,
 * emplacements and aircraft.
 *
 * Every unit faces +X in local space, so a yaw of 0 or PI aims it at the
 * enemy. Segment counts are kept deliberately low - these are drawn up to
 * ~100 instances per side, so silhouette detail is worth far more here than
 * smooth curves that vanish at the cinematic camera distance.
 */

function box(w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function cyl(rt: number, rb: number, h: number, seg: number, x = 0, y = 0, z = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}

/** Cylinder lying along X (the "forward" axis) rather than standing up. */
function cylX(rt: number, rb: number, len: number, seg: number, x = 0, y = 0, z = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rt, rb, len, seg);
  g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

/** Wheel: a cylinder lying along Z, so it rolls forward along X. */
function wheel(radius: number, width: number, seg: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(radius, radius, width, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

function mirrorZ(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const c = g.clone();
  c.scale(1, 1, -1);
  return c;
}

/** Infantryman: legs, torso, pack, helmeted head, arms and a rifle held
 * across the body. Roughly 1.3 units tall before the display scale. */
export function buildSoldierGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Legs, slightly apart and tapering into boots.
  const legL = box(0.15, 0.46, 0.16, 0, 0.23, 0.11);
  parts.push(legL, mirrorZ(legL));
  const bootL = box(0.19, 0.1, 0.2, 0.02, 0.05, 0.11);
  parts.push(bootL, mirrorZ(bootL));

  // Torso with webbing, and a pack slung behind.
  parts.push(box(0.3, 0.46, 0.42, 0, 0.7, 0));
  parts.push(box(0.32, 0.09, 0.44, 0, 0.6, 0));
  parts.push(box(0.2, 0.34, 0.34, -0.24, 0.74, 0));

  // Shoulders, then arms angled forward onto the weapon.
  parts.push(box(0.24, 0.12, 0.5, 0, 0.9, 0));
  const armL = box(0.13, 0.34, 0.13, 0.09, 0.76, 0.24);
  armL.rotateZ(-0.5);
  armL.translate(0.06, 0.02, 0);
  parts.push(armL);
  const armR = box(0.13, 0.32, 0.13, 0.02, 0.76, -0.22);
  armR.rotateZ(-0.25);
  parts.push(armR);

  // Head under a helmet with a brim.
  parts.push(cyl(0.11, 0.12, 0.14, 7, 0, 1.02, 0));
  const helmet = new THREE.SphereGeometry(0.17, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.55);
  helmet.scale(1, 0.85, 1);
  helmet.translate(0, 1.06, 0);
  parts.push(helmet);
  parts.push(cyl(0.19, 0.19, 0.035, 9, 0.02, 1.05, 0));

  // Rifle: receiver, barrel, magazine, stock.
  parts.push(box(0.42, 0.07, 0.07, 0.3, 0.78, 0.12));
  parts.push(cylX(0.022, 0.022, 0.34, 5, 0.66, 0.78, 0.12));
  parts.push(box(0.07, 0.15, 0.05, 0.24, 0.69, 0.12));
  parts.push(box(0.2, 0.09, 0.06, 0.02, 0.79, 0.12));

  return mergeGeometries(parts) as THREE.BufferGeometry;
}

/** Two stacked cones read as a fuller pine silhouette than a single cone,
 * at zero extra draw calls since it's still one instanced geometry. */
export function buildPineLeafGeometry(): THREE.BufferGeometry {
  const lower = new THREE.ConeGeometry(1.1, 2.2, 7);
  const upper = new THREE.ConeGeometry(0.72, 1.7, 7);
  upper.translate(0, 1.35, 0);
  return mergeGeometries([lower, upper]) as THREE.BufferGeometry;
}

/** Six-wheeled armoured personnel carrier: sloped nose, roof cupola with
 * an MG, side skirts, vision blocks and an antenna. */
export function buildApcGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Lower hull, then an upper deck inset slightly for a stepped profile.
  parts.push(box(1.95, 0.42, 0.96, 0, 0.58, 0));
  parts.push(box(1.6, 0.3, 0.84, -0.08, 0.9, 0));

  // Sloped glacis plate.
  const glacis = box(0.62, 0.4, 0.9, 0, 0, 0);
  glacis.rotateZ(-0.55);
  glacis.translate(1.02, 0.72, 0);
  parts.push(glacis);

  // Side skirts over the wheels.
  const skirtL = box(1.85, 0.22, 0.07, 0, 0.42, 0.5);
  parts.push(skirtL, mirrorZ(skirtL));

  // Vision blocks along the flanks.
  for (const vx of [0.34, -0.06, -0.46]) {
    const v = box(0.2, 0.11, 0.05, vx, 0.92, 0.44);
    parts.push(v, mirrorZ(v));
  }

  // Commander's cupola and its machine gun.
  parts.push(cyl(0.28, 0.31, 0.22, 8, -0.18, 1.16, 0));
  parts.push(box(0.3, 0.06, 0.3, -0.18, 1.28, 0));
  parts.push(box(0.34, 0.13, 0.14, 0.06, 1.32, 0));
  parts.push(cylX(0.03, 0.03, 0.46, 5, 0.42, 1.32, 0));

  // Exhaust and whip antenna.
  parts.push(cylX(0.07, 0.07, 0.3, 6, -0.95, 0.82, 0.36));
  parts.push(cyl(0.018, 0.018, 0.95, 4, -0.6, 1.5, -0.34));

  // Six road wheels with visible hubs.
  for (const wx of [0.66, 0.02, -0.62]) {
    for (const wz of [0.52, -0.52]) {
      parts.push(wheel(0.3, 0.2, 10, wx, 0.3, wz));
      parts.push(wheel(0.12, 0.23, 6, wx, 0.3, wz));
    }
  }

  return mergeGeometries(parts) as THREE.BufferGeometry;
}

/** Main battle tank: sloped hull, turret with a rear bustle, mantlet,
 * muzzle-braked gun, road wheels with sprocket and idler, fenders. */
export function buildTankGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Hull: lower box plus a sloped glacis and a flat deck.
  parts.push(box(1.75, 0.34, 0.98, 0, 0.42, 0));
  const glacis = box(0.68, 0.34, 0.98, 0, 0, 0);
  glacis.rotateZ(-0.62);
  glacis.translate(0.92, 0.56, 0);
  parts.push(glacis);
  parts.push(box(1.5, 0.16, 0.98, -0.1, 0.66, 0));

  // Fenders over the tracks.
  const fenderL = box(1.85, 0.07, 0.16, 0, 0.72, 0.56);
  parts.push(fenderL, mirrorZ(fenderL));

  // Turret: tapered front, squared bustle at the back.
  parts.push(cyl(0.4, 0.46, 0.3, 8, -0.1, 0.89, 0));
  parts.push(box(0.5, 0.28, 0.62, -0.5, 0.89, 0));
  const cheek = box(0.42, 0.26, 0.5, 0, 0, 0);
  cheek.rotateY(0.4);
  cheek.translate(0.22, 0.89, 0.2);
  parts.push(cheek, mirrorZ(cheek));

  // Mantlet and main gun with a muzzle brake.
  parts.push(box(0.24, 0.28, 0.4, 0.36, 0.9, 0));
  parts.push(cylX(0.055, 0.075, 1.25, 7, 0.98, 0.9, 0));
  parts.push(cylX(0.09, 0.09, 0.18, 7, 1.62, 0.9, 0));

  // Commander's cupola, hatch and antenna.
  parts.push(cyl(0.17, 0.19, 0.16, 7, -0.24, 1.12, 0.16));
  parts.push(box(0.2, 0.05, 0.2, -0.24, 1.21, 0.16));
  parts.push(cyl(0.016, 0.016, 0.85, 4, -0.62, 1.4, -0.24));

  // Tracks, with a drive sprocket, idler and road wheels between them.
  const trackL = box(1.85, 0.3, 0.26, 0, 0.28, 0.54);
  parts.push(trackL, mirrorZ(trackL));
  for (const wz of [0.54, -0.54]) {
    parts.push(wheel(0.19, 0.21, 8, 0.82, 0.28, wz));
    parts.push(wheel(0.19, 0.21, 8, -0.82, 0.28, wz));
    for (const wx of [0.44, 0.12, -0.2, -0.52]) {
      parts.push(wheel(0.15, 0.22, 7, wx, 0.24, wz));
    }
  }

  return mergeGeometries(parts) as THREE.BufferGeometry;
}

/** Towed field gun that sits at the back of a camp and lobs shells. Barrel
 * points along +X and is elevated, so shells leave on a visible arc. */
export function buildCannonGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const barrel = cylX(0.13, 0.17, 3.1, 8, 0, 0, 0);
  barrel.rotateZ(-0.34);
  barrel.translate(1.15, 1.28, 0);
  parts.push(barrel);
  // Muzzle brake and recoil cylinder.
  const brake = cylX(0.2, 0.2, 0.3, 8, 0, 0, 0);
  brake.rotateZ(-0.34);
  brake.translate(2.55, 1.78, 0);
  parts.push(brake);
  const recoil = cylX(0.1, 0.1, 1.1, 6, 0, 0, 0);
  recoil.rotateZ(-0.34);
  recoil.translate(0.75, 1.5, 0);
  parts.push(recoil);

  parts.push(box(0.62, 0.52, 0.5, 0.02, 0.86, 0));
  const cradle = box(0.42, 0.9, 0.34, 0, 0, 0);
  cradle.rotateZ(0.22);
  cradle.translate(-0.1, 0.5, 0);
  parts.push(cradle);

  const trailL = box(1.9, 0.16, 0.16, 0, 0, 0);
  trailL.rotateY(0.22);
  trailL.translate(-0.95, 0.2, 0.34);
  parts.push(trailL, mirrorZ(trailL));
  // Spades at the end of each trail leg.
  const spadeL = box(0.18, 0.3, 0.14, -1.85, 0.14, 0.62);
  parts.push(spadeL, mirrorZ(spadeL));

  parts.push(wheel(0.44, 0.16, 12, 0, 0.44, 0.62));
  parts.push(wheel(0.44, 0.16, 12, 0, 0.44, -0.62));
  parts.push(wheel(0.16, 0.19, 6, 0, 0.44, 0.62));
  parts.push(wheel(0.16, 0.19, 6, 0, 0.44, -0.62));

  // Angled gun shield.
  const shield = box(0.1, 0.86, 1.15, 0, 0, 0);
  shield.rotateZ(0.16);
  shield.translate(0.42, 0.9, 0);
  parts.push(shield);
  const shieldTop = box(0.09, 0.3, 1.0, 0, 0, 0);
  shieldTop.rotateZ(0.5);
  shieldTop.translate(0.5, 1.4, 0);
  parts.push(shieldTop);

  return mergeGeometries(parts) as THREE.BufferGeometry;
}

/** Delta-wing strike jet: area-ruled fuselage, bubble canopy, twin tails,
 * two exhaust nozzles and underwing pylons with missiles. Nose along +X. */
export function buildJetGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Fuselage in two sections so it visibly narrows toward the tail.
  parts.push(cylX(0.3, 0.34, 2.1, 9, 0.35, 0, 0));
  parts.push(cylX(0.34, 0.26, 1.5, 9, -1.35, 0, 0));

  // Nose cone and pitot.
  const nose = new THREE.ConeGeometry(0.3, 1.2, 9);
  nose.rotateZ(-Math.PI / 2);
  nose.translate(1.98, 0, 0);
  parts.push(nose);
  parts.push(cylX(0.03, 0.03, 0.42, 4, 2.72, 0, 0));

  // Bubble canopy.
  const canopy = new THREE.SphereGeometry(0.26, 10, 7);
  canopy.scale(2.4, 0.68, 0.9);
  canopy.translate(0.85, 0.26, 0);
  parts.push(canopy);

  // Side intakes.
  const intakeL = box(0.9, 0.3, 0.26, 0.55, -0.06, 0.42);
  parts.push(intakeL, mirrorZ(intakeL));

  // Swept delta wings with a leading-edge root extension.
  const wingL = box(1.7, 0.09, 2.4, 0, 0, 0);
  wingL.rotateY(-0.34);
  wingL.translate(-0.5, -0.04, 1.35);
  parts.push(wingL, mirrorZ(wingL));
  const lerxL = box(0.9, 0.07, 0.5, 0, 0, 0);
  lerxL.rotateY(-0.5);
  lerxL.translate(0.55, 0, 0.4);
  parts.push(lerxL, mirrorZ(lerxL));

  // Canted twin tails and horizontal stabilisers.
  const finL = box(0.8, 0.85, 0.08, 0, 0, 0);
  finL.rotateX(0.28);
  finL.translate(-1.65, 0.52, 0.3);
  parts.push(finL, mirrorZ(finL));
  const stabL = box(0.66, 0.08, 0.8, 0, 0, 0);
  stabL.rotateY(-0.3);
  stabL.translate(-1.72, -0.04, 0.55);
  parts.push(stabL, mirrorZ(stabL));

  // Twin exhaust nozzles.
  parts.push(cylX(0.19, 0.22, 0.42, 8, -2.2, 0, 0.19));
  parts.push(cylX(0.19, 0.22, 0.42, 8, -2.2, 0, -0.19));

  // Pylons and missiles under each wing.
  const pylonL = box(0.24, 0.18, 0.08, -0.35, -0.18, 1.0);
  parts.push(pylonL, mirrorZ(pylonL));
  const missileL = cylX(0.07, 0.07, 0.95, 6, -0.3, -0.32, 1.0);
  parts.push(missileL, mirrorZ(missileL));
  const tipL = new THREE.ConeGeometry(0.07, 0.26, 6);
  tipL.rotateZ(-Math.PI / 2);
  tipL.translate(0.3, -0.32, 1.0);
  parts.push(tipL, mirrorZ(tipL));

  return mergeGeometries(parts) as THREE.BufferGeometry;
}

/** Attack helicopter: stepped cockpit, engine housing, tail boom with a
 * rotor guard, skids, stub wings with rocket pods and a chin turret. */
export function buildHelicopterGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Fuselage: gunner's nose section stepped below the pilot's.
  const nose = new THREE.SphereGeometry(0.42, 10, 8);
  nose.scale(1.5, 0.8, 0.9);
  nose.translate(0.62, -0.16, 0);
  parts.push(nose);
  const cabin = new THREE.SphereGeometry(0.6, 11, 8);
  cabin.scale(1.35, 0.95, 1);
  parts.push(cabin);

  // Engine housing and exhausts above the cabin.
  parts.push(box(1.0, 0.34, 0.66, -0.5, 0.42, 0));
  const exhaustL = cylX(0.11, 0.13, 0.3, 6, -1.02, 0.42, 0.22);
  parts.push(exhaustL, mirrorZ(exhaustL));

  // Rotor mast and head.
  parts.push(cyl(0.1, 0.1, 0.46, 6, 0, 0.78, 0));
  parts.push(cyl(0.17, 0.2, 0.14, 8, 0, 0.99, 0));

  // Tail boom, fin, stabiliser and the tail-rotor guard ring.
  parts.push(cylX(0.12, 0.2, 2.3, 8, -1.5, 0.16, 0));
  parts.push(box(0.42, 0.78, 0.08, -2.42, 0.5, 0));
  parts.push(box(0.5, 0.07, 0.86, -2.2, 0.3, 0));
  const guard = new THREE.TorusGeometry(0.34, 0.045, 5, 12);
  guard.translate(-2.5, 0.44, 0.12);
  parts.push(guard);

  // Chin turret.
  parts.push(cyl(0.16, 0.18, 0.16, 8, 0.86, -0.5, 0));
  parts.push(cylX(0.045, 0.045, 0.5, 5, 1.12, -0.52, 0));

  // Skids with struts.
  const skidL = cylX(0.055, 0.055, 1.8, 6, -0.1, -0.86, 0.52);
  parts.push(skidL, mirrorZ(skidL));
  const strutFL = box(0.09, 0.4, 0.09, 0, 0, 0);
  strutFL.rotateX(-0.32);
  strutFL.translate(0.42, -0.62, 0.44);
  parts.push(strutFL, mirrorZ(strutFL));
  const strutRL = box(0.09, 0.4, 0.09, 0, 0, 0);
  strutRL.rotateX(-0.32);
  strutRL.translate(-0.55, -0.62, 0.44);
  parts.push(strutRL, mirrorZ(strutRL));

  // Stub wings carrying rocket pods and a missile rail.
  const wingL = box(0.42, 0.1, 0.8, -0.1, -0.14, 0.62);
  parts.push(wingL, mirrorZ(wingL));
  const podL = cylX(0.16, 0.16, 0.78, 8, 0.02, -0.3, 0.86);
  parts.push(podL, mirrorZ(podL));
  const railL = box(0.5, 0.07, 0.07, 0, -0.3, 1.12);
  parts.push(railL, mirrorZ(railL));

  return mergeGeometries(parts) as THREE.BufferGeometry;
}

/** Flat cross of blades, spun around Y by the aircraft update. */
export function buildRotorGeometry(radius: number): THREE.BufferGeometry {
  const a = box(radius * 2, 0.04, 0.17);
  const b = box(0.17, 0.04, radius * 2);
  return mergeGeometries([a, b]) as THREE.BufferGeometry;
}

/** Sandbag/barricade block used along the contested frontline. */
export function buildBarricadeGeometry(): THREE.BufferGeometry {
  const base = box(0.5, 0.42, 1.5);
  const mid = box(0.44, 0.36, 1.2, 0, 0.36, 0);
  const top = box(0.36, 0.3, 0.85, 0, 0.66, 0);
  return mergeGeometries([base, mid, top]) as THREE.BufferGeometry;
}

/** Angular chunk thrown out by explosions. */
export function buildDebrisGeometry(): THREE.BufferGeometry {
  return new THREE.TetrahedronGeometry(0.28, 0);
}
