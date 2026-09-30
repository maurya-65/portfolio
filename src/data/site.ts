// All the words on the site live here. The project names and descriptions are
// placeholders: swap in your real projects, and edit anything that isn't true yet.

export const site = {
  firstName: "Maurya",
  lastName: "Oganja",
  role: "Software Developer",
  roleWords: ["Software", "Developer"],
  basedIn: "Based in Fredericton",
  location: { name: "Fredericton, NB, Canada", lat: 45.9636, lon: -66.6431, timeZone: "America/Moncton" },
  email: "mauryakiritkumar.oganja@unb.ca",
  phone: "+1 (506) 259-9121",
  address: ["Fredericton,", "New Brunswick,", "Canada."],
  github: "https://github.com/maurya-65",
  linkedin: "https://www.linkedin.com/in/maurya-oganja-626b31331",
  availability: "Open to co-op and internships",
};

export const nav = [
  { label: "About me", href: "#about" },
  { label: "Projects", href: "#works" },
  { label: "Skills", href: "#services" },
  { label: "Connect", href: "#contact" },
];

export const hero = {
  tags: ["Web development", "Backend systems", "Interface design"],
  blurb:
    "Computer science student at the University of New Brunswick. I build fast, clear web software, and I like understanding how every layer works.",
  recentWork: "Portfolio Site",
};

export const about = {
  index: "2/5",
  label: "About",
  code: "CS/2",
  // [stays put, breaks away]: the second part of each line drifts off as you scroll.
  statement: [
    ["Clean co", "de"],
    ["is not just ", "written,"],
    ["but desi", "gned"],
    ["to la", "st"],
    ["and to gr", "ow."],
  ],
  greeting: "Hello!",
  blocks: [
    {
      title: "Education",
      lead: "",
      body:
        "I'm studying computer science at the University of New Brunswick in Fredericton. Data structures, algorithms, databases and operating systems are where I spend most of my time, and I try to turn each course into something I can actually ship.",
    },
    {
      title: "How I work",
      lead: "I don't just make it run - I make it make sense.",
      body:
        "I care about readable code, sensible structure and pages that load fast. I like starting simple, testing the idea early, and adding complexity only when it earns its place. Good software should be easy to change, and easy for the next person to understand.",
    },
    {
      title: "Beyond code",
      lead: "",
      body:
        "I'm curious about how things fit together, from how a request travels across the internet to how a small interface detail changes the way an app feels. I learn by building, breaking and rebuilding, and I'm always looking for the next problem worth solving.",
    },
  ],
  connect: "Let's connect",
};

// Cover images are Picsum placeholders. Replace with real project screenshots.
export const projects = [
  {
    title: "Portfolio Site",
    image: "https://picsum.photos/seed/portfolio-site/1600/760?grayscale",
    width: 1600,
    height: 760,
    lines: ["Astro and TypeScript", "Three.js globe intro", "GSAP scroll motion"],
    href: "#",
  },
  {
    title: "Task Manager API",
    image: "https://picsum.photos/seed/task-manager-api/1200/900?grayscale",
    width: 1200,
    height: 900,
    lines: ["REST API design", "Authentication flow", "PostgreSQL database"],
    href: "#",
  },
  {
    title: "Campus Planner",
    image: "https://picsum.photos/seed/campus-planner/1600/760?grayscale",
    width: 1600,
    height: 760,
    lines: ["React front end", "Schedule and deadlines", "Responsive design"],
    href: "#",
  },
  {
    title: "Data Dashboard",
    image: "https://picsum.photos/seed/data-dashboard/1200/900?grayscale",
    width: 1200,
    height: 900,
    lines: ["Python data pipeline", "Charts and filters", "Clean, readable output"],
    href: "#",
  },
];

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
  title: "Skills",
  code: "CS/5",
  items: [
    { title: "Web dev", text: "Building responsive, accessible websites with modern HTML, CSS and TypeScript." },
    { title: "Frontend", text: "Turning designs into interfaces with React, Astro and smooth, purposeful motion." },
    { title: "Backend", text: "Writing APIs and services in Node.js and Python that are simple to run and to test." },
    { title: "Databases", text: "Designing schemas and writing queries in SQL and PostgreSQL that stay fast as data grows." },
    { title: "Fundamentals", text: "Data structures, algorithms and clean code habits, backed by Git and careful testing." },
  ],
};

export const achievements = {
  title: "Education",
  code: "CS/5",
  lead: ["Learning in public,", "with a focus on", "fundamentals and shipping"],
  note: ["University of New Brunswick", "(Bachelor of Computer Science)", "Fredericton, Canada."],
  items: [
    { name: "Computer Science, UNB", year: "", href: "#about" },
    { name: "GitHub projects", year: "", href: "https://github.com/maurya-65" },
    { name: "Open to co-op roles", year: "", href: "#contact" },
  ],
};

export const contact = {
  kicker: "Let's start the conversation",
  headline: ["Great software", "Great teams"],
  between: "start with",
  legend: "What's this about?",
  topics: ["Co-op / Internship", "Project", "Just saying hi"],
  submit: "Send message",
};
