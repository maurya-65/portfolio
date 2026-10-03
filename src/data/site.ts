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
  resume: "/maurya_oganja_resume.pdf",
  // PLACEHOLDER photos (Picsum). Swap these URLs for real pictures.
  portrait: placeholder("maurya-portrait", 800, 1000),
};

export const hero = {
  words: ["software", "developer"],
  tags: ["Full-stack web", "Agentic AI", "Backend systems"],
  basedIn: ["based", "in", "fredericton"],
  blurb: "I’m a computer science student who builds full-stack web software and agentic AI products that people actually use",
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
  experience: ["a Computer Science student at UNB,", "on the Dean’s List, building full-stack", "and agentic AI software."],
  title: ["It’s not just a", "degree   -   it’s a way", "of building things."],
  // Every block below is written as fixed lines, the way olha sets hers.
  how: [
    "I build full-stack web apps",
    "and agentic AI systems, and I",
    "care about products that are",
    "useful, not just projects. I start",
    "simple, test early, add complexity last.",
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
    "I tutor at UNB’s Math and",
    "Learning Centre, which taught me",
    "to explain and structure ideas.",
    "I’m curious about a wide range",
    "of things, and I use that to build",
    "things that solve real problems.",
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

// The projects shown on the monitor. The covers are PLACEHOLDERS (Picsum) for the plain 3D slider that phones get;
// on a wide screen the monitor turns into a small desktop that lists these as files.
const items = [
  {
    title: "Keepline",
    slug: "keepline",
    year: "2026",
    kind: "Hack Atlantic, Fredericton",
    blurb:
      "When someone leaves a team, what they knew leaves with them. Keepline reads the Slack, email and tickets a team already writes and turns them into a company memory that keeps its history: who said what, when it was true, and what replaced it. From that it maps which topics only one person knows, writes a handoff pack for the person leaving, briefs the new hire, and answers questions with links back to the source messages.",
    stack: ["SQLite", "BM25 search", "Claude API", "Vercel"],
    href: "#",
  },
  {
    title: "Auctus",
    slug: "auctus",
    year: "2026",
    kind: "Boost Ideation Camp, Fredericton",
    blurb:
      "An AI funding-discovery platform built with a small team and taken from idea to working MVP, then pitched, all during the camp.",
    stack: ["AI", "Web app", "MVP"],
    href: "#",
  },
  {
    title: "This portfolio",
    slug: "portfolio",
    year: "2026",
    kind: "Personal project",
    blurb:
      "The site you are on: an Astro build with smooth scrolling, scroll-driven animation, a physics-based About section, two Three.js scenes and this desktop.",
    stack: ["Astro", "TypeScript", "GSAP", "Three.js", "Lenis", "Matter.js"],
    href: "#",
  },
];

// A published Spline scene (its my.spline.design share link). Leave empty to hide the button.
// The scene is only loaded when a visitor clicks it. Based on "APPLE vision pro 3D portfolio concept" by
// zenodegenkamp (CC BY 4.0), so keep the credit.
const splineScene = "https://my.spline.design/applevisionpro3dportfolioconcept-14rZQtHljIfqsS8KL5iJwet0/";

export const projects = {
  spline: { url: splineScene, label: "Enter spatial view", credit: "Room scene based on work by zenodegenkamp, CC BY 4.0" },
  title: "recent works",
  link: "view project",
  items,
  slides: items.map((item) => ({ title: item.title, image: placeholder(item.slug, 1626, 940), href: item.href })),
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
      title: "full-stack web",
      list: ["React and Next.js", "Tailwind CSS", "HTML and CSS"],
      image: placeholder("web-dev", 730, 470),
      text: "I build full-stack web apps with React, Next.js and Tailwind CSS, from the interface to the API behind it.",
    },
    {
      title: "backend",
      list: ["Node.js and Express", "REST APIs", "JWT authentication"],
      image: placeholder("backend", 730, 470),
      text: "I write Node.js and Express services with REST APIs, JWT authentication, Git hooks and SQLite that are simple to run and to test.",
    },
    {
      title: "databases",
      list: ["PostgreSQL and Supabase", "MongoDB and MySQL", "Row-level security"],
      image: placeholder("databases", 730, 470),
      text: "I design schemas and queries in PostgreSQL, Supabase, MongoDB, MySQL and MariaDB, and lock data down with row-level security.",
    },
    {
      title: "agentic ai",
      list: ["Claude API tool use", "LangChain and LangGraph", "MCP and RAG"],
      image: placeholder("agentic-ai", 730, 470),
      text: "I build agentic workflows with the Claude API (tool use), LangChain, LangGraph, MCP and RAG, with grounded answers and limited cost.",
    },
    {
      title: "languages and tools",
      list: ["JavaScript, TypeScript, Python", "Java, C, SQL", "Git, Docker, Vitest"],
      image: placeholder("fundamentals", 730, 470),
      text: "JavaScript, TypeScript, Java, Python, C and SQL, backed by Git, GitHub Actions, Vitest, Docker and Vercel.",
    },
  ],
};

