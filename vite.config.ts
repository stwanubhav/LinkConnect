import { defineConfig, loadEnv, type Connect, type Plugin, type ViteDevServer, type PreviewServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { proxyGithub } from "./api/_github";
import { config as portfolio } from "./src/config";
import { headTags, crawlerFallback, llmsTxt, sitemapXml, robotsTxt } from "./seo/generate";

const env = loadEnv("development", process.cwd(), "");
const port = Number(process.env.PORT ?? 5173);
const basePath = process.env.BASE_PATH ?? "/";
const githubToken = env.GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";

function githubProxyPlugin(): Plugin {
  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    if (!req.url || !req.url.startsWith("/api/gh/")) return next();
    try {
      const r = await proxyGithub(req.url.slice("/api/gh/".length), req.headers["accept"]?.toString(), githubToken);
      res.statusCode = r.status;
      res.setHeader("Content-Type", r.contentType);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.end(r.body);
    } catch (err) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "proxy_failed", detail: String(err) }));
    }
  };
  return {
    name: "github-proxy",
    configureServer(server: ViteDevServer) { server.middlewares.use(handler); },
    configurePreviewServer(server: PreviewServer) { server.middlewares.use(handler); },
  };
}

function seoPlugin(): Plugin {
  const files: Record<string, [string, () => string]> = {
    "/llms.txt": ["text/plain; charset=utf-8", () => llmsTxt(portfolio)],
    "/sitemap.xml": ["application/xml; charset=utf-8", () => sitemapXml(portfolio)],
    "/robots.txt": ["text/plain; charset=utf-8", () => robotsTxt(portfolio)],
  };
  const serve: Connect.NextHandleFunction = (req, res, next) => {
    const f = files[req.url?.split("?")[0] ?? ""];
    if (!f) return next();
    res.setHeader("Content-Type", f[0]);
    res.end(f[1]());
  };
  return {
    name: "portfolio-seo",
    transformIndexHtml: (html) => html.replace("<!--seo:head-->", headTags(portfolio)).replace("<!--seo:body-->", crawlerFallback(portfolio)),
    configureServer(server: ViteDevServer) { server.middlewares.use(serve); },
    configurePreviewServer(server: PreviewServer) { server.middlewares.use(serve); },
    generateBundle() {
      for (const [path, [, make]] of Object.entries(files)) this.emitFile({ type: "asset", fileName: path.slice(1), source: make() });
    },
  };
}

function leetcodeProxyPlugin(): Plugin {
  const QUERY = `
    query userStats($username: String!) {
      matchedUser(username: $username) {
        username
        profile { ranking }
        submitStatsGlobal { acSubmissionNum { difficulty count } }
      }
      allQuestionsCount { difficulty count }
    }
  `;

  const bucket = (arr: { difficulty: string; count: number }[], k: string) =>
    arr.find((b) => b.difficulty === k)?.count ?? 0;

  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    if (!req.url || !req.url.startsWith("/api/leetcode")) return next();
    const url = new URL(req.url, "http://x");
    const username = (url.searchParams.get("username") || "").trim();
    if (!username) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "missing_username" }));
      return;
    }
    try {
      const upstreamRes = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
          "Referer": `https://leetcode.com/u/${username}`,
        },
        body: JSON.stringify({ query: QUERY, variables: { username } }),
      });
      if (!upstreamRes.ok) {
        res.statusCode = upstreamRes.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "upstream_error" }));
        return;
      }
      const j: any = await upstreamRes.json();
      if (j.errors?.length || !j.data?.matchedUser) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "user_not_found" }));
        return;
      }
      const u = j.data.matchedUser;
      const solved = u.submitStatsGlobal.acSubmissionNum;
      const all = j.data.allQuestionsCount;
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.end(JSON.stringify({
        username: u.username,
        ranking: u.profile.ranking,
        totalSolved: bucket(solved, "All"),
        easySolved: bucket(solved, "Easy"),
        mediumSolved: bucket(solved, "Medium"),
        hardSolved: bucket(solved, "Hard"),
        totalQuestions: bucket(all, "All"),
        totalEasy: bucket(all, "Easy"),
        totalMedium: bucket(all, "Medium"),
        totalHard: bucket(all, "Hard"),
      }));
    } catch (err) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "proxy_failed", detail: String(err) }));
    }
  };
  return {
    name: "leetcode-proxy",
    configureServer(server: ViteDevServer) { server.middlewares.use(handler); },
    configurePreviewServer(server: PreviewServer) { server.middlewares.use(handler); },
  };
}

