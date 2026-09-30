// All the words on the site live here. Anything marked PLACEHOLDER is waiting for a real link or photo.

const placeholder = (seed: string, width: number, height: number) => `https://picsum.photos/seed/${seed}/${width}/${height}?grayscale`;

export const site = {
  firstName: "Maurya",
  lastName: "Oganja",
  role: "Software Developer",
  basedIn: "Fredericton",
  location: { name: "Fredericton, NB, Canada", lat: 45.9636, lon: -66.6431, timeZone: "America/Moncton" },
  email: "mauryakiritkumar.oganja@unb.ca",
  phone: "+1 (506) 259-9121",
  phoneHref: "+15062599121",
  address: ["Fredericton,", "New Brunswick, Canada"],
  year: 2026,
  // Links. PLACEHOLDER ones are "#" until the real profile links arrive.
  github: "https://github.com/maurya-65",
  linkedin: "https://www.linkedin.com/in/maurya-oganja-626b31331",
  instagram: "https://www.instagram.com/maurya_65_?stkn=MXFrcjYzbnlldThidA==",
  resume: "#", // PLACEHOLDER
  // PLACEHOLDER photos (Picsum). Swap these URLs for real pictures.
  portrait: placeholder("maurya-portrait", 800, 1000),
};

export const hero = {
  words: ["software", "developer"],
  tags: ["Web development", "Backend systems", "Interface design"],
  basedIn: ["based", "in", "fredericton"],
  blurb: "I’m a computer science student who builds fast, clear web software for teams of ALL SIZES",
  recentLabel: "recent work",
  recentName: "portfolio site",
  collab: "AVAILABLE FOR co-op",
};

export const about = {
  index: "2/5",
  label: "for me",
  code: "cs/2",
  // One entry per line; every letter becomes a physics body when the section scrolls in. `white` lines are bright.
  statement: [
    { text: "CLEAN CODE", white: true },
    { text: "IS NOT JUST WRITTEN,", white: false },
    { text: "BUT DESIGNED", white: false },
    { text: "TO LAST", white: true },
    { text: "AND TO GROW.", white: true },
  ],
  greeting: "Hello!",
  intro: "I’m Maurya Oganja",
  experienceTitle: "my experience",
  experience: ["a Computer Science student at UNB", "in Fredericton, building web software", "and learning every layer of it."],
  title: ["It’s not just a", "degree   -   it’s a way", "of building things."],
  // Every block below is written as fixed lines, the way olha sets hers.
  how: [
    "I care about readable code,",
    "sensible structure and pages",
    "that load fast. I start simple,",
    "test the idea early, and add",
    "complexity last.",
  ],
  philosophyTitle: "my philosophy",
  philosophy: [
    "I value clarity, structure and",
    "simplicity — in code and in life.",
    "I start small, test early and add",
    "complexity only when it earns",
    "its place. Good software is easy",
    "to change, and easy for the next",
    "person to understand.",
  ],
  lifestyleTitle: "beyond code",
  lifestyle: [
    "I’m curious about how things",
    "fit together: from a request",
    "crossing the internet to one small",
    "interface detail that changes",
    "how an app feels. I learn by",
    "building, breaking, rebuilding.",
  ],
  connect: "lets contact",
  wish: [
    "I’m looking for a co-op or",
    "internship where I can ship",
    "real features, learn from",
    "experienced developers and",
    "grow at every layer, from the",
    "database up to the interface.",
    "Let’s build something good.",
  ],
  photos: [placeholder("maurya-life-one", 506, 566), placeholder("maurya-life-two", 412, 708)],
};

// PLACEHOLDER covers (Picsum). The 3D slider shows these on its screen, so they are 16:9.
export const projects = {
  title: "recent works",
  link: "view project",
  slides: [
    { title: "Portfolio Site", image: placeholder("portfolio-site", 1626, 940), href: "#" },
    { title: "Task Manager API", image: placeholder("task-manager-api", 1626, 940), href: "#" },
    { title: "Campus Planner", image: placeholder("campus-planner", 1626, 940), href: "#" },
    { title: "Data Dashboard", image: placeholder("data-dashboard", 1626, 940), href: "#" },
  ],
};

