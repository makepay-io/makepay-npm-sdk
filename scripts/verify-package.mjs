#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(join(repositoryRoot, "package.json"), "utf8"),
);
const expectedFiles = [
  "LICENSE",
  "README.md",
  "dist/index.d.ts",
  "dist/index.js",
  "package.json",
].sort();
const secretPatterns = [
  ["npm access token", /\bnpm_[A-Za-z0-9]{36,}\b/g],
  [
    "GitHub token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/g,
  ],
  ["Vercel access token", /\bvcp_[A-Za-z0-9]{30,}\b/g],
  ["Supabase access token", /\bsbp_[A-Za-z0-9]{30,}\b/g],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["live payment secret", /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g],
  ["private key", /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----/g],
  [
    "registry authentication value",
    /(?:_authToken|NODE_AUTH_TOKEN|NPM_TOKEN)\s*[:=]\s*["']?[^\s"']{8,}/g,
  ],
  ["MakeCrypto API secret", /\bmksec_[A-Za-z0-9_-]{20,}\b/g],
  ["MakePay webhook secret", /\bmkwhsec_[A-Za-z0-9_-]{20,}\b/g],
];

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    fail(
      `${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout;
}

function listFiles(root, baseRoot = root) {
  const files = [];

  for (const entry of readdirSync(root)) {
    const absolutePath = join(root, entry);
    if (statSync(absolutePath).isDirectory()) {
      files.push(...listFiles(absolutePath, baseRoot));
    } else {
      files.push(relative(baseRoot, absolutePath).replaceAll("\\", "/"));
    }
  }

  return files;
}

function assertExactFiles(actualFiles, source) {
  const normalized = [...actualFiles].sort();
  if (JSON.stringify(normalized) !== JSON.stringify(expectedFiles)) {
    const missing = expectedFiles.filter((file) => !normalized.includes(file));
    const unexpected = normalized.filter(
      (file) => !expectedFiles.includes(file),
    );
    fail(
      `${source} does not match the release allowlist.` +
        ` Missing: ${missing.join(", ") || "none"}.` +
        ` Unexpected: ${unexpected.join(", ") || "none"}.`,
    );
  }
}

if (packageJson.name !== "@makecrypto/makepay") {
  fail("package.json must publish @makecrypto/makepay.");
}
if (packageJson.version !== "0.4.0") {
  fail("package.json must publish version 0.4.0.");
}
if (
  JSON.stringify(packageJson.files) !==
  JSON.stringify(["dist", "README.md", "LICENSE"])
) {
  fail("package.json files must remain the exact reviewed release allowlist.");
}

const compilerOptions = JSON.parse(
  readFileSync(join(repositoryRoot, "tsconfig.json"), "utf8"),
).compilerOptions;
for (const option of [
  "declarationMap",
  "sourceMap",
  "inlineSourceMap",
  "inlineSources",
]) {
  if (compilerOptions[option] === true) {
    fail(`tsconfig.json must not enable ${option}.`);
  }
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), "makepay-sdk-pack-"));
let tarballPath = null;

try {
  const packed = JSON.parse(
    run(process.platform === "win32" ? "npm.cmd" : "npm", [
      "pack",
      "--json",
      "--ignore-scripts",
    ]),
  );
  const result = packed[0];
  if (!result?.filename || !Array.isArray(result.files)) {
    fail("npm pack did not return a valid package manifest.");
  }

  assertExactFiles(
    result.files.map((file) => file.path),
    "npm pack manifest",
  );
  tarballPath = join(repositoryRoot, result.filename);
  run("tar", ["-xzf", tarballPath, "-C", temporaryDirectory]);

  const extractedRoot = join(temporaryDirectory, "package");
  const extractedFiles = listFiles(extractedRoot);
  assertExactFiles(extractedFiles, "packed tarball");

  for (const file of extractedFiles) {
    if (
      file.endsWith(".map") ||
      file.startsWith("src/") ||
      file.startsWith("tests/")
    ) {
      fail(`Packed tarball contains a source or source-map artifact: ${file}`);
    }

    const contents = readFileSync(join(extractedRoot, file), "utf8");
    if (/sourceMappingURL\s*=|sourceURL\s*=/.test(contents)) {
      fail(`Packed tarball contains a source-map reference in ${file}.`);
    }

    for (const [label, pattern] of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(contents)) {
        fail(`Packed tarball contains a possible ${label} in ${file}.`);
      }
    }
  }

  console.log(
    `Verified ${packageJson.name}@${packageJson.version}: exact artifact allowlist, no source maps, and no recognized secrets.`,
  );
} finally {
  if (tarballPath) rmSync(tarballPath, { force: true });
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
