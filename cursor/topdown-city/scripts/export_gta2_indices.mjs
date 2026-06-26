#!/usr/bin/env node
/** Export all GTA2 ped animation frames for one body type (from gta2_ped_anim_map.json). */
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { createCanvas, ImageData } from 'canvas';

const here = path.dirname(fileURLToPath(import.meta.url));
const styViewer =
  process.env.GTA2_STY_VIEWER || path.join(here, 'vendor', 'gta2-sty-viewer-js');
const { STY } = await import(pathToFileURL(path.join(styViewer, 'js/sty.js')).href);

global.ImageData = ImageData;

const mapPath = path.join(here, 'gta2_ped_anim_map.json');
const animMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const [styPath, outDir, remapIdStr, bodyType = 'male'] = process.argv.slice(2);
const remapId = parseInt(remapIdStr || '27', 10);
const body = animMap.body_types[bodyType] || animMap.body_types.male;
const baseId = body.base_id;

const SLOTS = [];
for (const [clipId, clip] of Object.entries(animMap.clips)) {
  for (let f = 0; f < clip.count; f++) {
    SLOTS.push({
      clip: clipId,
      frame: f,
      folder: `${clipId}${f}`,
      ped_sprite: baseId + clip.offset + f,
    });
  }
}

const CANVAS_W = 36;
const CANVAS_H = 36;
const ANCHOR_X = 18;
const ANCHOR_Y = 35;

const buf = fs.readFileSync(styPath);
const sty = new STY(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const peds = sty.data.sprites.ped;
const pal = sty.data.virtualPalettes.ped_remap[remapId]?.physicalPalette;
if (!pal) {
  console.error('missing remap', remapId);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

for (let i = 0; i < SLOTS.length; i++) {
  const slot = SLOTS[i];
  const pedIdx = slot.ped_sprite;
  const s = peds[pedIdx];
  if (!s) {
    console.error('missing ped sprite', pedIdx, slot, 'body', bodyType);
    process.exit(1);
  }
  const bmp = s.bitmap;
  const w = bmp.width;
  const h = bmp.height;
  const ox = ANCHOR_X - (w >> 1);
  const oy = ANCHOR_Y - h + 1;

  const img = bmp.getImgData(pal);
  const c = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = c.getContext('2d');
  const norm = ctx.createImageData(CANVAS_W, CANVAS_H);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const cx = x + ox;
      const cy = y + oy;
      if (cx < 0 || cx >= CANVAS_W || cy < 0 || cy >= CANVAS_H) continue;
      const di = (cy * CANVAS_W + cx) * 4;
      norm.data[di] = img.data[si];
      norm.data[di + 1] = img.data[si + 1];
      norm.data[di + 2] = img.data[si + 2];
      norm.data[di + 3] = img.data[si + 3];
    }
  }
  ctx.putImageData(norm, 0, 0);
  fs.writeFileSync(path.join(outDir, `frame_${String(i).padStart(3, '0')}.png`), c.toBuffer('image/png'));

  const indices = Array.from({ length: CANVAS_H }, () => Array(CANVAS_W).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = bmp.data[y * w + x];
      const cx = x + ox;
      const cy = y + oy;
      if (cx < 0 || cx >= CANVAS_W || cy < 0 || cy >= CANVAS_H) continue;
      if (idx === 0) {
        const si = (y * w + x) * 4;
        if (img.data[si + 3] === 0) continue;
      }
      indices[cy][cx] = idx;
    }
  }
  fs.writeFileSync(
    path.join(outDir, `frame_${String(i).padStart(3, '0')}.idx.json`),
    JSON.stringify({
      w: CANVAS_W,
      h: CANVAS_H,
      indices,
      slot_index: i,
      clip: slot.clip,
      clip_frame: slot.frame,
      folder: slot.folder,
      ped_sprite: pedIdx,
      body_type: bodyType,
      base_id: baseId,
    })
  );
}

fs.writeFileSync(
  path.join(outDir, 'slots.json'),
  JSON.stringify({ remap: remapId, body_type: bodyType, base_id: baseId, slots: SLOTS }, null, 2)
);

console.log('ok', outDir, remapId, bodyType, 'slots', SLOTS.length, 'peds', SLOTS.map((s) => s.ped_sprite).join(','));
