// cubic-bezier easing without dependencies (Newton + bisection)
export const bezier = (x1: number, y1: number, x2: number, y2: number) => (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  let s = t;
  for (let i = 0; i < 8; i++) {
    const x = ((ax * s + bx) * s + cx) * s - t;
    const d = (3 * ax * s + 2 * bx) * s + cx;
    if (Math.abs(x) < 1e-5) break;
    if (Math.abs(d) < 1e-6) break;
    s -= x / d;
  }
  return ((ay * s + by) * s + cy) * s;
};
export const outQuint = bezier(0.22, 1, 0.36, 1);
export const inOutCubic = bezier(0.65, 0, 0.35, 1);
