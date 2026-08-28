import * as THREE from 'three';

export type ImpactHandler = (position: THREE.Vector3, color: number, magnitude: number) => void;

interface Projectile {
  active: boolean;
  readonly from: THREE.Vector3;
  readonly to: THREE.Vector3;
  t: number;
  speed: number;
  arc: number;
  readonly color: THREE.Color;
  length: number;
  thickness: number;
  /** Explosion magnitude on landing; 0 = no detonation. */
  impact: number;
  /** Sprite size for a cheap spark on landing; 0 = none. */
  endFlash: number;
  /** True for something released rather than launched. Horizontal travel
   * stays linear while the drop accelerates, which is what a free-falling
   * bomb actually does - a symmetric arc reads as a lobbed shell. */
  fallCurve: boolean;
}

interface Flash {
  active: boolean;
  life: number;
  maxLife: number;
  sprite: THREE.Sprite;
}

const TRACER_SLOTS = 320;
const SHELL_SLOTS = 90;
const FLASH_SLOTS = 90;

const X_AXIS = new THREE.Vector3(1, 0, 0);

function buildFlashTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,236,170,0.95)');
  grad.addColorStop(0.6, 'rgba(255,150,40,0.45)');
  grad.addColorStop(1, 'rgba(255,90,10,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function makeSlots(n: number): Projectile[] {
  return Array.from({ length: n }, () => ({
    active: false,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    t: 0,
    speed: 1,
    arc: 0,
    color: new THREE.Color(),
    length: 1,
    thickness: 1,
    impact: 0,
    endFlash: 0,
    fallCurve: false,
  }));
}

/**
 * All the things that fly across the battlefield: rifle/tank tracers,
 * lobbed artillery shells, air-dropped bombs and the muzzle flashes that
 * go with them.
 *
 * Everything is pooled and drawn through two instanced meshes plus a
 * sprite pool, so a firefight running non-stop for days never allocates
 * per shot. Materials are additive and `toneMapped: false` so the bloom
 * pass treats them as real emissive light instead of flat geometry.
 */
export class Combat {
  private readonly tracerMesh: THREE.InstancedMesh;
  private readonly shellMesh: THREE.InstancedMesh;
  private readonly tracers = makeSlots(TRACER_SLOTS);
  private readonly shells = makeSlots(SHELL_SLOTS);
  private readonly flashes: Flash[] = [];

  private tracerCursor = 0;
  private shellCursor = 0;
  private flashCursor = 0;

  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly posA = new THREE.Vector3();
  private readonly posB = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly scaleVec = new THREE.Vector3();

