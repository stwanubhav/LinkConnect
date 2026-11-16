import * as THREE from "three";
import type { WebsiteItem } from "./websiteStore";

export const SW = 1024, SH = 640;
const SANS = '"Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';

type Paint = (g: CanvasRenderingContext2D, t: number) => void;

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  const words = text.split(/\s+/);
  let line = "", n = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y + n * lh);
      line = w;
      if (++n >= maxLines) return;
    } else {
      line = test;
    }
  }
  if (line) g.fillText(line, x, y + n * lh);
}

const THEME_COLORS: Record<string, { bg: string; glow: string; accent: string; text: string }> = {
  blue: { bg: "#06133a", glow: "#0b2cff", accent: "#3b82f6", text: "#ffffff" },
  green: { bg: "#041f11", glow: "#16a34a", accent: "#22c55e", text: "#ffffff" },
  amber: { bg: "#1f1403", glow: "#d97706", accent: "#f59e0b", text: "#ffffff" },
  purple: { bg: "#180a2a", glow: "#7c3aed", accent: "#a855f7", text: "#ffffff" },
  cyan: { bg: "#041d24", glow: "#0891b2", accent: "#06b6d4", text: "#ffffff" },
  red: { bg: "#23060a", glow: "#dc2626", accent: "#ef4444", text: "#ffffff" },
};

