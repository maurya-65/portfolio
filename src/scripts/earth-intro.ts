import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const TEXTURES = "/textures/earth";
const START_DISTANCE = 3.2;
const FOV = 35;

// The opening view is turned this far west of Fredericton, so the blinking marker
// sits off-centre and the scroll has somewhere to carry the globe.
const START_OFFSET = { lat: -16, lon: -30 };
// The globe rocks gently by this much (radians) while nothing is scrolling.
const SWAY = 0.28;
const GREEN = 0x3ddc84;

// Area covered by atlantic-canada.jpg. It is NASA Blue Marble at its native
// 500 m resolution, requested for exactly this box.
const PATCH = { lonMin: -79, lonMax: -55, latMin: 38, latMax: 54 };

const ease = (t: number) => t * t * (3 - 2 * t);
const damp = (from: number, to: number, rate: number, dt: number) => from + (to - from) * (1 - Math.exp(-rate * dt));

// Point on the unit sphere for a lat/lon, matching how three.js wraps an
// equirectangular texture around a SphereGeometry.
function surfacePoint(lat: number, lon: number) {
  const latRad = THREE.MathUtils.degToRad(lat);
  const phi = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(-Math.cos(phi) * Math.cos(latRad), Math.sin(latRad), Math.sin(phi) * Math.cos(latRad));
}

// Quaternion that turns the globe so this point faces the camera (+z).
function faceCamera(point: THREE.Vector3) {
  return new THREE.Quaternion().setFromUnitVectors(point, new THREE.Vector3(0, 0, 1));
}

