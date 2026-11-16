import { useEffect, useMemo, useRef, useState } from "react";
import { usePageMeta } from "../lib/seo";
import { startEngine, type Frame } from "./engine";
import { buildTimeline, smooth, type ChapterKey, type Timeline } from "./timeline";
import { workFocus } from "./scenes/work";
import { useWebsites, type WebsiteItem } from "./websiteStore";
import "./cinema.css";

type Win = { key: ChapterKey; a: number; b: number; drift?: number };

const PANELS: Win[] = [
  { key: "hero", a: -1, b: 0.85 },
  { key: "work", a: 0.0, b: 0.95 },
  { key: "contact", a: -0.2, b: 2.0 },
];

function opacityFor(f: Frame, w: Win, tl: Timeline) {
  const i = tl.index(w.key);
  if (f.i === i - 1 && w.a < 0) return smooth(0.82, 1, f.t);
  if (f.i !== i) return 0;
  const fade = 0.06;
  return Math.min(smooth(w.a, w.a + fade, f.lp), 1 - smooth(w.b - fade, w.b, f.lp));
}

export default function Cinema() {
  usePageMeta({
    title: "Link Connect — 3D Curated Web Directory",
    description: "Explore curated websites with interactive 3D sliding cards: learnfreex.ct.ws, lotusstudy.in and more.",
    path: "/",
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panels = useRef<Partial<Record<ChapterKey, HTMLElement | null>>>({});
  const websites = useWebsites();
  const [ready, setReady] = useState(false);
  const [noGL, setNoGL] = useState(false);
  const [active, setActive] = useState(0);

  const tl = useMemo(() => buildTimeline(websites.length), [websites.length]);

  useEffect(() => {
    if (!websites || websites.length === 0 || !tl) return;
    document.documentElement.classList.add("cx-html");
    let stop: (() => void) | undefined;
    let cancelled = false;
    let lastActive = -1;
    const workI = tl.index("work");
    const minDelay = new Promise((r) => setTimeout(r, 600));

    startEngine(canvasRef.current!, websites, tl, (f) => {
      for (const w of PANELS) {
        const el = panels.current[w.key];
        if (!el) continue;
        const o = opacityFor(f, w, tl);
        el.style.opacity = String(o);
        el.style.visibility = o > 0.01 ? "visible" : "hidden";
        const glitchX = f.velocity > 0.8 ? (Math.random() - 0.5) * 6 : 0;
        el.style.transform = `translate3d(${glitchX}px, 0, 0)`;
      }

      if (f.i === workI) {
        const a = Math.round(workFocus(f.lp, websites.length));
        if (a !== lastActive && a >= 0 && a < websites.length) {
          lastActive = a;
          setActive(a);
        }
      }
    })
      .then(async (s) => {
        stop = s;
        await Promise.all([minDelay, document.fonts.ready]);
        if (cancelled) s();
        else setReady(true);
      })
      .catch((err) => {
        console.error("WebGL initialization error", err);
        if (!cancelled) {
          setNoGL(true);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
      stop?.();
      document.documentElement.classList.remove("cx-html");
    };
  }, [websites, tl]);

  function go(key: ChapterKey) {
    if (tl) {
      window.scrollTo({
        top: key === "hero" ? 0 : tl.scrollTargetFor(key, 0.05),
        behavior: "smooth",
      });
    }
  }

  function goToCard(cardIndex: number) {
    if (tl) {
      const top = tl.scrollTargetForCard(cardIndex, websites.length);
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  const p: WebsiteItem | undefined = websites[active] || websites[0];
  const reg = (k: ChapterKey) => (el: HTMLElement | null) => {
    panels.current[k] = el;
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // If clicking on the canvas while in the cards chapter, open active website
    if (window.scrollY > window.innerHeight * 0.8 && p?.url) {
      // Avoid clicks meant for overlay buttons
      const target = e.target as HTMLElement;
      if (target === canvasRef.current) {
        window.open(p.url, "_blank", "noopener,noreferrer");
      }
    }
  };

  return (
    <div className={`cx${noGL ? " cx-nogl" : ""}${ready ? " is-ready" : ""}`}>
      <canvas
        ref={canvasRef}
        className="cx-canvas"
        onClick={handleCanvasClick}
        title={p ? `Click to launch ${p.name}` : undefined}
        aria-hidden="true"
      />
      <div className="cx-spacer" style={{ height: `${((tl?.total ?? 1) + 1) * 100}vh` }} aria-hidden="true" />

      <div className={`cx-loader${ready ? " is-done" : ""}`} aria-hidden={ready}>
        <span className="cx-dot-type">LINK CONNECT</span>
        <span className="cx-loader-pill">
          <i />
        </span>
      </div>

      <header className="cx-head">
        <a
          href="#"
          className="cx-brand cx-dot-type"
          onClick={(e) => {
            e.preventDefault();
            go("hero");
          }}
        >
          <span className="cx-pulse-dot" />
          <span>LINK CONNECT</span>
        </a>

        <nav className="cx-head-right">
          <button
            type="button"
            className="cx-nav-link"
            onClick={() => go("work")}
          >
            SHOWCASE [{websites.length}]
          </button>
          <button
            type="button"
            className="cx-nav-link"
            onClick={() => go("contact")}
          >
            REACH OUT
          </button>
        </nav>
      </header>

      <main className="cx-panels">
        {/* HERO SECTION WITH FLOATING TEXT: Welcome To Link Connect */}
        <section ref={reg("hero")} className="cx-panel cx-hero" aria-label="Welcome">
          <div className="cx-hero-floating">
            <div className="cx-float-badge">
              <span className="cx-pulse-dot" />
              <span>// DIGITAL DESTINATIONS DIRECTORY</span>
            </div>

            <div className="cx-float-title-wrap">
              <p className="cx-float-prefix">WELCOME TO</p>
              <h1 className="cx-float-title">
                <span className="cx-glow-cyan">LINK</span>{" "}
                <span className="cx-glow-white">CONNECT</span>
              </h1>
            </div>

            <div className="cx-hero-actions">
              <button
                type="button"
                className="cx-btn-explore"
                onClick={() => go("work")}
              >
                <span>EXPLORE WEBSITES</span>
                <span className="cx-arrow">↓</span>
              </button>
            </div>
          </div>

          <p className="cx-scroll-hint">SCROLL TO SLIDE WEBSITES ↓</p>
        </section>

        {/* SLIDING ANIMATION CARDS SHOWCASE FOR WEBSITES */}
        {websites.length > 0 && p && (
          <section ref={reg("work")} className="cx-panel cx-work" aria-label="Websites">
            <div className="cx-work-header">
              <h2 className="cx-dot-type">WEBSITE SHOWCASE</h2>
              <span className="cx-card-counter">
                [{String(active + 1).padStart(2, "0")} / {String(websites.length).padStart(2, "0")}]
              </span>
            </div>

            <ol className="cx-website-list">
              {websites.map((x, i) => (
                <li key={x.id} className={i === active ? "is-active" : ""}>
                  <button
                    type="button"
                    onClick={() => goToCard(i)}
                    className="cx-website-nav-item"
                    title={`Slide to ${x.name}`}
                  >
                    <span className="cx-nav-num">[{String(i + 1).padStart(2, "0")}]</span>
                    <span className="cx-nav-name">{x.name}</span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="cx-work-detail" key={p.id}>
              <p className="cx-work-tag">{p.tag}{p.stack ? ` — ${p.stack}` : ""}</p>
              <p className="cx-work-desc">{p.desc}</p>

              <div className="cx-work-actions">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cx-open-btn"
                >
                  &gt; OPEN WEBSITE [{p.name}] ↗
                </a>
              </div>

              <div className="cx-slide-controls">
                <button
                  type="button"
                  onClick={() => goToCard(Math.max(0, active - 1))}
                  disabled={active === 0}
                  className="cx-step-btn"
                  title="Previous website"
                >
                  ← PREV
                </button>
                <button
                  type="button"
                  onClick={() => goToCard(Math.min(websites.length - 1, active + 1))}
                  disabled={active === websites.length - 1}
                  className="cx-step-btn"
                  title="Next website"
                >
                  NEXT →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* CONTACT / REACH OUT SECTION (ZOOM & COVER ALL WINDOW) */}
        <section ref={reg("contact")} className="cx-panel cx-contact" aria-label="Reach Out">
          <div className="cx-contact-box">
            <span className="cx-reach-badge">[ REACH OUT ]</span>
            <h2 className="cx-dot-type cx-contact-headline">LET&apos;S BUILD SOMETHING TOGETHER.</h2>
            <p className="cx-contact-sub">
              Available for full-time junior AI engineer roles, software internships, and freelance web platform development.
            </p>
            <a className="cx-mail-link" href="mailto:stwanubhavbusiness@gmail.com">
              stwanubhavbusiness@gmail.com
            </a>

            <div className="cx-contact-buttons">
              <a
                href="mailto:stwanubhavbusiness@gmail.com"
                className="cx-btn-message"
              >
                &gt; SEND A MESSAGE
              </a>
              <a
                href="https://github.com/stwanubhav"
                target="_blank"
                rel="noreferrer"
                className="cx-btn-social"
              >
                &gt; GITHUB PROFILE
              </a>
              <a
                href="https://linkedin.com/in/stwanubhav"
                target="_blank"
                rel="noreferrer"
                className="cx-btn-social"
              >
                &gt; LINKEDIN
              </a>
              <a
                href="https://instagram.com/stw_anubhav"
                target="_blank"
                rel="noreferrer"
                className="cx-btn-social"
              >
                &gt; INSTAGRAM
              </a>
            </div>
          </div>

          <footer className="cx-contact-footer">
            <span>@stwanubhav everywhere</span>
            <span>STWANUBHAV — ALL RIGHTS RESERVED</span>
            <span>©2026</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
