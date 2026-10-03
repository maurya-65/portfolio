import * as THREE from "three";
import { gsap } from "gsap";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { lite, pixelRatio } from "../lib/perf";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// All sizes are in scene units, roughly 10 cm each.
const WIDTH = 3.2;
const DEPTH = 2.2;
const BASE_HEIGHT = 0.15;
const LID_THICKNESS = 0.07;
const LID_DEPTH = 2.12;
const OPEN_ANGLE = THREE.MathUtils.degToRad(112);

const KEYBOARD_WIDTH = 2.85;
const KEY_HEIGHT = 0.05;
const KEY_GAP = 0.024;
const KEYBOARD_BACK = -0.9;

const DEFAULT_VIEW = { azimuth: -0.5, elevation: 0.42 };

type Key = [label: string, width: number];

// Every row adds up to 15 units, so the keyboard ends flush on both sides.
const ROWS: { height: number; keys: Key[] }[] = [
  {
    height: 0.62,
    keys: [["Esc", 1], ...Array.from({ length: 12 }, (_, i): Key => [`F${i + 1}`, 1]), ["Del", 2]],
  },
  {
    height: 1,
    keys: [..."`1234567890-=".split("").map((c): Key => [c, 1]), ["Backspace", 2]],
  },
  {
    height: 1,
    keys: [["Tab", 1.5], ..."QWERTYUIOP[]".split("").map((c): Key => [c, 1]), ["\\", 1.5]],
  },
  {
    height: 1,
    keys: [["Caps", 1.75], ..."ASDFGHJKL;'".split("").map((c): Key => [c, 1]), ["Enter", 2.25]],
  },
  {
    height: 1,
    keys: [["Shift", 2.25], ..."ZXCVBNM,./".split("").map((c): Key => [c, 1]), ["Shift", 2.75]],
  },
  {
    height: 1,
    keys: [["Ctrl", 1.25], ["Fn", 1], ["Win", 1.25], ["Alt", 1.25], ["", 6.25], ["Alt", 1], ["Ctrl", 1], ["<", 1], [">", 1]],
  },
];

const aluminium = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0x7a808b,
    metalness: 1,
    roughness: 0.3,
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
  });

function box(width: number, height: number, depth: number, radius: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 5, radius), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createKeyboard() {
  const group = new THREE.Group();
  const unit = KEYBOARD_WIDTH / 15;
  const depth = ROWS.reduce((sum, row) => sum + row.height, 0) * unit;

  const deck = box(KEYBOARD_WIDTH + 0.1, 0.012, depth + 0.1, 0.02, new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.8 }));
  deck.position.set(0, BASE_HEIGHT + 0.003, KEYBOARD_BACK + depth / 2);
  group.add(deck);

  // Light shows through the gaps between the keys, like a backlit keyboard.
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(KEYBOARD_WIDTH, depth),
    new THREE.MeshBasicMaterial({ color: 0x5a6a90, toneMapped: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, BASE_HEIGHT + 0.0095, KEYBOARD_BACK + depth / 2);
  group.add(glow);

  const total = ROWS.reduce((sum, row) => sum + row.keys.length, 0);
  const keys = new THREE.InstancedMesh(
    new RoundedBoxGeometry(1, 1, 1, 3, 0.12),
    new THREE.MeshPhysicalMaterial({ color: 0x15171b, roughness: 0.5, metalness: 0.1 }),
    total,
  );
  keys.castShadow = true;

  // Legends are drawn on one canvas that sits just above the keys.
  const pixelsPerUnit = 2048 / KEYBOARD_WIDTH;
  const legends = document.createElement("canvas");
  legends.width = 2048;
  legends.height = Math.round(depth * pixelsPerUnit);
  const context = legends.getContext("2d")!;
  context.fillStyle = "rgba(235, 240, 255, 0.82)";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const matrix = new THREE.Matrix4();
  let index = 0;
  let rowTop = 0;
  for (const row of ROWS) {
    const rowHeight = row.height * unit;
    let left = -KEYBOARD_WIDTH / 2;
    for (const [label, width] of row.keys) {
      const keyWidth = width * unit;
      const x = left + keyWidth / 2;
      const z = KEYBOARD_BACK + rowTop + rowHeight / 2;
      matrix.compose(
        new THREE.Vector3(x, BASE_HEIGHT + 0.009 + KEY_HEIGHT / 2, z),
        new THREE.Quaternion(),
        new THREE.Vector3(keyWidth - KEY_GAP, KEY_HEIGHT, rowHeight - KEY_GAP),
      );
      keys.setMatrixAt(index++, matrix);

      if (label) {
        const single = label.length === 1;
        context.font = `${single ? 400 : 300} ${single ? 58 : 34}px "Spline Sans Mono", monospace`;
        context.fillText(label, (x + KEYBOARD_WIDTH / 2) * pixelsPerUnit, (rowTop + rowHeight / 2) * pixelsPerUnit);
      }
      left += keyWidth;
    }
    rowTop += rowHeight;
  }
  group.add(keys);

  const legendTexture = new THREE.CanvasTexture(legends);
  legendTexture.colorSpace = THREE.SRGBColorSpace;
  legendTexture.anisotropy = 8;
  const legendPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(KEYBOARD_WIDTH, depth),
    new THREE.MeshBasicMaterial({ map: legendTexture, transparent: true, depthWrite: false }),
  );
  legendPlane.rotation.x = -Math.PI / 2;
  legendPlane.position.set(0, BASE_HEIGHT + 0.009 + KEY_HEIGHT + 0.0015, KEYBOARD_BACK + depth / 2);
  group.add(legendPlane);

  return group;
}

