import { useSyncExternalStore } from "react";

export type WebsiteItem = {
  id: string;
  name: string;
  title: string;
  url: string;
  tag: string;
  stack: string;
  desc: string;
  color?: string;
  theme?: "blue" | "green" | "amber" | "purple" | "cyan" | "red";
  stars?: number;
  createdAt?: number;
};

export const DEFAULT_WEBSITES: WebsiteItem[] = [
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

const STORAGE_KEY = "linkconnect_websites_v1";

function loadFromStorage(): WebsiteItem[] {
  if (typeof window === "undefined") return DEFAULT_WEBSITES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WEBSITES));
      return DEFAULT_WEBSITES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_WEBSITES;
  } catch (err) {
    console.error("Failed to load websites from localStorage", err);
    return DEFAULT_WEBSITES;
  }
}

let currentWebsites: WebsiteItem[] = loadFromStorage();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

// Write JSON permanently to disk through backend API
async function syncToDisk(sites: WebsiteItem[]) {
  if (typeof window === "undefined") return;
  try {
    let token = "";
    try {
      const raw = sessionStorage.getItem("linkconnect_zplus_session") || localStorage.getItem("linkconnect_zplus_session");
      if (raw) {
        token = JSON.parse(raw).token || "";
      }
    } catch {}

    await fetch("/api/websites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(sites),
    });
  } catch (err) {
    console.warn("Disk API not reachable; saved to localStorage fallback.", err);
  }
}

// Fetch permanent JSON data from disk
async function fetchFromDisk(): Promise<WebsiteItem[] | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/websites");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
    try {
      const res = await fetch("/websites.json");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {}
  }
  return null;
}

// Auto-sync with disk JSON on startup
if (typeof window !== "undefined") {
  fetchFromDisk().then((diskSites) => {
    if (diskSites && diskSites.length > 0) {
      currentWebsites = diskSites;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(diskSites));
      } catch {}
      notify();
    }
  });
}

function persist(sites: WebsiteItem[]) {
  currentWebsites = sites;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
    } catch (e) {
      console.error("Failed to persist websites to localStorage", e);
    }
    // Write permanently to disk in JSON format
    syncToDisk(sites);
  }
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        currentWebsites = JSON.parse(e.newValue);
        notify();
      } catch (err) {
        console.error("Storage event parse error", err);
      }
    }
  });
}

export const websiteStore = {
  getAll(): WebsiteItem[] {
    return currentWebsites;
  },

  getById(id: string): WebsiteItem | undefined {
    return currentWebsites.find((w) => w.id === id);
  },

  add(site: Omit<WebsiteItem, "id" | "createdAt">): WebsiteItem {
    const cleanId = (site.name || "site")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/^-+|-+$/g, "") || `site-${Date.now()}`;
    
    // Ensure unique ID
    let finalId = cleanId;
    let counter = 1;
    while (currentWebsites.some((w) => w.id === finalId)) {
      finalId = `${cleanId}-${counter++}`;
    }

    const newSite: WebsiteItem = {
      ...site,
      id: finalId,
      createdAt: Date.now(),
    };

    persist([...currentWebsites, newSite]);
    return newSite;
  },

  update(id: string, updates: Partial<Omit<WebsiteItem, "id">>): void {
    const next = currentWebsites.map((w) => {
      if (w.id === id) {
        return { ...w, ...updates };
      }
      return w;
    });
    persist(next);
  },

  delete(id: string): void {
    const next = currentWebsites.filter((w) => w.id !== id);
    persist(next);
  },

  reorder(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      fromIndex >= currentWebsites.length ||
      toIndex < 0 ||
      toIndex >= currentWebsites.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const next = [...currentWebsites];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    persist(next);
  },

  reset(): void {
    persist(DEFAULT_WEBSITES);
  },

  importJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validated: WebsiteItem[] = parsed.map((item, idx) => ({
          id: String(item.id || `imported-${idx}-${Date.now()}`),
          name: String(item.name || item.title || "website.com"),
          title: String(item.title || item.name || "Website"),
          url: String(item.url || `https://${item.name || "website.com"}`),
          tag: String(item.tag || "WEBSITE"),
          stack: String(item.stack || "WEB"),
          desc: String(item.desc || "Curated web destination."),
          color: item.color ? String(item.color) : "#0b2cff",
          theme: item.theme || "blue",
          stars: typeof item.stars === "number" ? item.stars : 100,
          createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
        }));
        persist(validated);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Import JSON failed", e);
      return false;
    }
  },

  exportJson(): string {
    return JSON.stringify(currentWebsites, null, 2);
  },

  async syncFromDisk(): Promise<WebsiteItem[]> {
    const diskSites = await fetchFromDisk();
    if (diskSites && diskSites.length > 0) {
      currentWebsites = diskSites;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(diskSites));
        } catch {}
      }
      notify();
    }
    return currentWebsites;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useWebsites(): WebsiteItem[] {
  return useSyncExternalStore(websiteStore.subscribe, websiteStore.getAll, () => DEFAULT_WEBSITES);
}
