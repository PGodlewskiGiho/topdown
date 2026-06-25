#!/usr/bin/env node
/** Debug sheet: export a block of ped sprites from bil.sty (not used for direction mapping). */
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { createCanvas, ImageData } from 'canvas';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(here, '..');
const outDir = path.join(siteRoot, 'assets', 'people', 'gta2', 'direction-picker');
const outSheet = process.env.OUT_SHEET
  ? path.join(siteRoot, process.env.OUT_SHEET)
  : path.join(siteRoot, 'assets', 'people', 'gta2', 'direction-picker.png');
const outSubdir = process.env.OUT_SUBDIR
  ? path.join(siteRoot, process.env.OUT_SUBDIR)
  : outDir;

const styPath = process.env.GTA2_STY || '/tmp/bil.sty';
const styViewer =
  process.env.GTA2_STY_VIEWER ||
  path.join(here, 'vendor', 'gta2-sty-viewer-js');
const remapId = parseInt(process.env.GTA2_REMAP || '27', 10);

// Default male block — 8 consecutive facings (verify visually before mapping).
const PED_INDICES = (process.env.PED_BLOCK || '18-25')
  .split(',')
  .flatMap((part) => {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      const out = [];
      for (let i = a; i <= b; i++) out.push(i);
      return out;
    }
    return [parseInt(part, 10)];
  });

const CANVAS_W = 22;
const CANVAS_H = 22;
const ANCHOR_X = 11;
const ANCHOR_Y = 21;
const SCALE = 10;
const PAD = 12;
const LABEL_H = 28;

const { STY } = await import(pathToFileURL(path.join(styViewer, 'js/sty.js')).href);
global.ImageData = ImageData;

const buf = fs.readFileSync(styPath);
const sty = new STY(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const peds = sty.data.sprites.ped;
const pal = sty.data.virtualPalettes.ped_remap[remapId]?.physicalPalette;
if (!pal) {
  console.error('missing ped_remap', remapId);
  process.exit(1);
}

function exportPed(pedIdx) {
  const s = peds[pedIdx];
  if (!s) throw new Error('missing ped ' + pedIdx);
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
  return c;
}

fs.mkdirSync(outSubdir, { recursive: true });

const cellW = CANVAS_W * SCALE;
const cellH = CANVAS_H * SCALE + LABEL_H;
const sheetW = PED_INDICES.length * (cellW + PAD) + PAD;
const sheetH = cellH + PAD * 2;
const sheet = createCanvas(sheetW, sheetH);
const sctx = sheet.getContext('2d');

sctx.fillStyle = '#1a1a22';
sctx.fillRect(0, 0, sheetW, sheetH);
sctx.font = 'bold 18px monospace';
sctx.textAlign = 'center';
sctx.fillStyle = '#f0f0f0';

const meta = {
  source: 'bil.sty',
  remap: remapId,
  note: 'Male pedestrian (graphic_type 0). Assign each ped index to a game direction.',
  game_directions: ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'],
  sprites: [],
};

for (let i = 0; i < PED_INDICES.length; i++) {
  const pedIdx = PED_INDICES[i];
  const frame = exportPed(pedIdx);
  const x0 = PAD + i * (cellW + PAD);
  const y0 = PAD;

  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(frame, x0, y0, cellW, cellH - LABEL_H);

  const label = `ped ${pedIdx}`;
  sctx.fillStyle = '#ffcc44';
  sctx.fillText(label, x0 + cellW / 2, y0 + cellH - 8);
  sctx.fillStyle = '#888';
  sctx.font = '14px monospace';
  sctx.fillText(`slot ${i}`, x0 + cellW / 2, y0 + cellH - LABEL_H - 6);
  sctx.font = 'bold 18px monospace';

  const singlePath = path.join(outSubdir, `ped_${pedIdx}.png`);
  const big = createCanvas(cellW, cellH - LABEL_H);
  const bctx = big.getContext('2d');
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(frame, 0, 0, cellW, cellH - LABEL_H);
  fs.writeFileSync(singlePath, big.toBuffer('image/png'));

  meta.sprites.push({ slot: i, ped_index: pedIdx, file: `direction-picker/ped_${pedIdx}.png` });
}

fs.writeFileSync(outSheet, sheet.toBuffer('image/png'));
fs.writeFileSync(path.join(outSubdir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
fs.writeFileSync(
  path.join(outSubdir, 'README.txt'),
  `GTA2 direction picker — male ped, remap ${remapId} (blue shirt / jeans)\n\n` +
    `Open ../direction-picker.png\n\n` +
    `8 sprites left→right = slot 0…7 (ped ${PED_INDICES.join(', ')})\n\n` +
    `Reply with mapping, e.g.:\n` +
    `  ped 23 = E\n` +
    `  ped 21 = S\n` +
    `  …\n\n` +
    `Game uses screen coords: +X = East, +Y = South (W key = North).\n`
);

console.log('wrote', outSheet);
console.log('peds', PED_INDICES.join(','));
