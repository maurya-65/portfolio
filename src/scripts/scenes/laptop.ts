import * as THREE from "three";
import { gsap } from "gsap";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { lite, pixelRatio } from "../lib/perf";

// Modelled on the Lenovo IdeaPad Pro 5i 16" (16IAH10) from Lenovo's own spec sheet and product photos:
// 356.8 x 251 x 15.95 mm, Luna Grey anodised and sandblasted aluminium, full-size keyboard with a numeric keypad,
// a 135 x 80 mm glass touchpad, the real port order on each side, rubber feet and a camera hump on the lid.
// All sizes are in scene units of 100 mm.
const WIDTH = 3.568;
const DEPTH = 2.51;
const BASE_HEIGHT = 0.095;
const FEET = 0.018;
const LID_THICKNESS = 0.045;
const LID_DEPTH = 2.48;
const OPEN_ANGLE = THREE.MathUtils.degToRad(112);

const KEYBOARD_WIDTH = 3.3;
const KEY_HEIGHT = 0.03;
const KEY_GAP = 0.02;
const KEYBOARD_BACK = -0.93;

const DEFAULT_VIEW = { azimuth: -0.5, elevation: 0.42 };

// One key in keyboard units (a normal key is 1 x 1); x and y are measured from the keyboard's top-left corner.
type Placed = { label: string; x: number; y: number; w: number; h: number };

const NUMPAD_X = 15.3;
const NUMPAD_KEY = 0.86;
const ROW_HEIGHTS = [0.62, 1, 1, 1, 1, 1];
const ROW_Y = ROW_HEIGHTS.map((_, i) => ROW_HEIGHTS.slice(0, i).reduce((sum, h) => sum + h, 0));
const KEYBOARD_UNITS = { w: NUMPAD_X + 4 * NUMPAD_KEY, h: ROW_HEIGHTS.reduce((sum, h) => sum + h, 0) };

function layoutKeys(): Placed[] {
  const keys: Placed[] = [];
  const row = (index: number, list: [label: string, width: number][]) => {
    let x = 0;
    for (const [label, w] of list) {
      keys.push({ label, x, y: ROW_Y[index], w, h: ROW_HEIGHTS[index] });
      x += w;
    }
  };
  const single = (text: string): [string, number][] => text.split("").map((c) => [c, 1]);

  // The main block: every row adds up to 15 units.
  row(0, [["Esc", 1], ...Array.from({ length: 12 }, (_, i): [string, number] => [`F${i + 1}`, 1]), ["Del", 2]]);
  row(1, [...single("`1234567890-="), ["Backspace", 2]]);
  row(2, [["Tab", 1.5], ...single("QWERTYUIOP[]"), ["\\", 1.5]]);
  row(3, [["Caps", 1.75], ...single("ASDFGHJKL;'"), ["Enter", 2.25]]);
  row(4, [["Shift", 2.25], ...single("ZXCVBNM,./"), ["Shift", 2.75]]);
  // Bottom row with the inverted-T arrows: left and right are half height, up sits above down.
  row(5, [["Ctrl", 1.1], ["Fn", 1], ["Win", 1.1], ["Alt", 1.1], ["", 5.5], ["Alt", 1.1], ["Ctrl", 1.1]]);
  const arrowX = 12;
  const bottom = ROW_Y[5];
  keys.push({ label: "<", x: arrowX, y: bottom + 0.5, w: 1, h: 0.5 });
  keys.push({ label: "^", x: arrowX + 1, y: bottom, w: 1, h: 0.5 });
  keys.push({ label: "v", x: arrowX + 1, y: bottom + 0.5, w: 1, h: 0.5 });
  keys.push({ label: ">", x: arrowX + 2, y: bottom + 0.5, w: 1, h: 0.5 });

  // The numeric keypad: narrower keys, a tall + and Enter.
  const pad = (label: string, col: number, r: number, w = 1, h = 1) => {
    const height = ROW_HEIGHTS.slice(r, r + h).reduce((sum, v) => sum + v, 0);
    keys.push({ label, x: NUMPAD_X + col * NUMPAD_KEY, y: ROW_Y[r], w: w * NUMPAD_KEY, h: height });
  };
  ["Home", "End", "PgUp", "PgDn"].forEach((label, col) => pad(label, col, 0));
  ["Num", "/", "*", "-"].forEach((label, col) => pad(label, col, 1));
  ["7", "8", "9"].forEach((label, col) => pad(label, col, 2));
  pad("+", 3, 2, 1, 2);
  ["4", "5", "6"].forEach((label, col) => pad(label, col, 3));
  ["1", "2", "3"].forEach((label, col) => pad(label, col, 4));
  pad("Ent", 3, 4, 1, 2);
  pad("0", 0, 5, 2);
  pad(".", 2, 5);
  return keys;
}

