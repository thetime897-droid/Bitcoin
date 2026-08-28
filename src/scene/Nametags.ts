import * as THREE from 'three';
import type { CampSide } from './Battlefield';

interface Tag {
  sprite: THREE.Sprite;
  side: CampSide;
  /** Set every frame the owning unit reports in; stale tags get hidden. */
  seen: boolean;
}

const BEARS_HEX = '#ff6b60';
const BULLS_HEX = '#4fe39a';

/** Cap on simultaneously displayed handles. Past this the field turns into
 * a wall of text and nobody's name is readable, which defeats the point. */
const MAX_TAGS = 46;

const LABEL_W = 320;
const LABEL_H = 84;

/** Stable bright colour per handle, so a viewer's name looks the same every
 * time they turn up. Hue from the name, fixed high saturation/lightness so
 * it stays legible against grass, dirt and smoke alike. */
function nameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 85%, 76%)`;
}

/**
 * Floating handles above individual units, for viewers who have been
 * enlisted from chat.
 *
 * One sprite and one small canvas texture per active handle - a few dozen
 * at most, so individual sprites are cheaper than the bookkeeping an
 * instanced text atlas would need.
 */
export class Nametags {
  private readonly tags = new Map<string, Tag>();
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  has(name: string): boolean {
    return this.tags.has(name);
  }

  get size(): number {
    return this.tags.size;
  }

  /** Mark every tag unseen; anything not placed this frame is hidden. */
  beginFrame(): void {
    for (const tag of this.tags.values()) tag.seen = false;
  }

  endFrame(): void {
    for (const tag of this.tags.values()) {
      if (!tag.seen) tag.sprite.visible = false;
    }
  }

  /** Called by the owning unit each frame with its current position. */
  place(name: string, side: CampSide, x: number, y: number, z: number): void {
    let tag = this.tags.get(name);
    if (!tag) {
      if (this.tags.size >= MAX_TAGS) return;
      tag = this.create(name, side);
      this.tags.set(name, tag);
    }
    tag.side = side;
    tag.seen = true;
    tag.sprite.position.set(x, y, z);
    tag.sprite.visible = true;
  }

  remove(name: string): void {
    const tag = this.tags.get(name);
    if (!tag) return;
    this.scene.remove(tag.sprite);
    const mat = tag.sprite.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.dispose();
    this.tags.delete(name);
  }

  private create(name: string, side: CampSide): Tag {
    const canvas = document.createElement('canvas');
    canvas.width = LABEL_W;
    canvas.height = LABEL_H;
    const ctx = canvas.getContext('2d')!;
    const accent = side === 'bears' ? BEARS_HEX : BULLS_HEX;

    ctx.font = '700 40px system-ui, sans-serif';
    const textWidth = Math.min(LABEL_W - 46, ctx.measureText(name).width);
    const chipW = textWidth + 40;
    const chipX = (LABEL_W - chipW) / 2;

    // Dark chip keeps the handle readable over any terrain colour.
    ctx.fillStyle = 'rgba(8, 10, 14, 0.78)';
    ctx.beginPath();
    ctx.roundRect(chipX, 14, chipW, 52, 12);
    ctx.fill();

    // Team-coloured bar on the leading edge: whose side they fight on stays
    // obvious even though the handle itself is individually coloured.
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(chipX, 14, 6, 52, 3);
    ctx.fill();

    ctx.fillStyle = nameColor(name);
    ctx.font = '700 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, LABEL_W / 2 + 3, 41, LABEL_W - 46);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
    );
    // Sized so a handle stays readable at the cinematic camera distance
    // without towering over the unit carrying it.
    sprite.scale.set(6.2, 1.63, 1);
    sprite.renderOrder = 5;
    this.scene.add(sprite);

    return { sprite, side, seen: true };
  }
}
