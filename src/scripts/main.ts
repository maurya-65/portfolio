import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { awards } from "./features/awards";

gsap.registerPlugin(ScrollTrigger);

const all = <T extends Element>(selector: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(selector));
const one = <T extends Element>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector);

const FULL = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";

// Always start at the top on a reload (the inline script in <head> does the same before first paint).
if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
window.scrollTo(0, 0);

// Smooth scrolling, driven by the GSAP ticker so ScrollTrigger stays in sync. olha uses Lenis with its defaults.
// Lenis would otherwise drop its smoothing and make scrollTo instant when the OS asks for reduced motion.
const lenis = new Lenis({ respectReducedMotion: false });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// The clock in the footer (and the phone menu), for wherever the visitor is: "(GMT-3) 11:51".
function startClock() {
  const clocks = all<HTMLElement>("[data-clock]");
  if (!clocks.length) return;
  const zone = clocks[0].dataset.clock!;
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false });
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" });
  const tick = () => {
    const now = new Date();
    const gmt = offset.formatToParts(now).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
    for (const clock of clocks) {
      const target = one<HTMLElement>("[data-clock-time]", clock);
      if (target) target.textContent = `(${gmt}) ${time.format(now)}`;
    }
  };
  tick();
  setInterval(tick, 1000);
}

// Scrolls to a section id the way olha's nav does: 0.8s, power3.out, stopping under the header.
function scrollToSection(id: string) {
  if (id === "top") {
    lenis.scrollTo(0, { duration: 0.8, easing: (t) => 1 - Math.pow(1 - t, 3) });
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;
  const offset = -(one<HTMLElement>(".header")?.offsetHeight ?? 0);
  lenis.scrollTo(target, { offset, duration: 0.8, easing: (t) => 1 - Math.pow(1 - t, 3) });
}

// The header: anchor links, the phone burger, and its colour while it sits over the dark sections.
function wireHeader() {
  const header = one<HTMLElement>(".header");
  const burger = one<HTMLElement>(".burger");

  for (const link of all<HTMLAnchorElement>("[data-anchor]")) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (window.innerWidth < 768) header?.classList.remove("burger-active");
      scrollToSection(link.dataset.anchor!);
    });
  }

  const toggle = () => header?.classList.toggle("burger-active");
  burger?.addEventListener("click", toggle);
  burger?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  });

  // Below 768px the header is dark text on a light page, and turns white over the dark zones.
  if (window.innerWidth < 768 && header) {
    const paint = (color: string) => gsap.to([".header-logo", ".burger"], { color, duration: 0.3, overwrite: "auto" });
    paint("#000");
    for (const zone of all(".dark-zone")) {
      ScrollTrigger.create({
        trigger: zone,
        start: "top 5%",
        end: "bottom top",
        onEnter: () => !header.classList.contains("burger-active") && paint("#fff"),
        onEnterBack: () => !header.classList.contains("burger-active") && paint("#fff"),
        onLeave: () => !header.classList.contains("burger-active") && paint("#000"),
        onLeaveBack: () => !header.classList.contains("burger-active") && paint("#000"),
      });
    }
    new MutationObserver(() => {
      if (header.classList.contains("burger-active")) gsap.to([".header-logo", ".burger"], { color: "#000", duration: 0.2, overwrite: "auto" });
    }).observe(header, { attributes: true, attributeFilter: ["class"] });
  }
}

// Bracket links: on hover the letters roll up to their clones, 0.02s apart from the end, 0.5s power3.out.
function wireRollLinks() {
  for (const link of all<HTMLElement>(".link")) {
    const original = all(".original span", link);
    const clone = all(".clone span", link);
    if (!original.length) continue;
    const wide = () => window.innerWidth > 1100;
    link.addEventListener("mouseenter", () => {
      if (!wide()) return;
      gsap.to(original, { yPercent: -100, stagger: { each: 0.02, from: "end" }, duration: 0.5, ease: "power3.out" });
      gsap.to(clone, { yPercent: -100, stagger: { each: 0.02, from: "end" }, duration: 0.5, ease: "power3.out" });
    });
    link.addEventListener("mouseleave", () => {
      if (!wide()) return;
      gsap.to(original, { yPercent: 0, stagger: { each: 0.02, from: "end" }, duration: 0.5, ease: "power3.out" });
      gsap.to(clone, { yPercent: 100, stagger: { each: 0.02, from: "end" }, duration: 0.5, ease: "power3.out" });
    });
  }
}

