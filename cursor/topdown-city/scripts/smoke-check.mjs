import { createHash } from "node:crypto";
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
  if (!existsSync(htmlFile)) continue;
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

const topdownMeta = path.join(siteRoot, "assets/people/topdown/meta.json");
if (!existsSync(topdownMeta)) {
  fail("missing assets/people/topdown/meta.json");
} else {
  const td = JSON.parse(readText(topdownMeta));
  const dirs = td.directions || ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
  const sampleDir = path.join(siteRoot, "assets/people/topdown/sprites/male_blue/walk0");
  const hashes = new Map();
  for (const d of dirs) {
    const png = path.join(sampleDir, `${d}.png`);
    if (!existsSync(png)) fail(`missing topdown sprite: sprites/male_blue/walk0/${d}.png`);
    const hash = createHash("md5").update(readFileSync(png)).digest("hex");
    if (hashes.has(hash)) {
      fail(`topdown ${d}.png duplicates ${hashes.get(hash)} — directions must differ`);
    }
    hashes.set(hash, d);
  }
  if (hashes.size < 8) fail(`expected 8 unique direction sprites, got ${hashes.size}`);
}

if (errors.length) {
  console.error("Smoke check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Smoke check passed: ${scriptRefs.length} scripts, build ${build}.`);