// The image on the display. Everything here is placeholder until the copy is decided.
function createScreenTexture(text: { title: string; subtitle: string }, maxAnisotropy: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 2880;
  canvas.height = 1800;
  const context = canvas.getContext("2d")!;

  const sky = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  sky.addColorStop(0, "#02030a");
  sky.addColorStop(0.6, "#070b1f");
  sky.addColorStop(1, "#141a44");
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const glow = context.createRadialGradient(2300, 1500, 0, 2300, 1500, 1300);
  glow.addColorStop(0, "rgba(90, 120, 255, 0.45)");
  glow.addColorStop(1, "rgba(90, 120, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 260; i++) {
    context.fillStyle = `rgba(255, 255, 255, ${0.15 + Math.random() * 0.6})`;
    context.beginPath();
    context.arc(Math.random() * canvas.width, Math.random() * canvas.height, 0.6 + Math.random() * 2, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#f0f0f0";
  context.textBaseline = "alphabetic";
  context.font = `700 420px "Sofia Sans Condensed", sans-serif`;
  context.fillText(text.title.toUpperCase(), 210, 1000);
  context.fillStyle = "#a3a3a8";
  context.font = `300 72px "Spline Sans Mono", monospace`;
  context.fillText(text.subtitle, 220, 1130);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createLid(screen: THREE.Texture) {
  const pivot = new THREE.Group();
  pivot.position.set(0, BASE_HEIGHT + 0.005, -DEPTH / 2 + 0.03);

  const shell = box(WIDTH, LID_THICKNESS, LID_DEPTH, 0.03, aluminium());
  shell.position.set(0, LID_THICKNESS / 2, LID_DEPTH / 2);
  pivot.add(shell);

  // The inner face is the underside while the lid is closed.
  const bezel = new THREE.Mesh(
    new RoundedBoxGeometry(WIDTH - 0.06, 0.004, LID_DEPTH - 0.06, 3, 0.002),
    new THREE.MeshStandardMaterial({ color: 0x030304, roughness: 0.5 }),
  );
  bezel.position.set(0, -0.0012, LID_DEPTH / 2);
  pivot.add(bezel);

  const screenWidth = WIDTH - 0.16;
  const screenHeight = (screenWidth * 10) / 16;
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(screenWidth, screenHeight),
    new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }),
  );
  display.rotation.x = Math.PI / 2;
  display.position.set(0, -0.0036, 0.1 + screenHeight / 2);
  pivot.add(display);

  const camera = new THREE.Mesh(
    new THREE.CircleGeometry(0.014, 24),
    new THREE.MeshBasicMaterial({ color: 0x0b1220 }),
  );
  camera.rotation.x = Math.PI / 2;
  camera.position.set(0, -0.0038, LID_DEPTH - 0.045);
  pivot.add(camera);

  // Wordmark on the outside of the lid, facing whoever stands behind the open laptop.
  const mark = document.createElement("canvas");
  mark.width = 1024;
  mark.height = 256;
  const markContext = mark.getContext("2d")!;
  markContext.fillStyle = "rgba(38, 42, 50, 0.9)";
  markContext.font = `700 150px "Sofia Sans Condensed", sans-serif`;
  markContext.textAlign = "center";
  markContext.textBaseline = "middle";
  markContext.fillText("Lenovo", 512, 128);
  const markTexture = new THREE.CanvasTexture(mark);
  markTexture.colorSpace = THREE.SRGBColorSpace;
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.15),
    new THREE.MeshBasicMaterial({ map: markTexture, transparent: true, depthWrite: false }),
  );
  logo.geometry.rotateX(-Math.PI / 2);
  logo.geometry.rotateY(Math.PI);
  logo.position.set(0, LID_THICKNESS + 0.0015, LID_DEPTH * 0.72);
  pivot.add(logo);

  return pivot;
}

