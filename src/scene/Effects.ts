import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { terrainHeightAt } from './Battlefield';
import { buildDebrisGeometry } from './geometry';

interface Particle {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  /** Sprite size at spawn; smoke puffs grow from this as they rise. */
  baseScale: number;
  growth: number;
  fadePower: number;
  /** Fire particles cool from white through orange to a dull red. */
  coolsDown: boolean;
}

interface DebrisChunk {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  rotation: THREE.Euler;
  life: number;
  maxLife: number;
  scale: number;
  /** Chunks get one bounce before settling; a second looks like a toy. */
  bounced: boolean;
}

interface Shockwave {
  active: boolean;
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxRadius: number;
}

/** A burnt-out hull left where a unit died, smoking until it fades. */
interface Wreck {
  active: boolean;
  position: THREE.Vector3;
  yaw: number;
  scale: number;
  life: number;
  maxLife: number;
}

const FIRE_POOL = 460;
const SMOKE_POOL = 260;
const SCORCH_POOL = 90;
const DEBRIS_POOL = 220;
const SHOCKWAVE_POOL = 8;
const WRECK_POOL = 40;
/** How long a burnt-out hull stays on the field before fading away. */
const WRECK_LIFE = 26;

/** Colours a fireball passes through as it cools. */
const HOT_CORE = new THREE.Color(0xfff6e0);
const MID_FLAME = new THREE.Color(0xffa235);
const COOL_EMBER = new THREE.Color(0x8c2408);

