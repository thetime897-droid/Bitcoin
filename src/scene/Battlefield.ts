import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { config } from '../config';
import { buildPineLeafGeometry } from './geometry';

const GROUND_HALF_WIDTH = 72;
const GROUND_HALF_DEPTH = 60;
const MAX_FRONTLINE_SHIFT = 14;
const CAMP_X_FACTOR = 0.8;
const CAMP_X = GROUND_HALF_WIDTH * CAMP_X_FACTOR;
const RIVER_Z = -18;
const CLASH_CENTER: [number, number] = [0, -14];

/** The road isn't a straight strip: it dips north from each camp to cross
 * the river at the bridge (x=0), then climbs back out to the other camp -
 * the natural line a road would actually take to the easiest crossing. */
function roadCenterZ(x: number): number {
  const t = Math.min(Math.abs(x) / CAMP_X, 1);
  return RIVER_Z + 22 * Math.pow(t, 1.3);
}

function roadSlope(x: number): number {
  const ax = Math.abs(x);
  if (ax >= CAMP_X || ax < 1e-4) return 0;
  const t = ax / CAMP_X;
  return Math.sign(x) * ((22 * 1.3) / CAMP_X) * Math.pow(t, 0.3);
}

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

/** A flat, ground-hugging text decal (like a painted yard line) rather than
 * a billboard sprite - reads as part of the terrain instead of a floating
 * HUD element bolted onto the 3D world. */
