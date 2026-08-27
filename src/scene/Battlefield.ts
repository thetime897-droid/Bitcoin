import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { config } from '../config';

const GROUND_HALF_WIDTH = 72;
const GROUND_HALF_DEPTH = 60;
const MAX_FRONTLINE_SHIFT = 14;
const CAMP_X_FACTOR = 0.8;

function makeCanvasTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w = 256, h = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(6, 1.5, 1);
  return sprite;
}

/** Simple deterministic pseudo-random so the scattered scenery is stable
 * across reloads instead of re-shuffling every time OBS refreshes the source. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function fbmHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.045) * Math.cos(z * 0.05) * 0.9 +
    Math.sin(x * 0.11 + z * 0.07) * 0.35 +
    Math.sin(z * 0.023 - x * 0.02) * 0.5
  );
}

export type CampSide = 'bears' | 'bulls';

/**
 * Owns the persistent 3D world: terrain, road, river/frontline, camps,
 * scenery and camera. Units and particle effects are separate modules that
 * hang objects off the anchors this class exposes, so the always-running
 * scenery (trees, houses, ground) never has to be rebuilt when the market
 * churns.
 */
export class Battlefield {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly bearsAnchor = new THREE.Object3D();
  readonly bullsAnchor = new THREE.Object3D();

  private readonly frontlineGroup = new THREE.Group();
  private frontlineTargetX = 0;
  private frontlineX = 0;
  private readonly clock = new THREE.Clock();
  private controls: OrbitControls | null = null;
  private cinematicT = 0;
  private disposed = false;
  private readonly priceLabels: THREE.Sprite[] = [];
  private readonly priceLabelBaseX: number[] = [];

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: config.transparent,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = config.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (config.transparent) this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    this.camera.position.set(0, 40, 88);
    this.camera.lookAt(0, 1, -6);

    if (!config.transparent) {
      this.scene.background = new THREE.Color(0x8fd1ef);
      this.scene.fog = new THREE.Fog(0x8fd1ef, 90, 220);
    }

    this.buildLighting();
    this.buildTerrain();
    this.buildRoad();
    this.frontlineGroup.add(...this.buildRiver());
    this.scene.add(this.frontlineGroup);
    this.buildScenery();
    this.buildCamps();
    this.buildPriceTicks();