const atmosphere = new THREE.ShaderMaterial({
  uniforms: { uIntensity: { value: 1 } },
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  transparent: true,
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform float uIntensity;
    varying vec3 vNormal;
    void main() {
      float glow = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
      gl_FragColor = vec4(0.4, 0.66, 1.0, 1.0) * glow * uIntensity;
    }`,
});

function createMarker(point: THREE.Vector3) {
  const marker = new THREE.Group();
  marker.position.copy(point).multiplyScalar(1.003);
  marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), point);

  const material = () => new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, depthWrite: false });
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.007, 32), material());
  const rings = [0, 0.5].map((offset) => ({
    offset,
    mesh: new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), material()),
  }));
  marker.add(dot, ...rings.map((ring) => ring.mesh));
  // Drawn last, so the map layers underneath can never cover it.
  marker.traverse((child) => (child.renderOrder = 3));
  return { marker, dot, rings };
}

// Fades the edges of the sharp patch out, so it melts into the globe underneath.
function createFeather() {
  const size = 256;
  const feather = 0.12;
  const data = new Uint8Array(size * size * 4);
  const edge = (t: number) => ease(Math.min(1, Math.min(t, 1 - t) / feather));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = Math.round(255 * edge(x / (size - 1)) * edge(y / (size - 1)));
      data.set([value, value, value, 255], (y * size + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true;
  return texture;
}

function createPatch(image: THREE.Texture, specular: THREE.Texture) {
  const { lonMin, lonMax, latMin, latMax } = PATCH;
  const geometry = new THREE.SphereGeometry(
    1.0006,
    128,
    96,
    THREE.MathUtils.degToRad(lonMin + 180),
    THREE.MathUtils.degToRad(lonMax - lonMin),
    THREE.MathUtils.degToRad(90 - latMax),
    THREE.MathUtils.degToRad(latMax - latMin),
  );

  // Same water shine as the globe: reuse its specular map, cropped to this box.
  const patchSpecular = specular.clone();
  patchSpecular.repeat.set((lonMax - lonMin) / 360, (latMax - latMin) / 180);
  patchSpecular.offset.set((lonMin + 180) / 360, (latMin + 90) / 180);
  patchSpecular.needsUpdate = true;

  const material = new THREE.MeshPhongMaterial({
    map: image,
    alphaMap: createFeather(),
    specularMap: patchSpecular,
    specular: new THREE.Color(0x333333),
    shininess: 14,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  return mesh;
}

async function init(intro: HTMLElement) {
  const canvas = intro.querySelector<HTMLCanvasElement>(".earth-canvas")!;
  const stage = intro.querySelector<HTMLElement>(".earth-stage")!;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    intro.remove();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // Transparent, so the page's own starfield shows behind the globe.
  renderer.setClearColor(0x000000, 0);

  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const prepare = (texture: THREE.Texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    // Upload to the GPU now, while nothing is moving, instead of mid-scroll.
    renderer.initTexture(texture);
    return texture;
  };

  // The small textures make the first frame instant; the sharp ones swap in later.
  const loader = new THREE.TextureLoader();
  let map: THREE.Texture, specular: THREE.Texture, clouds: THREE.Texture, lights: THREE.Texture;
  try {
    [map, specular, clouds, lights] = await Promise.all([
      loader.loadAsync(`${TEXTURES}/blue-marble-2k.jpg`),
      loader.loadAsync(`${TEXTURES}/earth_specular_2048.jpg`),
      loader.loadAsync(`${TEXTURES}/earth_clouds_1024.png`),
      loader.loadAsync(`${TEXTURES}/night-lights-4k.jpg`),
    ]);
  } catch {
    intro.remove();
    return;
  }
  prepare(map);
  prepare(lights);
  clouds.colorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);

  // Night at the start, so the sun sits behind the globe and only rims its edge.
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  const ambient = new THREE.AmbientLight(0xffffff, 0.04);
  scene.add(sun, ambient);
  const sunNight = new THREE.Vector3(-5, 3, -1.5);
  const sunDay = new THREE.Vector3(5, 2, 4);

  const globe = new THREE.Group();
  const earthMaterial = new THREE.MeshPhongMaterial({
    map,
    specularMap: specular,
    specular: new THREE.Color(0x333333),
    shininess: 14,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: lights,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 128), earthMaterial);
  const cloudMaterial = new THREE.MeshPhongMaterial({ map: clouds, transparent: true, opacity: 0.55, depthWrite: false });
  const cloudLayer = new THREE.Mesh(new THREE.SphereGeometry(1.008, 96, 96), cloudMaterial);
  cloudLayer.renderOrder = 2;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.12, 64, 64), atmosphere);

  const target = surfacePoint(Number(intro.dataset.lat), Number(intro.dataset.lon));
  const { marker, dot, rings } = createMarker(target);
  globe.add(earth, cloudLayer, marker);
  scene.add(globe, halo);

  const startQuat = faceCamera(
    surfacePoint(Number(intro.dataset.lat) + START_OFFSET.lat, Number(intro.dataset.lon) + START_OFFSET.lon),
  );
  const endQuat = faceCamera(target);

  // The scroll timeline only sets `goal`. `now` chases it a little every frame,
  // so a fast flick of the wheel still plays out as one continuous glide.
  // The green blink is there from the very first frame.
  const goal = { travel: 0, dive: 0, blink: 1 };
  const now = { ...goal };
  let aspect = 1;
  let active = true;
  // The sharp map of Atlantic Canada arrives late. It has no city lights, so it only
  // fades in once the night has gone, or it would show as a dark box on the dark side.
  let patch: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhongMaterial> | undefined;

  const resize = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    aspect = width / height;
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  const startedAt = performance.now();
  const idle = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  gsap.ticker.add((_time, deltaTime) => {
    if (!active) return;
    const dt = Math.min(deltaTime, 100) / 1000;
    const time = (performance.now() - startedAt) / 1000;

    now.travel = damp(now.travel, goal.travel, 2.2, dt);
    now.dive = damp(now.dive, goal.dive, 3, dt);
    now.blink = damp(now.blink, goal.blink, 6, dt);

    // The globe keeps turning on its own, rocking either side of Fredericton so the
    // green blink never slips round the back. The scroll then takes over.
    idle.setFromAxisAngle(up, Math.sin(time * 0.35) * SWAY * (1 - now.travel));
    globe.quaternion.copy(idle).multiply(startQuat).slerp(endQuat, ease(now.travel));
    cloudLayer.rotation.y = time * 0.01;

    // Night falls away as the globe turns towards Fredericton, where it is daytime.
    const day = ease(now.travel);
    sun.position.lerpVectors(sunNight, sunDay, day);
    sun.intensity = THREE.MathUtils.lerp(3.5, 3, day);
    ambient.intensity = THREE.MathUtils.lerp(0.04, 0.4, day);
    // City lights are only meant for the night side, so they are gone well before the end.
    earthMaterial.emissiveIntensity = 1.3 * (1 - THREE.MathUtils.smoothstep(day, 0, 0.6));
    atmosphere.uniforms.uIntensity.value = THREE.MathUtils.lerp(1.15, 1, day);
    if (patch) {
      patch.material.opacity = THREE.MathUtils.smoothstep(day, 0.35, 0.7);
      patch.visible = patch.material.opacity > 0.01;
    }

    // The camera lifts a little on the way over, then settles down on the target.
    let distance = THREE.MathUtils.lerp(START_DISTANCE, 1.7, ease(now.travel)) + Math.sin(Math.PI * now.travel) * 0.9;
    distance = THREE.MathUtils.lerp(distance, 1.18, ease(now.dive));

    // Narrow screens need the camera further back to keep the globe and arrow in view.
    const fit = Math.max(1, 1.3 / aspect);
    camera.position.z = distance * THREE.MathUtils.lerp(fit, Math.min(fit, 1.4), ease(now.dive));

    halo.visible = distance > 1.5;
    // Clouds are a low-res layer, so they thin out as the camera gets close.
    cloudMaterial.opacity = 0.55 * THREE.MathUtils.clamp((distance - 1.8) / 1.2, 0, 1);
    cloudLayer.visible = cloudMaterial.opacity > 0.01;

    marker.visible = now.blink > 0.01;
    dot.scale.setScalar(1 + 0.25 * Math.sin(time * 5));
    for (const { mesh, offset } of rings) {
      const phase = (time * 0.7 + offset) % 1;
      mesh.scale.setScalar(0.008 + phase * 0.035);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * now.blink;
    }

    renderer.render(scene, camera);
  });

  const hint = intro.querySelector(".earth-hint");
  const veil = intro.querySelector(".earth-veil");

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: intro,
      start: "top top",
      end: "+=450%",
      pin: stage,
      scrub: 0.4,
      // Created after the page's other triggers, so without this its pin spacing is never counted in them.
      refreshPriority: 2,
      onToggle: (self) => {
        active = self.isActive || self.progress < 1;
      },
      onRefresh: (self) => document.body.classList.toggle("intro-done", self.progress === 1),
      onLeave: () => document.body.classList.add("intro-done"),
      onEnterBack: () => document.body.classList.remove("intro-done"),
    },
  });

  timeline
    // 1. The first scroll swings the globe round until Fredericton is dead centre.
    .to(hint, { opacity: 0, duration: 0.4 }, 0)
    .to(goal, { travel: 1, duration: 3.5, ease: "none" }, 0.2)
    // 2. Then the camera drops onto the blink, and the land fills the frame.
    .to(goal, { dive: 1, duration: 1.6, ease: "none" }, 3.7)
    // 3. The land washes out to the page colour, and the site takes over.
    .to(veil, { opacity: 1, duration: 0.8, ease: "power1.in" }, 4.6);

  // The pin pushes everything below it down, so the other triggers need new positions.
  ScrollTrigger.refresh();

  // Sharper imagery arrives in the background while the visitor reads the first line.
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const maxSize = renderer.capabilities.maxTextureSize;
  if (saveData || maxSize < 8192) return;

  try {
    const sharp = prepare(await loader.loadAsync(`${TEXTURES}/blue-marble-8k.jpg`));
    earthMaterial.map = sharp;
    earthMaterial.needsUpdate = true;
    map.dispose();

    patch = createPatch(prepare(await loader.loadAsync(`${TEXTURES}/atlantic-canada.jpg`)), specular);
    patch.visible = false;
    globe.add(patch);
  } catch {
    // The 2k globe is still fine on its own.
  }
}

const intro = document.querySelector<HTMLElement>(".earth-intro");

if (intro) {
  // No point loading a 3D scene for people who asked for less motion.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    intro.remove();
  } else {
    init(intro);
  }
}
