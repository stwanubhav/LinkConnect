export type AiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ScrapedData = {
  success: boolean;
  url: string;
  title: string;
  description: string;
  keywords: string;
  headings: string[];
  bodySnippet: string;
  error?: string;
};

export type GeneratedCardData = {
  name: string;
  title: string;
  url: string;
  tag: string;
  stack: string;
  desc: string;
  color: string;
  theme: "blue" | "green" | "amber" | "purple" | "cyan" | "red";
  scraped?: ScrapedData;
};

const AI_CONFIG_KEY = "linkconnect_ai_config_v1";

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

export const AI_PRESETS = [
  {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    placeholder: "sk-proj-...",
  },
  {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct",
    placeholder: "sk-or-v1-...",
  },
  {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    placeholder: "gsk_...",
  },
  {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    placeholder: "sk-...",
  },
  {
    name: "Local Ollama",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3",
    placeholder: "ollama (or leave blank)",
  },
];

function heuristicGenerateCard(cleanUrl: string, domain: string, scraped: ScrapedData): GeneratedCardData {
  // Clean off extraneous suffixes like " — Secure Computer-Based Testing Platform"
  let title = (scraped.title || domain)
    .replace(/\s*([—\-|:·•]).*$/, "")
    .trim();
  if (!title || title.length > 30) {
    title = domain.split(".")[0];
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Synthesize description
  let desc = (scraped.description || "").trim();
  if (!desc && scraped.bodySnippet) {
    desc = scraped.bodySnippet.slice(0, 200).replace(/\s+/g, " ").trim() + "...";
  }
  if (!desc) {
    desc = `Curated digital destination featuring interactive platform capabilities and resources on ${domain}.`;
  }

  // Feature chips
  const candidateKeywords = [
    ...scraped.headings,
    ...(scraped.keywords ? scraped.keywords.split(",") : []),
  ]
    .map((s) => s.trim().toUpperCase().replace(/[^A-Z0-9\s\-]/g, ""))
    .filter((s) => s.length >= 3 && s.length <= 26);

  const chips = Array.from(new Set(candidateKeywords)).slice(0, 3);
  let stack = chips.join(" · ");
  if (!stack) {
    stack = "INTERACTIVE · WEB PLATFORM · RESOURCE";
  }

  // Category Tag
  const fullText = (scraped.title + " " + desc + " " + domain).toLowerCase();
  let tag = "CURATED WEB PORTAL";
  let theme: GeneratedCardData["theme"] = "blue";
  let color = "#0b2cff";

  if (fullText.includes("cbt") || fullText.includes("test") || fullText.includes("proctor") || fullText.includes("exam")) {
    tag = "OFFLINE CBT TESTING PLATFORM";
    stack = stack.includes("CHEAT") ? stack : "CHEAT-RESISTANT · OFFLINE-READY · ZERO INFRASTRUCTURE";
    theme = "blue";
    color = "#0b2cff";
  } else if (fullText.includes("course") || fullText.includes("tutorial") || fullText.includes("learnfree")) {
    tag = "FREE COURSES · TECH GUIDES";
    theme = "blue";
    color = "#0b2cff";
  } else if (fullText.includes("study") || fullText.includes("lotus") || fullText.includes("syllabus")) {
    tag = "ACADEMIC & EXAM PORTAL";
    theme = "green";
    color = "#16a34a";
  } else if (fullText.includes("doc") || fullText.includes("api") || fullText.includes("mozilla")) {
    tag = "WEB STANDARDS & DOCUMENTATION";
    theme = "amber";
    color = "#ffa116";
  } else if (fullText.includes("git") || fullText.includes("repo") || fullText.includes("open source")) {
    tag = "CODE COLLABORATION & OPEN SOURCE";
    theme = "purple";
    color = "#a97bff";
  } else if (fullText.includes("code") || fullText.includes("developer") || fullText.includes("freecodecamp")) {
    tag = "INTERACTIVE CODE LEARNING";
    theme = "cyan";
    color = "#00d4ff";
  }

  return {
    name: domain,
    title,
    url: cleanUrl,
    tag,
    stack,
    desc,
    theme,
    color,
    scraped,
  };
}

export const aiService = {
  getConfig(): AiConfig {
    if (typeof window === "undefined") return DEFAULT_AI_CONFIG;
    try {
      const raw = localStorage.getItem(AI_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          baseUrl: parsed.baseUrl || DEFAULT_AI_CONFIG.baseUrl,
          apiKey: parsed.apiKey || "",
          model: parsed.model || DEFAULT_AI_CONFIG.model,
        };
      }
    } catch (e) {
      console.error("Failed to read AI config", e);
    }
    return DEFAULT_AI_CONFIG;
  },

  saveConfig(config: AiConfig): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error("Failed to save AI config", e);
    }
  },

  // Step 1: Scrape the live website to extract title, description, headings, and body text
  async scrapeWebsite(targetUrl: string): Promise<ScrapedData> {
    let cleanUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(cleanUrl)}`);
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch (err) {
      console.warn("Primary scraper endpoint error, trying fallback...", err);
    }

    // Fallback: extract domain info gracefully
    let domain = cleanUrl;
    try {
      domain = new URL(cleanUrl).hostname.replace(/^www\./i, "");
    } catch {}

    return {
      success: false,
      url: cleanUrl,
      title: domain,
      description: "",
      keywords: "",
      headings: [],
      bodySnippet: "",
    };
  },

  async testConnection(config: AiConfig): Promise<{ success: boolean; message: string }> {
    if (!config.baseUrl) {
      return { success: false, message: "Base URL is required." };
    }

    const cleanBase = config.baseUrl.replace(/\/+$/, "");
    const endpoint = `${cleanBase}/chat/completions`;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (config.apiKey) {
        headers["Authorization"] = `Bearer ${config.apiKey.trim()}`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model || "gpt-4o-mini",
          messages: [{ role: "user", content: "Reply with 'OK'." }],
          max_tokens: 10,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          message: `API returned error ${res.status}: ${errText.slice(0, 140)}`,
        };
      }

      return { success: true, message: "Connection verified successfully!" };
    } catch (err: any) {
      return {
        success: false,
        message: `Network/CORS error: ${err.message || String(err)}`,
      };
    }
  },

  // Step 2 & 3: First analyze the site with scraper, then generate the 3D card using linked AI or autonomous analyzer
  async generateCard(
    targetUrl: string,
    config: AiConfig,
    onProgress?: (progress: { step: number; total: number; message: string }) => void,
  ): Promise<GeneratedCardData> {
    let cleanUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    let domain = "";
    try {
      const u = new URL(cleanUrl);
      domain = u.hostname.replace(/^www\./i, "");
    } catch {
      domain = cleanUrl.replace(/^https?:\/\//i, "").split("/")[0];
    }

    // Step 1: Scrape live site
    onProgress?.({
      step: 1,
      total: 3,
      message: `Step 1/3: Visiting ${domain} and scraping live HTML metadata & content...`,
    });

    const scraped = await this.scrapeWebsite(cleanUrl);

    // If no AI API is linked, use the autonomous heuristic analyzer
    const isAiConfigured = Boolean(config.baseUrl && (config.apiKey || config.baseUrl.includes("localhost")));
    if (!isAiConfigured) {
      onProgress?.({
        step: 2,
        total: 3,
        message: `Step 2/3: Analyzing extracted brand identity and feature set...`,
      });
      await new Promise((r) => setTimeout(r, 400));

      onProgress?.({
        step: 3,
        total: 3,
        message: `Step 3/3: Synthesizing 3D CRT card structure & color palette for ${domain}...`,
      });
      await new Promise((r) => setTimeout(r, 400));

      return heuristicGenerateCard(cleanUrl, domain, scraped);
    }

    // Step 2: Linked AI API call
    onProgress?.({
      step: 2,
      total: 3,
      message: `Step 2/3: Passing scraped evidence to linked ${config.model} for design synthesis...`,
    });

    const systemPrompt = `You are an expert 3D web directory curator for Link Connect.
