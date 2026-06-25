#!/usr/bin/env node
/** Export pedestrian STY frames + palette-index grids (22×22) for layer masks. */
import fs from 'fs';
import path from 'path';
import { createCanvas, ImageData } from 'canvas';
import { STY } from '/tmp/gta2-sty-viewer/js/sty.js';

global.ImageData = ImageData;

const [styPath, outDir, remapIdStr, indicesArg] = process.argv.slice(2);
const remapId = parseInt(remapIdStr || '27', 10);
const CANVAS_W = 22;
const CANVAS_H = 22;
const ANCHOR_X = 11;
const ANCHOR_Y = 21;

function parseIndices(arg) {
  if (!arg) return [...Array(16).keys()];
  const out = [];
  for (const part of arg.split(',')) {
    const p = part.trim();
    if (!p) continue;
    if (p.includes('-')) {
      const [a, b] = p.split('-').map((x) => parseInt(x, 10));
      for (let i = a; i <= b; i++) out.push(i);
    } else {
      out.push(parseInt(p, 10));
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

const indices = parseIndices(indicesArg);

const buf = fs.readFileSync(styPath);
const sty = new STY(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const peds = sty.data.sprites.ped;
const pal = sty.data.virtualPalettes.ped_remap[remapId]?.physicalPalette;
if (!pal) {
  console.error('missing remap', remapId);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

for (const i of indices) {
  const s = peds[i];
  if (!s) {
    console.warn('skip missing ped', i);
    continue;
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
  const tag = String(i).padStart(3, '0');
  fs.writeFileSync(path.join(outDir, `frame_${tag}.png`), c.toBuffer('image/png'));

  const grid = Array.from({ length: CANVAS_H }, () => Array(CANVAS_W).fill(0));
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
      grid[cy][cx] = idx;
    }
  }
  fs.writeFileSync(
    path.join(outDir, `frame_${tag}.idx.json`),
    JSON.stringify({ w: CANVAS_W, h: CANVAS_H, sty_index: i, indices: grid })
  );
}
console.log('ok', outDir, remapId, indices.length, 'frames');
