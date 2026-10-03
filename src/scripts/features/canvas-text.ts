import Matter from "matter-js";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";
import { lite, pixelRatio } from "../lib/perf";

type Line = { text: string; white: boolean };
type Point = { x: number; y: number };

// The statement in the About section: every letter is a Matter.js body, standing in place until the
// section scrolls in, then falling and piling up on the floor. The mouse pushes letters away. Numbers are
// olha's: gravity 3, the layout scaled from a 1920 wide design, forces 0.4 (0.05 on a phone).
export function canvasText(): Promise<void> {
  const host = document.querySelector<HTMLElement>(".canvas-text");
  if (!host) return Promise.resolve();
  const lines: Line[] = JSON.parse(host.dataset.lines ?? "[]");
  if (!lines.length) return Promise.resolve();

  const { Engine, Render, World, Bodies, Events, Runner, Body } = Matter;
  let teardown: (() => void) | null = null;
  let dead = false;

  async function build() {
    // The letters are measured with the real font, so it has to be there first.
    try {
      await document.fonts.load('900 100px "Sofia Sans Condensed"');
      await document.fonts.ready;
    } catch {
      // The fallback font still works.
    }
    if (dead) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const scale = width / 1920;
    const wide = width > 1100;

    const startX = (wide ? 580 : 60) * scale;
    const fontBase = (wide ? 170 : 230) * scale;
    const bodyBase = (wide ? 150 : 250) * scale;
    const spacingBase = -80 * scale;
    const stepBase = (wide ? 140 : 200) * scale;
    const total = stepBase * lines.length;
    const shrink = total > height ? height / total : 1;
    const fontSize = fontBase * shrink;
    const bodyHeight = bodyBase * shrink;
    const step = stepBase * shrink;
    const spacing = spacingBase * shrink;
    let top = 150;
    if (width > 1300) top = 250;
    else if (width > 1100) top = 150;
    else if (width > 768) top = 100;
    top *= shrink;
    const push = width > 768 ? 0.4 : 0.05;

    try {
      await document.fonts.load(`900 ${Math.max(60, fontSize)}px "Sofia Sans Condensed"`);
    } catch {
      // As above.
    }
    if (dead) return;

    const ruler = document.createElement("canvas").getContext("2d")!;
    ruler.font = `900 ${fontSize}px "Sofia Sans Condensed", sans-serif`;
    ruler.textAlign = "left";
    ruler.textBaseline = "alphabetic";

    const engine = Engine.create({ positionIterations: lite ? 5 : 8, velocityIterations: lite ? 4 : 6 });
    const render = Render.create({
      element: host!,
      engine,
      options: { width, height, pixelRatio: pixelRatio(), wireframes: false, background: "#101010" },
    });
    engine.gravity.y = 3;

    const floorHeight = Math.max(16, 0.12 * bodyHeight);
    const floor = Bodies.rectangle(width / 2, height + floorHeight / 2, 2 * width, floorHeight, {
      isStatic: true,
      restitution: 0,
      friction: 1,
      frictionStatic: 1,
      render: { visible: false },
    });
    const left = Bodies.rectangle(-20, height / 2, 40, 2 * height, { isStatic: true, render: { visible: false } });
    const right = Bodies.rectangle(width + 20, height / 2, 40, 2 * height, { isStatic: true, render: { visible: false } });
    World.add(engine.world, [floor, left, right]);

    type Letter = Matter.Body & { customChar: string; customColor: string };
    const letters: Letter[] = [];
    const homes: Point[] = [];

    const before = (text: string, count: number) => ruler.measureText(text.slice(0, count)).width;
    const tighten = 0.1 * spacing;
    let y = top;
    for (const line of lines) {
      const chars = [...line.text];
      chars.forEach((char, index) => {
        const from = before(line.text, index);
        const to = before(line.text, index + 1);
        const glyph = Math.max(1, to - from + tighten);
        const x = startX + from + tighten * index + glyph / 2;
        const body = Bodies.rectangle(x, y, glyph, bodyHeight, {
          restitution: 0.1,
          friction: 0.01,
          frictionAir: 0.01,
          density: 0.0005,
          render: { fillStyle: "transparent", strokeStyle: "transparent" },
        }) as Letter;
        body.customChar = char;
        body.customColor = line.white ? "#ffffff" : "#a9a9a9";
        Body.setStatic(body, true);
        World.add(engine.world, body);
        letters.push(body);
        homes.push({ x: body.position.x, y: body.position.y });
      });
      y += step;
    }

    const draw = () => {
      const context = render.context;
      for (const { position, angle, customChar, customColor } of letters) {
        context.save();
        context.translate(position.x, position.y);
        context.rotate(angle);
        context.fillStyle = customColor;
        context.font = `900 ${fontSize}px "Sofia Sans Condensed", sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(customChar, 0, 0);
        context.restore();
      }
    };
    Events.on(render, "afterRender", draw);

    // Letters ease back to their places when the section scrolls back out.
    let settling = 0;
    const cancelSettle = () => {
      if (settling) cancelAnimationFrame(settling);
      settling = 0;
    };
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const settle = () => {
      cancelSettle();
      for (const body of letters) {
        Body.setStatic(body, true);
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
      }
      const move = () => {
        let done = true;
        letters.forEach((body, index) => {
          const target = homes[index];
          const nx = lerp(body.position.x, target.x, 0.18);
          const ny = lerp(body.position.y, target.y, 0.18);
          const na = lerp(body.angle, 0, 0.18);
          Body.setPosition(body, { x: nx, y: ny });
          Body.setAngle(body, na);
          Body.setVelocity(body, { x: 0, y: 0 });
          Body.setAngularVelocity(body, 0);
          if (Math.abs(nx - target.x) > 0.3 || Math.abs(ny - target.y) > 0.3 || Math.abs(na) > 0.005) done = false;
        });
        if (done) {
          letters.forEach((body, index) => {
            Body.setPosition(body, homes[index]);
            Body.setAngle(body, 0);
            Body.setVelocity(body, { x: 0, y: 0 });
            Body.setAngularVelocity(body, 0);
          });
          settling = 0;
        } else {
          settling = requestAnimationFrame(move);
        }
      };
      move();
    };

    const repel = (event: MouseEvent) => {
      for (const body of letters) {
        if (body.isStatic) continue;
        const dx = body.position.x - event.clientX;
        const dy = body.position.y - event.clientY;
        const squared = dx * dx + dy * dy;
        if (squared < 14400) {
          const distance = Math.sqrt(squared) || 1;
          const strength = push * (1 - distance / 400);
          Body.applyForce(body, body.position, { x: (dx / distance) * strength, y: (dy / distance) * strength });
        }
      }
    };

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    const fall = ScrollTrigger.create({
      trigger: ".about-first__wrapper",
      start: "top -50%",
      end: "top -200%",
      toggleActions: "play reverse play reverse",
      onEnter: () => {
        cancelSettle();
        letters.forEach((body, index) => {
          Body.setStatic(body, true);
          Body.setPosition(body, homes[index]);
          Body.setAngle(body, 0);
          Body.setVelocity(body, { x: 0, y: 0 });
          Body.setAngularVelocity(body, 0);
        });
        setTimeout(() => {
          for (const body of letters) {
            Body.setStatic(body, false);
            Body.applyForce(body, body.position, { x: 0.02 * (Math.random() - 0.5), y: 0.003 * Math.random() });
          }
        }, 40);
        window.addEventListener("mousemove", repel);
      },
      onLeaveBack: () => {
        settle();
        window.removeEventListener("mousemove", repel);
      },
    });

    // The bg slides down over the pile as the section moves on.
    const cover = gsap.to(".canvas-text__bg", {
      y: 0,
      scrollTrigger: { trigger: ".about-first__wrapper", start: "top -150%", end: "top -250%", scrub: true },
    });

    // Nothing to simulate or draw while the section is far off screen.
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          Render.run(render);
          Runner.run(runner, engine);
        } else {
          Render.stop(render);
          Runner.stop(runner);
        }
      },
      { rootMargin: "20% 0px" },
    );
    watcher.observe(host!);

    // Draw the first frame now, so the letters are already on the canvas when the section scrolls in.

    Render.world(render);

    ScrollTrigger.refresh(true);

    teardown = () => {
      cancelSettle();
      watcher.disconnect();
      window.removeEventListener("mousemove", repel);
      Events.off(render, "afterRender", draw);
      Render.stop(render);
      Runner.stop(runner);
      render.canvas.remove();
      World.clear(engine.world, false);
      Engine.clear(engine);
      fall.kill();
      cover.scrollTrigger?.kill();
      cover.kill();
    };
  }

  const ready = build();

  let timer: number | undefined;
  let lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      // Phones fire resize when the address bar hides; only a width change moves the layout.
      if (window.innerWidth === lastWidth && window.innerWidth < 1100) return;
      lastWidth = window.innerWidth;
      teardown?.();
      teardown = null;
      build();
    }, 120);
  });
  return ready;
}
