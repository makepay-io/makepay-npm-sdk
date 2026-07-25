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
import { fileURLToPath, pathToFileURL } from "node:url";

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

for (const workflowPath of [
  ".github/workflows/ci.yml",
  ".github/workflows/publish.yml",
]) {
  const workflow = readFileSync(join(repositoryRoot, workflowPath), "utf8");
  const actionReferences = workflow
    .split(/\r?\n/)
    .filter((line) => /^\s*uses:/.test(line));
  if (!actionReferences.length) {
    fail(`${workflowPath} must use at least one pinned action.`);
  }
  for (const reference of actionReferences) {
    if (!/^\s*uses:\s+[^\s@]+@[a-f0-9]{40}\s+#\s+v\d+\.\d+\.\d+\s*$/.test(reference)) {
      fail(`${workflowPath} contains an unpinned action: ${reference.trim()}`);
    }
  }
}

const publishWorkflow = readFileSync(
  join(repositoryRoot, ".github/workflows/publish.yml"),
  "utf8",
);
if ((publishWorkflow.match(/id-token:\s*write/g) ?? []).length !== 1) {
  fail("Only the minimal npm publish job may receive OIDC permission.");
}
for (const requiredReleaseControl of [
  "prepare-candidate:",
  "needs: prepare-candidate",
  "environment: npm-release",
  "npm pack --ignore-scripts --json",
  "Upload immutable npm candidate",
  "Download the validated candidate",
  "candidate.sha256",
  "candidate.sha1",
  "candidate.integrity",
  "Checkout does not match immutable tag",
  "candidate.releaseTag",
  "candidate.workflowCommit",
  'npm publish "./release-candidate/${filename}"',
  "--ignore-scripts",
  "--provenance",
  "--tag next",
]) {
  if (!publishWorkflow.includes(requiredReleaseControl)) {
    fail(`Publish workflow is missing ${requiredReleaseControl}.`);
  }
}
if (publishWorkflow.includes('npm publish "release-candidate/${filename}"')) {
  fail("Publish workflow must use an explicit relative tarball path.");
}
const publishJob = publishWorkflow.slice(
  publishWorkflow.indexOf("  publish-next:"),
);
if (publishJob.includes("actions/checkout@")) {
  fail("The OIDC npm publish job must not checkout repository-controlled code.");
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

  const exported = await import(
    `${pathToFileURL(join(extractedRoot, "dist/index.js")).href}?verify=${Date.now()}`
  );
  for (const exportName of [
    "MakePayClient",
    "createAnonymousPaymentLink",
    "createMakePayDpopProof",
    "generateMakePayDpopKeyPair",
  ]) {
    if (typeof exported[exportName] !== "function") {
      fail(`Packed tarball is missing working export ${exportName}.`);
    }
  }

  console.log(
    `Verified ${packageJson.name}@${packageJson.version}: exact artifact allowlist, working runtime exports, no source maps, and no recognized secrets.`,
  );
} finally {
  if (tarballPath) rmSync(tarballPath, { force: true });
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
