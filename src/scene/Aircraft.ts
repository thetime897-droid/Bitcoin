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

/** Where a jet is in its attack run. */
const enum RunPhase {
  /** High and level, inbound. */
  Cruise,
  /** Nose down, descending onto the target. */
  Dive,
  /** Bombs away - releasing a stick. */
  Release,
  /** Climbing back out the far side. */
  Egress,
}

interface Jet {
  group: THREE.Group;
  burner: THREE.Sprite;
  side: CampSide;
  /** +1 flies left-to-right, -1 right-to-left. */
  dirX: 1 | -1;
  speed: number;
  cruiseAltitude: number;
  attackAltitude: number;
  /** Damped toward the phase's target, so climbs and dives are smooth. */
  altitude: number;
  laneZ: number;
  weaveSeed: number;
  phase: RunPhase;
  /** Bombs left in the current stick, and the gap until the next one. */
  stickLeft: number;
  stickTimer: number;
  /** Previous frame's position, for deriving pitch and bank from motion. */
  lastY: number;
  lastZ: number;
}

interface Heli {
  group: THREE.Group;
  rotor: THREE.Mesh;
  tailRotor: THREE.Mesh;
  side: CampSide;
  /** Which way the enemy is: +1 means enemy is at higher X. */
  facing: 1 | -1;
  /** Current and wanted position; the gap drives pitch and bank. */
  standoff: number;
  wantStandoff: number;
  laneZ: number;
  wantLaneZ: number;
  altitude: number;
  wantAltitude: number;
  /** Seconds until it picks a new station. */
  repositionTimer: number;
  fireCooldown: number;
  bobSeed: number;
}

const BEARS_COLOR = 0xd8453c;
const BULLS_COLOR = 0x33bd76;

function sideColor(side: CampSide): number {
  return side === 'bears' ? BEARS_COLOR : BULLS_COLOR;
}

function buildBurnerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.3, 'rgba(160,205,255,0.75)');
  grad.addColorStop(0.7, 'rgba(90,140,255,0.3)');
  grad.addColorStop(1, 'rgba(60,110,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Air support: jets that fly proper attack runs - descending onto the
 * target, releasing a stick of bombs, then climbing out the far side - and
 * gunships that work the line from behind their own front.
 *
 * A handful of individual meshes rather than instancing: the count is
 * small and each one needs its own animated rotor, banking and burner,
 * which is a poor fit for a single instanced draw.
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
    const burnerTex = buildBurnerTexture();

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
        opacity: 0.5,
      });

      // Bears sit on the left of the field and attack rightward.
      const dirX: 1 | -1 = side === 'bears' ? 1 : -1;

      for (let i = 0; i < opts.jetsPerSide; i++) {
        const group = new THREE.Group();
        const mesh = new THREE.Mesh(jetGeo, bodyMat);
        mesh.castShadow = true;
        // Exhaust plume behind the nozzles, brightest during a climb-out.
        const burner = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: burnerTex,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        );
        burner.position.set(-2.6, 0, 0);
        burner.scale.set(1.5, 0.9, 1);
        group.add(mesh, burner);
        scene.add(group);

        const jet: Jet = {
          group,
          burner,
          side,
          dirX,
          speed: 27,
          cruiseAltitude: 24,
          attackAltitude: 12,
          altitude: 24,
          laneZ: 0,
          weaveSeed: Math.random() * 100,
          phase: RunPhase.Cruise,
          stickLeft: 0,
          stickTimer: 0,
          lastY: 24,
          lastZ: 0,
        };
        this.jets.push(jet);
        // Stagger the starting positions so they don't fly in formation.
        this.respawnJet(jet, Math.random());
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

        const standoff = 12 + Math.random() * 14;
        const laneZ = (Math.random() - 0.5) * opts.fieldHalfDepth * 1.2;
        const altitude = 8 + Math.random() * 6;
        this.helis.push({
          group,
          rotor,
          tailRotor,
          side,
          facing: dirX,
          standoff,
          wantStandoff: standoff,
          laneZ,
          wantLaneZ: laneZ,
          altitude,
          wantAltitude: altitude,
          repositionTimer: Math.random() * 5,
          fireCooldown: Math.random(),
          bobSeed: Math.random() * 100,
        });
      }
    }
  }

  /** Put a jet back at its own edge of the map to start another run.
   * `progress` seeds how far into the run it starts (used once at setup). */
  private respawnJet(jet: Jet, progress = 0): void {
    const runway = this.opts.fieldHalfWidth + 40;
    jet.laneZ = (Math.random() - 0.5) * this.opts.fieldHalfDepth * 1.15;
    jet.cruiseAltitude = 22 + Math.random() * 10;
    jet.attackAltitude = 10 + Math.random() * 5;
    jet.altitude = jet.cruiseAltitude;
    jet.speed = 26 + Math.random() * 10;
    jet.phase = RunPhase.Cruise;
    jet.stickLeft = 0;
    jet.stickTimer = 0;
    jet.group.position.set(
      -jet.dirX * runway + jet.dirX * progress * runway * 2,
      jet.altitude,
      jet.laneZ,
    );
    jet.lastY = jet.altitude;
    jet.lastZ = jet.laneZ;
  }

  update(dt: number, frontlineX: number): void {
    this.time += dt;
    this.updateJets(dt, frontlineX);
    this.updateHelis(dt, frontlineX);
  }

  private updateJets(dt: number, frontlineX: number): void {
    const runway = this.opts.fieldHalfWidth + 40;

    for (const jet of this.jets) {
      const p = jet.group.position;
      p.x += jet.dirX * jet.speed * dt;

      // Distance to the boundary, signed so positive means "not there yet".
      const toLine = (frontlineX - p.x) * jet.dirX;

      // Attack profile: nose down on the way in, release across the line,
      // climb out once clear.
      switch (jet.phase) {
        case RunPhase.Cruise:
          if (toLine < 46) jet.phase = RunPhase.Dive;
          break;
        case RunPhase.Dive:
          if (toLine < 6) {
            jet.phase = RunPhase.Release;
            jet.stickLeft = 3 + Math.floor(Math.random() * 3);
            jet.stickTimer = 0;
          }
          break;
        case RunPhase.Release:
          if (jet.stickLeft <= 0) jet.phase = RunPhase.Egress;
          break;
        case RunPhase.Egress:
          break;
      }

      const wantAltitude =
        jet.phase === RunPhase.Cruise || jet.phase === RunPhase.Egress
          ? jet.cruiseAltitude
          : jet.attackAltitude;
      // Climbs harder than it dives, the way a jet pulling off a target does.
      const rate = jet.phase === RunPhase.Egress ? 1.6 : 0.9;
      jet.altitude = THREE.MathUtils.damp(jet.altitude, wantAltitude, rate, dt);

      // Gentle weave so the flight path doesn't read as a straight rail.
      const weave = Math.sin(this.time * 0.42 + jet.weaveSeed);
      p.z = jet.laneZ + weave * 8;
      p.y = jet.altitude + Math.sin(this.time * 0.6 + jet.weaveSeed) * 0.5;

      // Attitude comes from actual motion rather than a canned animation:
      // pitch from climb rate, bank from how hard it is turning.
      const climbRate = (p.y - jet.lastY) / Math.max(dt, 1e-4);
      const turnRate = (p.z - jet.lastZ) / Math.max(dt, 1e-4);
      jet.lastY = p.y;
      jet.lastZ = p.z;

      jet.group.rotation.set(0, jet.dirX === 1 ? 0 : Math.PI, 0);
      jet.group.rotation.z = THREE.MathUtils.clamp(climbRate * 0.055, -0.5, 0.5) * jet.dirX;
      jet.group.rotation.x = THREE.MathUtils.clamp(-turnRate * 0.05, -0.9, 0.9) * jet.dirX;

      // Burner flares on the climb out and idles down in the dive.
      const burnerMat = jet.burner.material as THREE.SpriteMaterial;
      const wantBurner = jet.phase === RunPhase.Egress ? 0.95 : 0.4;
      burnerMat.opacity = THREE.MathUtils.damp(burnerMat.opacity, wantBurner, 3, dt);
      jet.burner.scale.setScalar(1.1 + burnerMat.opacity * 1.3);

      // Release the stick one bomb at a time as the jet flies over.
      if (jet.stickLeft > 0) {
        jet.stickTimer -= dt;
        if (jet.stickTimer <= 0) {
          jet.stickTimer = 0.14;
          jet.stickLeft -= 1;
          // Released, not launched: it carries the jet's forward speed and
          // then falls, so the impact lands well ahead of the drop point.
          const lead = jet.speed * 0.9;
          const target = new THREE.Vector3(
            p.x + jet.dirX * lead,
            0.4,
            p.z + (Math.random() - 0.5) * 5,
          );
          this.combat.fireShell(p, target, 0xffb257, 0.6 + Math.random() * 0.5, 0, true);
        }
      }

      if (Math.abs(p.x) > runway) this.respawnJet(jet);
    }
  }

  private updateHelis(dt: number, frontlineX: number): void {
    const halfDepth = this.opts.fieldHalfDepth;

    for (const heli of this.helis) {
      heli.repositionTimer -= dt;
      if (heli.repositionTimer <= 0) {
        // Pick a fresh firing station: a new standoff, a new spot along the
        // line and a new height. Gunships reposition constantly rather than
        // sitting on one rail.
        heli.repositionTimer = 3.5 + Math.random() * 6;
        heli.wantStandoff = 8 + Math.random() * 20;
        heli.wantLaneZ = THREE.MathUtils.clamp(
          heli.laneZ + (Math.random() - 0.5) * 46,
          -halfDepth * 1.1,
          halfDepth * 1.1,
        );
        heli.wantAltitude = 7 + Math.random() * 9;
      }

      const prevZ = heli.laneZ;
      const prevAlt = heli.altitude;
      heli.standoff = THREE.MathUtils.damp(heli.standoff, heli.wantStandoff, 0.7, dt);
      heli.laneZ = THREE.MathUtils.damp(heli.laneZ, heli.wantLaneZ, 0.55, dt);
      heli.altitude = THREE.MathUtils.damp(heli.altitude, heli.wantAltitude, 0.8, dt);

      const p = heli.group.position;
      p.x = frontlineX - heli.facing * heli.standoff;
      p.z = heli.laneZ;
      p.y = heli.altitude + Math.sin(this.time * 1.2 + heli.bobSeed) * 0.35;

      // A helicopter tips into the direction it is travelling: nose down
      // when moving forward, rolled over when sliding sideways.
      const slideRate = (heli.laneZ - prevZ) / Math.max(dt, 1e-4);
      const climbRate = (heli.altitude - prevAlt) / Math.max(dt, 1e-4);
      heli.group.rotation.set(0, heli.facing === 1 ? 0 : Math.PI, 0);
      heli.group.rotation.z = THREE.MathUtils.clamp(-0.16 + climbRate * 0.05, -0.4, 0.25);
      heli.group.rotation.x = THREE.MathUtils.clamp(slideRate * 0.05, -0.45, 0.45) * heli.facing;

      heli.rotor.rotation.y += dt * 34;
      heli.tailRotor.rotation.y += dt * 46;

      heli.fireCooldown -= dt;
      if (heli.fireCooldown <= 0) {
        heli.fireCooldown = 0.16 + Math.random() * 0.3;
        const muzzle = new THREE.Vector3(p.x + heli.facing * 1.1, p.y - 0.5, p.z);
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
