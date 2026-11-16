import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const target = req.query.url as string | undefined;

  if (!target) {
    res.status(400).json({ error: "missing_url" });
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

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const keywordsMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);

    const h1Matches = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)].map((m) => m[1].trim()).slice(0, 3);
    const h2Matches = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)].map((m) => m[1].trim()).slice(0, 5);

    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);

    res.status(200).json({
      success: true,
      url: cleanTarget,
      title: (ogTitleMatch?.[1] || titleMatch?.[1] || "").trim(),
      description: (descMatch?.[1] || "").trim(),
      keywords: (keywordsMatch?.[1] || "").trim(),
      headings: [...h1Matches, ...h2Matches],
      bodySnippet: cleanText,
    });
  } catch (err: any) {
    res.status(200).json({
      success: false,
      url: cleanTarget,
      error: String(err.message || err),
      title: "",
      description: "",
      keywords: "",
      headings: [],
      bodySnippet: "",
    });
  }
}
