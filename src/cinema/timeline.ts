export type ChapterKey = "hero" | "work" | "contact";

export const ORDER: ChapterKey[] = ["hero", "work", "contact"];

export const TRANSITION = 0.75;

export type Located = { i: number; lp: number; t: number };
export type Timeline = ReturnType<typeof buildTimeline>;

export function buildTimeline(projects: number) {
  const count = Math.max(1, projects);
  const lens: Record<ChapterKey, number> = {
    hero: 1.4,
    work: Math.max(2.2, 1.8 * count),
    contact: 1.8,
  };
  const chapters = ORDER.map((key) => ({ key, len: lens[key] }));
  const starts = chapters.reduce<number[]>((a, c, i) => (a.push(i ? a[i - 1] + chapters[i - 1].len : 0), a), []);
  const total = starts[starts.length - 1] + chapters[chapters.length - 1].len;
  const index = (key: ChapterKey) => ORDER.indexOf(key);

  function locate(p: number): Located {
    let i = chapters.length - 1;
    while (i > 0 && p < starts[i]) i--;
    const { len } = chapters[i];
    const lp = Math.min(1, Math.max(0, (p - starts[i]) / len));
    const last = i === chapters.length - 1;
    const t = last ? 0 : Math.min(1, Math.max(0, (p - (starts[i] + len - TRANSITION)) / TRANSITION));
    return { i, lp, t };
  }

  const scrollTargetFor = (key: ChapterKey, local = 0.12) =>
    (starts[index(key)] + chapters[index(key)].len * local) * window.innerHeight;

  const scrollTargetForCard = (cardIndex: number, totalCards: number) => {
    const workStart = starts[index("work")];
    const workLen = chapters[index("work")].len;
    const n = Math.max(1, totalCards);
    const clampedIndex = Math.max(0, Math.min(n - 1, cardIndex));
    const targetLp = n > 1 ? Math.min(0.92, ((clampedIndex + 0.35) / n) * 0.93) : 0.45;
    return (workStart + workLen * targetLp) * window.innerHeight;
  };

  return { chapters, starts, total, index, locate, scrollTargetFor, scrollTargetForCard };
}

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