Your task is to analyze real website evidence and generate a complete, high-fidelity 3D CRT monitor card structure that captures the website's exact brand identity, color theme, and core features.

You must respond with ONLY valid JSON (no markdown formatting, no code blocks) matching this schema:
{
  "name": "domain name (e.g. unite-cbt.kdns.fr, learnfreex.ct.ws, lotusstudy.in)",
  "title": "Clean, punchy Brand or Portal Name (e.g. Unite CBT, LearnFreeX, Lotus Study)",
  "tag": "3-4 word UPPERCASE category (e.g. OFFLINE CBT TESTING PLATFORM, FREE COURSES · TECH GUIDES)",
  "stack": "3-4 key feature tags in UPPERCASE separated by ' · ' (e.g. CHEAT-RESISTANT · OFFLINE-READY · ZERO INFRASTRUCTURE)",
  "desc": "Crisp 2-3 sentence overview describing what this website offers and its key advantages (120-220 chars).",
  "theme": "one of: 'blue', 'green', 'amber', 'purple', 'cyan', 'red'",
  "color": "Hex color code matching the theme (e.g. #0b2cff for blue, #16a34a for green, #00d4ff for cyan, #ffa116 for amber, #a97bff for purple, #dc2626 for red)"
}`;

    const userPrompt = `Target Website: ${cleanUrl}
