// Average laptops have 4 cores or fewer, 4 to 8 GB of memory and integrated graphics. On those the three.js scenes
// drop to a cheaper setting: one pixel per CSS pixel, no antialiasing, smaller shadow maps.
const nav = navigator as Navigator & { deviceMemory?: number };
export const lite =
  (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A pixel ratio above 1.5 costs most of the frame time for almost no visible gain.
export const pixelRatio = (max = 1.5) => Math.min(window.devicePixelRatio || 1, lite ? 1 : max);