function radialTexture(stops: [number, string][]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function buildFireTexture(): THREE.Texture {
  return radialTexture([
    [0, 'rgba(255,255,255,1)'],
    [0.35, 'rgba(255,220,160,0.92)'],
    [1, 'rgba(255,90,20,0)'],
  ]);
}

function buildSmokeTexture(): THREE.Texture {
  return radialTexture([
    [0, 'rgba(190,188,184,0.85)'],
    [0.45, 'rgba(140,138,134,0.55)'],
    [1, 'rgba(110,108,104,0)'],
  ]);
}

function buildScorchTexture(): THREE.Texture {
  return radialTexture([
    [0, 'rgba(24,18,12,0.92)'],
    [0.55, 'rgba(38,28,18,0.6)'],
    [1, 'rgba(48,38,26,0)'],
  ]);
}

/**
 * Everything an explosion produces: a fireball that cools from white
 * through orange to embers, tumbling debris, an expanding ground
 * shockwave, a lingering smoke column, and a scorch mark burned into the
 * terrain.
 *
 * All five are pre-allocated pools. A busy market plus continuous
 * artillery means detonations never really stop, so nothing here may
 * allocate per blast during a multi-day stream.
 */
export class Effects {
  private readonly fire: Particle[] = [];
  private readonly smoke: Particle[] = [];
  private readonly flashes: THREE.PointLight[] = [];

  private readonly scorchMesh: THREE.InstancedMesh;
  private scorchCursor = 0;
  private scorchCount = 0;

  private readonly debrisMesh: THREE.InstancedMesh;
  private readonly debris: DebrisChunk[] = [];
  private debrisCursor = 0;

  private readonly shockwaves: Shockwave[] = [];
  private shockCursor = 0;

  private readonly wreckMesh: THREE.InstancedMesh;
  private readonly wrecks: Wreck[] = [];
  private wreckCursor = 0;
  private wreckSmokeTimer = 0;

  private fireCursor = 0;
  private smokeCursor = 0;
  private flashCursor = 0;
  private shakeAmount = 0;

  private readonly matrix = new THREE.Matrix4();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpScale = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpColor = new THREE.Color();
  private readonly flatQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

  constructor(scene: THREE.Scene) {
    const fireTex = buildFireTexture();
    for (let i = 0; i < FIRE_POOL; i++) {
      this.fire.push(this.makeParticle(scene, fireTex, THREE.AdditiveBlending));
    }
    const smokeTex = buildSmokeTexture();
    for (let i = 0; i < SMOKE_POOL; i++) {
      this.smoke.push(this.makeParticle(scene, smokeTex, THREE.NormalBlending));
    }
    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight(0xffaa55, 0, 34, 2);
      scene.add(light);
      this.flashes.push(light);
    }

    // Scorch marks lie flat on the terrain. polygonOffset keeps them from
    // z-fighting with the ground they're painted onto.
    const scorchGeo = new THREE.PlaneGeometry(1, 1);
    const scorchMat = new THREE.MeshBasicMaterial({
      map: buildScorchTexture(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      toneMapped: false,
    });
    this.scorchMesh = new THREE.InstancedMesh(scorchGeo, scorchMat, SCORCH_POOL);
    this.scorchMesh.count = 0;
    this.scorchMesh.frustumCulled = false;
    this.scorchMesh.renderOrder = 1;
    scene.add(this.scorchMesh);

    // Debris: lit geometry rather than sprites, so chunks catch the sun and
    // read as solid material being thrown rather than more fire.
    this.debrisMesh = new THREE.InstancedMesh(
      buildDebrisGeometry(),
      new THREE.MeshStandardMaterial({ color: 0x3a3128, roughness: 0.95 }),
      DEBRIS_POOL,
    );
    this.debrisMesh.count = 0;
    this.debrisMesh.frustumCulled = false;
    this.debrisMesh.castShadow = true;
    scene.add(this.debrisMesh);
    for (let i = 0; i < DEBRIS_POOL; i++) {
      this.debris.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        life: 0,
        maxLife: 1,
        scale: 1,
        bounced: false,
      });
    }

    // Shockwave rings, drawn flat on the ground and expanded outward.
    const ringGeo = new THREE.RingGeometry(0.9, 1, 40);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < SHOCKWAVE_POOL; i++) {
      const mesh = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: 0xffd7a0,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      );
      mesh.visible = false;
      mesh.renderOrder = 2;
      scene.add(mesh);
      this.shockwaves.push({ active: false, mesh, life: 0, maxLife: 1, maxRadius: 1 });
    }

    // Wrecks: a charred hull silhouette, dark and matte so it reads as
    // burnt-out rather than as another live unit.
    const wreckGeo = mergeGeometries([
      new THREE.BoxGeometry(1.9, 0.5, 1.0).translate(0, 0.3, 0),
      new THREE.BoxGeometry(0.9, 0.4, 0.8).translate(-0.2, 0.68, 0),
      new THREE.BoxGeometry(0.16, 0.16, 0.16).translate(0.9, 0.85, 0.2),
    ]) as THREE.BufferGeometry;
    this.wreckMesh = new THREE.InstancedMesh(
      wreckGeo,
      new THREE.MeshStandardMaterial({ color: 0x201c18, roughness: 1 }),
      WRECK_POOL,
    );
    this.wreckMesh.count = 0;
    this.wreckMesh.frustumCulled = false;
    this.wreckMesh.castShadow = true;
    this.wreckMesh.receiveShadow = true;
    scene.add(this.wreckMesh);
    for (let i = 0; i < WRECK_POOL; i++) {
      this.wrecks.push({
        active: false,
        position: new THREE.Vector3(),
        yaw: 0,
        scale: 1,
        life: 0,
        maxLife: WRECK_LIFE,
      });
    }
  }

  /**
   * Leave a burnt-out hull where a unit was destroyed. It smokes for a
   * while and then fades, so a stretch of front that has been fought over
   * hard visibly accumulates losses.
   */
  addWreck(position: THREE.Vector3, scale = 1): void {
    const w = this.wrecks[this.wreckCursor];
    this.wreckCursor = (this.wreckCursor + 1) % WRECK_POOL;
    w.active = true;
    w.life = w.maxLife = WRECK_LIFE * (0.75 + Math.random() * 0.5);
    w.position.set(position.x, terrainHeightAt(position.x, position.z), position.z);
    w.yaw = Math.random() * Math.PI * 2;
    w.scale = scale * (0.85 + Math.random() * 0.35);
  }

  private stepWrecks(dt: number): void {
    let writeIndex = 0;
    // One shared smoke emission per tick rather than per wreck, so a field
    // full of hulls costs the same as a single one.
    this.wreckSmokeTimer -= dt;
    const emit = this.wreckSmokeTimer <= 0;
    if (emit) this.wreckSmokeTimer = 0.35;

    for (const w of this.wrecks) {
      if (!w.active) continue;
      w.life -= dt;
      if (w.life <= 0) {
        w.active = false;
        continue;
      }

      // Sink slightly and shrink away over the last few seconds.
      const fade = Math.min(1, w.life / 4);
      const s = w.scale * (0.6 + 0.4 * fade);
      this.tmpQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), w.yaw);
      this.tmpScale.set(s, s * fade, s);
      this.matrix.compose(w.position, this.tmpQuat, this.tmpScale);
      this.wreckMesh.setMatrixAt(writeIndex, this.matrix);
      writeIndex++;

      if (emit && w.life > 3 && Math.random() < 0.5) {
        const p = this.smoke[this.smokeCursor];
        this.smokeCursor = (this.smokeCursor + 1) % SMOKE_POOL;
        p.life = p.maxLife = 2.2 + Math.random() * 1.6;
        p.velocity.set((Math.random() - 0.5) * 0.5, 1.5 + Math.random(), (Math.random() - 0.5) * 0.5);
        p.sprite.position.copy(w.position).setY(w.position.y + 0.8);
        p.baseScale = 0.7;
        p.growth = 1.5;
        p.fadePower = 0.6;
        p.coolsDown = false;
        p.sprite.scale.setScalar(p.baseScale);
        (p.sprite.material as THREE.SpriteMaterial).color.setHex(0x6f6a64);
        (p.sprite.material as THREE.SpriteMaterial).opacity = 0.35;
        p.sprite.visible = true;
      }
    }

    this.wreckMesh.count = writeIndex;
    if (writeIndex > 0) this.wreckMesh.instanceMatrix.needsUpdate = true;
  }

  private makeParticle(scene: THREE.Scene, map: THREE.Texture, blending: THREE.Blending): Particle {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending,
        toneMapped: blending === THREE.NormalBlending,
      }),
    );
    sprite.visible = false;
    scene.add(sprite);
    return {
      sprite,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      baseScale: 1,
      growth: 0,
      fadePower: 1,
      coolsDown: false,
    };
  }

  /** Current camera shake magnitude, decaying each frame; the render loop
   * feeds this into Battlefield.shake() so effects and cinematic drift
   * never fight over camera ownership. */
  get shake(): number {
    return this.shakeAmount;
  }

  /**
   * magnitude: roughly 0 (small) .. 1+ (whale-sized) liquidation.
   * shakeScale lets routine background fire (artillery, bombs) light up the
   * field without rattling the camera the way a real liquidation does.
   */
  explode(position: THREE.Vector3, color: number, magnitude: number, shakeScale = 1): void {
    const m = THREE.MathUtils.clamp(magnitude, 0.15, 2.5);
    const unit = Math.min(m, 1);
    const groundY = terrainHeightAt(position.x, position.z);

    // Fireball: a fast hot core plus slower outer flame, so the blast has
    // a bright centre rather than one uniform puff.
    const fireCount = Math.round(THREE.MathUtils.lerp(14, 68, unit));
    for (let i = 0; i < fireCount; i++) {
      const core = i < fireCount * 0.35;
      const p = this.fire[this.fireCursor];
      this.fireCursor = (this.fireCursor + 1) % FIRE_POOL;
      p.life = p.maxLife = core ? 0.22 + Math.random() * 0.22 : 0.5 + Math.random() * 0.55;
      const speed = THREE.MathUtils.lerp(2.5, 11, m) * (core ? 0.55 : 1);
      const angle = Math.random() * Math.PI * 2;
      const rise = Math.random() * speed * (core ? 0.7 : 1.15);
      p.velocity.set(Math.cos(angle) * speed, rise, Math.sin(angle) * speed);
      p.sprite.position.copy(position);
      p.baseScale = THREE.MathUtils.lerp(0.5, 1.8, m) * (core ? 1.35 : 1);
      p.growth = 0;
      p.fadePower = core ? 1.4 : 0.9;
      p.coolsDown = true;
      p.sprite.scale.setScalar(p.baseScale);
      (p.sprite.material as THREE.SpriteMaterial).color.copy(HOT_CORE);
      (p.sprite.material as THREE.SpriteMaterial).opacity = 1;
      p.sprite.visible = true;
    }

    // Smoke outlives the fireball by several seconds and drifts upward,
    // which is what actually sells a blast as a real explosion.
    const smokeCount = Math.round(THREE.MathUtils.lerp(4, 15, unit));
    for (let i = 0; i < smokeCount; i++) {
      const p = this.smoke[this.smokeCursor];
      this.smokeCursor = (this.smokeCursor + 1) % SMOKE_POOL;
      p.life = p.maxLife = 1.7 + Math.random() * 2.1;
      const angle = Math.random() * Math.PI * 2;
      const drift = 0.6 + Math.random() * 1.2;
      p.velocity.set(Math.cos(angle) * drift, 1.3 + Math.random() * 1.8, Math.sin(angle) * drift);
      p.sprite.position.copy(position).addScaledVector(p.velocity, 0.12);
      p.baseScale = THREE.MathUtils.lerp(0.9, 2.2, m);
      p.growth = THREE.MathUtils.lerp(1.0, 2.6, m);
      // Smoke should hang around at near-full opacity then thin out late,
      // rather than fading linearly from the first frame.
      p.fadePower = 0.55;
      p.coolsDown = false;
      p.sprite.scale.setScalar(p.baseScale);
      (p.sprite.material as THREE.SpriteMaterial).color.setHex(0x9a9691);
      (p.sprite.material as THREE.SpriteMaterial).opacity = 0.4;
      p.sprite.visible = true;
    }

    // Debris arcs out and tumbles.
    const debrisCount = Math.round(THREE.MathUtils.lerp(5, 26, unit));
    for (let i = 0; i < debrisCount; i++) {
      const d = this.debris[this.debrisCursor];
      this.debrisCursor = (this.debrisCursor + 1) % DEBRIS_POOL;
      d.active = true;
      d.bounced = false;
      d.life = d.maxLife = 1.5 + Math.random() * 1.6;
      d.position.copy(position);
      const angle = Math.random() * Math.PI * 2;
      const out = THREE.MathUtils.lerp(3, 13, m) * (0.4 + Math.random() * 0.8);
      d.velocity.set(Math.cos(angle) * out, 4 + Math.random() * out, Math.sin(angle) * out);
      d.spin.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
      );
      d.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
      d.scale = THREE.MathUtils.lerp(0.35, 1.05, m) * (0.5 + Math.random() * 0.8);
    }

    // Ground shockwave.
    const wave = this.shockwaves[this.shockCursor];
    this.shockCursor = (this.shockCursor + 1) % SHOCKWAVE_POOL;
    wave.active = true;
    wave.life = wave.maxLife = 0.3 + unit * 0.2;
    wave.maxRadius = THREE.MathUtils.lerp(2.6, 8, unit);
    wave.mesh.position.set(position.x, groundY + 0.12, position.z);
    wave.mesh.visible = true;

    this.addScorch(position, THREE.MathUtils.lerp(3.4, 9, unit), groundY);

    const light = this.flashes[this.flashCursor];
    this.flashCursor = (this.flashCursor + 1) % this.flashes.length;
    light.position.copy(position).setY(position.y + 3);
    light.color.set(color);
    light.intensity = THREE.MathUtils.lerp(6, 28, m);

    this.shakeAmount = Math.max(this.shakeAmount, THREE.MathUtils.lerp(0.02, 0.35, m) * shakeScale);
  }

  private addScorch(position: THREE.Vector3, size: number, groundY: number): void {
    // Ring buffer: the oldest mark is overwritten once the pool is full, so
    // the ground never ends up solid black after hours of shelling.
    const index = this.scorchCursor;
    this.scorchCursor = (this.scorchCursor + 1) % SCORCH_POOL;
    this.scorchCount = Math.min(this.scorchCount + 1, SCORCH_POOL);

    this.tmpPos.set(position.x, groundY + 0.05, position.z);
    this.tmpScale.set(size, size, size);
    this.matrix.compose(this.tmpPos, this.flatQuat, this.tmpScale);
    this.scorchMesh.setMatrixAt(index, this.matrix);
    this.scorchMesh.instanceMatrix.needsUpdate = true;
    this.scorchMesh.count = this.scorchCount;
  }

  update(dt: number): void {
    this.stepParticles(this.fire, dt, -9.8);
    // Smoke decelerates and rises rather than falling back down.
    this.stepParticles(this.smoke, dt, 0.6, 0.72);
    this.stepDebris(dt);
    this.stepShockwaves(dt);
    this.stepWrecks(dt);

    for (const light of this.flashes) {
      if (light.intensity > 0) light.intensity = Math.max(0, light.intensity - dt * 40);
    }
    this.shakeAmount = Math.max(0, this.shakeAmount - dt * 0.6);
  }

  private stepParticles(pool: Particle[], dt: number, gravity: number, damping = 1): void {
    for (const p of pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.velocity.y += gravity * dt;
      if (damping !== 1) p.velocity.multiplyScalar(Math.pow(damping, dt));
      p.sprite.position.addScaledVector(p.velocity, dt);

      const t = Math.max(0, p.life / p.maxLife);
      const mat = p.sprite.material as THREE.SpriteMaterial;
      mat.opacity = Math.pow(t, p.fadePower) * (p.growth > 0 ? 0.4 : 1);
      if (p.growth > 0) p.sprite.scale.setScalar(p.baseScale + (1 - t) * p.growth);

      if (p.coolsDown) {
        // White-hot at spawn, orange through the middle, dull ember at the
        // end - the single biggest thing that stops a blast looking flat.
        const age = 1 - t;
        if (age < 0.5) this.tmpColor.copy(HOT_CORE).lerp(MID_FLAME, age * 2);
        else this.tmpColor.copy(MID_FLAME).lerp(COOL_EMBER, (age - 0.5) * 2);
        mat.color.copy(this.tmpColor);
      }

      if (p.life <= 0) p.sprite.visible = false;
    }
  }

  private stepDebris(dt: number): void {
    let writeIndex = 0;
    for (const d of this.debris) {
      if (!d.active) continue;
      d.life -= dt;
      if (d.life <= 0) {
        d.active = false;
        continue;
      }

      d.velocity.y -= 16 * dt;
      d.position.addScaledVector(d.velocity, dt);

      const ground = terrainHeightAt(d.position.x, d.position.z) + 0.1;
      if (d.position.y < ground) {
        d.position.y = ground;
        if (d.bounced) {
          // Settled: stop dead and let it fade out where it landed.
          d.velocity.set(0, 0, 0);
          d.spin.multiplyScalar(0.86);
        } else {
          d.bounced = true;
          d.velocity.y = Math.abs(d.velocity.y) * 0.32;
          d.velocity.x *= 0.5;
          d.velocity.z *= 0.5;
          d.spin.multiplyScalar(0.6);
        }
      }

      d.rotation.x += d.spin.x * dt;
      d.rotation.y += d.spin.y * dt;
      d.rotation.z += d.spin.z * dt;

      // Shrink away over the last stretch of life instead of popping out.
      const t = d.life / d.maxLife;
      const s = d.scale * Math.min(1, t * 3);
      this.tmpQuat.setFromEuler(d.rotation);
      this.tmpScale.set(s, s, s);
      this.matrix.compose(d.position, this.tmpQuat, this.tmpScale);
      this.debrisMesh.setMatrixAt(writeIndex, this.matrix);
      writeIndex++;
    }
    this.debrisMesh.count = writeIndex;
    if (writeIndex > 0) this.debrisMesh.instanceMatrix.needsUpdate = true;
  }

  private stepShockwaves(dt: number): void {
    for (const w of this.shockwaves) {
      if (!w.active) continue;
      w.life -= dt;
      if (w.life <= 0) {
        w.active = false;
        w.mesh.visible = false;
        continue;
      }
      const age = 1 - w.life / w.maxLife;
      // Expands fast then eases out, fading as it goes.
      const radius = w.maxRadius * (1 - Math.pow(1 - age, 2.2));
      w.mesh.scale.set(radius, 1, radius);
      (w.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - age) * 0.35;
    }
  }
}