// Sandblasted, anodised aluminium: a fine, even grain with no direction, drawn once. It drives roughness and a
// faint bump, which is what separates real metal from painted plastic.
let grainTexture: THREE.CanvasTexture | null = null;
function grain() {
  if (grainTexture) return grainTexture;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#9e9e9e";
  context.fillRect(0, 0, size, size);
  for (let i = 0; i < 60000; i++) {
    const v = 60 + Math.random() * 140;
    context.fillStyle = `rgba(${v},${v},${v},0.2)`;
    context.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  grainTexture = new THREE.CanvasTexture(canvas);
  grainTexture.wrapS = grainTexture.wrapT = THREE.RepeatWrapping;
  grainTexture.repeat.set(5, 5);
  grainTexture.anisotropy = 8;
  return grainTexture;
}

// Luna Grey.
const aluminium = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0x95979c,
    metalness: 0.92,
    roughness: 1,
    roughnessMap: grain(),
    bumpMap: grain(),
    bumpScale: 0.3,
    clearcoat: 0.05,
    clearcoatRoughness: 0.6,
  });

// A small photo studio instead of a plain room: a big overhead softbox, two tall strip lights and a dim warm
// bounce, over a graded dark backdrop. The strips are what draw the long highlights along the metal edges.
// Values above 1 are fine here, the environment is rendered in half float.
function createStudio() {
  const studio = new THREE.Scene();
  const backdrop = document.createElement("canvas");
  backdrop.width = 4;
  backdrop.height = 256;
  const gradient = backdrop.getContext("2d")!;
  const fade = gradient.createLinearGradient(0, 0, 0, 256);
  fade.addColorStop(0, "#7b7e85");
  fade.addColorStop(0.55, "#43454a");
  fade.addColorStop(1, "#1a1b1d");
  gradient.fillStyle = fade;
  gradient.fillRect(0, 0, 4, 256);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(40, 32, 16),
    new THREE.MeshBasicMaterial({ map: Object.assign(new THREE.CanvasTexture(backdrop), { colorSpace: THREE.SRGBColorSpace }), side: THREE.BackSide }),
  );
  studio.add(dome);

  const panel = (width: number, height: number, power: number, tint: number, position: [number, number, number], look: [number, number, number]) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(power), side: THREE.DoubleSide }));
    mesh.position.set(...position);
    mesh.lookAt(...look);
    studio.add(mesh);
  };
  panel(14, 9, 2.4, 0xffffff, [0, 14, 2], [0, 0, 0]);
  panel(2.4, 16, 9, 0xffffff, [-13, 5, 3], [0, 0, 0]);
  panel(2.4, 16, 7, 0xffffff, [13, 5, -2], [0, 0, 0]);
  panel(12, 3, 1.6, 0xfff1e0, [0, 1.5, 14], [0, 0, 0]);
  return studio;
}

