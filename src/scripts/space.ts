// One starfield behind the whole page, so the intro and the site share the same sky.
const canvas = document.querySelector<HTMLCanvasElement>(".space");

// Small seeded generator: the stars stay put when the window is resized.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function draw(target: HTMLCanvasElement) {
  const ratio = Math.min(window.devicePixelRatio, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  target.width = width * ratio;
  target.height = height * ratio;

  const context = target.getContext("2d")!;
  context.scale(ratio, ratio);

  const next = random(20260930);
  const count = Math.round((width * height) / 2400);
  for (let i = 0; i < count; i++) {
    const x = next() * width;
    const y = next() * height;
    const size = 0.3 + next() ** 4 * 1.3;
    const alpha = 0.25 + next() * 0.75;
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }
}

if (canvas) {
  draw(canvas);

  // Phones fire resize when the address bar hides; only redraw on real width changes.
  let lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    draw(canvas);
  });
}
