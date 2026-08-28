import * as THREE from 'three';
import { buildApcGeometry, buildSoldierGeometry, buildTankGeometry } from './geometry';
import { CAMP_X, GROUND_HALF_DEPTH, terrainHeightAt } from './Battlefield';
import type { CampSide } from './Battlefield';
import type { Combat } from './Combat';
import type { Nametags } from './Nametags';

interface UnitSlot {
  active: boolean;
  /** Live world position; steered toward the tasked spot each frame. */
  posX: number;
  posZ: number;
  /** How far behind the frontline this unit wants to sit. */
  standoff: number;
  /** Where along the line it wants to stand. */
  laneZ: number;
  /** Seconds to wait before picking a new spot. */
  dwell: number;
  /** True once it has reached its fighting position at least once. */
  deployed: boolean;
  /** Facing, smoothed toward either the travel direction or the enemy. */
  yaw: number;
  seed: number;
  scale: number;
  fireCooldown: number;
  /** Chat handle riding this unit, if any. */
  label: string | null;
  /** What this unit is currently trying to do. */
  stance: Stance;
  /** Seconds left before it reconsiders its stance. */
  stanceTimer: number;
  /** Per-unit speed multiplier, so nobody moves in lockstep. */
  speedMul: number;
  /** Index into the army's squads, or -1 for a unit that fights alone. */
  squad: number;
  /** Post within the squad: how far back, and how far off to the side. */
  offX: number;
  offZ: number;
}

/** Unit classes, ordered light to heavy. */
const enum Kind {
  Infantry,
  Apc,
  Tank,
}

/**
 * What a unit is currently trying to do. Every unit cycles through these on
 * its own timer, which is what keeps the front churning: at any moment some
 * are pushing up to the boundary, some are holding, some are pulling back,
 * and none of them are doing it in step with each other.
 */
const enum Stance {
  /** Push right up to the boundary and fight at contact range. */
  Assault,
  /** Sit in the firing line a short way back. */
  Hold,
  /** Pull back and move around the rear of own territory. */
  Reserve,
}

/** Closest any unit will press to the line - just past the sandbags. */
const MIN_STANDOFF = 1.2;
/** Only units within this distance of the line have a shot worth taking. */
const FIRING_RANGE = 17;
/** How far back a unit may roam, as a fraction of the way to its own camp.
 * Kept below 1 so nobody wanders into the camp furniture. */
const ZONE_LIMIT = 0.86;
const LANE_SPREAD = GROUND_HALF_DEPTH * 1.7;
/** Units are drawn slightly larger than true scale: the camera has to hold
 * the whole field, and at true scale the fighting reads as coloured dust. */
const UNIT_SCALE = 1.45;
/** Close enough to a tasked spot to count as arrived. */
const ARRIVE_EPS = 0.6;

const TRACER_BEARS = 0xffb0a4;
const TRACER_BULLS = 0xaaffcf;

const INFANTRY_CAP = 110;
const APC_CAP = 20;
const TANK_CAP = 20;

/** Golden-ratio and silver-ratio strides. Stepping an index by an irrational
 * fraction spreads *any* prefix of the sequence evenly over [0,1), so a
 * half-strength army still forms a full-width line instead of bunching at
 * one end the way sequential slot allocation would. */
const PHI_STEP = 0.6180339887;
const RANK_STEP = 0.7548776662;

function frac(v: number): number {
  return v - Math.floor(v);
}

interface KindProfile {
  /** Ground speed in world units per second, before this unit's own jitter. */
  speed: number;
  /** Depth of this class's firing line behind the boundary. */
  rankDepth: number;
  /** Seconds to pause on arrival before moving again. Short on purpose -
   * long pauses are what made the front look like a diorama. */
  dwellMin: number;
  dwellMax: number;
  /** How far it will drift along the line in one move. */
  roam: number;
  /** Odds of picking each stance, in Assault / Hold / Reserve order. */
  stanceOdds: [number, number, number];
}