function box(width: number, height: number, depth: number, radius: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 5, radius), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createKeyboard() {
  const group = new THREE.Group();
  const unit = KEYBOARD_WIDTH / KEYBOARD_UNITS.w;
  const depth = KEYBOARD_UNITS.h * unit;
  const left = -KEYBOARD_WIDTH / 2;
  const deckY = BASE_HEIGHT + 0.002;

  const deck = box(KEYBOARD_WIDTH + 0.1, 0.008, depth + 0.1, 0.015, new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.8 }));
  deck.position.set(0, deckY, KEYBOARD_BACK + depth / 2);
  group.add(deck);

  // Light shows through the gaps between the keys: a soft, neutral backlight.
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(KEYBOARD_WIDTH, depth), new THREE.MeshBasicMaterial({ color: 0x555a66, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, deckY + 0.0045, KEYBOARD_BACK + depth / 2);
  group.add(glow);

  const placed = layoutKeys();
  const keys = new THREE.InstancedMesh(
    new RoundedBoxGeometry(1, 1, 1, 3, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x5f6268, roughness: 0.6, metalness: 0 }),
    placed.length,
  );
  keys.castShadow = true;

  // Legends are drawn on one canvas that sits just above the keys.
  const pixelsPerUnit = 2048 / KEYBOARD_WIDTH;
  const legends = document.createElement("canvas");
  legends.width = 2048;
  legends.height = Math.round(depth * pixelsPerUnit);
  const context = legends.getContext("2d")!;
  context.fillStyle = "rgba(238, 241, 247, 0.9)";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const matrix = new THREE.Matrix4();
  placed.forEach((key, index) => {
    const keyWidth = key.w * unit;
    const keyDepth = key.h * unit;
    const x = left + key.x * unit + keyWidth / 2;
    const z = KEYBOARD_BACK + key.y * unit + keyDepth / 2;
    matrix.compose(
      new THREE.Vector3(x, deckY + 0.004 + KEY_HEIGHT / 2, z),
      new THREE.Quaternion(),
      new THREE.Vector3(keyWidth - KEY_GAP, KEY_HEIGHT, keyDepth - KEY_GAP),
    );
    keys.setMatrixAt(index, matrix);

    if (key.label) {
      const short = key.label.length === 1;
      const size = short ? 52 : key.label.length > 3 ? 26 : 32;
      context.font = `${short ? 400 : 300} ${size}px "Spline Sans Mono", monospace`;
      context.fillText(key.label, (x - left) * pixelsPerUnit, (z - KEYBOARD_BACK) * pixelsPerUnit);
    }
  });
  group.add(keys);

  const legendTexture = new THREE.CanvasTexture(legends);
  legendTexture.colorSpace = THREE.SRGBColorSpace;
  legendTexture.anisotropy = 8;
  const legendPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(KEYBOARD_WIDTH, depth),
    new THREE.MeshBasicMaterial({ map: legendTexture, transparent: true, depthWrite: false }),
  );
  legendPlane.rotation.x = -Math.PI / 2;
  legendPlane.position.set(0, deckY + 0.004 + KEY_HEIGHT + 0.0015, KEYBOARD_BACK + depth / 2);
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
  pivot.position.set(0, BASE_HEIGHT + 0.004, -DEPTH / 2 + 0.04);

  const shell = box(WIDTH, LID_THICKNESS, LID_DEPTH, 0.02, aluminium());
  shell.position.set(0, LID_THICKNESS / 2, LID_DEPTH / 2);
  pivot.add(shell);

  // The raised strip along the far edge of the lid that holds the camera and its sensors.
  const hump = box(0.8, 0.014, 0.11, 0.006, aluminium());
  hump.position.set(0, LID_THICKNESS + 0.004, LID_DEPTH - 0.1);
  pivot.add(hump);

  // The inner face is the underside while the lid is closed.
  const bezel = new THREE.Mesh(
    new RoundedBoxGeometry(WIDTH - 0.05, 0.004, LID_DEPTH - 0.05, 3, 0.002),
    new THREE.MeshPhysicalMaterial({ color: 0x040405, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.12 }),
  );
  bezel.position.set(0, -0.0012, LID_DEPTH / 2);
  pivot.add(bezel);

  // 16:10, 16 inch: 344 x 215 mm of picture.
  const screenWidth = 3.44;
  const screenHeight = screenWidth / 1.6;
  const screenZ = 0.24 + screenHeight / 2;
  const display = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }));
  display.rotation.x = Math.PI / 2;
  display.position.set(0, -0.0036, screenZ);
  pivot.add(display);

  // The glass: black, glossy and added on top, so only its reflections show. The picture itself is not dimmed.
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(screenWidth, screenHeight),
    new THREE.MeshPhysicalMaterial({
      color: 0x000000,
      roughness: 0.04,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  glass.rotation.x = Math.PI / 2;
  glass.position.set(0, -0.0041, screenZ);
  pivot.add(glass);

  const camera = new THREE.Mesh(new THREE.CircleGeometry(0.014, 24), new THREE.MeshBasicMaterial({ color: 0x0b1220 }));
  camera.rotation.x = Math.PI / 2;
  camera.position.set(0, -0.0038, LID_DEPTH - 0.05);
  pivot.add(camera);

  // Wordmark in the middle of the lid, facing whoever stands behind the open laptop.
  const mark = document.createElement("canvas");
  mark.width = 1024;
  mark.height = 256;
  const markContext = mark.getContext("2d")!;
  markContext.fillStyle = "#000";
  markContext.fillRect(0, 0, mark.width, mark.height);
  markContext.fillStyle = "#fff";
  markContext.font = `700 150px "Sofia Sans Condensed", sans-serif`;
  markContext.textAlign = "center";
  markContext.textBaseline = "middle";
  markContext.fillText("Lenovo", 512, 128);
  // Drawn white on black and used as an alpha map, so the logo is polished metal that picks up the reflections.
  const markTexture = new THREE.CanvasTexture(mark);
  markTexture.anisotropy = 8;
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.155),
    new THREE.MeshStandardMaterial({ color: 0xe6e8ed, metalness: 1, roughness: 0.14, alphaMap: markTexture, transparent: true, depthWrite: false }),
  );
  logo.geometry.rotateX(-Math.PI / 2);
  logo.geometry.rotateY(Math.PI);
  logo.position.set(0, LID_THICKNESS + 0.0015, LID_DEPTH * 0.52);
  pivot.add(logo);

  return pivot;
}

