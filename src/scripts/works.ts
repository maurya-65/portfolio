import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Slide = { title: string; image: string; href: string };

// The Works section: a 3D screen that tips up as you scroll into it and shows one project at a time.
// The scene follows olha's: camera at z 1.5 (fov 45), a #101010 fog that clears over 200% of scroll, the
// group rotating from 1.5 rad to 0, a 0.813 x 0.47 screen, mouse parallax, and a drag or swipe to change
// slide. Her scene also loads a 3D model that is not part of the files, so a plain monitor stands in.
function init(host: HTMLElement) {
  const slides: Slide[] = JSON.parse(host.dataset.slides ?? "[]");
  const canvas = host.querySelector<HTMLCanvasElement>(".projects-gl");
  const stage = host.querySelector<HTMLElement>(".projects-stage");
  const tip = host.querySelector<HTMLElement>(".projects-tip");
  const swipe = host.querySelector<HTMLElement>(".projects-canvas__swipe");
  const link = host.querySelector<HTMLAnchorElement>(".link");
  const section = host.closest<HTMLElement>(".projects");
  if (!slides.length || !canvas || !stage || !section) return;

  const desktop = () => window.innerWidth > 1100;
  const BACKGROUND = "#101010";

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  scene.fog = new THREE.Fog(BACKGROUND, 0.01, 2.7);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 1.5);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = stage;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  let dirty = true;
  new ResizeObserver(resize).observe(stage);

  // Light for the stand-in monitor.
  scene.add(new THREE.HemisphereLight(0xbcc4ff, 0x080808, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(0.6, 1, 1.2);
  scene.add(key);

  const group = new THREE.Group();
  group.rotation.x = 1.5;
  scene.add(group);

  // The monitor: a bezel, a neck and a foot, sitting behind the screen plane.
  const metal = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55, metalness: 0.6 });
  const model = new THREE.Group();
  model.position.set(0, -0.25 + 0.25, 0);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.52, 0.035), metal);
  bezel.position.set(0, 0, -0.745);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 0.51),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.position.set(0, 0, -0.726);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.02), metal);
  neck.position.set(0, -0.36, -0.77);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.16), metal);
  foot.position.set(0, -0.465, -0.72);
  model.add(bezel, glow, neck, foot);
  group.add(model);

  // The slides: one plane per project, all stacked, the current one at full opacity.
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const planes = slides.map((slide, index) => {
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: index === 0 ? 1 : 0 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.813, 0.47), material);
    plane.position.set(0.004, 0.001, -0.72);
    group.add(plane);
    loader.load(slide.image, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.needsUpdate = true;
      dirty = true;
    });
    return plane;
  });

  // An invisible plane a little in front catches the pointer.
  const hit = new THREE.Mesh(new THREE.PlaneGeometry(0.813, 0.47), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
  hit.position.set(0, 0, -0.69);
  group.add(hit);

  // ---- Slider state
  let current = 0;
  const go = (index: number) => {
    current = index;
    if (link) link.href = slides[index].href;
    dirty = true;
  };

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const over = (event: PointerEvent | MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    group.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(hit).length > 0;
  };

  let hovering = false;
  const setHover = (value: boolean) => {
    if (hovering === value) return;
    hovering = value;
    document.body.style.cursor = value ? "grab" : "default";
    if (desktop()) showTip(value);
  };

  let startX = 0;
  let delta = 0;
  let dragging = false;
  canvas.style.touchAction = "pan-y";

  canvas.addEventListener("pointermove", (event) => {
    if (dragging) {
      delta = event.clientX - startX;
      return;
    }
    if (event.pointerType === "mouse") setHover(over(event));
  });
  canvas.addEventListener("pointerleave", () => {
    if (!dragging) setHover(false);
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (!over(event)) return;
    startX = event.clientX;
    delta = 0;
    dragging = true;
    document.body.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    if (delta < -40 && current < slides.length - 1) go(current + 1);
    else if (delta > 40 && current > 0) go(current - 1);
    delta = 0;
    document.body.style.cursor = hovering ? "grab" : "default";
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  // ---- The "Swipe" tag that follows the cursor over the screen (wide screens only)
  let tipTween: gsap.core.Tween | null = null;
  const tipX = tip ? gsap.quickTo(tip, "left", { duration: 0.5, ease: "power3.out" }) : null;
  const tipY = tip ? gsap.quickTo(tip, "top", { duration: 0.5, ease: "power3.out" }) : null;
  window.addEventListener("mousemove", (event) => {
    if (!hovering) return;
    tipX?.(event.clientX + 16);
    tipY?.(event.clientY + 16);
  });
  function showTip(show: boolean) {
    if (!tip) return;
    tipTween?.kill();
    tipTween = show
      ? gsap.fromTo(tip, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.5, delay: 0.2, ease: "power3.out" })
      : gsap.to(tip, { clipPath: "inset(0 0 0 100%)", duration: 0.5, delay: 0.2, ease: "power3.in" });
  }

  // ---- Mouse parallax on a wide screen
  const mouse = { x: 0, y: 0 };
  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });

  // ---- Scroll: the fog clears and the screen tips up, both scrubbed
  const fog = scene.fog as THREE.Fog;
  gsap.to(fog, {
    near: 2.5,
    far: 3,
    ease: "none",
    onUpdate: () => (dirty = true),
    scrollTrigger: { trigger: section, start: "top top", end: "+=200%", scrub: 2, invalidateOnRefresh: true },
  });
  gsap.to(group.rotation, {
    x: 0,
    ease: "none",
    onUpdate: () => (dirty = true),
    scrollTrigger: { trigger: section, start: "top 40%", end: "+=200%", scrub: 2, invalidateOnRefresh: true },
  });

  // The "view case" link and the phone hint appear as the section scrolls.
  if (link) {
    gsap.fromTo(link, { opacity: 0, pointerEvents: "none" }, { opacity: 1, pointerEvents: "auto", scrollTrigger: { trigger: section, start: "top -100%", end: "bottom 100%", scrub: true } });
  }
  if (swipe && window.innerWidth < 1100) {
    gsap.fromTo(swipe, { opacity: 0, pointerEvents: "none" }, { opacity: 1, pointerEvents: "auto", scrollTrigger: { trigger: section, start: "top -100%", end: "bottom 100%", scrub: true } });
  }

  // Frames are only drawn while the section is around (olha: from the middle of About to the middle of Services).
  let active = false;
  const from = document.querySelector(".about") ?? section;
  const to = document.querySelector(".services") ?? from;
  ScrollTrigger.create({
    trigger: from,
    start: document.querySelector(".about") ? "center center" : "top bottom",
    endTrigger: to,
    end: "center top",
    onToggle: (self) => {
      active = self.isActive;
      dirty = true;
    },
  });

  gsap.ticker.add(() => {
    let moving = false;
    planes.forEach((plane, index) => {
      const material = plane.material as THREE.MeshBasicMaterial;
      const target = index === current ? 1 : 0;
      const next = material.opacity + 0.15 * (target - material.opacity);
      if (Math.abs(next - material.opacity) > 0.001) moving = true;
      material.opacity = Math.abs(target - next) < 0.001 ? target : next;
    });
    if (desktop()) {
      const dx = 0.05 * (0.1 * mouse.x - camera.position.x);
      const dy = 0.05 * (0.1 * mouse.y - camera.position.y);
      if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) moving = true;
      camera.position.x += dx;
      camera.position.y += dy;
      camera.lookAt(0, 0, 0);
    }
    if (active || dirty || moving) {
      renderer.render(scene, camera);
      dirty = false;
    }
  });

  resize();
}

const host = document.querySelector<HTMLElement>(".projects-canvas");
if (host) init(host);