// Copy for the laptop section, and the text shown on its screen.
export const laptop = {
  name: "Lenovo IdeaPad Pro 5i",
  note: "The machine I write most of my code on: assignments, side projects and this site.",
  specs: [
    { label: "Processor", value: "Intel Core Ultra 9 285H" },
    { label: "Memory", value: "32GB RAM" },
    { label: "Storage", value: "1TB SSD" },
    { label: "Graphics", value: "NVIDIA RTX 5050" },
    { label: "Display", value: "2.8K OLED" },
  ],
  screen: { title: "Hello, world.", subtitle: "Screen text goes here." },
};

export const services = {
  title: "skills",
  code: "cs/5",
  items: [
    {
      title: "web development",
      list: ["Responsive layouts", "Accessibility", "TypeScript"],
      image: placeholder("web-dev", 730, 470),
      text: "I build responsive, accessible websites with modern HTML, CSS and TypeScript. Each page is meant to load fast and be easy to use.",
    },
    {
      title: "frontend",
      list: ["React and Astro", "Motion with GSAP", "Design systems"],
      image: placeholder("frontend", 730, 470),
      text: "I turn designs into interfaces with React, Astro and smooth, purposeful motion — interfaces that feel considered from the first click.",
    },
    {
      title: "backend",
      list: ["Node.js and Python", "REST APIs", "Authentication"],
      image: placeholder("backend", 730, 470),
      text: "I write APIs and services in Node.js and Python that are simple to run, simple to test, and honest about what they do.",
    },
    {
      title: "databases",
      list: ["SQL and PostgreSQL", "Schema design", "Query tuning"],
      image: placeholder("databases", 730, 470),
      text: "I design schemas and write queries in SQL and PostgreSQL that stay fast as the data grows.",
    },
    {
      title: "fundamentals",
      list: ["Data structures", "Algorithms", "Git and testing"],
      image: placeholder("fundamentals", 730, 470),
      text: "Data structures, algorithms and clean code habits, backed by Git and careful testing.",
    },
  ],
};

export const education = {
  title: "education",
  code: "cs/5",
  lead: ["I’m learning in public,", "with a focus on", "fundamentals and shipping"],
  leadSpan: 2,
  note: ["University of New Brunswick", "(Bachelor of Computer Science)", "Fredericton, Canada."],
  // Each row opens a stack of pictures on hover, so it gets a few.
  items: [
    { name: "Computer Science, UNB", count: "( 1 )", images: ["unb-one", "unb-two", "unb-three"] },
    { name: "GitHub projects", count: "( 4 )", images: ["github-one", "github-two"] },
    { name: "Open to co-op roles", count: "( 2 )", images: ["co-op-one", "co-op-two"] },
  ].map((item) => ({ ...item, images: item.images.map((seed) => placeholder(seed, 640, 800)) })),
  article: { label: "My code on", link: "GITHUB" },
};

export const contact = {
  kicker: "Let’s start the conversation",
  headline: ["Great software", "great teams"],
  between: "starts with",
  legend: "what’s this about?",
  topics: [
    { label: "co-op", value: "Co-op / Internship" },
    { label: "project", value: "Project" },
    { label: "hi", value: "Just saying hi" },
  ],
  submit: "Discuss the project",
};

export const footer = {
  pages: [
    { label: "about me", id: "about" },
    { label: "skills", id: "services" },
    { label: "works", id: "works" },
  ],
  links: [
    { label: "github", href: site.github },
    { label: "linkedin", href: site.linkedin },
    { label: "resume", href: site.resume },
  ],
  copyright: "All rights reserved. Maurya Oganja",
  legal: "Any reproduction, distribution, or use of the materials without permission is prohibited.",
};

export const nav = [
  { label: "about me", id: "about" },
  { label: "works", id: "works" },
  { label: "skills", id: "services" },
  { label: "connect", id: "connect" },
];
