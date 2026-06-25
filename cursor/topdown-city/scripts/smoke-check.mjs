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
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(full, extension);
    return entry.isFile() && entry.name.endsWith(extension) ? [full] : [];
  });
}

const htmlFiles = [
  path.join(repoRoot, "index.html"),
  path.join(siteRoot, "index.html"),
  path.join(siteRoot, "404.html"),
];

for (const htmlFile of htmlFiles) {
  if (!existsSync(htmlFile)) continue;
  const html = readText(htmlFile);
  if (/\?v=/.test(html)) {
    fail(`${rel(htmlFile)} must not use ?v= cache-busting query params`);
  }
  if (/searchParams\.set\(\s*["']v["']/.test(html) || /localStorage\.setItem\(\s*["']tdc_build["']/.test(html)) {
    fail(`${rel(htmlFile)} must not add ?v= via redirect or localStorage`);
  }
  if (/location\.(replace|assign)/.test(html) && /\?v=/.test(html)) {
    fail(`${rel(htmlFile)} must not use location redirects with ?v=`);
  }
  const baseDir = path.dirname(htmlFile);
  const refs = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (isExternal(ref)) continue;
    const target = path.resolve(baseDir, stripQuery(ref));
    if (!existsSync(target)) {
      fail(`${rel(htmlFile)} references missing file: ${ref}`);
    }
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

const treeMetaPath = path.join(siteRoot, "assets/trees/meta.json");
if (existsSync(treeMetaPath)) {
  const treeMeta = JSON.parse(readText(treeMetaPath));
  for (const kind of Object.keys(treeMeta.kinds || {})) {
    const file = treeMeta.kinds[kind].file;
    const pngPath = path.join(siteRoot, "assets/trees", file);
    if (!existsSync(pngPath)) {
      fail(`missing tree sprite PNG (run npm run gen:trees): assets/trees/${file}`);
    }
  }
}

if (errors.length) {
  console.error("Smoke check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Smoke check passed: ${scriptRefs.length} scripts, no ?v= cache busting.`);
