import type { config as Config } from "../src/config";

type C = typeof Config;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const today = () => new Date().toISOString().slice(0, 10);
const site = (c: C) => (c.site.url || "https://linkconnect.local").replace(/\/$/, "");

export function headTags(c: C) {
  const url = `${site(c)}/`;
  return [
    `<title>${esc(c.site.title || "Link Connect")}</title>`,
    `<meta name="description" content="${esc(c.site.description || "")}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(c.site.title || "Link Connect")}" />`,
    `<meta property="og:description" content="${esc(c.site.description || "")}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="website" />`,
  ].join("\n    ");
}

export function crawlerFallback(c: C) {
  return `<div id="seo-content" style="position:absolute;left:-99999px;top:auto;width:1px;height:1px;overflow:hidden;" aria-hidden="true">
      <h1>${esc(c.site.title || "Link Connect")}</h1>
      <p>${esc(c.site.description || "Curated 3D website directory")}</p>
      <h2>Featured Websites</h2>
      <ul>
        <li><a href="https://learnfreex.ct.ws">learnfreex.ct.ws</a> — Free courses & tutorials</li>
        <li><a href="https://lotusstudy.in">lotusstudy.in</a> — Academic & exam portal</li>
      </ul>
    </div>`;
}

export function llmsTxt(c: C) {
  return `# Link Connect
> ${c.site.description || "Curated 3D Web Directory featuring learnfreex.ct.ws, lotusstudy.in and more."}

Website: ${site(c)}

## Featured Websites
- learnfreex.ct.ws: Free education, courses, tutorials and guides
- lotusstudy.in: Premier academic & competitive exam preparation resources
`;
}

export function sitemapXml(c: C) {
  const d = today();
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site(c)}/</loc>
    <lastmod>${d}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${site(c)}/admin</loc>
    <lastmod>${d}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;
}

export function robotsTxt(c: C) {
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${site(c)}/sitemap.xml
`;
}
