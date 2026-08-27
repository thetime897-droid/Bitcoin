import * as THREE from 'three';

interface Particle {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

const POOL_SIZE = 460;

function buildParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,200,120,0.9)');
  grad.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Pooled explosion particles for liquidation events plus a couple of
 * reusable flash lights - everything pre-allocated so a busy market (lots
 * of liquidations back to back) never triggers GC churn during a long
 * unattended stream.
 */
export class Effects {
  private readonly particles: Particle[] = [];
  private readonly texture = buildParticleTexture();
  private readonly flashes: THREE.PointLight[] = [];
  private cursor = 0;
  private flashCursor = 0;
  private shakeAmount = 0;

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.texture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      scene.add(sprite);
      this.particles.push({ sprite, velocity: new THREE.Vector3(), life: 0, maxLife: 1 });
    }
    for (let i = 0; i < 3; i++) {
      const light = new THREE.PointLight(0xffaa55, 0, 30, 2);
      scene.add(light);
      this.flashes.push(light);
    }
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
    const count = Math.round(THREE.MathUtils.lerp(8, 55, Math.min(m, 1)));
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % POOL_SIZE;
      p.life = p.maxLife = 0.5 + Math.random() * 0.5;
      const speed = THREE.MathUtils.lerp(2, 9, m);
      const angle = Math.random() * Math.PI * 2;
      const upBias = Math.random() * speed;
      p.velocity.set(Math.cos(angle) * speed, upBias, Math.sin(angle) * speed);
      p.sprite.position.copy(position);
      p.sprite.scale.setScalar(THREE.MathUtils.lerp(0.5, 1.6, m));
      (p.sprite.material as THREE.SpriteMaterial).color.set(color);
      (p.sprite.material as THREE.SpriteMaterial).opacity = 1;
      p.sprite.visible = true;
    }

    const light = this.flashes[this.flashCursor];
    this.flashCursor = (this.flashCursor + 1) % this.flashes.length;
    light.position.copy(position).setY(3);
    light.color.set(color);
    light.intensity = THREE.MathUtils.lerp(6, 26, m);

    this.shakeAmount = Math.max(this.shakeAmount, THREE.MathUtils.lerp(0.02, 0.35, m) * shakeScale);
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.velocity.y -= 9.8 * dt;
      p.sprite.position.addScaledVector(p.velocity, dt);
      const t = Math.max(0, p.life / p.maxLife);
      (p.sprite.material as THREE.SpriteMaterial).opacity = t;
      if (p.life <= 0) p.sprite.visible = false;
    }
    for (const light of this.flashes) {
      if (light.intensity > 0) light.intensity = Math.max(0, light.intensity - dt * 40);
    }
    this.shakeAmount = Math.max(0, this.shakeAmount - dt * 0.6);
  }
}
