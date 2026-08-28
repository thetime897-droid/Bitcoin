import * as THREE from 'three';
import { buildCannonGeometry } from './geometry';
import { BEARS_HEX, BULLS_HEX, CAMP_X, terrainHeightAt } from './Battlefield';
import type { CampSide } from './Battlefield';
import type { Combat } from './Combat';

interface Gun {
  group: THREE.Group;
  side: CampSide;
  /** +1 when the enemy lies at higher X. */
  facing: 1 | -1;
  restX: number;
  laneZ: number;
  /** Trench guns fire flat and fast; rear guns lob high and slow. */
  forward: boolean;
  cooldown: number;
  /** Seconds left in the recoil-and-return animation, 0 when settled. */
  recoil: number;
}

/** Guns dug in behind the camp, lobbing over their own lines. */
const REAR_GUNS_PER_SIDE = 3;
/** Guns in the forward trench in front of the tower, firing direct. */
const TRENCH_GUNS_PER_SIDE = 3;
const RECOIL_TIME = 0.42;
const SHELL_COLOR = 0xffcf7a;

/**
 * Artillery lined up behind each camp. The guns lob shells over their own
 * infantry onto the far side of the frontline, kicking off a real explosion
 * where each one lands - the loudest visual cue that the two sides are
 * actually fighting rather than just standing there.
 */
export class Emplacements {
  private readonly guns: Gun[] = [];

  constructor(scene: THREE.Scene, private readonly combat: Combat) {
    const geo = buildCannonGeometry();

    for (const side of ['bears', 'bulls'] as CampSide[]) {
      const isBears = side === 'bears';
      const facing: 1 | -1 = isBears ? 1 : -1;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(isBears ? BEARS_HEX : BULLS_HEX).lerp(new THREE.Color(0x2a2a2a), 0.55),
        roughness: 0.7,
        metalness: 0.3,
      });

      const campX = isBears ? -CAMP_X : CAMP_X;
      // Two batteries: one dug in behind the camp lobbing over its own
      // lines, one in the forward trench in front of the tower firing
      // direct at whatever is coming across the line.
      const positions: { laneZ: number; restX: number; forward: boolean }[] = [];
      for (let i = 0; i < REAR_GUNS_PER_SIDE; i++) {
        positions.push({ laneZ: -22 + i * 22, restX: campX - facing * 7, forward: false });
      }
      for (let i = 0; i < TRENCH_GUNS_PER_SIDE; i++) {
        // Sitting on the trench line, which the camp builds at local x=11.
        positions.push({ laneZ: -13 + i * 13, restX: campX + facing * 11, forward: true });
      }

      for (const { laneZ, restX, forward } of positions) {
        const group = new THREE.Group();
        const gun = new THREE.Mesh(geo, mat);
        gun.castShadow = true;
        gun.receiveShadow = true;
        // Local +X is the muzzle direction, so the bulls' guns turn around.
        gun.rotation.y = facing === 1 ? 0 : Math.PI;
        group.add(gun);

        // Sandbag revetment around the gun pit.
        const bagMat = new THREE.MeshStandardMaterial({ color: 0x7d7256, roughness: 1 });
        const bags = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.4, 1.3), bagMat, 6);
        bags.castShadow = true;
        const m = new THREE.Matrix4();
        for (let b = 0; b < 6; b++) {
          const t = (b / 5 - 0.5) * 4.4;
          m.makeTranslation(-facing * 2.4, 0.2, t);
          bags.setMatrixAt(b, m);
        }
        group.add(bags);

        group.position.set(restX, terrainHeightAt(restX, laneZ), laneZ);
        scene.add(group);

        this.guns.push({
          group,
          side,
          facing,
          restX,
          laneZ,
          forward,
          // Trench guns are in direct contact and fire noticeably faster
          // than the rear battery lobbing shells over the camp.
          cooldown: (forward ? 1 : 1.5) + Math.random() * 5,
          recoil: 0,
        });
      }
    }
  }

  update(dt: number, frontlineX: number): void {
    for (const gun of this.guns) {
      if (gun.recoil > 0) {
        gun.recoil = Math.max(0, gun.recoil - dt);
        // Snap back on firing, then ease forward to the resting position.
        const settled = 1 - gun.recoil / RECOIL_TIME;
        gun.group.position.x = gun.restX - gun.facing * 1.5 * (1 - settled * settled);
      }

      gun.cooldown -= dt;
      if (gun.cooldown > 0) continue;
      gun.cooldown = (gun.forward ? 2 : 3.5) + Math.random() * (gun.forward ? 3.5 : 6);
      gun.recoil = RECOIL_TIME;

      const muzzle = new THREE.Vector3(
        gun.group.position.x + gun.facing * 2.4,
        gun.group.position.y + 1.5,
        gun.laneZ,
      );
      // Drop rounds well beyond the line, into enemy-held ground. The
      // forward guns shoot flatter and land closer, since they are firing
      // directly at whatever is pressing the boundary.
      const reach = gun.forward ? 4 + Math.random() * 18 : 8 + Math.random() * 26;
      const target = new THREE.Vector3(
        frontlineX + gun.facing * reach,
        0.4,
        gun.laneZ + (Math.random() - 0.5) * 26,
      );
      this.combat.fireShell(
        muzzle,
        target,
        SHELL_COLOR,
        0.5 + Math.random() * 0.45,
        gun.forward ? 7 : 20,
      );
      this.combat.flash(muzzle, gun.forward ? 2.6 : 3.2);
    }
  }
}