function createLaptop(screen: THREE.Texture) {
  const laptop = new THREE.Group();
  const metal = aluminium();

  const base = box(WIDTH, BASE_HEIGHT, DEPTH, 0.045, metal);
  base.position.y = BASE_HEIGHT / 2;
  laptop.add(base);

  laptop.add(createKeyboard());

  const trackpad = box(
    1.25,
    0.008,
    0.66,
    0.02,
    new THREE.MeshPhysicalMaterial({ color: 0x70747d, metalness: 0.6, roughness: 0.16, clearcoat: 1 }),
  );
  trackpad.position.set(0, BASE_HEIGHT + 0.003, 0.66);
  laptop.add(trackpad);

  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, WIDTH - 0.5, 32),
    new THREE.MeshStandardMaterial({ color: 0x1a1b1e, metalness: 0.8, roughness: 0.4 }),
  );
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, BASE_HEIGHT + 0.03, -DEPTH / 2 + 0.03);
  hinge.castShadow = true;
  laptop.add(hinge);

  // Ports on both sides.
  const portMaterial = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9 });
  for (const side of [-1, 1]) {
    for (const z of [-0.5, -0.15, 0.3]) {
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.14), portMaterial);
      port.position.set((side * WIDTH) / 2, BASE_HEIGHT / 2, z);
      laptop.add(port);
    }
  }

  const lid = createLid(screen);
  laptop.add(lid);
  return { laptop, lid };
}

