import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";

const DEFAULT_WEBSITES = [
  {
    id: "learnfreex",
    name: "learnfreex.ct.ws",
    title: "LearnFreeX",
    url: "https://learnfreex.ct.ws",
    tag: "FREE COURSES · TECH GUIDES",
    stack: "TUTORIALS · NOTES · DEVELOPER GUIDES",
    desc: "Free online educational platform featuring developer tutorials, downloadable study guides, and curated programming courses for students.",
    color: "#0b2cff",
    theme: "blue",
    stars: 1420,
    createdAt: 1700000000000,
  },
  {
    id: "lotusstudy",
    name: "lotusstudy.in",
    title: "Lotus Study",
    url: "https://lotusstudy.in",
    tag: "ACADEMIC & EXAM PORTAL",
    stack: "EXAM NOTES · STUDY MATERIAL · SYLLABUS",
    desc: "Premier student learning & exam preparation portal providing high-yield syllabus notes, study resources, and academic guidance across subjects.",
    color: "#16a34a",
    theme: "green",
    stars: 1180,
    createdAt: 1700000001000,
  },
  {
    id: "unite-cbt",
    name: "unite-cbt.kdns.fr",
    title: "Unite CBT",
    url: "https://unite-cbt.kdns.fr",
    tag: "OFFLINE CBT TESTING PLATFORM",
    stack: "CHEAT-RESISTANT · OFFLINE-READY · ZERO INFRASTRUCTURE",
    desc: "Unite CBT is a free, offline-ready computer-based testing platform that runs on any PC. Supports 100+ concurrent candidates per machine with zero infrastructure cost, and cheat-resistant proctoring features.",
    color: "#0b2cff",
    theme: "blue",
    stars: 2400,
    createdAt: 1700000001500,
  },
  {
    id: "mdn",
    name: "developer.mozilla.org",
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    tag: "WEB STANDARDS & DOCUMENTATION",
    stack: "JAVASCRIPT · HTML5 · CSS3 · APIS",
    desc: "The open community resource providing in-depth documentation, guides, and specifications on modern web standards and browser technologies.",
    color: "#ffa116",
    theme: "amber",
    stars: 3450,
    createdAt: 1700000002000,
  },
  {
    id: "github",
    name: "github.com",
    title: "GitHub",
    url: "https://github.com",
    tag: "CODE COLLABORATION & OPEN SOURCE",
    stack: "GIT · REPOSITORIES · ACTIONS · PACKAGES",
    desc: "Global software development platform for version control, issue tracking, continuous integration, and open source community collaboration.",
    color: "#a97bff",
    theme: "purple",
    stars: 5820,
    createdAt: 1700000003000,
  },
  {
    id: "freecodecamp",
    name: "freecodecamp.org",
    title: "FreeCodeCamp",
    url: "https://www.freecodecamp.org",
    tag: "INTERACTIVE CODE LEARNING",
    stack: "FULLSTACK · PYTHON · CERTIFICATIONS",
    desc: "Learn to code for free through hands-on interactive programming lessons, real-world development projects, and verified certifications.",
    color: "#00d4ff",
    theme: "cyan",
    stars: 4300,
    createdAt: 1700000004000,
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const jsonPath = path.resolve(process.cwd(), "public/websites.json");

  if (req.method === "GET") {
    try {
      if (fs.existsSync(jsonPath)) {
        const content = fs.readFileSync(jsonPath, "utf-8");
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache");
        res.status(200).send(content);
        return;
      }
    } catch {}

    res.status(200).json(DEFAULT_WEBSITES);
    return;
  }

  if (req.method === "POST") {
    try {
      const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (Array.isArray(data)) {
        try {
          if (fs.existsSync(jsonPath)) {
            fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
          }
        } catch {}

        res.status(200).json({
          success: true,
          count: data.length,
          timestamp: Date.now(),
        });
        return;
      }
    } catch {}

    res.status(400).json({ error: "expected_array" });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
}