function makeGroundLabel(): { mesh: THREE.Mesh; canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 96;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
  const geo = new THREE.PlaneGeometry(7.2, 2.16);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  return { mesh, canvas, texture };
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

function terrainHeightAt(x: number, z: number): number {
  const flattener = THREE.MathUtils.smoothstep(Math.abs(z - roadCenterZ(x)), 0, 9);
  return fbmHeight(x, z) * flattener;
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
  private composer: EffectComposer | null = null;
  private cinematicT = 0;
  private disposed = false;
  private readonly priceLabels: { mesh: THREE.Mesh; canvas: HTMLCanvasElement; texture: THREE.CanvasTexture }[] = [];
  private waterMat: THREE.MeshStandardMaterial | null = null;
  private waterTime = 0;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: config.transparent,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = config.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (config.transparent) this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    this.camera.position.set(0, 40, 88);
    this.camera.lookAt(0, 1, -6);

    if (!config.transparent) {
      this.buildSky();
      this.scene.fog = new THREE.Fog(0xb8cdb2, 130, 250);
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

    if (!config.transparent) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.4, 0.94);
      this.composer.addPass(bloom);
      this.composer.addPass(new OutputPass());
    }

    this.resize();
  }

  private buildSky(): void {
    const tex = makeCanvasTexture((ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#4d7fb8');
      grad.addColorStop(0.42, '#8fbcd6');
      grad.addColorStop(0.72, '#b9d3bc');
      grad.addColorStop(1, '#c6d9bd');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }, 8, 512);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(280, 20, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, toneMapped: false }),
    );
    this.scene.add(sky);
  }

  private buildLighting(): void {
    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x3b5c2c, 0.85);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0d2, 1.5);
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
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  }

  private buildTerrain(): void {
    const geo = new THREE.PlaneGeometry(GROUND_HALF_WIDTH * 2, GROUND_HALF_DEPTH * 2, 100, 60);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(0x4c8a3f);
    const dark = new THREE.Color(0x2f5e26);
    const dirt = new THREE.Color(0x8a6f45);
    const dirtDark = new THREE.Color(0x6b5636);
    const rand = seededRandom(7);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainHeightAt(x, z));

      const edge = Math.min(1, (Math.abs(x) / GROUND_HALF_WIDTH) * 1.15);
      let c = base.clone().lerp(dark, edge * 0.6 + rand() * 0.12);

      // No-man's-land: a war-trampled dirt patch around the river crossing
      // where the armies actually clash, fading back to grass outward.
      const clashDist = Math.hypot(x - CLASH_CENTER[0], z - CLASH_CENTER[1]);
      const warBlend = 1 - THREE.MathUtils.smoothstep(clashDist, 12, 46);
      if (warBlend > 0) {
        const patchDirt = dirt.clone().lerp(dirtDark, rand() * 0.3);
        c = c.lerp(patchDirt, warBlend * 0.8);
      }

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
    // Canvas width = along the road's length; canvas height = across its
    // width - a dashed centre line running lengthwise once tiled.
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
    tex.repeat.set(18, 1);

    const halfWidth = 3.5;
    const length = GROUND_HALF_WIDTH * 2 - 4;
    const geo = new THREE.PlaneGeometry(length, halfWidth * 2, 64, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const alongX = pos.getX(i);
      const crossT = pos.getY(i) / halfWidth;
      const centerZ = roadCenterZ(alongX);
      const slope = roadSlope(alongX);
      const tangentLen = Math.sqrt(1 + slope * slope);
      const px = -slope / tangentLen;
      const pz = 1 / tangentLen;
      pos.setXYZ(i, alongX + px * halfWidth * crossT, 0.04, centerZ + pz * halfWidth * crossT);
    }
    geo.computeVertexNormals();

    // DoubleSide: remapping the plane's local Y onto world Z (instead of a
    // simple rotation) can leave the computed winding facing away from the
    // camera depending on curve direction, so don't rely on face culling here.
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }));
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  private buildRiver(): THREE.Object3D[] {
    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x2a7fb0,
      transparent: true,
      opacity: 0.82,
      roughness: 0.12,
      metalness: 0.4,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_HALF_WIDTH * 2.4, 9), this.waterMat);
    water.rotateX(-Math.PI / 2);
    water.rotateZ(Math.PI / 2);
    water.position.set(0, 0.06, RIVER_Z);
    water.receiveShadow = true;

    const bridgeDeck = new THREE.Mesh(
      new THREE.BoxGeometry(7.4, 0.4, 10),
      new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 }),
    );
    bridgeDeck.position.set(0, 0.28, RIVER_Z);
    bridgeDeck.castShadow = true;
    bridgeDeck.receiveShadow = true;

    const railMat = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.85 });
    const rails: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.18, 0.18), railMat);
      rail.position.set(0, 0.56, RIVER_Z + side * 4.9);
      rail.castShadow = true;
      rails.push(rail);
    }

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 9),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, toneMapped: false }),
    );
    glow.rotateX(-Math.PI / 2);
    glow.rotateZ(Math.PI / 2);
    glow.position.set(0, 0.08, RIVER_Z);

    return [water, bridgeDeck, glow, ...rails];
  }

  private buildScenery(): void {
    const rand = seededRandom(42);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4530, roughness: 1 });
    // White base so the per-instance colors set below (leafBase/leafDark)
    // aren't multiplied against another dark green and crushed toward black.
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 1.2, 6);
    const leafGeo = buildPineLeafGeometry();

    const count = config.quality === 'high' ? 150 : config.quality === 'medium' ? 95 : 50;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count);
    trunks.castShadow = true;
    leaves.castShadow = true;
    const m = new THREE.Matrix4();
    const leafColor = new THREE.Color();
    const leafBase = new THREE.Color(0x2e6b32);
    const leafDark = new THREE.Color(0x214d24);
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < count * 20) {
      guard++;
      const x = (rand() * 2 - 1) * GROUND_HALF_WIDTH * 0.94;
      const z = (rand() * 2 - 1) * GROUND_HALF_DEPTH * 0.9;
      const nearRoad = Math.abs(z - roadCenterZ(x)) < 6;
      const nearRiver = Math.abs(z - RIVER_Z) < 7;
      const nearCamp = Math.abs(x) > GROUND_HALF_WIDTH * 0.78;
      const nearPriceTicks = Math.abs(z - 20) < 4.5;
      const clashDist = Math.hypot(x - CLASH_CENTER[0], z - CLASH_CENTER[1]);
      const inWarZone = clashDist < 24;
      if (nearRoad || nearRiver || nearCamp || nearPriceTicks || inWarZone) continue;
      const y = terrainHeightAt(x, z);
      const scale = 0.7 + rand() * 0.9;
      m.compose(
        new THREE.Vector3(x, y + 0.6 * scale, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2),
        new THREE.Vector3(scale, scale, scale),
      );
      trunks.setMatrixAt(placed, m);
      m.compose(
        new THREE.Vector3(x, y + 1.2 * scale, z),
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale),
      );
      leaves.setMatrixAt(placed, m);
      leafColor.copy(leafBase).lerp(leafDark, rand() * 0.5);
      leaves.setColorAt(placed, leafColor);
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
      group.position.set(x, terrainHeightAt(x, z), z);
      this.scene.add(group);
    }
  }

  private buildCamps(): void {
    this.bearsAnchor.position.set(-CAMP_X, 0, roadCenterZ(-CAMP_X));
    this.bullsAnchor.position.set(CAMP_X, 0, roadCenterZ(CAMP_X));
    this.scene.add(this.bearsAnchor, this.bullsAnchor);

    this.buildCampMarkers(this.bearsAnchor, 0xe0483f, 'BEARS', 'SELL SIDE');
    this.buildCampMarkers(this.bullsAnchor, 0x36c17a, 'BULLS', 'BUY SIDE');
  }

  private buildCampMarkers(anchor: THREE.Object3D, color: number, label: string, sub: string): void {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.3 });
    const poleGeo = new THREE.CylinderGeometry(0.14, 0.14, 8.4, 6);
    for (const px of [-3.1, 3.1]) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(px, 4.2, 0);
      pole.castShadow = true;
      anchor.add(pole);
    }

    const bannerTex = makeCanvasTexture((ctx, w, h) => {
      const hex = `#${color.toString(16).padStart(6, '0')}`;
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, w, h);
      // subtle diagonal insignia stripes
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#000000';
      for (let sx = -h; sx < w; sx += 44) {
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + h * 0.6, h);
        ctx.lineTo(sx + h * 0.6 + 18, h);
        ctx.lineTo(sx + 18, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = '800 92px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h / 2 - 14);
      ctx.font = '600 30px system-ui, sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(sub, w / 2, h / 2 + 58);
    }, 640, 256);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(6.2, 2.48),
      new THREE.MeshStandardMaterial({ map: bannerTex, side: THREE.DoubleSide, roughness: 0.85 }),
    );
    banner.position.set(0, 6.6, 0);
    banner.castShadow = true;
    anchor.add(banner);

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
  }

  private buildPriceTicks(): void {
    for (let i = -3; i <= 3; i++) {
      const label = makeGroundLabel();
      label.mesh.position.set(i * 9, 0.05, 20);
      this.priceLabels.push(label);
      this.scene.add(label.mesh);
    }
  }

  /** Refresh the decorative ground price ticks around the current price. */
  setCenterPrice(price: number, step: number): void {
    for (let i = 0; i < this.priceLabels.length; i++) {
      const offsetIndex = i - Math.floor(this.priceLabels.length / 2);
      const value = price + offsetIndex * step;
      const { canvas, texture } = this.priceLabels[i];
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '700 42px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = offsetIndex === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.42)';
      ctx.fillText(value.toLocaleString('en-US', { maximumFractionDigits: 0 }), canvas.width / 2, canvas.height / 2);
      texture.needsUpdate = true;
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

    this.waterTime += dt;
    if (this.waterMat) {
      this.waterMat.opacity = 0.78 + Math.sin(this.waterTime * 0.8) * 0.04;
    }

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
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
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
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
