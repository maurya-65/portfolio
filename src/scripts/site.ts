import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText);

// Small seeded generator: the scattered letters land in the same places every visit.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const all = <T extends Element>(selector: string) => gsap.utils.toArray<T>(selector);

// Fredericton's clock in the footer, whatever timezone the visitor is in.
function startClock() {
  const clock = document.querySelector<HTMLTimeElement>("[data-clock]");
  if (!clock) return;
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: clock.dataset.clock,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
  const tick = () => (clock.textContent = format.format(new Date()).replace(/\./g, "").toUpperCase());
  tick();
  setInterval(tick, 15000);
}

// There is no backend, so the form opens the visitor's mail app with everything filled in.
function wireForm() {
  const form = document.querySelector<HTMLFormElement>(".contact-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const body = [
      `Name: ${data.get("name")}`,
      `Phone: ${data.get("phone")}`,
      `Email: ${data.get("email")}`,
      `Topic: ${data.get("topic")}`,
      "",
      `${data.get("message") ?? ""}`,
    ].join("\n");
    window.location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent("Portfolio message")}&body=${encodeURIComponent(body)}`;
  });
}

startClock();
wireForm();

// Everything below is skipped for reduced motion; the page reads fine without it.
gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
  // Smooth scrolling, driven by the GSAP ticker so ScrollTrigger stays in sync.
  const lenis = new Lenis({ anchors: true });
  lenis.on("scroll", ScrollTrigger.update);
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // Hero: the two words rise letter by letter once the intro hands over.
  const heroTrigger = { trigger: ".hero", start: "top 60%", once: true };
  gsap.from(".hero-title .ch-in", {
    yPercent: 115,
    duration: 1.1,
    stagger: 0.035,
    ease: "power4.out",
    scrollTrigger: heroTrigger,
  });
  gsap.from([".hero-based", ".hero-blurb", ".hero-tags li", ".hero-float"], {
    opacity: 0,
    y: 24,
    duration: 0.9,
    stagger: 0.08,
    delay: 0.6,
    ease: "power3.out",
    scrollTrigger: heroTrigger,
  });
  gsap.from(".hero-panel", {
    clipPath: "inset(100% 0 0 0)",
    duration: 1.2,
    delay: 0.3,
    ease: "power4.inOut",
    scrollTrigger: heroTrigger,
  });

  // The two floating labels drift up a little slower than the page.
  all<HTMLElement>(".hero-float").forEach((label) => {
    gsap.to(label, {
      yPercent: -120,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
  });

  // "About me": the letters climb into place at their own pace, so they overlap on the way.
  const rise = gsap.timeline({
    scrollTrigger: { trigger: ".about-title", start: "top 90%", end: "bottom 55%", scrub: 0.6 },
  });
  const aboutLetters = all(".about-heading .ch-in");
  aboutLetters.forEach((letter, index) => {
    rise.fromTo(letter, { yPercent: 130 }, { yPercent: 0, duration: 1, ease: "power2.out" }, index * 0.12);
  });

  // Every other big heading slides up when it comes into view.
  for (const selector of [".works-title", ".services-title", ".ach-title", ".contact-line"]) {
    all<HTMLElement>(`${selector} .letters`).forEach((group) => {
      gsap.from(group.querySelectorAll(".ch-in"), {
        yPercent: 115,
        duration: 0.9,
        stagger: 0.04,
        ease: "power4.out",
        scrollTrigger: { trigger: group, start: "top 88%", once: true },
      });
    });
  }

  // The statement: the end of each line comes apart and drifts away as you scroll past.
  const next = random(20260930);
  const drifting = all<HTMLElement>(".drift-ch");
  drifting.forEach((letter) => {
    gsap.to(letter, {
      x: 40 + next() * 260,
      y: 30 + next() * 380,
      rotation: (next() - 0.5) * 140,
      ease: "power1.in",
      scrollTrigger: { trigger: ".statement", start: "top 35%", end: "bottom top", scrub: 0.8 },
    });
  });

  // Body copy lights up word by word as it is read.
  all<HTMLElement>(".about-text, .about-lead").forEach((paragraph) => {
    const words = SplitText.create(paragraph, { type: "words" }).words;
    gsap.fromTo(
      words,
      { opacity: 0.15 },
      {
        opacity: 1,
        stagger: 0.1,
        ease: "none",
        scrollTrigger: { trigger: paragraph, start: "top 85%", end: "bottom 55%", scrub: true },
      },
    );
  });

  // Project cards fade up, and their images settle from a slight zoom.
  all<HTMLElement>(".work").forEach((card) => {
    gsap.from(card, {
      opacity: 0,
      y: 80,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: card, start: "top 88%", once: true },
    });
    gsap.fromTo(
      card.querySelector("img"),
      { scale: 1.25 },
      {
        scale: 1,
        ease: "none",
        scrollTrigger: { trigger: card, start: "top bottom", end: "bottom 35%", scrub: true },
      },
    );
  });

  // Services: the grid lines draw in, then the columns come up one by one.
  gsap.from(".service", {
    opacity: 0,
    y: 60,
    duration: 0.9,
    stagger: 0.1,
    ease: "power3.out",
    scrollTrigger: { trigger: ".service-grid", start: "top 85%", once: true },
  });

  gsap.from(".ach-list li", {
    opacity: 0,
    x: -30,
    duration: 0.8,
    stagger: 0.1,
    ease: "power3.out",
    scrollTrigger: { trigger: ".ach-list", start: "top 85%", once: true },
  });

  // "Great collabs": the letters lean away from the cursor.
  const contact = document.querySelector<HTMLElement>(".contact");
  const reactive = all<HTMLElement>(".contact-line-react .ch-in");
  const reach = 220;
  const onMove = (event: PointerEvent) => {
    for (const letter of reactive) {
      const box = letter.getBoundingClientRect();
      const dx = box.left + box.width / 2 - event.clientX;
      const dy = box.top + box.height / 2 - event.clientY;
      const distance = Math.hypot(dx, dy);
      const push = Math.max(0, 1 - distance / reach);
      gsap.to(letter, {
        x: (dx / (distance || 1)) * push * 46,
        y: (dy / (distance || 1)) * push * 26,
        rotation: (dx / reach) * push * 22,
        duration: 0.5,
        ease: "power3.out",
        overwrite: "auto",
      });
    }
  };
  const onLeave = () => gsap.to(reactive, { x: 0, y: 0, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" });
  contact?.addEventListener("pointermove", onMove);
  contact?.addEventListener("pointerleave", onLeave);

  // The footer wordmark rises as the page ends.
  gsap.from(".footer-wordmark span", {
    yPercent: 100,
    duration: 1.2,
    ease: "power4.out",
    scrollTrigger: { trigger: ".footer-wordmark", start: "top 95%", once: true },
  });

  return () => {
    contact?.removeEventListener("pointermove", onMove);
    contact?.removeEventListener("pointerleave", onLeave);
    gsap.ticker.remove(raf);
    lenis.destroy();
  };
});