// Clicking an email copies it, and a "Copied" tag follows the cursor for three seconds.
function wireCopy() {
  const tip = one<HTMLElement>(".copy-tooltip");
  if (!tip) return;
  let hide: number | undefined;
  let follow: ((event: MouseEvent) => void) | null = null;
  gsap.set(tip, { clipPath: "inset(0 0 0 100%)" });

  const close = () => {
    if (follow) window.removeEventListener("mousemove", follow);
    follow = null;
    gsap.to(tip, { clipPath: "inset(0 0 0 100%)", duration: 0.5, ease: "power3.out", overwrite: "auto" });
  };

  for (const link of all<HTMLElement>("[data-copy]")) {
    link.addEventListener("click", (event) => {
      navigator.clipboard?.writeText(link.dataset.copy!).then(() => {
        gsap.set(tip, { x: event.clientX + 40, y: event.clientY });
        if (follow) window.removeEventListener("mousemove", follow);
        follow = (move) => gsap.to(tip, { x: move.clientX + 40, y: move.clientY, duration: 0.4, ease: "power2.out" });
        window.addEventListener("mousemove", follow);
        gsap.fromTo(tip, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "power3.out", overwrite: "auto" });
        window.clearTimeout(hide);
        hide = window.setTimeout(close, 3000);
      });
    });
  }
}

// Every section heading: its letters drop in from above as it scrolls into view, middle letter first.
function wireTitles() {
  for (const title of all<HTMLElement>(".animation-title")) {
    const letters = all(".letter", title);
    gsap.fromTo(
      letters,
      { y: "-120%" },
      { y: 0, duration: 1, ease: "power3.out", stagger: { each: 0.05, from: "center" }, scrollTrigger: { trigger: title, start: "top 100%", end: "bottom 30%", scrub: 1 } },
    );
  }
}

// The hero: the letters drop in from the middle out, then everything else fades up, and finally the
// year counter rolls. Started when the hero first comes into view (olha starts it when its loader ends).
let startHero: (() => void) | undefined;
function wireHero() {
  const hero = one(".hero");
  if (!hero) return;

  // "Based in" ends exactly under the last letter of the title: its right edge follows the title's.
  const based = one<HTMLElement>(".hero-based");
  const alignBased = () => {
    const letters = all<HTMLElement>(".hero-title .hero-word:last-child .hero-letter");
    const parent = based?.offsetParent as HTMLElement | null;
    if (!based || !parent || !letters.length) return;
    const trailing = Math.abs(parseFloat(getComputedStyle(letters[0]).letterSpacing) || 0);
    based.style.right = `${parent.getBoundingClientRect().right - letters[letters.length - 1].getBoundingClientRect().right - trailing}px`;
  };
  alignBased();
  window.addEventListener("resize", alignBased);
  document.fonts?.ready.then(alignBased);

  const play = () => {
    const ease = "power4.out";
    gsap.to(".hero-title .hero-letter", { y: 0, delay: 0.5, duration: 1.7, ease: "power4.inOut", stagger: { each: 0.03, from: "center" } });
    if (window.innerWidth < 768) {
      gsap.to(".hero-title", { delay: 1.5, onComplete: () => one(".hero-title")?.classList.add("hero-title-after") });
    }
    gsap.to(".hero-designer", { opacity: 1, delay: 1.5, duration: 1, ease });
    gsap.to(".hero-designer__img>img", { clipPath: FULL, scale: 1, delay: 1.6, duration: 2.5, ease });
    gsap.to(".hero-designer__descr>p>span", { y: 0, delay: 1.7, duration: 1, ease, stagger: { each: 0.08 } });
    for (const part of [".hero-based", ".hero-description", ".hero-recent", ".hero-collab"]) {
      gsap.to(part, { opacity: 1, delay: 1.5, duration: 1, ease });
    }
    gsap.to(".hero-title__number-first>span", { y: "200%", delay: 2, duration: 2, ease });
    gsap.to(".hero-title__number-third>span", { y: "300%", delay: 2.2, duration: 1.5, ease });
    gsap.to(".hero-title__number-third>span", { y: "0%", delay: 3.2, duration: 2, ease });
    gsap.to(".hero-title__number-four>span", { y: "0%", delay: 2.7, duration: 2, ease });
    gsap.to(".hero-title__number-five>span", { y: "900%", delay: 2.8, duration: 2, ease });
    gsap.to(".hero-title__number-five>span", { y: "600%", delay: 4.3, duration: 2, ease });
    gsap.to(".hero-title__number-second", { opacity: 1, delay: 3, duration: 1, ease });
    // olha marks the page loaded a few seconds after the last of these; the class pins the final state.
    gsap.delayedCall(7.5, () => document.body.classList.add("loaded"));
  };

  startHero = play;
}

