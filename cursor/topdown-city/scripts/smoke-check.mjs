import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(here, "..");
const repoRoot = path.resolve(siteRoot, "..", "..");
const errors = [];

function rel(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function fail(message) {
  errors.push(message);
}

function stripQuery(ref) {
  return ref.split(/[?#]/, 1)[0];
}

function isExternal(ref) {
  return /^(https?:|mailto:|tel:|data:|#)/.test(ref);
}

function collectFiles(dir, extension) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(full, extension);
    return entry.isFile() && entry.name.endsWith(extension) ? [full] : [];
  });
}

function evalLivingSpriteDirTests() {
  const DIR = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
  function snap8Index(a) {
    const d = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.round(d / (Math.PI / 4)) % DIR.length;
  }
  function dirNameFromAngle(a) {
    return DIR[snap8Index(a)];
  }
  function dirNameFromDelta(dx, dy) {
    const mv = Math.hypot(dx, dy);
    if (mv < 0.001) return null;
    return dirNameFromAngle(Math.atan2(dy, dx));
  }
  function spriteDir(entity, opts = {}) {
    if (opts.keys) {
      const ix =
        (opts.keys["d"] || opts.keys["arrowright"] ? 1 : 0) -
        (opts.keys["a"] || opts.keys["arrowleft"] ? 1 : 0);
      const iy =
        (opts.keys["s"] || opts.keys["arrowdown"] ? 1 : 0) -
        (opts.keys["w"] || opts.keys["arrowup"] ? 1 : 0);
      const kd = dirNameFromDelta(ix, iy);
      if (kd) {
        entity._faceDir = kd;
        return kd;
      }
    }
    const mdx = entity._moveDx || 0;
    const mdy = entity._moveDy || 0;
    const fromInput = dirNameFromDelta(mdx, mdy);
    if (fromInput) {
      entity._faceDir = fromInput;
      return fromInput;
    }
    const vx = entity.vx || 0;
    const vy = entity.vy || 0;
    const fromVel = dirNameFromDelta(vx, vy);
    if (fromVel && Math.hypot(vx, vy) > 0.15) {
      entity._faceDir = fromVel;
      return fromVel;
    }
    return entity._faceDir || dirNameFromAngle(0);
  }

  const pedSim = { _faceDir: "S", _moveDx: 0, _moveDy: 0, vx: 0, vy: 0 };
  const keys = { w: true };
  if (spriteDir(pedSim, { keys }) !== "N") {
    fail("facing: W key should resolve to N, got " + pedSim._faceDir);
  }
  const pedSim2 = { _faceDir: "S", _moveDx: 1, _moveDy: 0, vx: 0, vy: 0 };
  if (spriteDir(pedSim2, {}) !== "E") {
    fail("facing: _moveDx=1 should resolve to E, got " + pedSim2._faceDir);
  }
  const dirs = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
  for (const d of dirs) {
    const layer = path.join(
      siteRoot,
      "assets/people/gta2/parts/bodies/male/skins/medium/walk0",
      `${d}.png`
    );
    if (!existsSync(layer)) fail(`missing GTA2 direction PNG: walk0/${d}.png`);
  }
}

const forbiddenRootIndex = path.join(repoRoot, "index.html");
if (existsSync(forbiddenRootIndex)) {
  fail(
    "repo root index.html must not exist — game is only in cursor/topdown-city/ (see AGENTS.md)"
  );
  const rootHtml = readText(forbiddenRootIndex);
  if (/location\.(replace|assign)/.test(rootHtml) || /location\.href\s*=/.test(rootHtml)) {
    fail("repo root index.html contains forbidden redirect scripts");
  }
}

const htmlFiles = [
  path.join(siteRoot, "index.html"),
  path.join(siteRoot, "404.html"),
];

for (const htmlFile of htmlFiles) {
  const html = readText(htmlFile);
  const baseDir = path.dirname(htmlFile);
  const refs = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (isExternal(ref)) continue;
    const target = path.resolve(baseDir, stripQuery(ref));
    if (!existsSync(target)) {
      fail(`${rel(htmlFile)} references missing file: ${ref}`);
    }
  }

  if (/\?v=/.test(html)) {
    fail(`${rel(htmlFile)} must not use ?v= cache-busting query params`);
  }
  if (/searchParams\.set\(\s*["']v["']/.test(html) || /localStorage\.setItem\(\s*["']tdc_build["']/.test(html)) {
    fail(`${rel(htmlFile)} must not add ?v= via redirect or localStorage`);
  }
  if (/location\.(replace|assign)/.test(html) || /location\.href\s*=/.test(html)) {
    fail(`${rel(htmlFile)} must not use location redirects (causes reload loops on Pages)`);
  }
}

const jsFilesToScan = [
  ...collectFiles(path.join(siteRoot, "js"), ".js"),
  path.join(siteRoot, "scripts", "smoke-check.mjs"),
];
for (const jsFile of jsFilesToScan) {
  const js = readText(jsFile);
  if (/\?v=/.test(js) && !jsFile.endsWith("smoke-check.mjs")) {
    fail(`${rel(jsFile)} must not append ?v= to asset URLs`);
  }
  if (/searchParams\.set\(\s*["']v["']/.test(js) || /localStorage\.setItem\(\s*["']tdc_build["']/.test(js)) {
    fail(`${rel(jsFile)} must not add ?v= via redirect or localStorage`);
  }
}

const siteIndex = readText(path.join(siteRoot, "index.html"));
const scriptRefs = [...siteIndex.matchAll(/<script\s+src=["']([^"']+)["']/g)].map((match) => stripQuery(match[1]));
const duplicateScripts = scriptRefs.filter((ref, index) => scriptRefs.indexOf(ref) !== index);
for (const ref of duplicateScripts) {
  fail(`duplicate script tag in cursor/topdown-city/index.html: ${ref}`);
}

const jsFiles = collectFiles(path.join(siteRoot, "js"), ".js")
  .map((file) => rel(file).replace("cursor/topdown-city/", ""))
  .sort();
const missingFromIndex = jsFiles.filter((file) => !scriptRefs.includes(file));
const missingOnDisk = scriptRefs.filter((ref) => !jsFiles.includes(ref));

for (const file of missingFromIndex) {
  fail(`JS file is not loaded by cursor/topdown-city/index.html: ${file}`);
}
for (const ref of missingOnDisk) {
  fail(`script tag points to missing JS file: ${ref}`);
}

const workflow = readText(path.join(repoRoot, ".github/workflows/deploy-pages.yml"));
if (!workflow.includes("path: cursor/topdown-city")) {
  fail(".github/workflows/deploy-pages.yml does not deploy cursor/topdown-city");
}

const agentsDoc = path.join(repoRoot, "AGENTS.md");
if (!existsSync(agentsDoc)) {
  fail("missing AGENTS.md at repo root (deploy rules for AI agents)");
}

evalLivingSpriteDirTests();

const gta2Root = path.join(siteRoot, "assets/people/gta2");
const gta2Meta = JSON.parse(readText(path.join(gta2Root, "meta.json")));
const gta2PngCount = collectFiles(path.join(gta2Root, "parts"), ".png").length;
if (gta2PngCount < 1000) {
  fail(`expected at least 1000 GTA2 layer PNGs, found ${gta2PngCount}`);
}
for (const combo of gta2Meta.combos_preview || []) {
  const preview = path.join(gta2Root, "previews", `${combo.id}.png`);
  if (!existsSync(preview)) {
    fail(`missing GTA2 preview PNG: assets/people/gta2/previews/${combo.id}.png`);
  }
  const layers = [
    ["shoes", combo.pants],
    ["pants", combo.pants],
    ["arms", combo.shirt],
    ["torsos", combo.shirt],
    ["skins", combo.skin],
    ["hairs", combo.hair],
  ];
  for (const [part, variant] of layers) {
    const layerPath = path.join(
      gta2Root,
      "parts/bodies",
      combo.body,
      part,
      variant,
      "walk0",
      "S.png"
    );
    if (!existsSync(layerPath)) {
      fail(`missing GTA2 layer PNG for combo ${combo.id}: ${rel(layerPath)}`);
    }
  }
}

if (errors.length) {
  console.error("Smoke check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Smoke check passed: ${scriptRefs.length} scripts, no ?v= cache busting.`);
