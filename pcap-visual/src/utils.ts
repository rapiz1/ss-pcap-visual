export function humanReadableSize(x: number): string {
  const base = 1000;
  const suffix = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  for (i = 0; i < suffix.length && x >= base; i++) {
    x /= base;
  }
  i = Math.min(i, suffix.length);
  x = Math.round(x * 100) / 100;
  return x + ' ' + suffix[i];
}

export function normalize(x: number): number {
  const ret = 1 - Math.exp(-x);
  console.log(x, ret);
  return ret;
}