function websiteScraperPlugin(): Plugin {
  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    if (!req.url || !req.url.startsWith("/api/scrape")) return next();
    const urlObj = new URL(req.url, "http://localhost");
    const target = urlObj.searchParams.get("url");

    if (!target) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "missing_url" }));
      return;
    }

    let cleanTarget = target.trim();
    if (!/^https?:\/\//i.test(cleanTarget)) {
      cleanTarget = `https://${cleanTarget}`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(cleanTarget, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      clearTimeout(timeout);

      const html = await response.text();

      // Extract metadata with regex
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const ogTitleMatch =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
      const descMatch =
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      const keywordsMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);

      // Extract headings
      const h1Matches = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)].map((m) => m[1].trim()).slice(0, 3);
      const h2Matches = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)].map((m) => m[1].trim()).slice(0, 5);

      // Extract visible text (strip script, style, tags)
      const cleanText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200);

      const result = {
        success: true,
        url: cleanTarget,
        title: (ogTitleMatch?.[1] || titleMatch?.[1] || "").trim(),
        description: (descMatch?.[1] || "").trim(),
        keywords: (keywordsMatch?.[1] || "").trim(),
        headings: [...h1Matches, ...h2Matches],
        bodySnippet: cleanText,
      };

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-cache");
      res.end(JSON.stringify(result));
    } catch (err: any) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          url: cleanTarget,
          error: String(err.message || err),
          title: "",
          description: "",
          keywords: "",
          headings: [],
          bodySnippet: "",
        }),
      );
    }
  };

  return {
    name: "website-scraper",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(handler);
    },
  };
}

