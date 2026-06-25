#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createCanvas, ImageData } from 'canvas';
import { STY } from '/tmp/gta2-sty-viewer/js/sty.js';

global.ImageData = ImageData;

const [styPath, outDir, remapIdStr] = process.argv.slice(2);
const remapId = parseInt(remapIdStr || '27', 10);

const buf = fs.readFileSync(styPath);
const sty = new STY(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const peds = sty.data.sprites.ped;
const pal = sty.data.virtualPalettes.ped_remap[remapId]?.physicalPalette;
if (!pal) {
  console.error('missing remap', remapId);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
for (let i = 0; i < 16; i++) {
  const s = peds[i];
  if (!s) continue;
  const img = s.bitmap.getImgData(pal);
  const c = createCanvas(img.width, img.height);
  c.getContext('2d').putImageData(img, 0, 0);
  fs.writeFileSync(path.join(outDir, `frame_${String(i).padStart(2, '0')}.png`), c.toBuffer('image/png'));
}
console.log('ok', outDir, remapId);
