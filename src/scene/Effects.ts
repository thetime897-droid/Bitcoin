import * as THREE from 'three';
import { terrainHeightAt } from './Battlefield';

interface Particle {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  /** Sprite size at spawn; smoke puffs grow from this as they rise. */
  baseScale: number;
  growth: number;
  fadePower: number;
}

const FIRE_POOL = 460;
const SMOKE_POOL = 260;
const SCORCH_POOL = 90;

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
    [0.4, 'rgba(255,200,120,0.9)'],
    [1, 'rgba(255,80,20,0)'],
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
 * Everything an explosion leaves behind: the fireball itself, a lingering
 * smoke column, and a scorch mark burned into the ground.
 *
 * All three are pre-allocated pools. A busy market plus continuous
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

  private fireCursor = 0;
  private smokeCursor = 0;
  private flashCursor = 0;
  private shakeAmount = 0;

  private readonly matrix = new THREE.Matrix4();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpScale = new THREE.Vector3();
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

    const fireCount = Math.round(THREE.MathUtils.lerp(10, 58, unit));
    for (let i = 0; i < fireCount; i++) {
      const p = this.fire[this.fireCursor];
      this.fireCursor = (this.fireCursor + 1) % FIRE_POOL;
      p.life = p.maxLife = 0.45 + Math.random() * 0.5;
      const speed = THREE.MathUtils.lerp(2.5, 10, m);
      const angle = Math.random() * Math.PI * 2;
      p.velocity.set(Math.cos(angle) * speed, Math.random() * speed * 1.1, Math.sin(angle) * speed);
      p.sprite.position.copy(position);
      p.baseScale = THREE.MathUtils.lerp(0.5, 1.7, m);
      p.growth = 0;
      p.fadePower = 1;
      p.sprite.scale.setScalar(p.baseScale);
      (p.sprite.material as THREE.SpriteMaterial).color.set(color);
      (p.sprite.material as THREE.SpriteMaterial).opacity = 1;
      p.sprite.visible = true;
    }

    // Smoke outlives the fireball by several seconds and drifts upward,
    // which is what actually sells a blast as a real explosion.
    const smokeCount = Math.round(THREE.MathUtils.lerp(4, 13, unit));
    for (let i = 0; i < smokeCount; i++) {
      const p = this.smoke[this.smokeCursor];
      this.smokeCursor = (this.smokeCursor + 1) % SMOKE_POOL;
      p.life = p.maxLife = 1.6 + Math.random() * 1.9;
      const angle = Math.random() * Math.PI * 2;
      const drift = 0.6 + Math.random() * 1.2;
      p.velocity.set(Math.cos(angle) * drift, 1.3 + Math.random() * 1.8, Math.sin(angle) * drift);
      p.sprite.position.copy(position).addScaledVector(p.velocity, 0.12);
      p.baseScale = THREE.MathUtils.lerp(0.9, 2.1, m);
      p.growth = THREE.MathUtils.lerp(1.0, 2.4, m);
      // Smoke should hang around at near-full opacity then thin out late,
      // rather than fading linearly from the first frame.
      p.fadePower = 0.55;
      p.sprite.scale.setScalar(p.baseScale);
      (p.sprite.material as THREE.SpriteMaterial).color.setHex(0x9a9691);
      (p.sprite.material as THREE.SpriteMaterial).opacity = 0.4;
      p.sprite.visible = true;
    }

    this.addScorch(position, THREE.MathUtils.lerp(3.4, 9, unit));

    const light = this.flashes[this.flashCursor];
    this.flashCursor = (this.flashCursor + 1) % this.flashes.length;
    light.position.copy(position).setY(position.y + 3);
    light.color.set(color);
    light.intensity = THREE.MathUtils.lerp(6, 28, m);

    this.shakeAmount = Math.max(this.shakeAmount, THREE.MathUtils.lerp(0.02, 0.35, m) * shakeScale);
  }

  private addScorch(position: THREE.Vector3, size: number): void {
    // Ring buffer: the oldest mark is overwritten once the pool is full, so
    // the ground never ends up solid black after hours of shelling.
    const index = this.scorchCursor;
    this.scorchCursor = (this.scorchCursor + 1) % SCORCH_POOL;
    this.scorchCount = Math.min(this.scorchCount + 1, SCORCH_POOL);

    this.tmpPos.set(position.x, terrainHeightAt(position.x, position.z) + 0.05, position.z);
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
      if (p.life <= 0) p.sprite.visible = false;
    }
  }
}