function zplusAuthPlugin(): Plugin {
  const AUTHORIZED_EMAIL = "anubhavpatel2526@gmail.com";
  // Strictly 256-bit cryptographic SHA-256 hash. Plaintext password is NEVER stored or written anywhere.
  const AUTHORIZED_PASSWORD_HASH = "5df7d67e46744d67d9d37343db110f0873c6ecca4b9b0a2f8e51e08c3916265c";
  const JWT_SECRET = "zplus_security_stw_linkconnect_secret_key_8829";
  const loginAttempts: Record<string, { count: number; lockedUntil: number }> = {};

  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    if (!req.url) return next();
    const pathname = req.url.split("?")[0];

    if (pathname === "/api/auth/login" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          const { email, passwordHash } = JSON.parse(body || "{}");
          const cleanEmail = String(email || "").trim().toLowerCase();
          const cleanHash = String(passwordHash || "").trim();

          const emailMatch =
            cleanEmail === AUTHORIZED_EMAIL ||
            cleanEmail === "anubhavpatel2526" ||
            cleanEmail.replace(/@gmail\.com$/i, "") === "anubhavpatel2526";
          const hashMatch = cleanHash === AUTHORIZED_PASSWORD_HASH;

          // 1. MASTER CREDENTIALS: Always clear lockout and issue clearance token
          if (emailMatch && hashMatch) {
            delete loginAttempts[cleanEmail];
            delete loginAttempts[AUTHORIZED_EMAIL];

            const payload = {
              email: AUTHORIZED_EMAIL,
              clearance: "LEVEL_5_Z_PLUS",
              iat: Date.now(),
              exp: Date.now() + 2 * 60 * 60 * 1000,
            };
            const sig = crypto.createHmac("sha256", JWT_SECRET).update(JSON.stringify(payload)).digest("hex");
            const token = Buffer.from(JSON.stringify(payload)).toString("base64") + "." + sig;

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                token,
                user: { email: AUTHORIZED_EMAIL, clearance: "LEVEL_5_Z_PLUS" },
              }),
            );
            return;
          }

          // 2. INVALID CREDENTIALS: Check lockout
          const attempts = loginAttempts[cleanEmail] || { count: 0, lockedUntil: 0 };
          if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
            const sec = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
            res.statusCode = 429;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: false,
                error: `Z+ Security Lockout active. Try again in ${sec} seconds.`,
                lockedUntil: attempts.lockedUntil,
              }),
            );
            return;
          }

          // Incorrect credentials
          attempts.count = (attempts.count || 0) + 1;
          if (attempts.count >= 5) {
            attempts.lockedUntil = Date.now() + 5 * 60 * 1000;
          }
          loginAttempts[cleanEmail] = attempts;

          res.statusCode = 401;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              success: false,
              error:
                attempts.count >= 5
                  ? "DEFCON 1: 5 Failed attempts detected. Z+ Security console locked for 5 minutes."
                  : `Access Denied: Invalid credentials. [${Math.max(0, 5 - attempts.count)} attempt(s) remaining before lockout].`,
              attemptsRemaining: Math.max(0, 5 - attempts.count),
            }),
          );
        } catch (e: any) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "bad_request", message: e.message }));
        }
      });
      return;
    }

    if (pathname === "/api/auth/verify" && (req.method === "POST" || req.method === "GET")) {
      const authHeader = req.headers["authorization"] || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (!token || !token.includes(".")) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ valid: false, error: "missing_token" }));
        return;
      }

      const [b64, sig] = token.split(".");
      try {
        const payloadStr = Buffer.from(b64, "base64").toString("utf-8");
        const payload = JSON.parse(payloadStr);
        const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(JSON.stringify(payload)).digest("hex");

        if (sig === expectedSig && Date.now() < payload.exp) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ valid: true, user: payload }));
          return;
        }
      } catch {}

      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ valid: false, error: "invalid_or_expired_token" }));
      return;
    }

    next();
  };

  return {
    name: "zplus-auth",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(handler);
    },
  };
}

function websiteStoragePlugin(): Plugin {
  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    if (!req.url) return next();
    const pathname = req.url.split("?")[0];

    const dataPath = path.resolve(import.meta.dirname, "public/websites.json");
    const backupPath = path.resolve(import.meta.dirname, "data/websites.json");

    if (pathname === "/api/websites") {
      if (req.method === "GET") {
        try {
          let content = "[]";
          if (fs.existsSync(dataPath)) {
            content = fs.readFileSync(dataPath, "utf-8");
          } else if (fs.existsSync(backupPath)) {
            content = fs.readFileSync(backupPath, "utf-8");
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-cache");
          res.end(content);
          return;
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "read_failed", message: e.message }));
          return;
        }
      }

      if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            if (!Array.isArray(parsed)) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "expected_array" }));
              return;
            }

            const formatted = JSON.stringify(parsed, null, 2);

            // 1. Write permanently to public/websites.json
            fs.writeFileSync(dataPath, formatted, "utf-8");

            // 2. Write backup to data/websites.json
            const dataDir = path.resolve(import.meta.dirname, "data");
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(backupPath, formatted, "utf-8");

            // 3. Write to dist/public/websites.json if dist folder exists
            const distPath = path.resolve(import.meta.dirname, "dist/public/websites.json");
            if (fs.existsSync(path.dirname(distPath))) {
              fs.writeFileSync(distPath, formatted, "utf-8");
            }

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                count: parsed.length,
                file: "public/websites.json",
                timestamp: Date.now(),
              }),
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "write_failed", message: err.message }));
          }
        });
        return;
      }
    }

    next();
  };

  return {
    name: "website-storage",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    githubProxyPlugin(),
    seoPlugin(),
    leetcodeProxyPlugin(),
    websiteScraperPlugin(),
    zplusAuthPlugin(),
    websiteStoragePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer({
            root: path.resolve(import.meta.dirname, ".."),
          }),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
