// The small computer the Works monitor turns into: a login screen, then a desktop with a taskbar, a Start menu,
// draggable windows and a terminal. Plain DOM and CSS, no WebGL and no images, so it costs almost nothing on a
// machine without a graphics card.
export type Project = { title: string; slug: string; year: string; kind: string; blurb: string; stack: string[]; href: string };
export type PCData = {
  owner: string;
  user: string;
  projects: Project[];
  about: string[];
  resume: { href: string; file: string; summary: string; education: string[]; skills: [string, string][] };
  contact: { email: string; github: string; linkedin: string };
};

const DESIGN_WIDTH = 1040;
const DESIGN_HEIGHT = 600;
const TASKBAR = 36;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

type Win = { id: string; node: HTMLElement; task: HTMLButtonElement; minimized: boolean; maximized: boolean; box: string };

export function createPC(root: HTMLElement, data: PCData) {
  let scale = 1;
  let zIndex = 10;
  let loggedIn = false;
  root.tabIndex = -1;
  root.dataset.lenisPrevent = "";

  const desktop = el("div", "pc-desktop");
  const icons = el("div", "pc-icons");
  const layer = el("div", "pc-windows");
  const taskbar = el("div", "pc-taskbar");
  const start = el("button", "pc-start", `${data.user}.os`);
  start.type = "button";
  const tasks = el("div", "pc-tasks");
  const clock = el("span", "pc-clock");
  taskbar.append(start, tasks, clock);
  const menu = el("div", "pc-menu");
  desktop.append(icons, layer, taskbar, menu);

  // ---- Login screen
  const login = el("form", "pc-login");
  const loginClock = el("div", "pc-login__clock");
  const loginDate = el("div", "pc-login__date");
  const avatar = el("div", "pc-login__avatar", data.user.charAt(0).toUpperCase());
  const label = el("label", "pc-login__label", "Username");
  const field = el("input", "pc-login__input");
  field.type = "text";
  field.autocomplete = "off";
  field.spellcheck = false;
  field.placeholder = `type ${data.user}`;
  field.setAttribute("aria-label", "Username");
  label.append(field);
  const loginNote = el("div", "pc-login__note", `Type “${data.user}” and press Enter to sign in.`);
  login.append(loginClock, loginDate, avatar, label, loginNote);
  root.append(desktop, login);

  const tick = () => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    clock.textContent = time;
    loginClock.textContent = time;
    loginDate.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  };
  tick();
  window.setInterval(tick, 20000);

  // ---- Windows and the taskbar
  const windows = new Map<string, Win>();
  const closeMenu = () => menu.classList.remove("is-open");

  function focusWindow(win: Win) {
    win.minimized = false;
    win.node.hidden = false;
    win.node.style.zIndex = String(++zIndex);
    for (const other of windows.values()) {
      other.node.classList.toggle("is-focused", other === win);
      other.task.classList.toggle("is-active", other === win);
    }
  }
  function minimize(win: Win) {
    win.minimized = true;
    win.node.hidden = true;
    win.node.classList.remove("is-focused");
    win.task.classList.remove("is-active");
  }
  function toggleMaximize(win: Win) {
    win.maximized = !win.maximized;
    win.node.classList.toggle("is-maximized", win.maximized);
    if (win.maximized) win.box = win.node.style.cssText;
    else win.node.style.cssText = win.box;
    focusWindow(win);
  }

  function openWindow(id: string, title: string, body: HTMLElement, box: { x: number; y: number; w: number; h: number }) {
    const existing = windows.get(id);
    if (existing) {
      focusWindow(existing);
      return existing.node;
    }
    const node = el("div", "pc-window");
    node.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;`;
    const head = el("div", "pc-window__head");
    const buttons = el("span", "pc-window__buttons");
    const minimizeButton = el("button", "", "–");
    const maximizeButton = el("button", "", "□");
    const closeButton = el("button", "pc-window__close", "×");
    for (const [button, name] of [[minimizeButton, "Minimize"], [maximizeButton, "Maximize"], [closeButton, "Close"]] as const) {
      button.type = "button";
      button.setAttribute("aria-label", `${name} ${title}`);
    }
    buttons.append(minimizeButton, maximizeButton, closeButton);
    head.append(el("span", "pc-window__title", title), buttons);
    body.classList.add("pc-window__body");
    node.append(head, body);
    layer.append(node);

    const task = el("button", "pc-task", title);
    task.type = "button";
    tasks.append(task);

    const win: Win = { id, node, task, minimized: false, maximized: false, box: node.style.cssText };
    windows.set(id, win);
    focusWindow(win);

    closeButton.addEventListener("click", () => {
      node.remove();
      task.remove();
      windows.delete(id);
    });
    minimizeButton.addEventListener("click", () => minimize(win));
    maximizeButton.addEventListener("click", () => toggleMaximize(win));
    head.addEventListener("dblclick", (event) => {
      if (!(event.target as HTMLElement).closest("button")) toggleMaximize(win);
    });
    task.addEventListener("click", () => (win.minimized || !node.classList.contains("is-focused") ? focusWindow(win) : minimize(win)));
    node.addEventListener("pointerdown", () => {
      closeMenu();
      if (!node.classList.contains("is-focused")) focusWindow(win);
    });

    // Dragging. The desktop is scaled to fit the monitor, so pointer distances are divided by the scale.
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    head.addEventListener("pointerdown", (event) => {
      if (win.maximized || (event.target as HTMLElement).closest("button")) return;
      startX = event.clientX;
      startY = event.clientY;
      originX = node.offsetLeft;
      originY = node.offsetTop;
      head.setPointerCapture(event.pointerId);
      head.classList.add("is-dragging");
    });
    head.addEventListener("pointermove", (event) => {
      if (!head.hasPointerCapture(event.pointerId)) return;
      const x = originX + (event.clientX - startX) / scale;
      const y = originY + (event.clientY - startY) / scale;
      node.style.left = `${Math.max(-node.offsetWidth + 90, Math.min(DESIGN_WIDTH - 90, x))}px`;
      node.style.top = `${Math.max(0, Math.min(DESIGN_HEIGHT - TASKBAR - 30, y))}px`;
    });
    const drop = (event: PointerEvent) => {
      if (head.hasPointerCapture(event.pointerId)) head.releasePointerCapture(event.pointerId);
      head.classList.remove("is-dragging");
    };
    head.addEventListener("pointerup", drop);
    head.addEventListener("pointercancel", drop);
    return node;
  }

  // ---- Apps
  function openProject(project: Project) {
    const body = el("div", "pc-project");
    body.append(el("h3", "pc-project__title", project.title), el("p", "pc-project__meta", `${project.year}  ·  ${project.kind}`), el("p", "pc-project__blurb", project.blurb));
    const tags = el("div", "pc-project__tags");
    for (const tag of project.stack) tags.append(el("span", "", tag));
    body.append(tags);
    if (project.href && project.href !== "#") {
      const link = el("a", "pc-project__link", "open project ↗");
      link.href = project.href;
      link.target = "_blank";
      link.rel = "noopener";
      body.append(link);
    }
    const offset = (windows.size % 5) * 22;
    openWindow(`project-${project.slug}`, `${project.slug}.md`, body, { x: 230 + offset, y: 50 + offset, w: 520, h: 360 });
  }

  function openFiles() {
    const list = el("div", "pc-files");
    data.projects.forEach((project, index) => {
      const row = el("button", "pc-files__row");
      row.type = "button";
      row.append(el("span", "pc-files__no", String(index + 1).padStart(2, "0")), el("span", "pc-files__name", `${project.slug}.md`), el("span", "pc-files__year", project.year));
      row.addEventListener("click", () => openProject(project));
      list.append(row);
    });
    list.append(el("p", "pc-files__tip", "click a file to open it"));
    openWindow("files", "projects/", list, { x: 110, y: 40, w: 360, h: 210 });
  }

  function openAbout() {
    const body = el("div", "pc-project");
    body.append(el("h3", "pc-project__title", data.owner), el("p", "pc-project__meta", "about.txt"));
    for (const line of data.about) body.append(el("p", "pc-project__blurb", line));
    openWindow("about", "about.txt", body, { x: 200, y: 60, w: 440, h: 250 });
  }

  function openResume() {
    const { resume } = data;
    const body = el("div", "pc-project pc-resume");
    body.append(el("h3", "pc-project__title", data.owner), el("p", "pc-project__meta", resume.file), el("p", "pc-project__blurb", resume.summary));
    body.append(el("h4", "pc-resume__head", "education"));
    for (const line of resume.education) body.append(el("p", "pc-project__blurb", line));
    body.append(el("h4", "pc-resume__head", "technical skills"));
    for (const [name, value] of resume.skills) {
      const row = el("p", "pc-contact");
      row.append(el("span", "", name), el("span", "pc-resume__value", value));
      body.append(row);
    }
    const actions = el("div", "pc-resume__actions");
    const view = el("a", "pc-resume__button", "open pdf ↗");
    view.href = resume.href;
    view.target = "_blank";
    view.rel = "noopener";
    const save = el("a", "pc-resume__button", "download");
    save.href = resume.href;
    save.download = resume.file;
    actions.append(view, save);
    body.append(actions);
    openWindow("resume", "resume.pdf", body, { x: 170, y: 20, w: 560, h: 420 });
  }

  function openContact() {
    const body = el("div", "pc-project");
    body.append(el("h3", "pc-project__title", "Say hello"), el("p", "pc-project__meta", "contact"));
    for (const [name, href, text] of [
      ["email", `mailto:${data.contact.email}`, data.contact.email],
      ["github", data.contact.github, data.contact.github.replace("https://", "")],
      ["linkedin", data.contact.linkedin, data.contact.linkedin.replace("https://www.", "")],
    ]) {
      const row = el("p", "pc-contact");
      const link = el("a", "pc-project__link", text);
      link.href = href;
      if (!href.startsWith("mailto:")) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      row.append(el("span", "", name), link);
      body.append(row);
    }
    openWindow("contact", "contact", body, { x: 260, y: 90, w: 480, h: 240 });
  }

  function openTerminal() {
    const existing = windows.get("terminal");
    if (existing) {
      focusWindow(existing);
      existing.node.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    const body = el("div", "pc-terminal");
    const out = el("div", "pc-terminal__out");
    const form = el("form", "pc-terminal__line");
    const prompt = el("span", "pc-terminal__prompt", `${data.user}@${data.user} ~ $`);
    const input = el("input", "pc-terminal__input");
    input.type = "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("aria-label", "Terminal command");
    form.append(prompt, input);
    body.append(out, form);

    const print = (...lines: string[]) => {
      for (const line of lines) out.append(el("div", "pc-terminal__row", line));
      out.scrollTop = out.scrollHeight;
    };
    const history: string[] = [];
    let cursor = 0;
    const find = (query: string) => {
      const q = query.toLowerCase().replace(/\.md$/, "");
      return data.projects.find((project, index) => project.slug === q || String(index + 1) === q);
    };
    const commands: Record<string, (args: string[]) => void> = {
      help: () =>
        print("help             this list", "ls               list projects", "open <name|no>   open a project", "cat <name|no>    print a project here", "about            who I am", "contact          how to reach me", "apps             open a desktop app: projects, resume, about, contact", "clear            clear the screen", "exit             close this terminal", "logout           sign out"),
      ls: () => print(...data.projects.map((project, index) => `${String(index + 1).padStart(2, "0")}  ${project.slug}.md`)),
      open: ([name]) => {
        const project = name && find(name);
        if (project) {
          openProject(project);
          print(`opening ${project.slug}.md`);
        } else print(name ? `no such project: ${name}` : "usage: open <name|no>");
      },
      cat: ([name]) => {
        const project = name && find(name);
        if (project) print(project.title.toUpperCase(), `${project.year}  ·  ${project.kind}`, "", project.blurb, "", `stack: ${project.stack.join(", ")}`);
        else print(name ? `no such project: ${name}` : "usage: cat <name|no>");
      },
      about: () => print(...data.about),
      whoami: () => print("visitor, and a very welcome one"),
      contact: () => print(`email     ${data.contact.email}`, `github    ${data.contact.github}`, `linkedin  ${data.contact.linkedin}`),
      apps: ([name]) => {
        const apps: Record<string, () => void> = { projects: openFiles, resume: openResume, about: openAbout, contact: openContact };
        if (name && apps[name]) apps[name]();
        else print("usage: apps <projects|resume|about|contact>");
      },
      date: () => print(new Date().toString()),
      clear: () => {
        out.textContent = "";
      },
      exit: () => closeWindow("terminal"),
      logout: () => logOut(),
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const line = input.value.trim();
      input.value = "";
      print(`${prompt.textContent} ${line}`);
      if (!line) return;
      history.push(line);
      cursor = history.length;
      const [name, ...args] = line.split(/\s+/);
      const run = commands[name.toLowerCase()];
      if (run) run(args);
      else print(`command not found: ${name}. type help`);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" && history.length) {
        event.preventDefault();
        cursor = Math.max(0, cursor - 1);
        input.value = history[cursor];
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        cursor = Math.min(history.length, cursor + 1);
        input.value = history[cursor] ?? "";
      }
    });
    body.addEventListener("pointerdown", () => window.setTimeout(() => input.focus(), 0));

    print(`${data.user}.os 1.0  (type help)`, "");
    commands.ls([]);
    openWindow("terminal", "terminal", body, { x: 300, y: 150, w: 620, h: 330 });
    input.focus();
  }

  function closeWindow(id: string) {
    windows.get(id)?.node.querySelector<HTMLButtonElement>(".pc-window__close")?.click();
  }

  // ---- Desktop icons and the Start menu: the same four apps, so anything closed can be opened again
  const apps: [string, string, () => void][] = [
    ["projects", "▤", openFiles],
    ["terminal", ">_", openTerminal],
    ["resume", "CV", openResume],
    ["about", "i", openAbout],
    ["contact", "@", openContact],
  ];
  for (const [name, glyph, open] of apps) {
    const icon = el("button", "pc-icon");
    icon.type = "button";
    icon.append(el("span", "pc-icon__glyph", glyph), el("span", "pc-icon__label", name));
    icon.addEventListener("click", open);
    icons.append(icon);

    const item = el("button", "pc-menu__item");
    item.type = "button";
    item.append(el("span", "pc-menu__glyph", glyph), el("span", "", name));
    item.addEventListener("click", () => {
      closeMenu();
      open();
    });
    menu.append(item);
  }
  const signOut = el("button", "pc-menu__item pc-menu__item--out");
  signOut.type = "button";
  signOut.append(el("span", "pc-menu__glyph", "⏻"), el("span", "", "log out"));
  signOut.addEventListener("click", () => logOut());
  menu.append(signOut);
  start.addEventListener("click", (event) => {
    event.stopPropagation();
    menu.classList.toggle("is-open");
  });
  desktop.addEventListener("pointerdown", (event) => {
    if (!(event.target as HTMLElement).closest(".pc-menu, .pc-start")) closeMenu();
  });

  // ---- Login and logout
  function signIn() {
    loggedIn = true;
    root.classList.add("is-in");
    field.value = "";
    loginNote.textContent = "";
    root.focus({ preventScroll: true });
    if (!windows.size) openFiles();
  }
  function logOut() {
    loggedIn = false;
    closeMenu();
    for (const id of [...windows.keys()]) closeWindow(id);
    root.classList.remove("is-in");
    loginNote.textContent = `Type “${data.user}” and press Enter to sign in.`;
    loginNote.classList.remove("is-error");
    field.focus({ preventScroll: true });
  }
  login.addEventListener("submit", (event) => {
    event.preventDefault();
    if (field.value.trim().toLowerCase() === data.user.toLowerCase()) {
      signIn();
      return;
    }
    loginNote.textContent = field.value.trim() ? `No user “${field.value.trim()}”. Try “${data.user}”.` : `Type “${data.user}” and press Enter.`;
    loginNote.classList.add("is-error");
    login.classList.remove("is-shaking");
    void login.offsetWidth;
    login.classList.add("is-shaking");
  });

  // Keys typed into the computer stay on it, so the page does not scroll under them. Escape hands the keyboard back.
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      (document.activeElement as HTMLElement | null)?.blur();
      root.blur();
      root.classList.remove("is-focused");
    }
    event.stopPropagation();
  });
  root.addEventListener("pointerdown", () => root.classList.add("is-focused"));

  return {
    setScale(value: number) {
      scale = value;
    },
    setActive(value: boolean) {
      if (value) {
        // The login box takes the keyboard straight away so "maurya" can just be typed.
        if (!loggedIn) field.focus({ preventScroll: true });
      } else {
        (document.activeElement as HTMLElement | null)?.blur();
      }
    },
  };
}

export const PC_SIZE = { width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
