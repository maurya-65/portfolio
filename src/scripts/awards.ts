import { gsap } from "gsap";

// The Education rows: hovering a row (after half a second) opens a stack of pictures in the preview area,
// each wiping up from a clipped line while it scales 1.3 -> 1. On a phone a row is tapped instead and the
// preview scrolls sideways. All timings are olha's.
export function awards() {
  const wrap = document.querySelector<HTMLElement>(".awards-wrap");
  if (!wrap) return;
  const rows = gsap.utils.toArray<HTMLElement>(".awards-block", wrap);
  const preview = wrap.querySelector<HTMLElement>(".awards-preview");
  const stage = preview?.querySelector<HTMLElement>(".awards-preview__wrap");
  if (!preview || !stage) return;

  const phone = window.matchMedia("(max-width: 620px)");
  const CLOSED = "polygon(0 0, 100% 0, 100% 0, 0 0)";
  const OPEN = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";

  // Each row's pictures move into the preview; the row keeps an empty shell.
  const stacks: Array<HTMLElement | undefined> = [];
  rows.forEach((row, index) => {
    const shell = row.querySelector<HTMLElement>(".awards-block__img");
    const pictures = row.querySelector<HTMLElement>(".awards-block__img-wrap");
    if (!pictures) return;
    stacks[index] = pictures;
    stage.appendChild(pictures);
    shell?.setAttribute("data-moved", "true");
  });

  const parking = document.createElement("div");
  parking.style.display = "none";
  preview.appendChild(parking);

  const timing = () => ({
    open: phone.matches ? 1.25 : 1.2,
    close: phone.matches ? 1.05 : 1,
    scaleIn: phone.matches ? 0.9 : 0.8,
    scaleOut: phone.matches ? 0.85 : 0.8,
    stagger: phone.matches ? 0.06 : 0.05,
    delayPhone: phone.matches ? 0.8 : 0,
    hover: 500,
  });

  const close = (stack?: HTMLElement) => {
    if (!stack) return gsap.timeline();
    const t = timing();
    const frames = stack.querySelectorAll(".awards-block__img-picture");
    const images = stack.querySelectorAll(".awards-block__img-picture img");
    gsap.killTweensOf([frames, images]);
    const tl = gsap.timeline();
    tl.to(frames, { clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)", duration: t.close, ease: "power3.inOut", stagger: t.stagger, overwrite: "auto" }, 0);
    tl.to(images, { scale: 1.3, duration: t.scaleOut, ease: "power3.inOut", stagger: t.stagger, overwrite: "auto" }, 0);
    tl.add(() => {
      gsap.set(frames, { clipPath: CLOSED });
      gsap.set(images, { scale: 1.3 });
    });
    return tl;
  };

  const open = (stack?: HTMLElement, immediate = false) => {
    if (!stack) return gsap.timeline();
    const t = timing();
    const frames = stack.querySelectorAll(".awards-block__img-picture");
    const images = stack.querySelectorAll(".awards-block__img-picture img");
    gsap.killTweensOf([frames, images]);
    if (immediate) {
      gsap.set(frames, { clipPath: OPEN });
      gsap.set(images, { scale: 1 });
      return gsap.timeline();
    }
    gsap.set(frames, { clipPath: CLOSED });
    gsap.set(images, { scale: 1.3 });
    const tl = gsap.timeline();
    tl.to(frames, { clipPath: OPEN, duration: t.open, ease: "power3.out", stagger: t.stagger, overwrite: "auto" }, 0);
    tl.to(images, { scale: 1, duration: t.scaleIn, ease: "power3.out", stagger: t.stagger, overwrite: "auto" }, 0);
    return tl;
  };

  // On a phone only the current stack lives in the preview; the others wait in a hidden holder.
  const show = (stack?: HTMLElement) => {
    if (!phone.matches) return;
    stacks.forEach((other) => other && other.parentNode !== parking && parking.appendChild(other));
    if (stack) stage.appendChild(stack);
  };

  let current: number | null = null;
  let running: gsap.core.Timeline | null = null;

  const scrollable = () => {
    if (!phone.matches) {
      preview.classList.remove("is-scrollable");
      preview.style.overflowX = "";
      preview.scrollLeft = 0;
      return;
    }
    if (!(current !== null ? stacks[current] : stacks[0])) {
      preview.classList.remove("is-scrollable");
      preview.style.overflowX = "hidden";
      preview.scrollLeft = 0;
      return;
    }
    requestAnimationFrame(() => {
      const yes = preview.scrollWidth > preview.clientWidth + 1;
      preview.classList.toggle("is-scrollable", yes);
      preview.style.overflowX = yes ? "auto" : "hidden";
      if (!yes) preview.scrollLeft = 0;
    });
  };

  for (const stack of stacks) {
    if (!stack) continue;
    gsap.set(stack.querySelectorAll(".awards-block__img-picture"), { clipPath: CLOSED });
    gsap.set(stack.querySelectorAll(".awards-block__img-picture img"), { scale: 1.3 });
  }

  const activate = (index: number, immediate = false) => {
    const stack = stacks[index];
    if (!stack) return;
    if (phone.matches) rows.forEach((row, i) => row.classList.toggle("is-active", i === index));
    if (!phone.matches) {
      if (current !== null && current !== index) close(stacks[current]);
      current = index;
      open(stack, immediate);
      scrollable();
      return;
    }
    running?.kill();
    running = null;
    const previous = current !== null ? stacks[current] : null;
    current = index;
    show(stack);
    scrollable();
    running = gsap.timeline();
    if (previous && previous !== stack) {
      stage.appendChild(previous);
      running.add(close(previous), 0);
      running.add(() => {
        if (previous.parentNode !== parking) parking.appendChild(previous);
      }, ">-0.001");
    }
    running.add(open(stack, immediate), timing().delayPhone);
    running.eventCallback("onComplete", () => {
      running = null;
      scrollable();
    });
  };

  if (phone.matches && stacks[0]) {
    show(stacks[0]);
    activate(0, true);
  } else {
    scrollable();
  }

  window.addEventListener("resize", () => {
    if (phone.matches) show(current !== null ? stacks[current] : stacks[0]);
    else stacks.forEach((stack) => stack && stack.parentNode !== stage && stage.appendChild(stack));
    scrollable();
  });

  rows.forEach((row, index) => {
    let timer: number | null = null;
    row.addEventListener("mouseenter", () => {
      if (phone.matches) return;
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => activate(index), timing().hover);
    });
    row.addEventListener("mouseleave", () => {
      if (phone.matches) return;
      if (timer) clearTimeout(timer);
      timer = null;
      if (current !== null) {
        close(stacks[current]);
        current = null;
        scrollable();
      }
    });
    row.addEventListener("click", () => {
      if (!phone.matches) return;
      activate(index);
      preview.scrollTo({ left: 0, behavior: "smooth" });
      row.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  });
}