export function paintWebsiteCard(g: CanvasRenderingContext2D, w: WebsiteItem, t: number) {
  const theme = THEME_COLORS[w.theme || "blue"] || {
    bg: "#080c14",
    glow: w.color || "#3b82f6",
    accent: w.color || "#60a5fa",
    text: "#ffffff",
  };

  // Base background
  g.fillStyle = theme.bg;
  g.fillRect(0, 0, SW, SH);

  // Background radial glow
  const glow = g.createRadialGradient(SW * 0.7, SH * 0.45, 20, SW * 0.7, SH * 0.45, 480);
  glow.addColorStop(0, `${theme.glow}44`);
  glow.addColorStop(1, `${theme.bg}00`);
  g.fillStyle = glow;
  g.fillRect(0, 0, SW, SH);

  // CRT scanlines grid background
  g.strokeStyle = "#ffffff08";
  g.lineWidth = 1;
  for (let y = 0; y < SH; y += 32) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(SW, y);
    g.stroke();
  }
  for (let x = 0; x < SW; x += 48) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, SH);
    g.stroke();
  }

  // --- TOP BROWSER CHROME ---
  g.fillStyle = "#0c1017";
  g.fillRect(0, 0, SW, 54);
  g.strokeStyle = "#ffffff1a";
  g.beginPath();
  g.moveTo(0, 54);
  g.lineTo(SW, 54);
  g.stroke();

  // Traffic control dots
  const dots = ["#ff5f56", "#ffbd2e", "#27c93f"];
  dots.forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath();
    g.arc(28 + i * 20, 27, 6, 0, Math.PI * 2);
    g.fill();
  });

  // Browser Address bar
  rr(g, 100, 11, SW - 360, 32, 8);
  g.fillStyle = "#ffffff0f";
  g.fill();
  g.strokeStyle = "#ffffff20";
  g.lineWidth = 1;
  g.stroke();

  // Padlock & Domain
  g.fillStyle = theme.accent;
  g.font = `600 13px ${MONO}`;
  g.fillText("🔒 HTTPS://", 116, 32);
  g.fillStyle = "#ffffff";
  g.font = `700 14px ${MONO}`;
  g.fillText(w.name, 214, 32);

  // Right status indicators
  const ping = 14 + (Math.floor(t * 7) % 9);
  g.fillStyle = "#22c55e";
  g.beginPath();
  g.arc(SW - 180, 27, 4, 0, Math.PI * 2);
  g.fill();
  g.font = `600 12px ${MONO}`;
  g.fillStyle = "#ffffffcc";
  g.fillText(`LIVE · ${ping}ms`, SW - 168, 31);
  g.fillText("HTTP/3", SW - 65, 31);

  // --- MAIN CARD CONTENT (LEFT SIDE) ---
  // Domain pill / badge
  rr(g, 48, 86, g.measureText(`// ${w.name.toUpperCase()}`).width + 60, 26, 13);
  g.fillStyle = `${theme.glow}33`;
  g.fill();
  g.strokeStyle = `${theme.accent}66`;
  g.stroke();
  g.font = `700 12px ${MONO}`;
  g.fillStyle = theme.accent;
  g.fillText(`// ${w.name.toUpperCase()}`, 64, 103);

  // Main Display Title
  const displayName = w.title || w.name;
  g.fillStyle = "#ffffff";
  let fontSize = 72;
  g.font = `900 ${fontSize}px ${SANS}`;
  while (g.measureText(displayName).width > SW * 0.58 && fontSize > 36) {
    fontSize -= 4;
    g.font = `900 ${fontSize}px ${SANS}`;
  }
  g.fillText(displayName, 48, 172);

  // Category Tag Badge
  if (w.tag) {
    g.font = `700 13px ${MONO}`;
    g.fillStyle = theme.accent;
    g.fillText(w.tag.toUpperCase(), 50, 210);
  }

  // Description
  g.font = `400 20px ${SANS}`;
  g.fillStyle = "#ffffffcc";
  wrap(g, w.desc || "Curated digital destination on Link Connect.", 50, 252, SW * 0.56, 30, 4);

  // Tech / Feature Chips
  const chips = (w.stack || w.tag || "PORTAL · WEB").split(" · ").filter(Boolean);
  let chipX = 50;
  chips.slice(0, 4).forEach((chip) => {
    g.font = `600 12px ${MONO}`;
    const cw = g.measureText(chip).width + 24;
    rr(g, chipX, 400, cw, 28, 6);
    g.fillStyle = "#ffffff14";
    g.fill();
    g.strokeStyle = "#ffffff24";
    g.stroke();
    g.fillStyle = "#ffffff";
    g.fillText(chip, chipX + 12, 418);
    chipX += cw + 10;
  });

  // Call to action button painted directly on the screen
  rr(g, 50, 460, 360, 54, 12);
  const btnGrad = g.createLinearGradient(50, 460, 410, 514);
  btnGrad.addColorStop(0, theme.glow);
  btnGrad.addColorStop(1, theme.accent);
  g.fillStyle = btnGrad;
  g.fill();

  g.font = `800 16px ${MONO}`;
  g.fillStyle = "#ffffff";
  g.fillText(`> VISIT ${w.name.toUpperCase()} ↗`, 74, 494);

  // Subtext below button
  g.font = `500 12px ${MONO}`;
  g.fillStyle = "#ffffff80";
  g.fillText("CLICK SCREEN OR BUTTON TO LAUNCH DESTINATION", 52, 545);

  // --- RIGHT SIDE: INTERACTIVE CYBER VISUALIZER ---
  const rx = SW * 0.64;
  const ry = 86;
  const rw = SW * 0.32;
  const rh = SH - 120;

  // Box background for the visualizer
  rr(g, rx, ry, rw, rh, 16);
  g.fillStyle = "#080d1799";
  g.fill();
  g.strokeStyle = `${theme.accent}44`;
  g.lineWidth = 1.5;
  g.stroke();

  // Visualizer Header
  g.font = `700 12px ${MONO}`;
  g.fillStyle = theme.accent;
  g.fillText("LINK ACTIVITY // SPECTRUM", rx + 18, ry + 32);

  // Animated Audio/Frequency Equalizer Bars
  const bars = 18;
  const barW = (rw - 36 - (bars - 1) * 6) / bars;
  for (let i = 0; i < bars; i++) {
    const wave = Math.sin(t * 4 + i * 0.5) * 0.5 + 0.5;
    const wave2 = Math.cos(t * 2.5 - i * 0.3) * 0.5 + 0.5;
    const barH = 20 + (wave * 0.6 + wave2 * 0.4) * 120;
    const bx = rx + 18 + i * (barW + 6);
    const by = ry + 210 - barH;

    rr(g, bx, by, barW, barH, 3);
    const bGrad = g.createLinearGradient(0, by, 0, by + barH);
    bGrad.addColorStop(0, theme.accent);
    bGrad.addColorStop(1, `${theme.glow}33`);
    g.fillStyle = bGrad;
    g.fill();
  }

  // Live Stats Monitor inside right box
  const statsY = ry + 240;
  rr(g, rx + 14, statsY, rw - 28, 140, 10);
  g.fillStyle = "#ffffff08";
  g.fill();

  const requests = 14200 + (Math.floor(t * 83) % 9999);
  const uptime = "99.98%";
  const statRows = [
    ["PROTOCOL", "HTTP/3 TLS 1.3"],
    ["STATUS", "200 OK CONNECTED"],
    ["TRAFFIC", `${requests.toLocaleString()} REQ/M`],
    ["UPTIME", uptime],
  ];

  statRows.forEach(([lbl, val], idx) => {
    const sy = statsY + 28 + idx * 28;
    g.font = `600 11px ${MONO}`;
    g.fillStyle = "#ffffff77";
    g.fillText(lbl, rx + 24, sy);
    g.font = `700 12px ${MONO}`;
    g.fillStyle = idx === 1 ? "#22c55e" : "#ffffff";
    g.textAlign = "right";
    g.fillText(val, rx + rw - 24, sy);
    g.textAlign = "left";
  });

  // Crosshair / radar indicator
  g.strokeStyle = `${theme.accent}66`;
  g.lineWidth = 1;
  const cx = rx + rw - 36;
  const cy = ry + 28;
  g.beginPath();
  g.arc(cx, cy, 10, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, 4, 0, Math.PI * 2);
  g.fillStyle = theme.accent;
  g.fill();
}

export function createScreenTexture(website: WebsiteItem) {
  const cv = document.createElement("canvas");
  cv.width = SW;
  cv.height = SH;
  const g = cv.getContext("2d")!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  return {
    tex,
    draw(t: number) {
      g.save();
      paintWebsiteCard(g, website, t);
      g.restore();
      tex.needsUpdate = true;
    },
  };
}
