import * as THREE from 'three';
import { buildApcGeometry, buildSoldierGeometry, buildTankGeometry } from './geometry';
import { GROUND_HALF_DEPTH, terrainHeightAt } from './Battlefield';
import type { CampSide } from './Battlefield';
import type { Combat } from './Combat';

interface UnitSlot {
  active: boolean;
  /** 0 = still at camp, 1 = dug in at the frontline. */
  advance: number;
  /** Position along the line (world Z), held while advancing. */
  laneZ: number;
  /** Extra depth behind the line so units don't stack in one row. */
  rank: number;
  seed: number;
  scale: number;
  fireCooldown: number;
}

/** Unit classes, ordered light to heavy. */
const enum Kind {
  Infantry,
  Apc,
  Tank,
}

const ADVANCE_SPEED = 0.16;
/** How far behind the frontline each side digs in. */
const STANDOFF = 4.5;
const LANE_SPREAD = GROUND_HALF_DEPTH * 1.7;
/** Units are drawn slightly larger than true scale: the camera has to hold
 * the whole field, and at true scale the fighting reads as coloured dust. */
const UNIT_SCALE = 1.45;

const TRACER_BEARS = 0xffb0a4;
const TRACER_BULLS = 0xaaffcf;

const INFANTRY_CAP = 72;
const APC_CAP = 16;
const TANK_CAP = 18;

/** Golden-ratio and silver-ratio strides. Stepping an index by an irrational
 * fraction spreads *any* prefix of the sequence evenly over [0,1), so a
 * half-strength army still forms a full-width line instead of bunching at
 * one end the way sequential slot allocation would. */
const PHI_STEP = 0.6180339887;
const RANK_STEP = 0.7548776662;

function frac(v: number): number {
  return v - Math.floor(v);
}

function makeSlots(n: number, rankDepth: number): UnitSlot[] {
  return Array.from({ length: n }, (_, i) => ({
    active: false,
    advance: 0,
    laneZ: (frac(i * PHI_STEP) - 0.5) * LANE_SPREAD,
    rank: frac(i * RANK_STEP) * rankDepth,
    seed: Math.random() * 1000,
    scale: 1,
    fireCooldown: Math.random() * 2,
  }));
}

interface Formation {
  mesh: THREE.InstancedMesh;
  slots: UnitSlot[];
  kind: Kind;
  rankDepth: number;
}

class SideArmy {
  private readonly formations: Formation[] = [];
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly upAxis = new THREE.Vector3(0, 1, 0);
  private readonly instanceColor = new THREE.Color();
  private readonly color: THREE.Color;
  private readonly darkColor: THREE.Color;
  private readonly muzzle = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly position = new THREE.Vector3();
  private readonly scaleVec = new THREE.Vector3();
  private time = 0;

