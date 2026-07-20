import { availableParallelism } from "node:os";
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

// axe-core walks the whole DOM synchronously, so each page is a CPU-bound unit
// of work and a site of any size spends minutes here. The scan runs in a pool
// of worker threads (one page in flight per worker, pulled from a shared queue)
// to use every core instead of one. Each worker owns its own JSDOM globals,
// sidestepping the globalThis races that block same-thread concurrency. See
// a11y-worker.mjs for the per-page half.
export async function checkA11y(
  distDir: string,
): Promise<{ checked: number; violations: A11yViolation[] }> {
  const htmlFiles = await collectHtmlFiles(distDir);
  const violations: A11yViolation[] = [];
  let checked = 0;
  if (htmlFiles.length === 0) return { checked, violations };

  const workerURL = new URL("./a11y-worker.mjs", import.meta.url);
  const poolSize = Math.max(1, Math.min(availableParallelism(), htmlFiles.length));
  let next = 0;

  await new Promise<void>((resolve, reject) => {
    const workers: Worker[] = [];
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
      if (next >= htmlFiles.length) {
        if (--active === 0) finish();
        return;
      }
      worker.postMessage(htmlFiles[next++]);
    };

    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerURL, { workerData: { distDir } });
      workers.push(worker);
      worker.on("message", (msg: WorkerResult) => {
        if (msg.error) {
          finish(new Error(msg.error));
          return;
        }
        if (!msg.skipped) checked++;
        if (msg.violations) violations.push(...msg.violations);
        pump(worker);
      });
      worker.on("error", finish);
      pump(worker);
    }
  });

  // Worker completion order is nondeterministic; sort so the reported list is
  // stable across runs (helps diffing CI logs and the 30-item truncation).
  violations.sort((a, b) => a.page.localeCompare(b.page) || a.id.localeCompare(b.id));
  return { checked, violations };
}
