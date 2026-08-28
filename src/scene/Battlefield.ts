import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { config } from '../config';
import { buildBarricadeGeometry, buildPineLeafGeometry } from './geometry';

export const GROUND_HALF_WIDTH = 78;
export const GROUND_HALF_DEPTH = 56;
export const CAMP_X = GROUND_HALF_WIDTH * 0.76;
const MAX_FRONTLINE_SHIFT = GROUND_HALF_WIDTH * 0.42;
const ROAD_Z = 4;

export const BEARS_HEX = 0xe0483f;
export const BULLS_HEX = 0x36c17a;

function makeCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 256,
  h = 256,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** A flat, ground-hugging text decal (like a painted yard line) rather than
 * a billboard sprite - reads as part of the terrain instead of a floating
 * HUD element bolted onto the 3D world. */
function makeGroundLabel(): { mesh: THREE.Mesh; canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 112;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
  const geo = new THREE.PlaneGeometry(7.6, 2.2);
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

export function terrainHeightAt(x: number, z: number): number {
  const flattener = THREE.MathUtils.smoothstep(Math.abs(z - ROAD_Z), 0, 10);
  return fbmHeight(x, z) * flattener;
}

export type CampSide = 'bears' | 'bulls';

/**
 * Team emblems, drawn as flat silhouettes. Both are built from a handful of
 * curves rather than loaded as images so the whole build stays a single
 * self-contained file with nothing to fetch at runtime.
 */
function drawBullEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  // Horns sweeping out and up from the crown of the head.
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * 0.26 * s, cy - 0.16 * s);
    ctx.quadraticCurveTo(cx + dir * 0.78 * s, cy - 0.26 * s, cx + dir * 0.74 * s, cy - 0.62 * s);
    ctx.quadraticCurveTo(cx + dir * 0.62 * s, cy - 0.34 * s, cx + dir * 0.20 * s, cy - 0.30 * s);
    ctx.closePath();
    ctx.fill();
  }
  // Ears tucked under the horns.
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + dir * 0.36 * s, cy - 0.06 * s, 0.16 * s, 0.09 * s, dir * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Head: broad at the brow, tapering into a heavy muzzle.
  ctx.beginPath();
  ctx.moveTo(cx - 0.30 * s, cy - 0.26 * s);
  ctx.quadraticCurveTo(cx - 0.36 * s, cy + 0.16 * s, cx - 0.20 * s, cy + 0.40 * s);
  ctx.quadraticCurveTo(cx, cy + 0.60 * s, cx + 0.20 * s, cy + 0.40 * s);
  ctx.quadraticCurveTo(cx + 0.36 * s, cy + 0.16 * s, cx + 0.30 * s, cy - 0.26 * s);
  ctx.quadraticCurveTo(cx, cy - 0.40 * s, cx - 0.30 * s, cy - 0.26 * s);
  ctx.closePath();
  ctx.fill();
}

function drawBearEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  // Round ears set wide on the skull.
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + dir * 0.42 * s, cy - 0.38 * s, 0.20 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Skull.
  ctx.beginPath();
  ctx.ellipse(cx, cy - 0.02 * s, 0.46 * s, 0.42 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Muzzle pushed forward and down.
  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.30 * s, 0.26 * s, 0.22 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTeamEmblem(ctx: CanvasRenderingContext2D, side: CampSide, cx: number, cy: number, s: number): void {
  if (side === 'bulls') drawBullEmblem(ctx, cx, cy, s);
  else drawBearEmblem(ctx, cx, cy, s);
}

/**
 * Owns the persistent 3D world: terrain, the contested frontline, the two
 * fortified camps, scenery and camera. Units, projectiles and aircraft are
 * separate modules positioned against the frontline this class tracks, so
 * the static world is never rebuilt when the market moves.
 *
 * Layout: Bears hold the left (-X), Bulls hold the right (+X), and the
 * frontline is a line running along Z whose X position is driven by market
 * pressure - it is literally pushed back and forth between them.
 */
export class Battlefield {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  private readonly frontlineGroup = new THREE.Group();
  private frontlineTargetX = 0;
  private frontlineX = 0;
  private readonly clock = new THREE.Clock();
  private controls: OrbitControls | null = null;
  private composer: EffectComposer | null = null;
  private cinematicT = 0;
  /** Damped aim point, so the camera eases toward the shifting line. */
  private lookAtX = 0;
  private disposed = false;
  private readonly priceLabels: { mesh: THREE.Mesh; canvas: HTMLCanvasElement; texture: THREE.CanvasTexture }[] = [];

  /** Shared with the ground shader so the territory tint tracks the line. */
  private readonly frontlineUniform = { value: 0 };
  private readonly lineGlowMat: THREE.MeshBasicMaterial;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: config.transparent,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.effectivePixelRatio());
    this.renderer.shadowMap.enabled = config.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (config.transparent) this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 500);
    this.camera.position.set(0, 42, 92);
    this.camera.lookAt(0, 1, -4);

    if (!config.transparent) {
      this.buildSky();
      this.scene.fog = new THREE.Fog(0xb8cdb2, 140, 270);
    }

    this.lineGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffe9b0,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    this.buildLighting();
    this.buildTerrain();
    this.buildRoad();
    this.buildFrontline();
    this.scene.add(this.frontlineGroup);
    this.buildScenery();
    this.buildCamp('bears');
    this.buildCamp('bulls');
    this.buildPriceTicks();

    if (config.interact) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.set(0, 2, -4);
      this.controls.maxPolarAngle = Math.PI * 0.49;
      this.controls.minDistance = 15;
      this.controls.maxDistance = 150;
      this.controls.enableDamping = true;
      this.controls.keys = { LEFT: 'KeyA', UP: 'KeyW', RIGHT: 'KeyD', BOTTOM: 'KeyS' };
      this.controls.listenToKeyEvents(window);
    }

    if (!config.transparent) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.5, 0.82));
      this.composer.addPass(new OutputPass());
    }

    this.resize();
  }

  /** Device pixel ratio times the optional supersampling factor. OBS
   * browser sources report a DPR of 1, so `?scale=1.5` is the only way to
   * render above the capture resolution and get cleaner edges. */
  private effectivePixelRatio(): number {
    return Math.min(window.devicePixelRatio * config.renderScale, 2.6);
  }

  private buildSky(): void {
    const tex = makeCanvasTexture((ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#3f6ea6');
      grad.addColorStop(0.4, '#87b6d4');
      grad.addColorStop(0.72, '#b6d2bd');
      grad.addColorStop(1, '#c8dabe');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }, 8, 512);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(320, 24, 18),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, toneMapped: false }),
    );
    this.scene.add(sky);
  }

  private buildLighting(): void {
    this.scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x3b5c2c, 0.8));

    const sun = new THREE.DirectionalLight(0xfff0d2, 1.55);
    sun.position.set(-46, 68, 34);
    sun.castShadow = config.quality !== 'low';
    if (sun.castShadow) {
      const mapSize = config.quality === 'high' ? 3072 : 1024;
      sun.shadow.mapSize.set(mapSize, mapSize);
      sun.shadow.camera.left = -110;
      sun.shadow.camera.right = 110;
      sun.shadow.camera.top = 75;
      sun.shadow.camera.bottom = -75;
      sun.shadow.camera.far = 220;
      sun.shadow.bias = -0.0012;
      sun.shadow.normalBias = 0.02;
    }
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  }

  private buildTerrain(): void {
    const segX = config.quality === 'low' ? 60 : 128;
    const segZ = config.quality === 'low' ? 40 : 84;
    const geo = new THREE.PlaneGeometry(GROUND_HALF_WIDTH * 2, GROUND_HALF_DEPTH * 2, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(0x4f8c41);
    const dark = new THREE.Color(0x2f5e26);
    const rand = seededRandom(7);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainHeightAt(x, z));
      const edge = Math.min(1, (Math.abs(z) / GROUND_HALF_DEPTH) * 1.1);
      const c = base.clone().lerp(dark, edge * 0.45 + rand() * 0.14);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    this.applyTerritoryShader(mat);
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  /**
   * Paints held territory straight onto the ground: everything left of the
   * frontline reads Bear red, everything right of it Bull green, with a
   * churned, scorched strip where the two armies actually meet. Done in the
   * shader (rather than by recoloring vertices on the CPU) so the boundary
   * can slide every frame at zero cost.
   */
  private applyTerritoryShader(mat: THREE.MeshStandardMaterial): void {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uFrontlineX = this.frontlineUniform;
      shader.uniforms.uBearColor = { value: new THREE.Color(0xb03127) };
      shader.uniforms.uBullColor = { value: new THREE.Color(0x14964f) };
      shader.uniforms.uScorch = { value: new THREE.Color(0x4a3a26) };

      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTerrainWorld;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n  vTerrainWorld = (modelMatrix * vec4(position, 1.0)).xyz;',
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vTerrainWorld;
           uniform float uFrontlineX;
           uniform vec3 uBearColor;
           uniform vec3 uBullColor;
           uniform vec3 uScorch;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           float dLine = vTerrainWorld.x - uFrontlineX;
           float sideT = smoothstep(-2.5, 2.5, dLine);
           vec3 heldColor = mix(uBearColor, uBullColor, sideT);
           // Held ground is strongest right behind the line and fades out
           // toward each camp, so the map reads as two territories meeting.
           float hold = mix(0.84, 0.52, smoothstep(0.0, 90.0, abs(dLine)));
           diffuseColor.rgb = mix(diffuseColor.rgb, heldColor, hold);
           // No-man's-land: a narrow strip of churned dirt right at the line.
           float noMans = 1.0 - smoothstep(1.5, 8.0, abs(dLine));
           diffuseColor.rgb = mix(diffuseColor.rgb, uScorch, noMans * 0.6);`,
        );
    };
    // Distinct key so this variant does not share a program with untinted
    // standard materials elsewhere in the scene.
    mat.customProgramCacheKey = () => 'territory-ground';
  }

  private buildRoad(): void {
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
    tex.repeat.set(20, 1);

    const geo = new THREE.PlaneGeometry(GROUND_HALF_WIDTH * 2 - 6, 7);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    mesh.position.set(0, 0.05, ROAD_Z);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  /**
   * The dividing line itself: a bright emissive strip flanked by sandbag
   * barricades in each side's colour. Lives in a group whose X is driven by
   * market pressure, so the whole boundary physically slides.
   */
  private buildFrontline(): void {
    const depth = GROUND_HALF_DEPTH * 2;

    const glowStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.65, depth), this.lineGlowMat);
    glowStrip.rotateX(-Math.PI / 2);
    glowStrip.position.y = 0.14;
    this.frontlineGroup.add(glowStrip);

    // Each side's colour bleeds a little way off the boundary so the
    // division still reads at a glance when the camera pulls back.
    for (const side of ['bears', 'bulls'] as CampSide[]) {
      const dir = side === 'bears' ? -1 : 1;
      const edge = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, depth),
        new THREE.MeshBasicMaterial({
          color: side === 'bears' ? BEARS_HEX : BULLS_HEX,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      edge.rotateX(-Math.PI / 2);
      edge.position.set(dir * 2.1, 0.1, 0);
      this.frontlineGroup.add(edge);
    }

    // Marker posts every few metres so the line reads as a built position,
    // not just a glowing decal.
    const postGeo = new THREE.CylinderGeometry(0.11, 0.11, 2.6, 5);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.9 });
    const postCount = 22;
    const posts = new THREE.InstancedMesh(postGeo, postMat, postCount);
    posts.castShadow = true;
    const m = new THREE.Matrix4();
    for (let i = 0; i < postCount; i++) {
      const z = -GROUND_HALF_DEPTH + (i / (postCount - 1)) * depth;
      m.makeTranslation(0, 1.3, z);
      posts.setMatrixAt(i, m);
    }
    this.frontlineGroup.add(posts);

    // Sandbag lines dug in on both sides of the boundary.
    const barricadeGeo = buildBarricadeGeometry();
    for (const side of ['bears', 'bulls'] as CampSide[]) {
      const dir = side === 'bears' ? -1 : 1;
      const count = 26;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(side === 'bears' ? BEARS_HEX : BULLS_HEX).lerp(new THREE.Color(0x2b2b2b), 0.45),
        roughness: 1,
      });
      const mesh = new THREE.InstancedMesh(barricadeGeo, mat, count);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const rand = seededRandom(side === 'bears' ? 91 : 137);
      for (let i = 0; i < count; i++) {
        const z = -GROUND_HALF_DEPTH + ((i + 0.5) / count) * depth + (rand() - 0.5) * 1.2;
        m.makeTranslation(dir * (2.1 + rand() * 0.7), 0.21, z);
        mesh.setMatrixAt(i, m);
      }
      this.frontlineGroup.add(mesh);
    }
  }

  private buildScenery(): void {
    const rand = seededRandom(42);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4530, roughness: 1 });
    // White base so the per-instance colors below aren't multiplied against
    // another dark green and crushed toward black.
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 1.2, 6);
    const leafGeo = buildPineLeafGeometry();

    const count = config.quality === 'high' ? 170 : config.quality === 'medium' ? 105 : 55;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count);
    trunks.castShadow = true;
    leaves.castShadow = true;
    const m = new THREE.Matrix4();
    const leafColor = new THREE.Color();
    const leafBase = new THREE.Color(0x35793a);
    const leafDark = new THREE.Color(0x214d24);
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < count * 25) {
      guard++;
      const x = (rand() * 2 - 1) * GROUND_HALF_WIDTH * 0.95;
      const z = (rand() * 2 - 1) * GROUND_HALF_DEPTH * 0.94;
      // Keep the fighting corridor, the road and the camps clear.
      const inCorridor = Math.abs(z - ROAD_Z) < 22 && Math.abs(x) < GROUND_HALF_WIDTH * 0.72;
      const nearRoad = Math.abs(z - ROAD_Z) < 7;
      const nearCamp = Math.abs(x) > GROUND_HALF_WIDTH * 0.7;
      const nearPriceTicks = Math.abs(z - (GROUND_HALF_DEPTH - 24)) < 4.5;
      if (inCorridor || nearRoad || nearCamp || nearPriceTicks) continue;
      const y = terrainHeightAt(x, z);
      const scale = 0.75 + rand() * 0.95;
      m.compose(
        new THREE.Vector3(x, y + 0.6 * scale, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2),
        new THREE.Vector3(scale, scale, scale),
      );
      trunks.setMatrixAt(placed, m);
      m.compose(new THREE.Vector3(x, y + 1.2 * scale, z), new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
      leaves.setMatrixAt(placed, m);
      leafColor.copy(leafBase).lerp(leafDark, rand() * 0.55);
      leaves.setColorAt(placed, leafColor);
      placed++;
    }
    trunks.count = placed;
    leaves.count = placed;
    this.scene.add(trunks, leaves);
  }

  /**
   * A fortified camp: perimeter walls open toward the enemy, an HQ block,
   * watchtowers, tents and a big two-post banner naming the side.
   */
  private buildCamp(side: CampSide): void {
    const isBears = side === 'bears';
    const hex = isBears ? BEARS_HEX : BULLS_HEX;
    const campX = isBears ? -CAMP_X : CAMP_X;
    // Local +X always points at the enemy; the bulls' camp is rotated so a
    // single build routine serves both.
    const facing = isBears ? 1 : -1;

    const anchor = new THREE.Group();
    anchor.position.set(campX, 0, ROAD_Z);
    this.scene.add(anchor);

    const built = new THREE.Group();
    built.rotation.y = facing === 1 ? 0 : Math.PI;
    anchor.add(built);

    const teamColor = new THREE.Color(hex);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8474, roughness: 1 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b5238, roughness: 1 });
    const accentMat = new THREE.MeshStandardMaterial({
      color: teamColor.clone().lerp(new THREE.Color(0x222222), 0.25),
      roughness: 0.85,
    });

    const tm = new THREE.Matrix4();

    // Perimeter: a long back wall with buttresses, plus two returns that
    // leave the enemy-facing side open for the armies to deploy through.
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.2, 40), stoneMat);
    backWall.position.set(-16, 2.1, 0);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    built.add(backWall);

    const buttressGeo = new THREE.BoxGeometry(1.8, 3.2, 1.6);
    const buttresses = new THREE.InstancedMesh(buttressGeo, stoneMat, 7);
    buttresses.castShadow = true;
    for (let i = 0; i < 7; i++) {
      tm.makeTranslation(-14.6, 1.6, -18 + i * 6);
      buttresses.setMatrixAt(i, tm);
    }
    built.add(buttresses);

    for (const zSide of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(24, 3.6, 1.4), stoneMat);
      wing.position.set(-4, 1.8, zSide * 20);
      wing.castShadow = true;
      wing.receiveShadow = true;
      built.add(wing);

      // Corner blockhouses at the back of the perimeter.
      const corner = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.4, 8, 3.4), stoneMat);
      shaft.position.y = 4;
      shaft.castShadow = true;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.5, 4.8), woodMat);
      deck.position.y = 8.2;
      deck.castShadow = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.2, 4), accentMat);
      roof.position.y = 9.5;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      corner.add(shaft, deck, roof);
      corner.position.set(-15, 0, zSide * 20);
      built.add(corner);
    }

    // HQ block with a team-coloured roof.
    const hq = new THREE.Group();
    const hqBody = new THREE.Mesh(new THREE.BoxGeometry(10, 4.4, 13), stoneMat);
    hqBody.position.y = 2.2;
    hqBody.castShadow = true;
    hqBody.receiveShadow = true;
    const hqRoof = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.9, 14.4), accentMat);
    hqRoof.position.y = 4.8;
    hqRoof.castShadow = true;
    hq.add(hqBody, hqRoof);
    hq.position.set(-9, 0, 0);
    built.add(hq);

    // Vehicle park: a hardstanding with a hangar alongside the HQ.
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0x5b5851, roughness: 1 }),
    );
    apron.position.set(-4, 0.09, -13);
    apron.receiveShadow = true;
    built.add(apron);

    const hangar = new THREE.Group();
    const hangarBody = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 7), stoneMat);
    hangarBody.position.y = 2;
    hangarBody.castShadow = true;
    const hangarRoof = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.7, 9, 12, 1, false, 0, Math.PI), accentMat);
    hangarRoof.rotation.z = Math.PI / 2;
    hangarRoof.position.y = 4;
    hangarRoof.castShadow = true;
    hangar.add(hangarBody, hangarRoof);
    hangar.position.set(-11, 0, -14);
    built.add(hangar);

    // Tents in staggered rows behind the staging area.
    const tentGeo = new THREE.ConeGeometry(1.9, 2.7, 5);
    const tentMat = new THREE.MeshStandardMaterial({
      color: teamColor.clone().lerp(new THREE.Color(0x141414), 0.4),
      roughness: 1,
    });
    const tents = new THREE.InstancedMesh(tentGeo, tentMat, 14);
    tents.castShadow = true;
    tents.receiveShadow = true;
    for (let i = 0; i < 14; i++) {
      const row = Math.floor(i / 7);
      const col = i % 7;
      tm.makeTranslation(-6 + row * 5, 1.35, 4 + col * 4.4 + row * 1.6);
      tents.setMatrixAt(i, tm);
    }
    built.add(tents);

    // Supply crates and fuel drums for clutter and a sense of scale.
    const crateGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const crates = new THREE.InstancedMesh(crateGeo, woodMat, 20);
    crates.castShadow = true;
    crates.receiveShadow = true;
    const crand = seededRandom(isBears ? 21 : 57);
    for (let i = 0; i < 20; i++) {
      tm.makeTranslation(-13 + crand() * 9, 0.6 + (crand() > 0.7 ? 1.2 : 0), -18 + crand() * 34);
      crates.setMatrixAt(i, tm);
    }
    built.add(crates);

    const drumGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.3, 8);
    const drums = new THREE.InstancedMesh(drumGeo, accentMat, 12);
    drums.castShadow = true;
    for (let i = 0; i < 12; i++) {
      tm.makeTranslation(-3 + crand() * 5, 0.65, -19 + crand() * 10);
      drums.setMatrixAt(i, tm);
    }
    built.add(drums);

    this.buildCampTower(built, side, teamColor, stoneMat, accentMat);
    this.buildCampTrench(built, teamColor);

    // Banner is parented to the unrotated anchor so its text always faces
    // the camera regardless of which side's camp it belongs to.
    this.addCampBanner(anchor, side, hex, isBears ? 'BEARS' : 'BULLS', isBears ? 'SELL SIDE' : 'BUY SIDE');
  }

  /**
   * The keep: a tall stone tower at the front of the camp, battlemented,
   * flying the side's colours with its animal emblem. It is the tallest
   * thing on the map, so each half reads as belonging to somebody from any
   * camera angle.
   */
  private buildCampTower(
    built: THREE.Object3D,
    side: CampSide,
    teamColor: THREE.Color,
    stoneMat: THREE.Material,
    accentMat: THREE.Material,
  ): void {
    const tower = new THREE.Group();
    tower.position.set(2, 0, 0);

    // Battered base, then the shaft.
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5.4, 3, 8), stoneMat);
    base.position.y = 1.5;
    base.castShadow = true;
    base.receiveShadow = true;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.0, 15, 8), stoneMat);
    shaft.position.y = 10.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    tower.add(base, shaft);

    // Corbelled gallery and crenellations.
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 3.7, 1.2, 8), stoneMat);
    gallery.position.y = 18.4;
    gallery.castShadow = true;
    tower.add(gallery);

    const merlonGeo = new THREE.BoxGeometry(1.3, 1.5, 1.0);
    const merlons = new THREE.InstancedMesh(merlonGeo, stoneMat, 10);
    merlons.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      q.setFromAxisAngle(up, -a);
      m.compose(
        new THREE.Vector3(Math.sin(a) * 4.0, 19.7, Math.cos(a) * 4.0),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      merlons.setMatrixAt(i, m);
    }
    tower.add(merlons);

    // Banded trim in team colour, so the tower is identifiable at distance.
    for (const y of [4.4, 12]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(4.05, 4.15, 0.7, 8), accentMat);
      band.position.y = y;
      band.castShadow = true;
      tower.add(band);
    }

    // Flagpole and the team flag itself.
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 11, 6),
      new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.35 }),
    );
    pole.position.y = 25.3;
    pole.castShadow = true;
    tower.add(pole);

    const flagTex = makeCanvasTexture((ctx, w, h) => {
      ctx.fillStyle = `#${teamColor.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      drawTeamEmblem(ctx, side, w / 2, h / 2, h * 0.72);
    }, 384, 256);

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(6.6, 4.4),
      new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9 }),
    );
    flag.position.set(0, 27.4, 3.4);
    flag.castShadow = true;
    tower.add(flag);

    built.add(tower);
  }

  /** Earthworks in front of the tower: a cut trench with a spoil berm
   * behind it, which is what the forward gun line sits in. */
  private buildCampTrench(built: THREE.Object3D, teamColor: THREE.Color): void {
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x4a3a26, roughness: 1 });

    // The cut itself, sunk just below the surface.
    const trench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 40), soilMat);
    trench.position.set(11, -0.45, 0);
    trench.receiveShadow = true;
    built.add(trench);

    // Spoil thrown up on the friendly side, with sandbags on the lip.
    const berm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 40), soilMat);
    berm.position.set(8.6, 0.5, 0);
    berm.castShadow = true;
    berm.receiveShadow = true;
    built.add(berm);

    const bagMat = new THREE.MeshStandardMaterial({
      color: teamColor.clone().lerp(new THREE.Color(0x2b2b2b), 0.5),
      roughness: 1,
    });
    const bagGeo = new THREE.BoxGeometry(1.5, 0.5, 1.8);
    const bags = new THREE.InstancedMesh(bagGeo, bagMat, 22);
    bags.castShadow = true;
    const m = new THREE.Matrix4();
    const rand = seededRandom(63);
    for (let i = 0; i < 22; i++) {
      m.makeTranslation(12.6 + rand() * 0.5, 0.28 + (rand() > 0.6 ? 0.5 : 0), -19 + i * 1.8);
      bags.setMatrixAt(i, m);
    }
    built.add(bags);
  }

  /**
   * The big wordmark sign. Parented to the unrotated anchor so its text
   * always faces the camera, and set off along Z so it stands clear of the
   * tower rather than clipping through it.
   */
  private addCampBanner(anchor: THREE.Object3D, side: CampSide, color: number, label: string, sub: string): void {
    const sign = new THREE.Group();
    sign.position.set(0, 0, 27);
    anchor.add(sign);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.35 });
    const poleGeo = new THREE.CylinderGeometry(0.16, 0.16, 12.4, 8);
    for (const px of [-4.6, 4.6]) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(px, 6.2, 0);
      pole.castShadow = true;
      sign.add(pole);
    }
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.3, 0.3), poleMat);
    crossbar.position.set(0, 12.2, 0);
    crossbar.castShadow = true;
    sign.add(crossbar);

    const tex = makeCanvasTexture((ctx, w, h) => {
      const hex = `#${color.toString(16).padStart(6, '0')}`;
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#000000';
      for (let sx = -h; sx < w; sx += 52) {
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + h * 0.55, h);
        ctx.lineTo(sx + h * 0.55 + 22, h);
        ctx.lineTo(sx + 22, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 8;
      ctx.strokeRect(12, 12, w - 24, h - 24);
      ctx.fillStyle = 'rgba(255,255,255,0.97)';
      drawTeamEmblem(ctx, side, 168, h / 2, h * 0.62);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 128px system-ui, sans-serif';
      ctx.fillText(label, w / 2 + 90, h / 2 - 18);
      ctx.font = '600 40px system-ui, sans-serif';
      ctx.letterSpacing = '7px';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(sub, w / 2 + 90, h / 2 + 74);
    }, 1024, 400);

    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(9.4, 3.67),
      new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.85 }),
    );
    banner.position.set(0, 10.2, 0);
    banner.castShadow = true;
    sign.add(banner);
  }

  private buildPriceTicks(): void {
    const z = GROUND_HALF_DEPTH - 24;
    for (let i = -3; i <= 3; i++) {
      const label = makeGroundLabel();
      label.mesh.position.set(i * 10.5, 0.07, z);
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
      ctx.font = '700 52px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Dark outline first: these sit on red or green held ground depending
      // on where the line is, so plain white text alone loses contrast.
      ctx.lineWidth = 9;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(value.toLocaleString('en-US', { maximumFractionDigits: 0 }), canvas.width / 2, canvas.height / 2);
      ctx.fillStyle = offsetIndex === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.72)';
      ctx.fillText(value.toLocaleString('en-US', { maximumFractionDigits: 0 }), canvas.width / 2, canvas.height / 2);
      texture.needsUpdate = true;
    }
  }

  /** -1 (sellers fully in control) .. +1 (buyers fully in control). A
   * positive ratio means buyers are winning, so the line is pushed toward
   * the bears' side (-X). */
  setPressureRatio(ratio: number): void {
    this.frontlineTargetX = -THREE.MathUtils.clamp(ratio, -1, 1) * MAX_FRONTLINE_SHIFT;
  }

  get frontlineWorldX(): number {
    return this.frontlineX;
  }

  update(): number {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.frontlineX = THREE.MathUtils.damp(this.frontlineX, this.frontlineTargetX, 1.1, dt);
    this.frontlineGroup.position.x = this.frontlineX;
    this.frontlineUniform.value = this.frontlineX;

    // Slow pulse on the boundary glow so a quiet market still has life.
    this.lineGlowMat.opacity = 0.5 + Math.sin(this.clock.elapsedTime * 1.6) * 0.12;

    if (this.controls) {
      this.controls.update();
    } else if (config.cinematic) {
      this.cinematicT += dt;
      const t = this.cinematicT;

      // A slow, hand-held-feeling side view. Three sweeps with deliberately
      // unrelated periods (roughly 7.5, 9.5 and 6 minutes) so the motion
      // never visibly repeats and never reverses sharply enough to read as
      // a mechanical oscillation. Amplitudes stay small: the camera must
      // never swing far enough back to show past the near edge of the
      // terrain slab, and the framing should stay recognisably the same
      // shot for a viewer who looks away and comes back.
      const angle = Math.sin(t * 0.0140) * 0.30;
      const radius = 54 + Math.sin(t * 0.0110) * 6;
      const height = 36.5 + Math.sin(t * 0.0175) * 2.5;
      this.camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius + 32);

      // Drift the aim toward whichever side is winning, damped hard so the
      // camera eases across rather than snapping when the line jumps.
      this.lookAtX = THREE.MathUtils.damp(this.lookAtX, this.frontlineX * 0.3, 0.35, dt);
      this.camera.lookAt(this.lookAtX, 3, -4);
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
    this.renderer.setPixelRatio(this.effectivePixelRatio());
    this.renderer.setSize(w, h);
    this.composer?.setPixelRatio(this.effectivePixelRatio());
    this.composer?.setSize(w, h);
  }

  /** Camera shake used for big liquidations - additive offset applied once
   * per frame from the effects layer, doesn't fight the cinematic drift. */
  shake(strength: number): void {
    this.camera.position.x += (Math.random() - 0.5) * strength;
    this.camera.position.y += (Math.random() - 0.5) * strength * 0.5;
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
