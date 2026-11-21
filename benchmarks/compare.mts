import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { cpus, platform, release, tmpdir, totalmem } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const card = "<article class=\"keep drop\" data-extra=\"remove\"><h2>Title &amp; text</h2><p title=\"ok\">Hello <b>world</b> <a href=\"https://example.com\" onclick=\"alert(1)\">link</a></p><!--comment--></article>";
const cleanCard = "<article class=\"keep\"><h2>Title &amp; text</h2><p title=\"ok\">Hello <b>world</b> <a href=\"https://example.com\">link</a></p></article>";
const options = {
  errorHandling: { attribute: "discardAttribute", attributeSetValue: "dropValue", tag: "discardElement" },
  tags: {
    a: { attributes: { href: { mode: "simple", value: /^https:\/\// } } },
    article: { attributes: { class: { delimiter: " ", mode: "set", values: ["keep"] } } },
    b: {},
    h2: {},
    p: { attributes: { title: { mode: "simple", value: "*" } } },
  },
};
const workloads = [
  { batch: 100, name: "small", repeats: 1, warmup: 30 },
  { batch: 5, name: "medium", repeats: 50, warmup: 5 },
  { batch: 1, name: "large", repeats: 1000, warmup: 2 },
];

type Enforce = (html: string, schema: unknown) => string;

async function collectedMemory() {
  const collect = global.gc;
  assert(collect, "Run workers with --expose-gc");
  // Allow pending DOM cleanup and recently returned stack frames to settle.
  await new Promise<void>((done) => {
    setImmediate(done);
  });
  collect();
  await new Promise<void>((done) => {
    setImmediate(done);
  });
  collect();
  return process.memoryUsage();
}

async function worker(entry: string, mode: string) {
  const beforeImport = await collectedMemory();
  const started = performance.now();
  const { enforceHtml } = createRequire(import.meta.url)(entry) as { enforceHtml: Enforce; };
  const importMs = performance.now() - started;
  assert.equal(typeof enforceHtml, "function");

  if (mode === "cold") {
    const callStarted = performance.now();
    const output = enforceHtml(card, options);
    const firstCallMs = performance.now() - callStarted;
    assert.equal(output, cleanCard);
    return { afterFirstCall: await collectedMemory(), beforeImport, firstCallMs, importMs };
  }

  if (mode === "memory") {
    assert.equal(enforceHtml(card, options), cleanCard);
    const checkpoints = [{ calls: 0, memory: await collectedMemory() }];
    for (let batch = 1; batch <= 5; batch++) {
      for (let i = 0; i < 1000; i++) {
        assert.equal(enforceHtml(card, options), cleanCard);
      }
      checkpoints.push({ calls: batch * 1000, memory: await collectedMemory() });
    }
    return { beforeImport, checkpoints, peakRssKiB: process.resourceUsage().maxRSS };
  }

  const workload = workloads.find((item) => {
    return item.name === mode;
  });
  assert(workload, `Unknown workload: ${mode}`);
  const input = card.repeat(workload.repeats);
  const expected = cleanCard.repeat(workload.repeats);
  for (let i = 0; i < workload.warmup; i++) {
    assert.equal(enforceHtml(input, options), expected);
  }
  const beforeTimed = await collectedMemory();
  const msPerCall = [];
  let output = "";
  let observedHeap = beforeTimed.heapUsed;
  for (let batch = 0; batch < 7; batch++) {
    const batchStarted = performance.now();
    for (let i = 0; i < workload.batch; i++) {
      output = enforceHtml(input, options);
    }
    msPerCall.push((performance.now() - batchStarted) / workload.batch);
    assert.equal(output, expected);
    observedHeap = Math.max(observedHeap, process.memoryUsage().heapUsed);
  }
  return {
    afterCollected: await collectedMemory(),
    beforeTimed,
    bytes: Buffer.byteLength(input),
    callsPerBatch: workload.batch,
    msPerCall,
    observedHeap,
    peakRssKiB: process.resourceUsage().maxRSS,
  };
}

async function compare() {
  const [legacy, current, output] = process.argv.slice(2);
  assert(legacy && current && output, "Usage: npx tsx benchmarks/compare.mts LEGACY.cjs CURRENT.cjs RESULTS.json");
  const { ModuleKind, ScriptTarget, transpileModule } = await import("typescript");
  const directory = mkdtempSync(join(tmpdir(), "domsanitize-benchmark-worker-"));
  const compiledWorker = join(directory, "worker.mjs");
  writeFileSync(compiledWorker, transpileModule(readFileSync(fileURLToPath(import.meta.url), "utf8"), {
    compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
  }).outputText);

  const entries = { current: resolve(current), legacy: resolve(legacy) };
  const samples: { implementation: string; mode: string; result: unknown; round: number; }[] = [];
  for (const mode of ["cold", "small", "medium", "large", "memory"]) {
    const rounds = mode === "cold" ? 7 : 3;
    for (let round = 0; round < rounds; round++) {
      // Alternate execution order. Each sample runs in a fresh native Node process;
      // TypeScript transpilation is completed before any measured worker starts.
      const order = round % 2 === 0 ? ["legacy", "current"] as const : ["current", "legacy"] as const;
      for (const implementation of order) {
        const run = spawnSync(process.execPath, ["--expose-gc", compiledWorker, "--worker", entries[implementation], mode], {
          encoding: "utf8",
          maxBuffer: 1024 * 1024,
          timeout: 120000,
        });
        assert.equal(run.status, 0, `${implementation}/${mode}: ${run.error?.message ?? run.stderr}`);
        const result: unknown = JSON.parse(run.stdout);
        samples.push({ implementation, mode, result, round });
        console.log(`${mode}: ${implementation}, process ${round + 1}/${rounds} complete`);
      }
    }
  }
  const report = {
    artifactSha256: Object.fromEntries(Object.entries(entries).map(([name, entry]) => {
      return [name, createHash("sha256").update(readFileSync(entry)).digest("hex")];
    })),
    entries,
    environment: { arch: process.arch, cpu: cpus()[0]?.model, cpus: cpus().length, node: process.version, platform: platform(), release: release(), totalMemoryBytes: totalmem() },
    generatedAt: new Date().toISOString(),
    methodology: { coldProcesses: 7, memoryCallsPerProcess: 5000, processesPerWarmWorkload: 3, timedBatchesPerProcess: 7, workloads },
    samples,
  };
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Saved ${samples.length} process samples to ${output}`);
}

if (process.argv[2] === "--worker") {
  const entry = process.argv[3];
  const mode = process.argv[4];
  assert(entry && mode);
  console.log(JSON.stringify(await worker(entry, mode)));
} else {
  await compare();
}
