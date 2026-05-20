import { createReadStream } from "fs";
import { createInterface } from "readline";

/**
 * Streams a JSONL file line-by-line and calls `onLine` for each parsed object.
 * Silently skips malformed lines.
 */
export async function streamJsonl<T>(
  filePath: string,
  onLine: (obj: T) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: "utf-8" });
    stream.on("error", reject);

    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        onLine(JSON.parse(trimmed) as T);
      } catch {
        // skip malformed lines
      }
    });
    rl.on("close", resolve);
    rl.on("error", reject);
  });
}

/**
 * Like streamJsonl but collects all parsed objects into an array.
 */
export async function readJsonl<T>(filePath: string): Promise<T[]> {
  const results: T[] = [];
  await streamJsonl<T>(filePath, (obj) => results.push(obj));
  return results;
}