Domain: ${domain}

REAL SCRAPED EVIDENCE FROM THE LIVE WEBSITE:
- Page Title: "${scraped.title || domain}"
- Meta Description: "${scraped.description || 'Not specified in meta'}"
- Meta Keywords: "${scraped.keywords || 'N/A'}"
- Key Headings: ${JSON.stringify(scraped.headings.slice(0, 5))}
- Body Content Snippet: "${scraped.bodySnippet.slice(0, 900) || 'Domain: ' + domain}"

Instructions:
Based on the real website evidence above, generate the structured 3D card JSON object matching the site's brand and features.`;

    const cleanBase = config.baseUrl.replace(/\/+$/, "");
    const endpoint = `${cleanBase}/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey.trim()}`;
    }

    onProgress?.({
      step: 3,
      total: 3,
      message: `Step 3/3: Synthesizing 3D CRT monitor layout and visualizer theme...`,
    });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model || "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        console.warn("AI API request failed, falling back to autonomous analyzer...");
        return heuristicGenerateCard(cleanUrl, domain, scraped);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || "";

      // Clean JSON response (strip markdown code blocks if present)
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return heuristicGenerateCard(cleanUrl, domain, scraped);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const validThemes: GeneratedCardData["theme"][] = ["blue", "green", "amber", "purple", "cyan", "red"];
      const theme: GeneratedCardData["theme"] = validThemes.includes(parsed.theme) ? parsed.theme : "blue";

      return {
        name: parsed.name ? String(parsed.name).toLowerCase() : domain,
        title: parsed.title ? String(parsed.title) : (scraped.title || domain),
        url: cleanUrl,
        tag: parsed.tag ? String(parsed.tag).toUpperCase() : "CURATED WEB PORTAL",
        stack: parsed.stack ? String(parsed.stack).toUpperCase() : "WEB · ONLINE · RESOURCES",
        desc: parsed.desc ? String(parsed.desc) : (scraped.description || "Curated web destination on Link Connect."),
        theme,
        color: parsed.color || "#0b2cff",
        scraped,
      };
    } catch (err) {
      console.warn("AI Generation encountered an error, falling back to autonomous analyzer:", err);
      return heuristicGenerateCard(cleanUrl, domain, scraped);
    }
  },
};