const PROFILES: Record<Kind, KindProfile> = {
  [Kind.Infantry]: {
    speed: 3.4, rankDepth: 12, dwellMin: 0.5, dwellMax: 2.6, roam: 11,
    stanceOdds: [0.42, 0.4, 0.18],
  },
  [Kind.Apc]: {
    speed: 7.4, rankDepth: 10, dwellMin: 0.6, dwellMax: 2.4, roam: 26,
    stanceOdds: [0.3, 0.3, 0.4],
  },
  [Kind.Tank]: {
    speed: 5.2, rankDepth: 9, dwellMin: 0.8, dwellMax: 3, roam: 19,
    stanceOdds: [0.34, 0.42, 0.24],
  },
};

/**
 * How many combined-arms groups each army fields. Units are handed out
 * round-robin, so every squad ends up with a mix of riflemen, an APC and
 * usually a tank rather than each class forming its own tidy rank.
 */
const SQUAD_COUNT = 16;
/** Share of units that fight alone instead of in a squad, so the gaps
 * between groups aren't completely empty. */
const LONE_WOLF_SHARE = 0.16;

/** A group that moves and fights together. Members hold a loose formation
 * around it, each at their own speed, so the group stretches and bunches
 * as it moves instead of sliding as one rigid block. */
interface Squad {
  stance: Stance;
  stanceTimer: number;
  standoff: number;
  laneZ: number;
}

/** Where each class sits inside its squad: riflemen up front, vehicles
 * supporting from behind and off to the flanks. */
const SQUAD_LAYOUT: Record<Kind, { depth: number; spread: number }> = {
  [Kind.Infantry]: { depth: 4.5, spread: 5.5 },
  [Kind.Apc]: { depth: 7, spread: 7 },
  [Kind.Tank]: { depth: 8.5, spread: 8 },
};

function makeSlots(n: number, campX: number, profile: KindProfile, kind: Kind): UnitSlot[] {
  const layout = SQUAD_LAYOUT[kind];
  return Array.from({ length: n }, (_, i) => {
    // Round-robin over squads, so activating the first N slots spreads
    // across every group instead of filling squad 0 to capacity first.
    const lone = frac(i * RANK_STEP + 0.11) < LONE_WOLF_SHARE;
    return {
      active: false,
      posX: campX,
      posZ: (frac(i * PHI_STEP) - 0.5) * LANE_SPREAD,
      standoff: MIN_STANDOFF + frac(i * RANK_STEP) * profile.rankDepth,
      laneZ: (frac(i * PHI_STEP) - 0.5) * LANE_SPREAD,
      dwell: Math.random() * 3,
      deployed: false,
      yaw: 0,
      seed: Math.random() * 1000,
      scale: 1,
      fireCooldown: Math.random() * 2,
      label: null,
      stance: Stance.Hold,
      stanceTimer: Math.random() * 6,
      speedMul: 0.78 + frac(i * PHI_STEP + 0.21) * 0.55,
      squad: lone ? -1 : i % SQUAD_COUNT,
      // Fixed post within the squad, so a group keeps a recognisable shape.
      offX: frac(i * PHI_STEP + 0.53) * layout.depth,
      offZ: (frac(i * RANK_STEP + 0.29) - 0.5) * 2 * layout.spread,
    };
  });
}

interface Formation {
  mesh: THREE.InstancedMesh;
  slots: UnitSlot[];
  kind: Kind;
  profile: KindProfile;
}

