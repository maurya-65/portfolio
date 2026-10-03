import * as THREE from "three";
import { gsap } from "gsap";
import { lite, pixelRatio } from "../lib/perf";

// The loader scene, copied from olha's: a light canvas (camera at z 6, fov 50), two radius-1 spheres whose
// textures are transparent with only text on them, so they read as two rings of words. The spheres turn at
// -0.3 and -0.5 rad/s, sit at y +0.18 and -0.18 inside a group tipped -0.6 rad (flat on phones) and wobbling
// slowly, rise in from y -8, and drop to y -10 when the load is done. Her textures are PNGs that are not in
// the files, so they are drawn here with developer words.
const BACKGROUND = "#f7f7f7";
const RINGS = [
  { y: 0.18, speed: 0.3 },
  { y: -0.18, speed: 0.5 },
];

// Her own function (bk): the strip is drawn, fitted and centred, on a transparent 2048 x 1024 canvas, which is
// what wraps the sphere, with the colour premultiplied by the alpha. Linear filtering, no mipmaps.
function ringTexture(image: CanvasImageSource & { width: number; height: number }) {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d")!;
  c.clearRect(0, 0, width, height);
  const fit = Math.min(width / image.width, height / image.height);
  const w = image.width * fit;
  const h = image.height * fit;
  c.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  const pixels = c.getImageData(0, 0, width, height);
  const d = pixels.data;
  for (let i = 0; i < d.length; i += 4) {
    const alpha = d[i + 3] / 255;
    d[i] *= alpha;
    d[i + 1] *= alpha;
    d[i + 2] *= alpha;
  }
  c.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

// Her strips (public/img/texture.png, 2033 x 106, and texture-services.png, 2048 x 32) read "DESIGN THAT CHANGES THE
// WORLD" and "WEB DESIGN • UX/UI DESIGN ...". These are drawn at the same sizes and with the same even spacing,
// with developer words instead. To use her originals, pass those two images to ringTexture instead.
function strip(width: number, height: number, font: string, words: string[], baseline: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#101010";
  c.font = font;
  c.textBaseline = "alphabetic";
  const widths = words.map((word) => c.measureText(word).width);
  // One gap per word, including the one that wraps around the ring, so the last word never touches the first.
  const gap = (width - widths.reduce((sum, w) => sum + w, 0)) / words.length;
  let x = 0;
  words.forEach((word, i) => {
    c.fillText(word, x, baseline);
    x += widths[i] + gap;
  });
  return canvas;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
// olha's AlphaSmoothMaterial.
const fragmentShader = `
  uniform sampler2D map;
  varying vec2 vUv;
  void main() {
    vec4 texColor = texture2D(map, vUv);
    float alphaThreshold = 0.05;
    if (texColor.a < alphaThreshold) discard;
    float alphaFactor = smoothstep(alphaThreshold, alphaThreshold + 0.05, texColor.a);
    gl_FragColor = vec4(texColor.rgb * alphaFactor, texColor.a * alphaFactor);
  }`;

export async function createLoaderRing(host: HTMLElement) {
  await Promise.all([document.fonts.load('900 100px "Sofia Sans Condensed"'), document.fonts.load('300 30px "Spline Sans Mono"')]);
  const images = [
    strip(2033, 106, '900 100px "Sofia Sans Condensed", sans-serif', ["SOFTWARE", "DEVELOPER", "BUILDING", "THE", "WEB"], 88),
    strip(2048, 32, '300 29px "Spline Sans Mono", monospace', ["WEB DEVELOPMENT", "•", "FRONT-END", "•", "BACK-END", "•", "FULL-STACK", "•", "SOFTWARE ENGINEERING"], 25),
  ];

  const canvas = document.createElement("canvas");
  canvas.className = "loader-gl";
  host.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite });
  renderer.setPixelRatio(pixelRatio());
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.set(0, 0, 6);

  const tilt = new THREE.Group();
  tilt.rotation.x = window.innerWidth > 768 ? -0.6 : 0;
  const wobble = new THREE.Group();
  // Her rings measure about 1.37 times what a radius-1 sphere gives at this camera, so the pair is scaled up.
  wobble.scale.setScalar(1.37);
  tilt.add(wobble);
  scene.add(tilt);

  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const textures = images.map(ringTexture);
  const meshes = RINGS.map((_ring, index) => {
    const material = new THREE.ShaderMaterial({
      uniforms: { map: { value: textures[index] } },
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -8;
    wobble.add(mesh);
    return mesh;
  });

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  // olha's camera (desktop only): it orbits a point on a sphere of radius 6 that follows the mouse, eased at 0.05
  // per frame, always looking at the origin. Before the mouse moves it sits on the x axis, as hers does.
  const pointer = { x: 0, y: 0 };
  const orbit = { x: 0, y: 0 };
  const follow = window.innerWidth > 1100;
  const onMove = (event: MouseEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  };
  if (follow) window.addEventListener("mousemove", onMove);

  const clock = new THREE.Clock();
  const tick = () => {
    if (follow) {
      orbit.x += 0.05 * (0.6 * pointer.y - orbit.x);
      orbit.y += 0.05 * (0.6 * pointer.x - orbit.y);
      const theta = Math.PI / 2 - orbit.x;
      const phi = orbit.y + Math.PI;
      camera.position.set(6 * Math.sin(theta) * Math.cos(phi), 6 * Math.cos(theta), 6 * Math.sin(theta) * Math.sin(phi));
      camera.lookAt(0, 0, 0);
    }
    const dt = clock.getDelta();
    const t = clock.elapsedTime;
    meshes.forEach((mesh, i) => (mesh.rotation.y -= RINGS[i].speed * dt));
    wobble.rotation.x = 0.4 + 0.05 * Math.sin(0.2 * t);
    wobble.rotation.z = 0.2 + 0.05 * Math.cos(0.25 * t);
    wobble.position.y = 0.05 * Math.sin(0.3 * t);
    renderer.render(scene, camera);
  };
  tick();
  gsap.ticker.add(tick);

  const rise = gsap.timeline({ paused: true });
  rise.to(meshes[0].position, { y: RINGS[0].y, duration: 2.5, delay: 1, ease: "power4.out" });
  rise.to(meshes[1].position, { y: RINGS[1].y, duration: 2, ease: "power4.out" }, "-=2");

  return {
    // Starts the rings rising (olha: 1s after everything is ready).
    start() {
      rise.play();
    },
    // Drops both rings out of view (olha: second ring first, the other 0.1s behind).
    exit() {
      rise.kill();
      const out = gsap.timeline();
      out.to(meshes[1].position, { y: -10, duration: 1.2, ease: "power4.in" });
      out.to(meshes[0].position, { y: -10, duration: 1.2, ease: "power4.in" }, "-=1.1");
      return out;
    },
    destroy() {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      geometry.dispose();
      for (const mesh of meshes) {
        (mesh.material as THREE.ShaderMaterial).uniforms.map.value.dispose();
        (mesh.material as THREE.ShaderMaterial).dispose();
      }
      renderer.dispose();
      // Give the WebGL context back: the two scenes below need it and browsers only allow a handful.
      renderer.forceContextLoss();
    },
  };
}
