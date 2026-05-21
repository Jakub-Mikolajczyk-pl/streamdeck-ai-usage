import { readdir, stat } from "fs/promises";
import { join } from "path";

/** Recursively find all *.jsonl files under a directory. Empty array if dir missing. */
export async function findJsonlFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".jsonl"))
      .map((e) =>
        join(e.parentPath ?? (e as { path?: string }).path ?? dir, e.name)
      );
  } catch {
    return [];
  }
}

/** Filter file paths to those modified within the last `maxAgeMs` milliseconds */
export async function filterRecentFiles(
  files: string[],
  maxAgeMs: number
): Promise<string[]> {
  const cutoff = Date.now() - maxAgeMs;
  const results = await Promise.all(
    files.map(async (f) => {
      try {
        const s = await stat(f);
        return s.mtimeMs >= cutoff ? f : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter((f): f is string => f !== null);
}