// The About section: everything below the physics text is tied to the scroll through the pinned wrapper.
function wireAbout() {
  const wrapper = ".about__wrapper";
  const scrub = (start: string, end: string, value: boolean | number = 1, trigger: string | Element = wrapper) => ({ trigger, start, end, scrub: value });

  gsap.to(".about-first-top span", { yPercent: 100, stagger: 0.1, scrollTrigger: scrub("top -150%", "top -200%") });
  gsap.to(".about-second-title", { opacity: 1, stagger: 0.1, scrollTrigger: scrub("top -220%", "top -240%") });
  gsap.to(".about-second__top>h4>span", { y: 0, scrollTrigger: scrub("top -200%", "top -250%") });
  gsap.to(".text-first__img>img", { y: 0, scrollTrigger: scrub("top -200%", "top -300%"), clipPath: FULL, scale: 1 });

  const first = gsap.utils.toArray<HTMLElement>(".text-first__text-wrapper > span");
  gsap.to(first.reverse(), { y: 0, rotate: 0, duration: 1, stagger: 0.2, ease: "power2.out", scrollTrigger: scrub("top -200%", "top -300%", true) });

  const second = gsap.utils.toArray<HTMLElement>(".text-second__text-wrapper > span");
  gsap.to(second.reverse(), { y: 0, rotate: 0, duration: 1, stagger: 0.2, ease: "power2.out", scrollTrigger: scrub("top -240%", "top -300%", true) });
  gsap.to(".text-second h3", { opacity: 1, scrollTrigger: scrub("top -240%", "top -300%") });

  if (window.innerWidth > 1100) {
    gsap.to(".text-third__img img", { scrollTrigger: scrub("top -250%", "top -320%", 1, ".text-third__img"), clipPath: FULL, scale: 1, stagger: 0.2 });

    // The paragraphs reveal word by word, tied to the scroll (Abdullah's text effect): each word rises out of
    // the line mask over a quarter of the block's scroll window, staggered across it, so lines come in top to
    // bottom and play back in reverse when scrolling up. The wrapper is taller than the screen and only lets go
    // of its pin at the end of the section, so a block's scroll position is worked out from where it will
    // actually sit on screen: it reaches 85% of the viewport height at the start and 40% at the end.
    const section = one<HTMLElement>(".about")!;
    const pinned = one<HTMLElement>(".about__wrapper")!;
    const offsetIn = (el: HTMLElement) => {
      let top = 0;
      for (let node: HTMLElement | null = el; node && node !== pinned; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
      return top;
    };
    const released = () => section.getBoundingClientRect().top + window.scrollY + section.offsetHeight - pinned.offsetHeight;
    for (const selector of [".abs-t", ".ast-s", ".text-third__title", ".text-four"]) {
      const block = one<HTMLElement>(selector);
      if (!block) continue;
      const words: HTMLElement[] = [];
      for (const inner of all<HTMLElement>(".reveal-line > span", block)) {
        const parts = (inner.textContent ?? "").trim().split(/\s+/);
        inner.textContent = "";
        parts.forEach((word, i) => {
          const span = document.createElement("span");
          span.style.display = "inline-block";
          span.textContent = word + (i < parts.length - 1 ? " " : "");
          inner.append(span);
          words.push(span);
        });
      }
      if (!words.length) continue;
      const each = words.length > 1 ? 0.75 / (words.length - 1) : 0;
      const at = (line: number) => () => Math.min(released() + offsetIn(block) - window.innerHeight * line, released() + pinned.offsetHeight);
      gsap.set(words, { yPercent: 110, opacity: 0 });
      const timeline = gsap.timeline({ scrollTrigger: { trigger: section, start: at(0.85), end: at(0.4), scrub: 0.6, invalidateOnRefresh: true } });
      words.forEach((word, i) => timeline.to(word, { yPercent: 0, opacity: 1, duration: 0.25, ease: "none" }, i * each));
    }
  } else {
    gsap.to(".about-mobile-text", { opacity: 1, scrollTrigger: scrub("top -150%", "top -200%", true, ".about-mobile-text") });
    gsap.to(".about-second-title", { opacity: 1, scrollTrigger: scrub("top -150%", "top -200%", true, ".about-second-title") });
  }
}

// Services: the blocks fade in staggered, and on a wide screen the hovered one opens up (384 -> 730, the rest 300).
// On a phone the blocks are a click accordion instead.
function wireServices() {
  const wrapper = one<HTMLElement>(".services__wrapper");
  const blocks = all<HTMLElement>(".services-block");
  if (!wrapper || !blocks.length) return;

  gsap.to(blocks, { scrollTrigger: { trigger: ".services", start: "top 20%" }, opacity: 1, duration: 1.5, stagger: 0.1 });

  let active: number | null = null;
  const wide = () => window.innerWidth > 768;

  const paint = () => {
    blocks.forEach((block, index) => {
      const number = one<HTMLElement>(".services-block__number", block)!;
      const title = one<HTMLElement>(".services-block__title", block)!;
      block.classList.toggle("mobile", !wide());
      if (wide()) {
        block.style.width = active === null ? "384rem" : active === index ? "730rem" : "300rem";
        block.style.maxHeight = "";
        block.style.background = "";
        number.style.opacity = "";
        title.style.transform = "";
      } else {
        block.style.width = "";
        block.style.maxHeight = active === index ? "1000px" : "55px";
        block.style.background = active === index ? "" : "#f5f5f5";
        number.style.opacity = active === index ? "" : "1";
        title.style.transform = active === index ? "" : "translate(0, 4px)";
      }
    });
  };

  blocks.forEach((block, index) => {
    block.addEventListener("mouseenter", () => {
      if (!wide()) return;
      active = index;
      paint();
    });
    block.addEventListener("click", () => {
      if (wide()) return;
      active = active === index ? null : index;
      paint();
      ScrollTrigger.refresh();
    });
  });
  wrapper.addEventListener("mouseleave", () => {
    active = null;
    paint();
  });
  window.addEventListener("resize", () => {
    active = null;
    paint();
  });
  paint();
}

// The contact form: an active topic, a phone field that keeps its "+", and a mail draft in place of a backend.
function wireForm() {
  gsap.fromTo(".form form", { opacity: 0 }, { opacity: 1, duration: 1.5, ease: "power3.out", scrollTrigger: { trigger: ".form", start: "top 85%" } });

  const form = one<HTMLFormElement>("[data-contact-form]");
  if (!form) return;

  const labels = all<HTMLLabelElement>(".budget label", form);
  form.addEventListener("change", (event) => {
    if ((event.target as HTMLInputElement).name !== "topic") return;
    labels.forEach((label) => label.classList.toggle("is-active-radio", label.querySelector("input")!.checked));
  });

  const phone = one<HTMLInputElement>('input[name="phone"]', form);
  if (phone) {
    phone.addEventListener("focus", () => {
      if (phone.value && phone.value.startsWith("+")) return;
      phone.value = "+";
      requestAnimationFrame(() => phone.setSelectionRange(phone.value.length, phone.value.length));
    });
    phone.addEventListener("input", () => {
      const caret = phone.selectionStart ?? 0;
      phone.value = "+" + phone.value.replace(/[^\d()+\- ]/g, "").replace(/\+/g, "");
      if (caret > 1 && phone.value.length >= caret) {
        try {
          phone.setSelectionRange(caret, caret);
        } catch {
          // Some input types refuse selection ranges; the value is still right.
        }
      }
    });
    phone.addEventListener("keydown", (event) => {
      const atStart = phone.selectionStart === 1 && phone.selectionEnd === 1;
      const atZero = phone.selectionStart === 0 && phone.selectionEnd === 0;
      if ((event.key === "Backspace" && atStart) || (event.key === "Delete" && atZero)) event.preventDefault();
    });
    phone.addEventListener("blur", () => {
      if (phone.value.replace(/\D/g, "").length === 0) phone.value = "";
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
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

// The footer name rises from below as the footer arrives; the links and the small print fade in.
function wireFooter() {
  gsap.fromTo(
    ".footer-title span",
    { yPercent: 150 },
    { yPercent: 0, ease: "power2.out", stagger: { each: 0.03, from: "center" }, scrollTrigger: { trigger: ".footer", start: "top 30%", end: "bottom bottom", scrub: 5 } },
  );
  gsap.to(".footer-behance", { scrollTrigger: { trigger: ".footer", start: "top 30%" }, opacity: 1, duration: 1.5 });
  gsap.to(".footer-reserved", { scrollTrigger: { trigger: ".footer", start: "top 30%" }, opacity: 1, delay: 0.8, duration: 1.5 });
}

startClock();
wireHeader();
// The loader, after olha's: two belts of developer text turn on a light screen while a real percentage climbs
// (fonts, the page load, every image, both 3D scenes). At 100 the belts drop away and the hero plays at once.
function runLoader(): Promise<void> {
  const cover = one<HTMLElement>("#loader");
  if (!cover) return Promise.resolve();
  const counter = one<HTMLElement>("[data-loader-count]", cover)!;
  const label = one<HTMLElement>(".loader-counter", cover)!;
  lenis.stop();
  const ring = import("./scenes/loader-ring.ts").then((module) => module.createLoaderRing(cover)).catch(() => null);

  // A safety net only: a stuck asset must not hold the page forever.
  const patient = (task: Promise<unknown>) => Promise.race([task.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 20000))]);
  const pageLoaded = new Promise<void>((resolve) => (document.readyState === "complete" ? resolve() : window.addEventListener("load", () => resolve(), { once: true })));
  const tasks = [
    pageLoaded,
    document.fonts?.ready ?? Promise.resolve(),
    ...all<HTMLImageElement>("img").map((img) => img.decode()),
    // The two Three.js scenes: modules, textures, shaders and the first frame.
    import("./scenes/works.ts").then((module) => module.ready),
    import("./scenes/laptop.ts").then((module) => module.ready),
    ring,
    // The About letters: measured with the real font and drawn once.
    textReady,
  ].map(patient);

  // olha's sequence, which starts only once everything has loaded (hers is about 11 seconds from the request):
  // the rings rise after 1s, the number fades in at 2.3s, counts 0 to 100 over 4s (power3.out) from about 3.1s,
  // fades out, and the rings drop. The number is only ever shown counting after the page is really ready.
  return new Promise((resolve) => {
    Promise.all(tasks).then(async () => {
      const scene = await ring;
      scene?.start();
      const shown = { value: 0 };
      const timeline = gsap.timeline();
      timeline.to(label, { opacity: 1, duration: 0.6, delay: 2.3 });
      timeline.to(shown, { value: 100, duration: 4, delay: 0.5, ease: "power3.out", onUpdate: () => (counter.textContent = String(Math.round(shown.value))) }, "-=0.3");
      timeline.to(label, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          // Measure everything while the cover still hides it, so nothing reflows under the hero animation.
          ScrollTrigger.refresh();
          // The hero starts as the rings start to drop, not after they are gone.
          onLoaderExit();
          // olha's order: the rings drop, then the sections fade in, then the links come alive, then the header fades in.
          const exit = scene?.exit() ?? gsap.timeline();
          exit.to("section", { opacity: 1, pointerEvents: "auto", duration: 1 });
          exit.to("a", { pointerEvents: "auto" });
          exit.to(".header", { opacity: 1, pointerEvents: "auto", duration: 1 });
          gsap.to(cover, {
            opacity: 0,
            delay: 1,
            duration: 0.5,
            ease: "power4.out",
            onComplete: () => {
              scene?.destroy();
              cover.remove();
              lenis.start();
              resolve();
            },
          });
        },
      });
    });
  });
}

function onLoaderExit() {
  startHero?.();
}

wireRollLinks();
wireCopy();
wireTitles();
wireHero();
wireAbout();
wireServices();
awards();
wireForm();
wireFooter();
// Matter.js is about a third of this file, and nothing needs it before the loader is on screen.
const textReady = import("./features/canvas-text").then((module) => module.canvasText());
runLoader().then(() => {
  window.dispatchEvent(new Event("site:ready"));
});

// Fonts change text widths, so everything is measured again once they are in.
document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });

// Lazy images below the fold arrive after `load` and can shift the page; re-measure so scroll start points stay true.
let refreshTimer: number | undefined;
for (const img of all<HTMLImageElement>("img")) {
  if (img.complete) continue;
  img.addEventListener("load", () => {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  }, { once: true });
}