    if (config.interact) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.set(0, 2, -6);
      this.controls.maxPolarAngle = Math.PI * 0.49;
      this.controls.minDistance = 15;
      this.controls.maxDistance = 120;
      this.controls.enableDamping = true;
      this.controls.keys = { LEFT: 'KeyA', UP: 'KeyW', RIGHT: 'KeyD', BOTTOM: 'KeyS' };
      this.controls.listenToKeyEvents(window);
    }

    this.resize();
  }

  private buildLighting(): void {
    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x3b5c2c, 0.9);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff3d6, 1.4);
    sun.position.set(-40, 60, 30);
    sun.castShadow = config.quality !== 'low';
    if (sun.castShadow) {
      sun.shadow.mapSize.set(config.quality === 'high' ? 2048 : 1024, config.quality === 'high' ? 2048 : 1024);
      sun.shadow.camera.left = -110;
      sun.shadow.camera.right = 110;
      sun.shadow.camera.top = 70;
      sun.shadow.camera.bottom = -70;
      sun.shadow.camera.far = 200;
      sun.shadow.bias = -0.0015;
    }
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  }

  private buildTerrain(): void {
    const geo = new THREE.PlaneGeometry(GROUND_HALF_WIDTH * 2, GROUND_HALF_DEPTH * 2, 80, 48);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(0x4c8a3f);
    const dark = new THREE.Color(0x2f5e26);
    const rand = seededRandom(7);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const roadDist = Math.abs(z - 2);
      const flattener = THREE.MathUtils.smoothstep(roadDist, 0, 9);
      const h = fbmHeight(x, z) * flattener;
      pos.setY(i, h);

      const edge = Math.min(1, (Math.abs(x) / GROUND_HALF_WIDTH) * 1.15);
      const c = base.clone().lerp(dark, edge * 0.6 + rand() * 0.12);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private buildRoad(): void {
    // Canvas width = along the road's length (X, after rotation); canvas
    // height = across its width (Z) - a dashed centre line running lengthwise.
    const tex = makeCanvasTexture((ctx, w, h) => {
      ctx.fillStyle = '#3a3a3f';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8e8dd';
      const dashW = w * 0.08;
      for (let x = -dashW; x < w; x += w * 0.22) {
        ctx.fillRect(x, h / 2 - h * 0.03, dashW, h * 0.06);
      }
    }, 512, 64);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 1);

    const geo = new THREE.PlaneGeometry(GROUND_HALF_WIDTH * 2 - 4, 7);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    mesh.position.set(0, 0.03, 2);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  private buildRiver(): THREE.Object3D[] {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_HALF_WIDTH * 2.4, 9),
      new THREE.MeshStandardMaterial({
        color: 0x2a7fb0,
        transparent: true,
        opacity: 0.82,
        roughness: 0.15,
        metalness: 0.35,
      }),
    );
    water.rotateX(-Math.PI / 2);
    water.rotateZ(Math.PI / 2);
    water.position.set(0, 0.06, -18);
    water.receiveShadow = true;

    const bridgeDeck = new THREE.Mesh(
      new THREE.BoxGeometry(7.4, 0.4, 10),
      new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 }),
    );
    bridgeDeck.position.set(0, 0.28, -18);
    bridgeDeck.castShadow = true;
    bridgeDeck.receiveShadow = true;

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 9),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }),
    );
    glow.rotateX(-Math.PI / 2);
    glow.rotateZ(Math.PI / 2);
    glow.position.set(0, 0.08, -18);

    return [water, bridgeDeck, glow];
  }

  private buildScenery(): void {
    const rand = seededRandom(42);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4530, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e6b32, roughness: 0.9 });
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 1.2, 6);
    const leafGeo = new THREE.ConeGeometry(1.1, 2.4, 7);

    const count = config.quality === 'high' ? 140 : config.quality === 'medium' ? 90 : 50;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count);
    trunks.castShadow = true;
    leaves.castShadow = true;
    const m = new THREE.Matrix4();
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < count * 20) {
      guard++;
      const x = (rand() * 2 - 1) * GROUND_HALF_WIDTH * 0.94;
      const z = (rand() * 2 - 1) * GROUND_HALF_DEPTH * 0.9;
      const nearRoad = Math.abs(z - 2) < 6;
      const nearRiver = Math.abs(z + 18) < 7;
      const nearCamp = Math.abs(x) > GROUND_HALF_WIDTH * 0.78;
      const nearPriceTicks = Math.abs(z - 20) < 4.5;
      if (nearRoad || nearRiver || nearCamp || nearPriceTicks) continue;
      const y = fbmHeight(x, z) * THREE.MathUtils.smoothstep(Math.abs(z - 2), 0, 9);
      const scale = 0.7 + rand() * 0.9;
      m.compose(
        new THREE.Vector3(x, y + 0.6 * scale, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2),
        new THREE.Vector3(scale, scale, scale),
      );
      trunks.setMatrixAt(placed, m);
      m.compose(
        new THREE.Vector3(x, y + 1.7 * scale, z),
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale),
      );
      leaves.setMatrixAt(placed, m);
      placed++;
    }
    trunks.count = placed;
    leaves.count = placed;
    this.scene.add(trunks, leaves);

    // A few low-poly houses dotted near each camp for scale/context.
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xcabb99, roughness: 1 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a3f34, roughness: 0.8 });
    const housePositions: [number, number][] = [
      [-70, 18], [-58, -34], [-30, 30], [30, 30], [58, -34], [70, 18], [-14, 26], [14, -30],
    ];
    for (const [x, z] of housePositions) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2, 3.2), houseMat);
      body.position.y = 1;
      body.castShadow = true;
      body.receiveShadow = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 4), roofMat);
      roof.position.y = 2.7;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(body, roof);
      const y = fbmHeight(x, z) * THREE.MathUtils.smoothstep(Math.abs(z - 2), 0, 9);
      group.position.set(x, y, z);
      this.scene.add(group);
    }
  }

  private buildCamps(): void {
    this.bearsAnchor.position.set(-GROUND_HALF_WIDTH * CAMP_X_FACTOR, 0, 4);
    this.bullsAnchor.position.set(GROUND_HALF_WIDTH * CAMP_X_FACTOR, 0, 4);
    this.scene.add(this.bearsAnchor, this.bullsAnchor);

    this.buildCampMarkers(this.bearsAnchor, 0xe0483f, 'BEARS');
    this.buildCampMarkers(this.bullsAnchor, 0x36c17a, 'BULLS');
  }

  private buildCampMarkers(anchor: THREE.Object3D, color: number, label: string): void {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x333333 }),
    );
    pole.position.y = 4;
    pole.castShadow = true;

    const bannerTex = makeCanvasTexture((ctx, w, h) => {
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '700 76px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h / 2 + 4);
    }, 512, 256);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 2.2),
      new THREE.MeshStandardMaterial({ map: bannerTex, side: THREE.DoubleSide }),
    );
    banner.position.set(0, 6.6, 0);
    banner.castShadow = true;

    const tentColor = new THREE.Color(color).lerp(new THREE.Color(0x111111), 0.35);
    for (let i = 0; i < 3; i++) {
      const tent = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 2.2, 5),
        new THREE.MeshStandardMaterial({ color: tentColor, roughness: 1 }),
      );
      tent.position.set(-6 + i * 5, 1.1, -6 + (i % 2) * 3);
      tent.castShadow = true;
      tent.receiveShadow = true;
      anchor.add(tent);
    }

    anchor.add(pole, banner);
  }

  private buildPriceTicks(): void {
    for (let i = -3; i <= 3; i++) {
      const sprite = makeLabelSprite('—', 'rgba(255,255,255,0.55)');
      sprite.position.set(i * 9, 1.4, 20);
      this.priceLabels.push(sprite);
      this.priceLabelBaseX.push(i * 9);
      this.scene.add(sprite);
    }
  }

  /** Refresh the decorative ground price ticks around the current price. */
  setCenterPrice(price: number, step: number): void {
    for (let i = 0; i < this.priceLabels.length; i++) {
      const offsetIndex = i - Math.floor(this.priceLabels.length / 2);
      const value = price + offsetIndex * step;
      const sprite = this.priceLabels[i];
      const canvas = (sprite.material.map!.image as HTMLCanvasElement);
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '600 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = offsetIndex === 0 ? '#ffffff' : 'rgba(255,255,255,0.5)';
      ctx.fillText(value.toLocaleString('en-US', { maximumFractionDigits: 0 }), 128, 32);
      sprite.material.map!.needsUpdate = true;
    }
  }

  /** -1 (sellers fully in control) .. +1 (buyers fully in control). Frontline
   * (river) drifts toward the stronger side over a few seconds. */
  setPressureRatio(ratio: number): void {
    this.frontlineTargetX = THREE.MathUtils.clamp(ratio, -1, 1) * MAX_FRONTLINE_SHIFT;
  }

  get frontlineWorldX(): number {
    return this.frontlineX;
  }

  update(): number {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.frontlineX = THREE.MathUtils.damp(this.frontlineX, this.frontlineTargetX, 1.4, dt);
    this.frontlineGroup.position.x = this.frontlineX;

    if (this.controls) {
      this.controls.update();
    } else if (config.cinematic) {
      this.cinematicT += dt;
      const t = this.cinematicT;
      const radius = 58 + Math.sin(t * 0.04) * 8;
      const angle = Math.sin(t * 0.025) * 0.5;
      this.camera.position.set(Math.sin(angle) * radius, 40 + Math.sin(t * 0.07) * 3, Math.cos(angle) * radius + 30);
      this.camera.lookAt(this.frontlineX * 0.2, 1, -6);
    }
    return dt;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /** Camera shake used for big liquidations - additive offset applied once
   * per frame from the effects layer, doesn't fight the cinematic drift. */
  shake(strength: number): void {
    const s = strength;
    this.camera.position.x += (Math.random() - 0.5) * s;
    this.camera.position.y += (Math.random() - 0.5) * s * 0.5;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.controls?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