function createLaptop(screen: THREE.Texture) {
  const laptop = new THREE.Group();
  // The rubber feet are part of the 15.95 mm, so the body is lifted by their height.
  laptop.position.y = FEET;

  const base = box(WIDTH, BASE_HEIGHT, DEPTH, 0.045, aluminium());
  base.position.y = BASE_HEIGHT / 2;
  laptop.add(base);

  laptop.add(createKeyboard());

  // 135 x 80 mm buttonless glass touchpad, centred under the main block of keys rather than under the whole deck.
  const keyUnit = KEYBOARD_WIDTH / KEYBOARD_UNITS.w;
  const mainCentre = -KEYBOARD_WIDTH / 2 + 7.5 * keyUnit;
  const keyboardEnd = KEYBOARD_BACK + KEYBOARD_UNITS.h * keyUnit;
  const trackpad = box(
    1.35,
    0.008,
    0.8,
    0.02,
    new THREE.MeshPhysicalMaterial({ color: 0x7d8087, metalness: 0, roughness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.06 }),
  );
  trackpad.position.set(mainCentre, BASE_HEIGHT + 0.0065, keyboardEnd + 0.18 + 0.4);
  laptop.add(trackpad);

  // The hinge, exposed behind the keyboard once the lid is open, and the long vent slot in front of it.
  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, WIDTH - 0.7, 24),
    new THREE.MeshStandardMaterial({ color: 0x55575c, metalness: 0.9, roughness: 0.35 }),
  );
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, BASE_HEIGHT + 0.004, -DEPTH / 2 + 0.04);
  hinge.castShadow = true;
  laptop.add(hinge);

  const vent = new THREE.Mesh(new THREE.BoxGeometry(KEYBOARD_WIDTH - 0.2, 0.002, 0.035), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9 }));
  vent.position.set(0, BASE_HEIGHT + 0.0008, -DEPTH / 2 + 0.2);
  laptop.add(vent);

  // Four rubber feet.
  const footMaterial = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.85 });
  for (const x of [-1.5, 1.5]) {
    for (const z of [-1.0, 1.0]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, FEET, 20), footMaterial);
      foot.position.set(x, -FEET / 2 + 0.002, z);
      laptop.add(foot);
    }
  }

  // Ports, in the order and spacing of Lenovo's diagram. Left side, from the back: power, HDMI, two USB-C
  // (Thunderbolt 4), 3.5 mm jack. Right side, from the front: power button, SD reader, two USB-A.
  const portMaterial = new THREE.MeshStandardMaterial({ color: 0x040405, roughness: 0.9 });
  const side = (x: number, z: number, depth: number, height: number, round = false) => {
    const geometry = round ? new THREE.CylinderGeometry(height / 2, height / 2, 0.012, 16) : new THREE.BoxGeometry(0.012, height, depth);
    const port = new THREE.Mesh(geometry, portMaterial);
    if (round) port.rotation.z = Math.PI / 2;
    port.position.set(x, BASE_HEIGHT * 0.56, z);
    laptop.add(port);
  };
  const fromBack = (fraction: number) => -DEPTH / 2 + fraction * DEPTH;
  const fromFront = (fraction: number) => DEPTH / 2 - fraction * DEPTH;
  const left = -WIDTH / 2 + 0.002;
  const right = WIDTH / 2 - 0.002;
  side(left, fromBack(0.115), 0.1, 0.04);
  side(left, fromBack(0.225), 0.15, 0.04);
  side(left, fromBack(0.31), 0.09, 0.025);
  side(left, fromBack(0.39), 0.09, 0.025);
  side(left, fromBack(0.46), 0, 0.034, true);
  const button = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.022, 0.2, 2, 0.006), new THREE.MeshStandardMaterial({ color: 0x8b8d92, metalness: 1, roughness: 0.4 }));
  button.position.set(right, BASE_HEIGHT * 0.56, fromFront(0.51));
  laptop.add(button);
  side(right, fromFront(0.65), 0.29, 0.016);
  side(right, fromFront(0.78), 0.135, 0.055);
  side(right, fromFront(0.88), 0.135, 0.055);

  const lid = createLid(screen);
  laptop.add(lid);
  return { laptop, lid };
}