class SideArmy {
  private readonly formations: Formation[] = [];
  private readonly squads: Squad[] = [];
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
    readonly side: CampSide,
    color: number,
    private readonly tracerColor: number,
  ) {
    this.color = new THREE.Color(color);
    this.darkColor = this.color.clone().lerp(new THREE.Color(0x1a1a1a), 0.45);

    const specs: { kind: Kind; geo: THREE.BufferGeometry; cap: number; mat: THREE.Material }[] = [
      {
        kind: Kind.Infantry,
        geo: buildSoldierGeometry(),
        cap: INFANTRY_CAP,
        mat: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
      },
      {
        kind: Kind.Apc,
        geo: buildApcGeometry(),
        cap: APC_CAP,
        mat: new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.2 }),
      },
      {
        kind: Kind.Tank,
        geo: buildTankGeometry(),
        cap: TANK_CAP,
        mat: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.28 }),
      },
    ];

    for (const spec of specs) {
      const profile = PROFILES[spec.kind];
      const mesh = new THREE.InstancedMesh(spec.geo, spec.mat, spec.cap);
      mesh.castShadow = true;
      mesh.count = 0;
      mesh.frustumCulled = false;
      scene.add(mesh);
      this.formations.push({
        mesh,
        slots: makeSlots(spec.cap, campX, profile, spec.kind),
        kind: spec.kind,
        profile,
      });
    }

    // Squads start spread along the line, each on its own stance clock.
    for (let i = 0; i < SQUAD_COUNT; i++) {
      this.squads.push({
        stance: Stance.Hold,
        stanceTimer: Math.random() * 8,
        standoff: MIN_STANDOFF + Math.random() * 10,
        laneZ: (frac(i * PHI_STEP) - 0.5) * LANE_SPREAD,
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
        // Fresh units walk on from their own camp.
        slot.active = true;
        slot.deployed = false;
        slot.posX = this.campX;
        slot.posZ = slot.laneZ + (Math.random() - 0.5) * 6;
        slot.yaw = this.facing === 1 ? 0 : Math.PI;
        slot.dwell = 0;
        slot.fireCooldown = Math.random() * 1.5;
        // Head somewhere straight away rather than standing at the camp.
        this.rollStance(slot, formation.profile);
        slot.standoff = MIN_STANDOFF + Math.random() * formation.profile.rankDepth;
        activeCount++;
      } else if (activeCount > target && slot.active) {
        slot.active = false;
        slot.label = null;
        activeCount--;
      }
    }
  }

  /** Give a chat handle its own unit. Prefers infantry so the crowd of
   * named viewers reads as a crowd, and never displaces an existing name. */
  enlist(name: string): boolean {
    for (const formation of this.formations) {
      for (const slot of formation.slots) {
        if (slot.active && slot.label === null) {
          slot.label = name;
          return true;
        }
      }
    }
    return false;
  }

  /** Drop a handle from whichever unit is carrying it. */
  discharge(name: string): boolean {
    for (const formation of this.formations) {
      for (const slot of formation.slots) {
        if (slot.label === name) {
          slot.label = null;
          return true;
        }
      }
    }
    return false;
  }

  /** Kill up to `count` of the most-advanced active units (front line
   * casualties read better than random rear-guard losses). Returns the
   * position of the last one killed plus any chat handles that died. */
  killFrontUnits(count: number, frontlineX: number): { position: THREE.Vector3 | null; names: string[] } {
    const all: UnitSlot[] = [];
    for (const f of this.formations) for (const s of f.slots) if (s.active) all.push(s);
    // Most advanced = closest to the line.
    all.sort((a, b) => Math.abs(a.posX - frontlineX) - Math.abs(b.posX - frontlineX));

    let position: THREE.Vector3 | null = null;
    const names: string[] = [];
    for (let i = 0; i < Math.min(count, all.length); i++) {
      const slot = all[i];
      slot.active = false;
      if (slot.label) {
        names.push(slot.label);
        slot.label = null;
      }
      position = new THREE.Vector3(slot.posX, terrainHeightAt(slot.posX, slot.posZ) + 0.6, slot.posZ);
    }
    return { position, names };
  }

  activeCount(): number {
    let n = 0;
    for (const f of this.formations) for (const s of f.slots) if (s.active) n++;
    return n;
  }

  /** How many chat handles this army is carrying. Counted from the slots
   * themselves rather than from the label layer, which only learns about a
   * new handle on the next rendered frame. */
  namedCount(): number {
    let n = 0;
    for (const f of this.formations) for (const s of f.slots) if (s.label) n++;
    return n;
  }

  hasName(name: string): boolean {
    for (const f of this.formations) for (const s of f.slots) if (s.label === name) return true;
    return false;
  }

  update(dt: number, frontlineX: number, combat: Combat, nametags: Nametags | null): void {
    this.time += dt;
    this.updateSquads(dt, frontlineX);
    for (const formation of this.formations) {
      this.writeFormation(formation, dt, frontlineX, combat, nametags);
    }
  }

  /** Squads move as groups on their own clocks, which is what produces
   * clumps and gaps along the front rather than an evenly spaced rank. */
  private updateSquads(dt: number, frontlineX: number): void {
    const half = LANE_SPREAD / 2;
    for (const squad of this.squads) {
      squad.stanceTimer -= dt;
      if (squad.stanceTimer > 0) continue;

      const r = Math.random();
      if (r < 0.4) {
        squad.stance = Stance.Assault;
        squad.stanceTimer = 5 + Math.random() * 8;
        squad.standoff = MIN_STANDOFF + Math.random() * 3;
      } else if (r < 0.74) {
        squad.stance = Stance.Hold;
        squad.stanceTimer = 7 + Math.random() * 11;
        squad.standoff = 3 + Math.random() * 9;
      } else {
        squad.stance = Stance.Reserve;
        squad.stanceTimer = 6 + Math.random() * 10;
        const zone = Math.max(12, Math.abs(frontlineX - this.campX) * ZONE_LIMIT);
        squad.standoff = 12 + Math.random() * Math.max(5, zone - 12);
      }
      // Groups also slide along the front, so the gaps between them move.
      squad.laneZ = THREE.MathUtils.clamp(squad.laneZ + (Math.random() - 0.5) * 30, -half, half);
    }
  }

  /** Roll a new stance. Called on its own timer per unit, so pushes and
   * pull-backs happen independently rather than as a synchronised wave. */
  private rollStance(slot: UnitSlot, profile: KindProfile): void {
    const [assault, hold] = profile.stanceOdds;
    const r = Math.random();
    if (r < assault) {
      slot.stance = Stance.Assault;
      slot.stanceTimer = 3 + Math.random() * 6;
    } else if (r < assault + hold) {
      slot.stance = Stance.Hold;
      slot.stanceTimer = 5 + Math.random() * 9;
    } else {
      slot.stance = Stance.Reserve;
      slot.stanceTimer = 4 + Math.random() * 8;
    }
  }

  /** Pick the next spot to move to, given the current stance. */
  private retask(slot: UnitSlot, profile: KindProfile, frontlineX: number): void {
    switch (slot.stance) {
      case Stance.Assault:
        // Right up against the boundary.
        slot.standoff = MIN_STANDOFF + Math.random() * 3.5;
        break;
      case Stance.Hold:
        slot.standoff = 3 + Math.random() * profile.rankDepth;
        break;
      case Stance.Reserve: {
        // Anywhere between the firing line and (almost) its own camp. The
        // distance from line to camp shrinks as the enemy advances, so the
        // roaming zone tightens automatically when a side is losing ground.
        const zone = Math.max(profile.rankDepth, Math.abs(frontlineX - this.campX) * ZONE_LIMIT);
        slot.standoff = profile.rankDepth + Math.random() * Math.max(4, zone - profile.rankDepth);
        break;
      }
    }

    const roam = (Math.random() - 0.5) * 2 * profile.roam;
    const half = LANE_SPREAD / 2;
    slot.laneZ = THREE.MathUtils.clamp(slot.laneZ + roam, -half, half);
    slot.dwell = profile.dwellMin + Math.random() * (profile.dwellMax - profile.dwellMin);
  }

  private writeFormation(
    formation: Formation,
    dt: number,
    frontlineX: number,
    combat: Combat,
    nametags: Nametags | null,
  ): void {
    const { mesh, slots, kind, profile } = formation;
    const isVehicle = kind !== Kind.Infantry;
    const enemyYaw = this.facing === 1 ? 0 : Math.PI;
    let writeIndex = 0;

    for (const slot of slots) {
      // Shrink/pop out retired units smoothly instead of an instant vanish.
      const targetScale = slot.active ? 1 : 0;
      slot.scale = THREE.MathUtils.damp(slot.scale, targetScale, 6, dt);
      if (slot.scale < 0.02 && !slot.active) continue;

      let moving = false;

      if (slot.active) {
        let wantStandoff: number;
        let wantZ: number;

        if (slot.squad >= 0) {
          // Hold a post inside the squad. The squad's own clock decides
          // when the whole group pushes up or pulls back; each member
          // covers the ground at its own speed, so the group stretches out
          // on the move and bunches up again when it arrives.
          const squad = this.squads[slot.squad];
          wantStandoff = squad.standoff + slot.offX;
          wantZ = squad.laneZ + slot.offZ;
        } else {
          // Fighting alone: run the per-unit stance clock instead. It can
          // flip mid-move, so a lone unit may turn around and push forward
          // before it ever reaches the rear spot it set out for.
          slot.stanceTimer -= dt;
          if (slot.stanceTimer <= 0) {
            this.rollStance(slot, profile);
            this.retask(slot, profile, frontlineX);
          }
          wantStandoff = slot.standoff;
          wantZ = slot.laneZ;
        }

        // The tasked position is always measured back from the line, so the
        // whole army follows the front as it is pushed around.
        const wantX = frontlineX - this.facing * wantStandoff;
        const dx = wantX - slot.posX;
        const dz = wantZ - slot.posZ;
        const dist = Math.hypot(dx, dz);

        if (dist > ARRIVE_EPS) {
          const step = Math.min(dist, profile.speed * slot.speedMul * dt);
          slot.posX += (dx / dist) * step;
          slot.posZ += (dz / dist) * step;
          moving = true;
          // Face where it is going while it is going there.
          slot.yaw = this.approachAngle(slot.yaw, Math.atan2(dx, dz) - Math.PI / 2, dt * 3.2);
          if (!slot.deployed && Math.abs(slot.posX - wantX) < profile.rankDepth) {
            slot.deployed = true;
          }
        } else {
          // In position: face the enemy. A squad member then simply waits
          // for its group's next move; a lone unit runs its own dwell and
          // picks a fresh spot when it expires.
          slot.yaw = this.approachAngle(slot.yaw, enemyYaw, dt * 2.4);
          slot.deployed = true;
          if (slot.squad < 0) {
            slot.dwell -= dt;
            if (slot.dwell <= 0) this.retask(slot, profile, frontlineX);
          }
        }
      }

      const groundY = terrainHeightAt(slot.posX, slot.posZ);
      // Infantry bob as they jog; vehicles pitch gently over the ground.
      const bob = isVehicle
        ? Math.sin(this.time * 3 + slot.seed) * 0.02
        : moving
          ? Math.abs(Math.sin(this.time * 6 + slot.seed)) * 0.07
          : Math.sin(this.time * 2 + slot.seed) * 0.03;

      // Idle infantry shift their weight; a whole rank frozen looks dead.
      const sway = isVehicle || moving ? 0 : Math.sin(this.time * 1.1 + slot.seed) * 0.14;
      this.quat.setFromAxisAngle(this.upAxis, slot.yaw + sway);

      const s = slot.scale * UNIT_SCALE;
      this.position.set(slot.posX, groundY + bob, slot.posZ);
      this.scaleVec.set(s, s, s);
      this.matrix.compose(this.position, this.quat, this.scaleVec);
      mesh.setMatrixAt(writeIndex, this.matrix);
      this.instanceColor.copy(this.color).lerp(this.darkColor, ((Math.sin(slot.seed) + 1) / 2) * 0.4);
      mesh.setColorAt(writeIndex, this.instanceColor);
      writeIndex++;

      if (slot.label && nametags) {
        const lift = isVehicle ? 2.4 : 2.2;
        nametags.place(slot.label, this.side, slot.posX, groundY + lift, slot.posZ);
      }

      // Only deployed units close enough to the line have a shot worth
      // taking: a fresh wave visibly marches up before it joins the
      // firefight, and rear patrols move without firing at nothing.
      if (!slot.active || !slot.deployed) continue;
      if (Math.abs(slot.posX - frontlineX) > FIRING_RANGE) continue;
      slot.fireCooldown -= dt;
      if (slot.fireCooldown > 0) continue;

      if (kind === Kind.Tank) {
        slot.fireCooldown = 1.6 + Math.random() * 2.0;
        this.muzzle.set(slot.posX + this.facing * 1.9, groundY + 1.0, slot.posZ);
        this.aimAcross(frontlineX, slot.posZ, 7);
        combat.fireTracer(this.muzzle, this.target, this.tracerColor, true);
      } else if (kind === Kind.Apc) {
        // Cupola MG: short bursts rather than single aimed shots.
        slot.fireCooldown = 0.9 + Math.random() * 1.3;
        this.muzzle.set(slot.posX + this.facing * 1.0, groundY + 1.6, slot.posZ);
        this.aimAcross(frontlineX, slot.posZ, 10);
        combat.fireTracer(this.muzzle, this.target, this.tracerColor);
      } else {
        // Slower per rifle than a real weapon, but there are well over a
        // hundred of them per side - any faster and the tracers merge into
        // one solid sheet of light.
        slot.fireCooldown = 0.75 + Math.random() * 1.7;
        this.muzzle.set(slot.posX + this.facing * 0.75, groundY + 0.75, slot.posZ + 0.14);
        this.aimAcross(frontlineX, slot.posZ, 12);
        combat.fireTracer(this.muzzle, this.target, this.tracerColor);
      }
    }

    mesh.count = writeIndex;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  /** Rotate toward a heading the short way round, so a unit turning past
   * the +/-PI seam doesn't spin all the way around. */
  private approachAngle(current: number, want: number, rate: number): number {
    let delta = (want - current) % (Math.PI * 2);
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    return current + delta * Math.min(1, rate);
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

/** Two opposing instanced armies. Units walk out from their camp, take up
 * a position behind their own side of the line, and keep repositioning
 * along it - the line itself is driven by order-book pressure, so the whole
 * army advances or falls back with it. */
export class UnitArmies {
  private readonly bears: SideArmy;
  private readonly bulls: SideArmy;
  /** Handles waiting for a free unit, oldest first. */
  private readonly reserves: string[] = [];

  constructor(scene: THREE.Scene, private readonly combat: Combat, private readonly nametags: Nametags | null = null) {
    this.bears = new SideArmy(scene, -CAMP_X, 1, 'bears', 0xe0483f, TRACER_BEARS);
    this.bulls = new SideArmy(scene, CAMP_X, -1, 'bulls', 0x36c17a, TRACER_BULLS);
  }

  setDesiredTotal(side: CampSide, total: number): void {
    (side === 'bears' ? this.bears : this.bulls).setDesiredTotal(total);
    this.drainReserves();
  }

  /**
   * Put a chat handle on a unit. Sides are balanced by named headcount so
   * neither army ends up carrying the whole audience.
   */
  enlist(name: string): CampSide | null {
    const clean = name.trim().slice(0, 18);
    if (!clean) return null;
    // Already deployed - leave them where they are.
    if (this.bears.hasName(clean) || this.bulls.hasName(clean)) return null;

    // Send them to whichever army is carrying fewer handles right now.
    const first = this.bears.namedCount() <= this.bulls.namedCount() ? this.bears : this.bulls;
    const second = first === this.bears ? this.bulls : this.bears;

    if (first.enlist(clean)) return first.side;
    if (second.enlist(clean)) return second.side;

    // Every unit is spoken for; queue them for the next free slot.
    if (!this.reserves.includes(clean)) this.reserves.push(clean);
    while (this.reserves.length > 60) this.reserves.shift();
    return null;
  }

  private drainReserves(): void {
    while (this.reserves.length > 0) {
      const name = this.reserves[0];
      const placed = this.bears.enlist(name) || this.bulls.enlist(name);
      if (!placed) break;
      this.reserves.shift();
    }
  }

  /** Returns where the last casualty fell plus any chat handles lost. */
  killUnits(side: CampSide, count: number, frontlineX: number): { position: THREE.Vector3 | null; names: string[] } {
    const result = (side === 'bears' ? this.bears : this.bulls).killFrontUnits(count, frontlineX);
    for (const name of result.names) this.nametags?.remove(name);
    return result;
  }

  activeCount(side: CampSide): number {
    return (side === 'bears' ? this.bears : this.bulls).activeCount();
  }

  update(dt: number, frontlineX: number): void {
    this.nametags?.beginFrame();
    this.bears.update(dt, frontlineX, this.combat, this.nametags);
    this.bulls.update(dt, frontlineX, this.combat, this.nametags);
    this.nametags?.endFrame();
  }
}
