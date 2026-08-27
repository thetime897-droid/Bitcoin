import * as THREE from 'three';
import { buildSoldierGeometry, buildTankGeometry } from './geometry';
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

const ADVANCE_SPEED = 0.16;
/** Units are drawn slightly larger than true scale: the camera has to hold
 * the whole field, and at true scale the fighting reads as coloured dust. */
const UNIT_SCALE = 1.45;
/** How far behind the frontline each side digs in. */
const STANDOFF = 4.5;
const LANE_SPREAD = GROUND_HALF_DEPTH * 1.5;

const TRACER_BEARS = 0xffb0a4;
const TRACER_BULLS = 0xaaffcf;

function makeSlots(n: number, rankDepth: number): UnitSlot[] {
  return Array.from({ length: n }, () => ({
    active: false,
    advance: 0,
    laneZ: (Math.random() - 0.5) * LANE_SPREAD,
    rank: Math.random() * rankDepth,
    seed: Math.random() * 1000,
    scale: 1,
    fireCooldown: Math.random() * 2,
  }));
}

class SideArmy {
  private readonly soldiers: THREE.InstancedMesh;
  private readonly tanks: THREE.InstancedMesh;
  private readonly soldierSlots: UnitSlot[];
  private readonly tankSlots: UnitSlot[];
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly upAxis = new THREE.Vector3(0, 1, 0);
  private readonly color: THREE.Color;
  private readonly darkColor: THREE.Color;
  private readonly muzzle = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly tracerColor: number;
  private time = 0;

  constructor(
    scene: THREE.Scene,
    private readonly campX: number,
    /** +1 when the enemy lies at higher X. */
    private readonly facing: 1 | -1,
    color: number,
    tracerColor: number,
    soldierCap: number,
    tankCap: number,
  ) {
    this.color = new THREE.Color(color);
    this.darkColor = this.color.clone().lerp(new THREE.Color(0x1a1a1a), 0.45);
    this.tracerColor = tracerColor;

    const soldierMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    const tankMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.25 });
    this.soldiers = new THREE.InstancedMesh(buildSoldierGeometry(), soldierMat, soldierCap);
    this.tanks = new THREE.InstancedMesh(buildTankGeometry(), tankMat, tankCap);
    this.soldiers.castShadow = true;
    this.tanks.castShadow = true;
    this.soldiers.count = 0;
    this.tanks.count = 0;
    this.soldiers.frustumCulled = false;
    this.tanks.frustumCulled = false;
    scene.add(this.soldiers, this.tanks);

    this.soldierSlots = makeSlots(soldierCap, 9);
    this.tankSlots = makeSlots(tankCap, 6);
  }

  setDesiredTotal(total: number, tankRatio: number): void {
    const tankTarget = Math.min(this.tankSlots.length, Math.round(total * tankRatio));
    const soldierTarget = Math.min(this.soldierSlots.length, Math.max(0, total - tankTarget));
    this.setDesired(this.soldierSlots, soldierTarget, 9);
    this.setDesired(this.tankSlots, tankTarget, 6);
  }

  private setDesired(slots: UnitSlot[], target: number, rankDepth: number): void {
    let activeCount = slots.filter((s) => s.active).length;
    for (const slot of slots) {
      if (activeCount === target) break;
      if (activeCount < target && !slot.active) {
        slot.active = true;
        slot.advance = 0;
        slot.laneZ = (Math.random() - 0.5) * LANE_SPREAD;
        slot.rank = Math.random() * rankDepth;
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
    const all = [...this.soldierSlots, ...this.tankSlots].filter((s) => s.active);
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
    return this.soldierSlots.filter((s) => s.active).length + this.tankSlots.filter((s) => s.active).length;
  }

  update(dt: number, frontlineX: number, combat: Combat): void {
    this.time += dt;
    this.writeInstances(this.soldiers, this.soldierSlots, dt, frontlineX, combat, 0);
    this.writeInstances(this.tanks, this.tankSlots, dt, frontlineX, combat, 1);
  }

  private writeInstances(
    mesh: THREE.InstancedMesh,
    slots: UnitSlot[],
    dt: number,
    frontlineX: number,
    combat: Combat,
    kind: 0 | 1,
  ): void {
    const isTank = kind === 1;
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
      const bob = marching
        ? Math.abs(Math.sin(this.time * 6 + slot.seed)) * 0.07
        : Math.sin(this.time * 2 + slot.seed) * 0.03;

      // Everything faces the enemy; infantry sways a little while dug in.
      const yaw = this.facing === 1 ? 0 : Math.PI;
      const sway = isTank ? 0 : Math.sin(this.time * 1.4 + slot.seed) * 0.12;
      this.quat.setFromAxisAngle(this.upAxis, yaw + sway);
      const s = slot.scale * UNIT_SCALE;
      this.matrix.compose(new THREE.Vector3(x, groundY + bob, z), this.quat, new THREE.Vector3(s, s, s));
      mesh.setMatrixAt(writeIndex, this.matrix);
      const jitter = (Math.sin(slot.seed) + 1) / 2;
      mesh.setColorAt(writeIndex, this.color.clone().lerp(this.darkColor, jitter * 0.4));
      writeIndex++;

      // Only units that have reached the line open fire, so a fresh wave
      // visibly marches up before it joins the firefight.
      if (!slot.active || marching) continue;
      slot.fireCooldown -= dt;
      if (slot.fireCooldown > 0) continue;
      slot.fireCooldown = isTank ? 1.7 + Math.random() * 2.2 : 0.5 + Math.random() * 1.5;

      const muzzleForward = isTank ? 1.35 : 0.75;
      this.muzzle.set(x + this.facing * muzzleForward, groundY + (isTank ? 0.72 : 0.75), z + (isTank ? 0 : 0.14));
      // Aim into the enemy ranks just across the line, with spread so the
      // volley looks like many shooters rather than one synchronized beam.
      this.target.set(
        frontlineX + this.facing * (3 + Math.random() * 13),
        0.5 + Math.random() * 1.3,
        z + (Math.random() - 0.5) * (isTank ? 7 : 12),
      );
      combat.fireTracer(this.muzzle, this.target, this.tracerColor, isTank);
    }

    mesh.count = writeIndex;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

/** Two opposing instanced armies that march from their camp to the
 * frontline, dig in facing each other and trade fire across it, growing and
 * shrinking with order-book depth. */
export class UnitArmies {
  private readonly bears: SideArmy;
  private readonly bulls: SideArmy;

  constructor(scene: THREE.Scene, bearsX: number, bullsX: number, private readonly combat: Combat) {
    this.bears = new SideArmy(scene, bearsX, 1, 0xe0483f, TRACER_BEARS, 34, 12);
    this.bulls = new SideArmy(scene, bullsX, -1, 0x36c17a, TRACER_BULLS, 34, 12);
  }

  setDesiredTotal(side: CampSide, total: number, tankRatio = 0.25): void {
    (side === 'bears' ? this.bears : this.bulls).setDesiredTotal(total, tankRatio);
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