function init(stage: HTMLElement, canvas: HTMLCanvasElement) {
  const text = JSON.parse(stage.dataset.screen ?? "{}") as { title: string; subtitle: string };
  const canHover = window.matchMedia("(hover: hover)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: "default" });
  renderer.setPixelRatio(pixelRatio());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // The lights never move, only the lid does, so the shadow is redrawn only when the lid moves.
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const environment = new THREE.PMREMGenerator(renderer);
  scene.environment = environment.fromScene(createStudio(), 0.03).texture;
  scene.environmentIntensity = 1;
  environment.dispose();

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
  const rim = new THREE.DirectionalLight(0xe8eeff, 1.2);
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
  const focus = new THREE.Vector3(0, 1.0, 0);
  let distance = 6;

  const resize = () => {
    const { clientWidth, clientHeight } = stage;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();

    // Far enough back to fit the open laptop on any screen shape.
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfWidth = halfHeight * camera.aspect;
    distance = Math.max((WIDTH * 1.15) / (2 * halfWidth), (2.75 * 1.1) / (2 * halfHeight)) * 1.2 + 1;
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
      duration: open ? 1.5 : 1.1,
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
    const sway = dragging || lidState.angle < 0.5 ? 0 : Math.sin(time * 0.6) * 0.1;
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