function init(stage: HTMLElement, canvas: HTMLCanvasElement) {
  const text = JSON.parse(stage.dataset.screen ?? "{}") as { title: string; subtitle: string };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: "default" });
  renderer.setPixelRatio(pixelRatio());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // The lights never move, only the lid does, so the shadow is redrawn only when the lid moves.
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const environment = new THREE.PMREMGenerator(renderer);
  scene.environment = environment.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2, 8, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(lite ? 512 : 1024, lite ? 512 : 1024);
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  const rim = new THREE.DirectionalLight(0x8fb0ff, 1.6);
  rim.position.set(-4, 3, -4);
  scene.add(key, rim);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.5 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const screen = createScreenTexture(text, renderer.capabilities.getMaxAnisotropy());
  const { laptop, lid } = createLaptop(screen);
  scene.add(laptop);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const focus = new THREE.Vector3(0, 0.85, 0);
  let distance = 6;

  const resize = () => {
    const { clientWidth, clientHeight } = stage;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();

    // Far enough back to fit the open laptop on any screen shape.
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfWidth = halfHeight * camera.aspect;
    distance = Math.max((WIDTH * 1.15) / (2 * halfWidth), (2.5 * 1.1) / (2 * halfHeight)) * 1.2 + 1;
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  // Orbit: the camera circles the laptop, so the lights stay where they are.
  const view = { ...DEFAULT_VIEW };
  const goal = { ...DEFAULT_VIEW };
  const lidState = { angle: 0 };
  let hovered = false;
  let pinned = false;
  let dragging = false;
  let visible = false;

  const toggle = stage.querySelector<HTMLButtonElement>(".laptop-toggle")!;

  const updateLid = () => {
    const open = hovered || pinned;
    gsap.to(lidState, {
      angle: open ? OPEN_ANGLE : 0,
      duration: reduceMotion ? 0 : open ? 1.5 : 1.1,
      ease: open ? "power3.out" : "power2.inOut",
      overwrite: true,
    });
    toggle.textContent = pinned ? "Close lid" : "Open lid";
    toggle.setAttribute("aria-pressed", String(pinned));
  };

  const settle = () => {
    if (dragging) return;
    gsap.to(goal, { ...DEFAULT_VIEW, duration: 1.4, ease: "power2.inOut", overwrite: true });
  };

  canvas.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") return;
    hovered = true;
    updateLid();
  });
  canvas.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "touch") return;
    hovered = false;
    updateLid();
    settle();
  });

  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    gsap.killTweensOf(goal);
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    goal.azimuth -= (event.clientX - lastX) * 0.008;
    // Touch keeps vertical drags for scrolling the page.
    if (event.pointerType !== "touch") {
      goal.elevation = THREE.MathUtils.clamp(goal.elevation + (event.clientY - lastY) * 0.006, 0.06, 1.2);
    }
    lastX = event.clientX;
    lastY = event.clientY;
  });
  const release = () => {
    dragging = false;
    canvas.classList.remove("is-dragging");
    if (!hovered && !pinned) settle();
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  toggle.addEventListener("click", () => {
    pinned = !pinned;
    updateLid();
  });

  // Phones cannot hover, so the lid opens once the laptop scrolls into view.
  new IntersectionObserver(
    (entries) => {
      // Reports can arrive batched; the last one is the current state.
      const entry = entries[entries.length - 1];
      visible = entry.isIntersecting;
      if (!canHover) {
        hovered = entry.intersectionRatio > 0.5;
        updateLid();
      }
    },
    { threshold: [0, 0.5] },
  ).observe(stage);

  const damp = (from: number, to: number, rate: number, dt: number) => from + (to - from) * (1 - Math.exp(-rate * dt));

  // One frame now compiles the shaders and uploads the textures while the loader is still up, so the first
  // frame on screen does not stall.
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);

  // Nothing is drawn unless the view or the lid changed. The idle sway is drawn at 30 frames a second (20 on
  // lite machines), a drag or a lid move at full rate.
  let lastKey = "";
  let lastDraw = 0;
  let lastLid = -1;
  gsap.ticker.add((time, deltaTime) => {
    if (!visible) return;
    const dt = Math.min(deltaTime, 100) / 1000;

    view.azimuth = damp(view.azimuth, goal.azimuth, 7, dt);
    view.elevation = damp(view.elevation, goal.elevation, 7, dt);

    // A slow sway keeps the open laptop feeling alive when nobody is dragging.
    const sway = reduceMotion || dragging || lidState.angle < 0.5 ? 0 : Math.sin(time * 0.6) * 0.1;
    const azimuth = view.azimuth + sway;

    camera.position.set(
      focus.x + distance * Math.sin(azimuth) * Math.cos(view.elevation),
      focus.y + distance * Math.sin(view.elevation),
      focus.z + distance * Math.cos(azimuth) * Math.cos(view.elevation),
    );
    camera.lookAt(focus);

    const lidMoved = Math.abs(lidState.angle - lastLid) > 1e-4;
    const frame = `${azimuth.toFixed(4)}|${view.elevation.toFixed(4)}`;
    const swayOnly = !lidMoved && !dragging && Math.abs(view.azimuth - goal.azimuth) < 1e-3 && Math.abs(view.elevation - goal.elevation) < 1e-3;
    if (frame === lastKey && !lidMoved) return;
    if (swayOnly && time - lastDraw < (lite ? 0.05 : 0.033)) return;
    lastKey = frame;
    lastDraw = time;
    if (lidMoved) {
      lastLid = lidState.angle;
      lid.rotation.x = -lidState.angle;
      renderer.shadowMap.needsUpdate = true;
    }
    renderer.render(scene, camera);
  });
}

const stage = document.querySelector<HTMLElement>(".laptop-stage");
const canvas = stage?.querySelector<HTMLCanvasElement>(".laptop-canvas");

// The screen and keyboard are drawn with the site fonts, so wait for them. The loader waits on this promise.
export const ready: Promise<void> =
  stage && canvas
    ? Promise.all([
        document.fonts.load('700 100px "Sofia Sans Condensed"'),
        document.fonts.load('300 40px "Spline Sans Mono"'),
        document.fonts.load('400 40px "Spline Sans Mono"'),
      ]).then(() => {
        try {
          init(stage, canvas);
        } catch (error) {
          // No WebGL2 (software rendering, blocklisted GPU, hardware acceleration off): leave the canvas empty, keep the page.
          console.error("[laptop] 3D scene failed to start", error);
        }
        return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      })
    : Promise.resolve();