export const education = {
  title: "education",
  code: "cs/5",
  lead: ["Dean’s List at UNB,", "with a focus on", "fundamentals and shipping"],
  leadSpan: 2,
  note: ["University of New Brunswick", "(BSc Computer Science, GPA 3.5 / 4.3)", "Fredericton, Canada."],
  // Each row opens a stack of pictures on hover, so it gets a few.
  items: [
    { name: "Computer Science, UNB", count: "( 1 )", images: ["unb-one", "unb-two", "unb-three"] },
    { name: "Technology Management and Entrepreneurship", count: "( 2 )", images: ["github-one", "github-two"] },
    { name: "Open to co-op roles", count: "( 3 )", images: ["co-op-one", "co-op-two"] },
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

// The resume app on the Works desktop, from maurya_oganja_resume.pdf.
export const resume = {
  file: "maurya_oganja_resume.pdf",
  summary:
    "Computer Science student at the University of New Brunswick, on the Dean's List for 2025-26 and one of two students awarded the Eldon and Maxine Clair Scholarship. I tutor at UNB's MLC, which shapes how I explain and structure ideas. My work isn't limited to full stack development and agentic AI; I like understanding a wide range of things and using that to build useful products, not just projects.",
  education: ["University of New Brunswick, Fredericton, NB", "BSc Computer Science, Sep 2024 - Present", "GPA 3.5 / 4.3", "Diploma in Technology Management and Entrepreneurship (ongoing)"],
  skills: [
    ["Languages", "JavaScript, TypeScript, Java, Python, C, SQL"],
    ["Frontend", "React, Next.js, Tailwind CSS, HTML, CSS"],
    ["Backend", "Node.js, Express, REST APIs, JWT authentication, Git Hooks, SQLite"],
    ["Databases", "PostgreSQL, Supabase, MongoDB, MySQL, MariaDB, Row-Level Security"],
    ["AI and agents", "Claude API (tool use), LangChain, LangGraph, MCP, RAG, Agentic Workflows"],
    ["Tools", "Git, GitHub, GitHub Actions, Vitest, Vercel, npm, Docker"],
  ],
};

export const nav = [
  { label: "about me", id: "about" },
  { label: "works", id: "works" },
  { label: "skills", id: "services" },
  { label: "connect", id: "connect" },
];

export const experience = {
  title: "experience",
  code: "cs/3",
  rows: [
    { when: "Sep 2026 — Present", title: "MLC Tutor", place: "University of New Brunswick, Fredericton, NB", text: "Helps students in drop-in sessions, breaking problems down step by step until the concept makes sense, and takes on private one-on-one tutoring through the MLC." },
    { when: "2026", title: "Hack Atlantic 2026", place: "Fredericton, NB", text: "Built Keepline, which turns the Slack, email and ticket messages a team already writes into a company memory, so a departing person's knowledge is handed off to their replacement." },
    { when: "Jan 2026", title: "Boost Ideation Camp 2026", place: "Fredericton, NB", text: "Worked in a team to build and pitch Auctus, an AI funding-discovery platform, taking it from idea to working MVP during the camp." },
    { when: "2026", title: "Open Source Contributor", place: "GirlScript Summer of Code, Remote", text: "Picked up issues across community repositories and got pull requests reviewed and merged with help from project mentors." },
    { when: "Nov 2025 — Feb 2026", title: "Open Source Contributor", place: "Code Social, Winter of Code, Remote", text: "Contributed through pull requests, code reviews and issue triage over the three-month program." },
  ],
};

export const achievements = {
  title: "achievements",
  code: "cs/4",
  rows: [
    { when: "2025 — 2026", title: "Dean's List", place: "University of New Brunswick", text: "Recognized for outstanding academic performance." },
    { when: "2024 — 2025", title: "Eldon and Maxine Clair Scholarship in Computer Science", place: "University of New Brunswick", text: "Awarded by the UNB Faculty of Computer Science; one of only two students selected." },
    { when: "2024 — 2025", title: "UNB Alumni Scholarship for International Students", place: "University of New Brunswick", text: "Merit award recognizing exceptional high school academic performance and extracurricular activities." },
  ],
};
