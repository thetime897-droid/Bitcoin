import * as THREE from 'three';
import { buildHelicopterGeometry, buildJetGeometry, buildRotorGeometry } from './geometry';
import type { Combat } from './Combat';
import type { CampSide } from './Battlefield';

export interface AirSupportOptions {
  fieldHalfWidth: number;
  fieldHalfDepth: number;
  /** How many of each aircraft type per side. */
  jetsPerSide: number;
  helisPerSide: number;
}

interface Jet {
  group: THREE.Group;
  side: CampSide;
  /** +1 flies left-to-right, -1 right-to-left. */
  dirX: 1 | -1;
  speed: number;
  altitude: number;
  laneZ: number;
  weaveSeed: number;
  bombCooldown: number;
}

interface Heli {
  group: THREE.Group;
  rotor: THREE.Mesh;
  tailRotor: THREE.Mesh;
  side: CampSide;
  /** Which way the enemy is: +1 means enemy is at higher X. */
  facing: 1 | -1;
  standoff: number;
  laneZ: number;
  patrolPhase: number;
  patrolSpeed: number;
  altitude: number;
  fireCooldown: number;
}

const BEARS_COLOR = 0xd8453c;
const BULLS_COLOR = 0x33bd76;

function sideColor(side: CampSide): number {
  return side === 'bears' ? BEARS_COLOR : BULLS_COLOR;
}

/**
 * Air support: jets that make bombing runs the length of the field, and
 * gunships that hold station just behind their own line and rake the
 * enemy across it.
 *
 * A handful of individual meshes rather than instancing - the count is
 * small and each one needs its own animated rotor/banking, which is a
 * poor fit for a single instanced draw.
 */
export class AirSupport {
  private readonly jets: Jet[] = [];
  private readonly helis: Heli[] = [];
  private time = 0;

  constructor(
    scene: THREE.Scene,
    private readonly combat: Combat,
    private readonly opts: AirSupportOptions,
  ) {
    const jetGeo = buildJetGeometry();
    const heliGeo = buildHelicopterGeometry();
    const mainRotorGeo = buildRotorGeometry(2.1);
    const tailRotorGeo = buildRotorGeometry(0.62);

    for (const side of ['bears', 'bulls'] as CampSide[]) {
      const bodyMat = new THREE.MeshStandardMaterial({
        color: sideColor(side),
        roughness: 0.45,
        metalness: 0.45,
      });
      const rotorMat = new THREE.MeshStandardMaterial({
        color: 0x1c1c20,
        roughness: 0.6,
        transparent: true,
        opacity: 0.55,
      });

      // Bears sit on the left of the field and attack rightward.
      const dirX: 1 | -1 = side === 'bears' ? 1 : -1;

      for (let i = 0; i < opts.jetsPerSide; i++) {
        const mesh = new THREE.Mesh(jetGeo, bodyMat);
        mesh.castShadow = true;
        const group = new THREE.Group();
        group.add(mesh);
        scene.add(group);
        this.jets.push({
          group,
          side,
          dirX,
          speed: 26 + Math.random() * 9,
          altitude: 20 + Math.random() * 9,
          laneZ: (Math.random() - 0.5) * opts.fieldHalfDepth * 1.1,
          weaveSeed: Math.random() * 100,
          bombCooldown: Math.random() * 4,
        });
        // Stagger the starting positions so they don't fly in formation.
        this.respawnJet(this.jets[this.jets.length - 1], Math.random());
      }

      for (let i = 0; i < opts.helisPerSide; i++) {
        const group = new THREE.Group();
        const body = new THREE.Mesh(heliGeo, bodyMat);
        body.castShadow = true;
        const rotor = new THREE.Mesh(mainRotorGeo, rotorMat);
        rotor.position.y = 0.95;
        const tailRotor = new THREE.Mesh(tailRotorGeo, rotorMat);
        tailRotor.rotation.x = Math.PI / 2;
        tailRotor.position.set(-2.4, 0.42, 0.14);
        group.add(body, rotor, tailRotor);
        scene.add(group);
        this.helis.push({
          group,
          rotor,
          tailRotor,
          side,
          facing: dirX,
          standoff: 13 + Math.random() * 9,
          laneZ: (Math.random() - 0.5) * opts.fieldHalfDepth * 0.9,
          patrolPhase: Math.random() * Math.PI * 2,
          patrolSpeed: 0.16 + Math.random() * 0.12,
          altitude: 8 + Math.random() * 4,
          fireCooldown: Math.random(),
        });
      }
    }
  }

