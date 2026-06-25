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

const versionPath = path.join(siteRoot, "version.json");
const version = JSON.parse(readText(versionPath));
const build = String(version.build || "");
if (!/^\d{10}$/.test(build)) {
  fail(`${rel(versionPath)} has invalid build value: ${version.build}`);
}

const htmlFiles = [
  path.join(repoRoot, "index.html"),
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

  const versionRefs = [...html.matchAll(/[?&]v=(\d+)/g)].map((match) => match[1]);
  for (const value of versionRefs) {
    if (value !== build) {
      fail(`${rel(htmlFile)} uses v=${value}, expected v=${build}`);
    }
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

console.log(`Smoke check passed: ${scriptRefs.length} scripts, build ${build}.`);
