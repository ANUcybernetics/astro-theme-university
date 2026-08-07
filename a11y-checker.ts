import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { availableParallelism } from "node:os";
import { dirname, join, relative } from "node:path";
import { Worker } from "node:worker_threads";
import { collectHtmlFiles } from "./link-checker.js";

export interface A11yViolation {
  page: string;
  id: string;
  impact: string | null;
  description: string;
  nodes: number;
}

interface WorkerResult {
  skipped?: boolean;
  violations?: A11yViolation[];
  error?: string;
}

// A page's scan result is a pure function of its HTML, so results are cached
// keyed by content hash: pages whose markup didn't change since the last build
// skip axe entirely. Stored without the page path — identical markup at two
// routes scans identically.
interface CachedPageResult {
  skipped?: boolean;
  violations?: Omit<A11yViolation, "page">[];
}

interface A11yCache {
  version: number;
  axeVersion: string;
  entries: Record<string, CachedPageResult>;
}

// Bump when the scan's semantics change outside axe-core itself (e.g. the
// worker's redirect-stub detection), which silently invalidates every entry.
// axe-core upgrades are caught separately via the recorded axeVersion.
const CACHE_SCHEMA_VERSION = 1;

const axeVersion: string = createRequire(import.meta.url)("axe-core/package.json").version;

async function readCache(cachePath: string): Promise<Record<string, CachedPageResult>> {
  // A missing, corrupt, or outdated cache all mean the same thing: scan
  // everything and rebuild it. Never fail the build over cache state.
  try {
    const parsed = JSON.parse(await readFile(cachePath, "utf-8")) as A11yCache;
    if (parsed.version !== CACHE_SCHEMA_VERSION || parsed.axeVersion !== axeVersion) return {};
    return parsed.entries ?? {};
  } catch {
    return {};
  }
}

async function writeCache(
  cachePath: string,
  entries: Record<string, CachedPageResult>,
): Promise<void> {
  await mkdir(dirname(cachePath), { recursive: true });
  const cache: A11yCache = { version: CACHE_SCHEMA_VERSION, axeVersion, entries };
  // Write-then-rename so a crash mid-write leaves the old cache intact rather
  // than a truncated JSON file (which readCache would discard wholesale).
  const tmpPath = `${cachePath}.tmp`;
  await writeFile(tmpPath, JSON.stringify(cache));
  await rename(tmpPath, cachePath);
}

// axe-core walks the whole DOM synchronously, so each page is a CPU-bound unit
// of work and a site of any size spends minutes here. Two things keep it fast:
//
// - Results are cached by page content hash (in `cacheDir`, when given): only
//   pages whose HTML changed since the last build are scanned. The rewritten
//   cache carries exactly the hashes seen this run, so entries for deleted or
//   changed pages age out on their own.
// - Cache misses run in a pool of worker threads (one page in flight per
//   worker, pulled from a shared queue) to use every core instead of one. Each
//   worker owns its own JSDOM globals, sidestepping the globalThis races that
//   block same-thread concurrency. See a11y-worker.mjs for the per-page half.
export async function checkA11y(
  distDir: string,
  cacheDir?: string,
): Promise<{ checked: number; reused: number; violations: A11yViolation[] }> {
  const htmlFiles = await collectHtmlFiles(distDir);
  const violations: A11yViolation[] = [];
  let checked = 0;
  let reused = 0;
  if (htmlFiles.length === 0) return { checked, reused, violations };

  const cachePath = cacheDir ? join(cacheDir, "a11y-check.json") : undefined;
  const prior = cachePath ? await readCache(cachePath) : {};
  const nextEntries: Record<string, CachedPageResult> = {};

  const pageOf = (file: string) => "/" + relative(distDir, file).replace(/index\.html$/, "");

  // Hash every page up front (IO-bound, so a handful of concurrent lanes over
  // the shared index suffices); serve hits from the cache and queue the rest.
  const misses: { file: string; hash: string }[] = [];
  let nextFile = 0;
  await Promise.all(
    Array.from({ length: Math.min(16, htmlFiles.length) }, async () => {
      while (nextFile < htmlFiles.length) {
        const file = htmlFiles[nextFile++];
        const html = await readFile(file, "utf-8");
        const hash = createHash("sha256").update(html).digest("hex");
        const hit = prior[hash];
        if (!hit) {
          misses.push({ file, hash });
          continue;
        }
        nextEntries[hash] = hit;
        if (!hit.skipped) {
          checked++;
          reused++;
          const page = pageOf(file);
          for (const v of hit.violations ?? []) violations.push({ page, ...v });
        }
      }
    }),
  );

  if (misses.length > 0) {
    const workerURL = new URL("./a11y-worker.mjs", import.meta.url);
    const poolSize = Math.max(1, Math.min(availableParallelism(), misses.length));
    let next = 0;

    await new Promise<void>((resolve, reject) => {
      const workers: Worker[] = [];
      // Which queue item each worker is scanning, so its result can be filed
      // under the right content hash when the message comes back.
      const assigned = new Map<Worker, { file: string; hash: string }>();
      let active = poolSize;
      let settled = false;

      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        for (const w of workers) void w.terminate();
        if (err) reject(err);
        else resolve();
      };

      // Hand the next page to a now-idle worker, or retire it when the queue is
      // drained; the last worker to retire settles the pool.
      const pump = (worker: Worker) => {
        if (next >= misses.length) {
          assigned.delete(worker);
          if (--active === 0) finish();
          return;
        }
        const job = misses[next++];
        assigned.set(worker, job);
        worker.postMessage(job.file);
      };

      for (let i = 0; i < poolSize; i++) {
        const worker = new Worker(workerURL, { workerData: { distDir } });
        workers.push(worker);
        worker.on("message", (msg: WorkerResult) => {
          if (msg.error) {
            finish(new Error(msg.error));
            return;
          }
          const job = assigned.get(worker);
          if (job) {
            nextEntries[job.hash] = msg.skipped
              ? { skipped: true }
              : { violations: (msg.violations ?? []).map(({ page: _page, ...rest }) => rest) };
          }
          if (!msg.skipped) checked++;
          if (msg.violations) violations.push(...msg.violations);
          pump(worker);
        });
        worker.on("error", finish);
        pump(worker);
      }
    });
  }

  // Worker completion order is nondeterministic; sort so the reported list is
  // stable across runs (helps diffing CI logs and the 30-item truncation).
  violations.sort((a, b) => a.page.localeCompare(b.page) || a.id.localeCompare(b.id));

  if (cachePath) await writeCache(cachePath, nextEntries);
  return { checked, reused, violations };
}