  /** Put a jet back at its own edge of the map to start another run.
   * `progress` seeds how far into the run it starts (used once at setup). */
  private respawnJet(jet: Jet, progress = 0): void {
    const runway = this.opts.fieldHalfWidth + 34;
    jet.laneZ = (Math.random() - 0.5) * this.opts.fieldHalfDepth * 1.1;
    jet.altitude = 20 + Math.random() * 9;
    jet.speed = 26 + Math.random() * 9;
    jet.bombCooldown = 0.4 + Math.random();
    jet.group.position.set(
      -jet.dirX * runway + jet.dirX * progress * runway * 2,
      jet.altitude,
      jet.laneZ,
    );
  }

  update(dt: number, frontlineX: number): void {
    this.time += dt;
    this.updateJets(dt, frontlineX);
    this.updateHelis(dt, frontlineX);
  }

  private updateJets(dt: number, frontlineX: number): void {
    const runway = this.opts.fieldHalfWidth + 34;
    for (const jet of this.jets) {
      const p = jet.group.position;
      p.x += jet.dirX * jet.speed * dt;

      // Gentle weave so the flight path doesn't read as a straight rail.
      const weave = Math.sin(this.time * 0.5 + jet.weaveSeed);
      p.z = jet.laneZ + weave * 7;
      p.y = jet.altitude + Math.sin(this.time * 0.7 + jet.weaveSeed) * 1.2;

      // Nose along travel direction, banked into the weave.
      jet.group.rotation.set(0, jet.dirX === 1 ? 0 : Math.PI, 0);
      jet.group.rotation.z = -weave * 0.45 * jet.dirX;

      const overEnemyGround = jet.dirX === 1 ? p.x > frontlineX : p.x < frontlineX;
      jet.bombCooldown -= dt;
      if (overEnemyGround && jet.bombCooldown <= 0 && Math.abs(p.x - frontlineX) < 46) {
        jet.bombCooldown = 0.55 + Math.random() * 0.9;
        const target = new THREE.Vector3(
          p.x + jet.dirX * (10 + Math.random() * 16),
          0.4,
          p.z + (Math.random() - 0.5) * 9,
        );
        // Dropped, not launched: shallow arc, inherits the jet's momentum.
        this.combat.fireShell(p, target, 0xffb257, 0.55 + Math.random() * 0.5, 3);
      }

      if (Math.abs(p.x) > runway) this.respawnJet(jet);
    }
  }

  private updateHelis(dt: number, frontlineX: number): void {
    for (const heli of this.helis) {
      heli.patrolPhase += heli.patrolSpeed * dt;
      const p = heli.group.position;

      // Hold station on our own side of the line and slide along it.
      p.x = frontlineX - heli.facing * heli.standoff;
      p.z = heli.laneZ + Math.sin(heli.patrolPhase) * this.opts.fieldHalfDepth * 0.45;
      p.y = heli.altitude + Math.sin(this.time * 1.3 + heli.patrolPhase) * 0.5;

      // Nose toward the enemy, nose-down slightly, rolling into the slide.
      const drift = Math.cos(heli.patrolPhase);
      heli.group.rotation.set(0, heli.facing === 1 ? 0 : Math.PI, 0);
      heli.group.rotation.x = -0.1;
      heli.group.rotation.z = drift * 0.22 * heli.facing;

      heli.rotor.rotation.y += dt * 34;
      heli.tailRotor.rotation.y += dt * 46;

      heli.fireCooldown -= dt;
      if (heli.fireCooldown <= 0) {
        heli.fireCooldown = 0.16 + Math.random() * 0.3;
        const muzzle = new THREE.Vector3(p.x + heli.facing * 1.1, p.y - 0.3, p.z);
        const target = new THREE.Vector3(
          frontlineX + heli.facing * (4 + Math.random() * 22),
          0.7 + Math.random() * 1.4,
          p.z + (Math.random() - 0.5) * 16,
        );
        this.combat.fireTracer(muzzle, target, 0xfff0b0);
      }
    }
  }
}
