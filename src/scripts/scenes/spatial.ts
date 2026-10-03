// The optional Spline scene beside the monitor: a hosted viewer page in an iframe. Nothing is downloaded until the
// visitor clicks the button, and the frame is removed when the overlay closes. Weak devices and phones never see
// the button.
import { lite } from "../lib/perf";

const button = document.querySelector<HTMLButtonElement>(".spatial-open");
const capable = !lite && window.matchMedia("(min-width: 1101px) and (pointer: fine)").matches;

if (button && capable) {
  button.hidden = false;
  const url = button.dataset.scene!;
  let open = false;

  const enter = () => {
    if (open) return;
    open = true;

    const overlay = document.createElement("div");
    overlay.className = "spatial";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Spatial view of my projects");
    overlay.dataset.lenisPrevent = "";
    overlay.innerHTML = `<iframe class="spatial__canvas" title="Spatial view" allow="fullscreen"></iframe><p class="spatial__status">Loading scene</p><button class="spatial__close" type="button" aria-label="Close">Close</button><p class="spatial__credit"></p>`;
    overlay.querySelector(".spatial__credit")!.textContent = button.dataset.credit ?? "";
    document.body.append(overlay);
    document.body.style.overflow = "hidden";

    const status = overlay.querySelector<HTMLElement>(".spatial__status")!;

    const close = () => {
      overlay.remove();
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      open = false;
      button.focus();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    overlay.querySelector(".spatial__close")!.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    overlay.querySelector<HTMLElement>(".spatial__close")!.focus();

    const frame = overlay.querySelector<HTMLIFrameElement>(".spatial__canvas")!;
    frame.style.border = "0";
    frame.addEventListener("load", () => status.remove(), { once: true });
    frame.src = url;
  };

  button.addEventListener("click", enter);
}
