export async function limitConcurrency<T>(
  concurrency: number,
  tasks: Array<() => Promise<T>>
): Promise<T[]> {
  if (tasks.length === 0) return [];
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  const workerCount = Math.min(concurrency, tasks.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= tasks.length) return;
      const task = tasks[index];
      if (task) results[index] = await task();
    }
  });
  await Promise.all(workers);
  return results;
}
