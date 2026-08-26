import * as THREE from 'three';
import { buildSoldierGeometry, buildTankGeometry } from './geometry';
import type { CampSide } from './Battlefield';

interface UnitSlot {
  active: boolean;
  advance: number; // 0 = at camp, 1 = at frontline
  laneX: number;
  laneZ: number;
  seed: number;
  scale: number;
}

const ADVANCE_SPEED = 0.18;
const FRONT_Z = -12;

function makeSlots(n: number): UnitSlot[] {
  return Array.from({ length: n }, () => ({
    active: false,
    advance: 0,
    laneX: (Math.random() - 0.5) * 14,
    laneZ: (Math.random() - 0.5) * 14,
    seed: Math.random() * 1000,
    scale: 1,
  }));
}

class SideArmy {
  readonly soldiers: THREE.InstancedMesh;
  readonly tanks: THREE.InstancedMesh;
  private readonly soldierSlots: UnitSlot[];
  private readonly tankSlots: UnitSlot[];
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly upAxis = new THREE.Vector3(0, 1, 0);
  private readonly color: THREE.Color;
  private readonly darkColor: THREE.Color;
  private time = 0;

  constructor(
    scene: THREE.Scene,
    private readonly campX: number,
    private readonly facing: 1 | -1,
    color: number,
    soldierCap: number,
    tankCap: number,
  ) {
    this.color = new THREE.Color(color);
    this.darkColor = this.color.clone().lerp(new THREE.Color(0x1a1a1a), 0.45);

    const soldierMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    const tankMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2 });
    this.soldiers = new THREE.InstancedMesh(buildSoldierGeometry(), soldierMat, soldierCap);
    this.tanks = new THREE.InstancedMesh(buildTankGeometry(), tankMat, tankCap);
    this.soldiers.castShadow = true;
    this.tanks.castShadow = true;
    this.soldiers.count = 0;
    this.tanks.count = 0;
    scene.add(this.soldiers, this.tanks);

    this.soldierSlots = makeSlots(soldierCap);
    this.tankSlots = makeSlots(tankCap);
  }

  setDesiredTotal(total: number, tankRatio: number): void {
    const tankTarget = Math.min(this.tankSlots.length, Math.round(total * tankRatio));
    const soldierTarget = Math.min(this.soldierSlots.length, Math.max(0, total - tankTarget));
    this.setDesired(this.soldierSlots, soldierTarget);
    this.setDesired(this.tankSlots, tankTarget);
  }

  private setDesired(slots: UnitSlot[], target: number): void {
    let activeCount = slots.filter((s) => s.active).length;
    for (const slot of slots) {
      if (activeCount === target) break;
      if (activeCount < target && !slot.active) {
        slot.active = true;
        slot.advance = 0;
        slot.laneX = (Math.random() - 0.5) * 14;
        slot.laneZ = (Math.random() - 0.5) * 14;
        activeCount++;
      } else if (activeCount > target && slot.active) {
        slot.active = false;
        activeCount--;
      }
    }
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
      const x = THREE.MathUtils.lerp(this.campX + slot.laneX, frontlineX + slot.laneX * 0.4, this.eased(slot.advance));
      const z = THREE.MathUtils.lerp(slot.laneZ, FRONT_Z + slot.laneZ * 0.5, this.eased(slot.advance));
      last = new THREE.Vector3(x, 0.6, z);
    }
    return last;
  }

  activeCount(): number {
    return this.soldierSlots.filter((s) => s.active).length + this.tankSlots.filter((s) => s.active).length;
  }

  private eased(t: number): number {
    return t * t * (3 - 2 * t);
  }

  update(dt: number, frontlineX: number): void {
    this.time += dt;
    this.writeInstances(this.soldiers, this.soldierSlots, dt, frontlineX, 0);
    this.writeInstances(this.tanks, this.tankSlots, dt, frontlineX, 1);
  }

  private writeInstances(mesh: THREE.InstancedMesh, slots: UnitSlot[], dt: number, frontlineX: number, kind: 0 | 1): void {
    let writeIndex = 0;
    for (const slot of slots) {
      // Shrink/pop out retired units smoothly instead of an instant vanish.
      const targetScale = slot.active ? 1 : 0;
      slot.scale = THREE.MathUtils.damp(slot.scale, targetScale, 6, dt);
      if (slot.active && slot.advance < 1) {
        slot.advance = Math.min(1, slot.advance + dt * ADVANCE_SPEED);
      }
      if (slot.scale < 0.02 && !slot.active) continue;

      const e = this.eased(slot.advance);
      const x = THREE.MathUtils.lerp(this.campX + slot.laneX, frontlineX + slot.laneX * 0.4, e);
      const z = THREE.MathUtils.lerp(slot.laneZ, FRONT_Z + slot.laneZ * 0.5, e);
      const bob = slot.advance >= 1 ? Math.sin(this.time * 2 + slot.seed) * 0.03 : Math.abs(Math.sin(this.time * 6 + slot.seed)) * 0.06;
      const yaw = this.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
      this.quat.setFromAxisAngle(this.upAxis, yaw + (kind === 0 ? Math.sin(this.time * 1.5 + slot.seed) * 0.15 : 0));
      this.matrix.compose(
        new THREE.Vector3(x, bob, z),
        this.quat,
        new THREE.Vector3(slot.scale, slot.scale, slot.scale),
      );
      mesh.setMatrixAt(writeIndex, this.matrix);
      const jitter = (Math.sin(slot.seed) + 1) / 2;
      mesh.setColorAt(writeIndex, this.color.clone().lerp(this.darkColor, jitter * 0.4));
      writeIndex++;
    }
    mesh.count = writeIndex;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

/** Two opposing instanced armies that march from their camp toward the
 * frontline and hold position there, growing/shrinking with order-book
 * depth and thinning out when their side gets liquidated. */
export class UnitArmies {
  private readonly bears: SideArmy;
  private readonly bulls: SideArmy;

  constructor(scene: THREE.Scene, bearsX: number, bullsX: number) {
    this.bears = new SideArmy(scene, bearsX, 1, 0xe0483f, 28, 10);
    this.bulls = new SideArmy(scene, bullsX, -1, 0x36c17a, 28, 10);
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
    this.bears.update(dt, frontlineX);
    this.bulls.update(dt, frontlineX);
  }
}