  constructor(
    scene: THREE.Scene,
    private readonly campX: number,
    /** +1 when the enemy lies at higher X. */
    private readonly facing: 1 | -1,
    color: number,
    private readonly tracerColor: number,
  ) {
    this.color = new THREE.Color(color);
    this.darkColor = this.color.clone().lerp(new THREE.Color(0x1a1a1a), 0.45);

    const specs: { kind: Kind; geo: THREE.BufferGeometry; cap: number; rankDepth: number; mat: THREE.Material }[] = [
      {
        kind: Kind.Infantry,
        geo: buildSoldierGeometry(),
        cap: INFANTRY_CAP,
        rankDepth: 11,
        mat: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
      },
      {
        kind: Kind.Apc,
        geo: buildApcGeometry(),
        cap: APC_CAP,
        rankDepth: 8,
        mat: new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.2 }),
      },
      {
        kind: Kind.Tank,
        geo: buildTankGeometry(),
        cap: TANK_CAP,
        rankDepth: 6,
        mat: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.28 }),
      },
    ];

    for (const spec of specs) {
      const mesh = new THREE.InstancedMesh(spec.geo, spec.mat, spec.cap);
      mesh.castShadow = true;
      mesh.count = 0;
      mesh.frustumCulled = false;
      scene.add(mesh);
      this.formations.push({
        mesh,
        slots: makeSlots(spec.cap, spec.rankDepth),
        kind: spec.kind,
        rankDepth: spec.rankDepth,
      });
    }
  }

  /** Split the requested strength across infantry, APCs and armour. */
  setDesiredTotal(total: number): void {
    const tanks = Math.min(TANK_CAP, Math.round(total * 0.14));
    const apcs = Math.min(APC_CAP, Math.round(total * 0.12));
    const infantry = Math.min(INFANTRY_CAP, Math.max(0, total - tanks - apcs));
    const targets = [infantry, apcs, tanks];
    for (let i = 0; i < this.formations.length; i++) {
      this.setDesired(this.formations[i], targets[i]);
    }
  }

  private setDesired(formation: Formation, target: number): void {
    let activeCount = 0;
    for (const s of formation.slots) if (s.active) activeCount++;

    for (const slot of formation.slots) {
      if (activeCount === target) break;
      if (activeCount < target && !slot.active) {
        slot.active = true;
        slot.advance = 0;
        slot.fireCooldown = Math.random() * 1.5;
        activeCount++;
      } else if (activeCount > target && slot.active) {
        slot.active = false;
        activeCount--;
      }
    }
  }

  private eased(t: number): number {
    return t * t * (3 - 2 * t);
  }

  /** World X for a unit at its current advance progress. */
  private slotX(slot: UnitSlot, frontlineX: number): number {
    const dugIn = frontlineX - this.facing * (STANDOFF + slot.rank);
    return THREE.MathUtils.lerp(this.campX, dugIn, this.eased(slot.advance));
  }

  /** Kill up to `count` of the most-advanced active units (front line
   * casualties read better than random rear-guard losses). Returns the
   * world position of the last unit killed, for spawning an explosion. */
  killFrontUnits(count: number, frontlineX: number): THREE.Vector3 | null {
    const all: UnitSlot[] = [];
    for (const f of this.formations) for (const s of f.slots) if (s.active) all.push(s);
    all.sort((a, b) => b.advance - a.advance);
    let last: THREE.Vector3 | null = null;
    for (let i = 0; i < Math.min(count, all.length); i++) {
      const slot = all[i];
      slot.active = false;
      const x = this.slotX(slot, frontlineX);
      last = new THREE.Vector3(x, terrainHeightAt(x, slot.laneZ) + 0.6, slot.laneZ);
    }
    return last;
  }

  activeCount(): number {
    let n = 0;
    for (const f of this.formations) for (const s of f.slots) if (s.active) n++;
    return n;
  }

  update(dt: number, frontlineX: number, combat: Combat): void {
    this.time += dt;
    for (const formation of this.formations) {
      this.writeFormation(formation, dt, frontlineX, combat);
    }
  }

  private writeFormation(formation: Formation, dt: number, frontlineX: number, combat: Combat): void {
    const { mesh, slots, kind } = formation;
    const isVehicle = kind !== Kind.Infantry;
    let writeIndex = 0;

    for (const slot of slots) {
      // Shrink/pop out retired units smoothly instead of an instant vanish.
      const targetScale = slot.active ? 1 : 0;
      slot.scale = THREE.MathUtils.damp(slot.scale, targetScale, 6, dt);
      if (slot.active && slot.advance < 1) {
        slot.advance = Math.min(1, slot.advance + dt * ADVANCE_SPEED);
      }
      if (slot.scale < 0.02 && !slot.active) continue;

      const x = this.slotX(slot, frontlineX);
      const z = slot.laneZ;
      const groundY = terrainHeightAt(x, z);
      const marching = slot.advance < 1;

      // Infantry bob as they jog; vehicles pitch gently over the ground.
      const bob = isVehicle
        ? Math.sin(this.time * 3 + slot.seed) * 0.02
        : marching
          ? Math.abs(Math.sin(this.time * 6 + slot.seed)) * 0.07
          : Math.sin(this.time * 2 + slot.seed) * 0.03;

      const yaw = this.facing === 1 ? 0 : Math.PI;
      const sway = isVehicle ? 0 : Math.sin(this.time * 1.4 + slot.seed) * 0.12;
      this.quat.setFromAxisAngle(this.upAxis, yaw + sway);
      const s = slot.scale * UNIT_SCALE;
      this.position.set(x, groundY + bob, z);
      this.scaleVec.set(s, s, s);
      this.matrix.compose(this.position, this.quat, this.scaleVec);
      mesh.setMatrixAt(writeIndex, this.matrix);
      this.instanceColor.copy(this.color).lerp(this.darkColor, ((Math.sin(slot.seed) + 1) / 2) * 0.4);
      mesh.setColorAt(writeIndex, this.instanceColor);
      writeIndex++;

      // Only units that have reached the line open fire, so a fresh wave
      // visibly marches up before it joins the firefight.
      if (!slot.active || marching) continue;
      slot.fireCooldown -= dt;
      if (slot.fireCooldown > 0) continue;

      if (kind === Kind.Tank) {
        slot.fireCooldown = 1.6 + Math.random() * 2.0;
        this.muzzle.set(x + this.facing * 1.9, groundY + 1.0, z);
        this.aimAcross(frontlineX, z, 7);
        combat.fireTracer(this.muzzle, this.target, this.tracerColor, true);
      } else if (kind === Kind.Apc) {
        // Cupola MG: short bursts rather than single aimed shots.
        slot.fireCooldown = 0.9 + Math.random() * 1.3;
        this.muzzle.set(x + this.facing * 1.0, groundY + 1.6, z);
        this.aimAcross(frontlineX, z, 10);
        combat.fireTracer(this.muzzle, this.target, this.tracerColor);
      } else {
        slot.fireCooldown = 0.42 + Math.random() * 1.15;
        this.muzzle.set(x + this.facing * 0.75, groundY + 0.75, z + 0.14);
        this.aimAcross(frontlineX, z, 12);
        combat.fireTracer(this.muzzle, this.target, this.tracerColor);
      }
    }

    mesh.count = writeIndex;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  /** Aim into the enemy ranks just across the line, with spread so a volley
   * looks like many shooters rather than one synchronized beam. */
  private aimAcross(frontlineX: number, laneZ: number, zSpread: number): void {
    this.target.set(
      frontlineX + this.facing * (3 + Math.random() * 13),
      0.5 + Math.random() * 1.3,
      laneZ + (Math.random() - 0.5) * zSpread,
    );
  }
}

/** Two opposing instanced armies that march from their camp to the
 * frontline, dig in facing each other and trade fire across it, growing and
 * shrinking with order-book depth. */
export class UnitArmies {
  private readonly bears: SideArmy;
  private readonly bulls: SideArmy;

  constructor(scene: THREE.Scene, bearsX: number, bullsX: number, private readonly combat: Combat) {
    this.bears = new SideArmy(scene, bearsX, 1, 0xe0483f, TRACER_BEARS);
    this.bulls = new SideArmy(scene, bullsX, -1, 0x36c17a, TRACER_BULLS);
  }

  setDesiredTotal(side: CampSide, total: number): void {
    (side === 'bears' ? this.bears : this.bulls).setDesiredTotal(total);
  }

  killUnits(side: CampSide, count: number, frontlineX: number): THREE.Vector3 | null {
    return (side === 'bears' ? this.bears : this.bulls).killFrontUnits(count, frontlineX);
  }

  activeCount(side: CampSide): number {
    return (side === 'bears' ? this.bears : this.bulls).activeCount();
  }

  update(dt: number, frontlineX: number): void {
    this.bears.update(dt, frontlineX, this.combat);
    this.bulls.update(dt, frontlineX, this.combat);
  }
}