  constructor(scene: THREE.Scene, private readonly onImpact: ImpactHandler) {
    const tracerGeo = new THREE.BoxGeometry(1, 0.09, 0.09);
    const tracerMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.tracerMesh = new THREE.InstancedMesh(tracerGeo, tracerMat, TRACER_SLOTS);
    this.tracerMesh.count = 0;
    this.tracerMesh.frustumCulled = false;

    const shellGeo = new THREE.SphereGeometry(0.16, 6, 5);
    const shellMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.shellMesh = new THREE.InstancedMesh(shellGeo, shellMat, SHELL_SLOTS);
    this.shellMesh.count = 0;
    this.shellMesh.frustumCulled = false;

    scene.add(this.tracerMesh, this.shellMesh);

    const flashTex = buildFlashTexture();
    for (let i = 0; i < FLASH_SLOTS; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: flashTex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        }),
      );
      sprite.visible = false;
      scene.add(sprite);
      this.flashes.push({ active: false, life: 0, maxLife: 0.09, sprite });
    }
  }

  /** Flat, fast small-arms / tank round. */
  fireTracer(from: THREE.Vector3, to: THREE.Vector3, color: number, heavy = false): void {
    const p = this.tracers[this.tracerCursor];
    this.tracerCursor = (this.tracerCursor + 1) % TRACER_SLOTS;
    p.active = true;
    p.from.copy(from);
    p.to.copy(to);
    p.t = 0;
    const dist = from.distanceTo(to) || 1;
    p.speed = (heavy ? 78 : 122) / dist;
    p.arc = heavy ? 0.9 : 0.25;
    p.color.set(color);
    p.length = heavy ? 2.6 : 1.7;
    p.thickness = heavy ? 1.9 : 1;
    p.impact = 0;
    // Rounds spark on impact rather than spawning particle explosions -
    // dozens of shooters firing continuously would otherwise drain the
    // particle pool that liquidation blasts depend on.
    p.endFlash = heavy ? 2.4 : 0.9;
    p.fallCurve = false;
    this.flash(from, heavy ? 1.5 : 0.7);
  }

  /**
   * High-arcing artillery shell, or - with `fall` set - a bomb released
   * from an aircraft, which keeps the launcher's forward motion while the
   * drop accelerates under gravity.
   */
  fireShell(
    from: THREE.Vector3,
    to: THREE.Vector3,
    color: number,
    magnitude: number,
    arc = 16,
    fall = false,
  ): void {
    const p = this.shells[this.shellCursor];
    this.shellCursor = (this.shellCursor + 1) % SHELL_SLOTS;
    p.active = true;
    p.from.copy(from);
    p.to.copy(to);
    p.t = 0;
    const dist = from.distanceTo(to) || 1;
    p.speed = 42 / dist;
    p.arc = arc;
    p.color.set(color);
    p.length = 1;
    p.thickness = 1 + magnitude * 0.5;
    p.impact = magnitude;
    p.endFlash = 0;
    p.fallCurve = fall;
  }

  /** Bright, very short-lived burst - muzzle blast, rotor gun flash. */
  flash(position: THREE.Vector3, size: number): void {
    const f = this.flashes[this.flashCursor];
    this.flashCursor = (this.flashCursor + 1) % FLASH_SLOTS;
    f.active = true;
    f.life = f.maxLife = 0.075 + size * 0.03;
    f.sprite.position.copy(position);
    f.sprite.scale.setScalar(size);
    f.sprite.visible = true;
    (f.sprite.material as THREE.SpriteMaterial).opacity = 1;
  }

  /** Point along the ballistic path at progress `t` (0..1). */
  private samplePath(p: Projectile, t: number, out: THREE.Vector3): THREE.Vector3 {
    if (p.fallCurve) {
      // Horizontal at a constant rate, vertical proportional to t squared -
      // free fall, so the bomb pitches over steeply as it nears the ground.
      out.set(
        THREE.MathUtils.lerp(p.from.x, p.to.x, t),
        THREE.MathUtils.lerp(p.from.y, p.to.y, t * t),
        THREE.MathUtils.lerp(p.from.z, p.to.z, t),
      );
      return out;
    }
    out.lerpVectors(p.from, p.to, t);
    out.y += p.arc * 4 * t * (1 - t);
    return out;
  }

  update(dt: number): void {
    this.writeProjectiles(this.tracerMesh, this.tracers, dt, true);
    this.writeProjectiles(this.shellMesh, this.shells, dt, false);

    for (const f of this.flashes) {
      if (!f.active) continue;
      f.life -= dt;
      if (f.life <= 0) {
        f.active = false;
        f.sprite.visible = false;
        continue;
      }
      (f.sprite.material as THREE.SpriteMaterial).opacity = f.life / f.maxLife;
    }
  }

  private writeProjectiles(
    mesh: THREE.InstancedMesh,
    slots: Projectile[],
    dt: number,
    orientAlongPath: boolean,
  ): void {
    let writeIndex = 0;
    for (const p of slots) {
      if (!p.active) continue;
      p.t += p.speed * dt;

      if (p.t >= 1) {
        p.active = false;
        if (p.impact > 0 || p.endFlash > 0) {
          this.samplePath(p, 1, this.posA);
          if (p.endFlash > 0) this.flash(this.posA, p.endFlash);
          if (p.impact > 0) this.onImpact(this.posA, p.color.getHex(), p.impact);
        }
        continue;
      }

      this.samplePath(p, p.t, this.posA);

      if (orientAlongPath) {
        // Point the unit-length box along the local path tangent, then
        // stretch it so the round reads as a streak rather than a dot.
        this.samplePath(p, Math.min(1, p.t + 0.02), this.posB);
        this.dir.subVectors(this.posB, this.posA);
        if (this.dir.lengthSq() < 1e-8) this.dir.copy(X_AXIS);
        else this.dir.normalize();
        this.quat.setFromUnitVectors(X_AXIS, this.dir);
        this.scaleVec.set(p.length, p.thickness, p.thickness);
      } else {
        this.quat.identity();
        this.scaleVec.setScalar(p.thickness);
      }

      this.matrix.compose(this.posA, this.quat, this.scaleVec);
      mesh.setMatrixAt(writeIndex, this.matrix);
      mesh.setColorAt(writeIndex, p.color);
      writeIndex++;
    }

    mesh.count = writeIndex;
    if (writeIndex > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
}
