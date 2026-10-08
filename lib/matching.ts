import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export type Matchable = {
  id: string;
  name: string;
  category: string;
  description: string;
  location: string;
  date: Date;
  latitude: number | null;
  longitude: number | null;
  userId: string;
};

export type MatchResult = {
  id: string;
  type: "lost" | "found";
  name: string;
  category: string;
  place: string;
  date: string;
  image: string;
  score: number;
  userId: string;
};

const MATCH_MIN = 55;
const DAY = 24 * 60 * 60 * 1000;
const TOKEN_RE = new RegExp("[\\p{L}\\p{N}]+", "gu");

const STOP = new Set([
  "the", "and", "for", "with", "was", "has", "have", "this", "that", "from",
  "lost", "found", "item", "near", "very", "are", "you", "its", "not", "but",
  "can", "any", "all", "got", "own", "some", "please", "contact", "inside",
]);

const tokenize = (text: string) => {
  const out = new Set<string>();
  const matches = text.toLowerCase().match(TOKEN_RE) || [];

  for (const raw of matches) {
    if (raw.length < 2 || STOP.has(raw)) continue;
    out.add(raw.length > 3 && raw.endsWith("s") ? raw.slice(0, -1) : raw);
  }

  return out;
};

const countCommon = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  a.forEach((t) => {
    if (b.has(t)) n += 1;
  });
  return n;
};

const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

export const scoreMatch = (lost: Matchable, found: Matchable) => {
  const diffDays = (found.date.getTime() - lost.date.getTime()) / DAY;
  if (diffDays < -1) return 0;

  const tokensLost = tokenize(`${lost.name} ${lost.description}`);
  const tokensFound = tokenize(`${found.name} ${found.description}`);
  const common = countCommon(tokensLost, tokensFound);
  if (common === 0) return 0;

  const base = common / Math.max(1, Math.min(tokensLost.size, tokensFound.size));
  const nameCommon = countCommon(tokenize(lost.name), tokenize(found.name));
  const textScore = Math.round(40 * Math.min(1, base + (nameCommon > 0 ? 0.35 : 0)));

  const categoryScore = lost.category && lost.category === found.category ? 30 : 0;

  const la = lost.location.toLowerCase().trim();
  const lb = found.location.toLowerCase().trim();
  let locationScore = 0;
  if (la && lb) {
    if (la.includes(lb) || lb.includes(la)) {
      locationScore = 15;
    } else {
      const ta = new Set(Array.from(tokenize(la)).filter((t) => t.length >= 3));
      const tb = new Set(Array.from(tokenize(lb)).filter((t) => t.length >= 3));
      const shared = countCommon(ta, tb);
      locationScore = shared >= 2 ? 15 : shared === 1 ? 8 : 0;
    }
  }

  let dateScore = 0;
  if (diffDays <= 3) dateScore = 15;
  else if (diffDays <= 7) dateScore = 10;
  else if (diffDays <= 14) dateScore = 6;
  else if (diffDays <= 30) dateScore = 3;

  let geoScore = 0;
  if (
    lost.latitude !== null &&
    lost.longitude !== null &&
    found.latitude !== null &&
    found.longitude !== null
  ) {
    const km = distanceKm(lost.latitude, lost.longitude, found.latitude, found.longitude);
    if (km <= 1) geoScore = 10;
    else if (km <= 3) geoScore = 5;
  }

  return Math.min(
    100,
    categoryScore + textScore + locationScore + dateScore + geoScore
  );
};

type Row = Matchable & { images: string[] };

export const findMatchesFor = async (
  type: "lost" | "found",
  source: Matchable,
  limit = 5
): Promise<MatchResult[]> => {
  const otherType: "lost" | "found" = type === "lost" ? "found" : "lost";
  const t = source.date.getTime();

  let rows: Row[];
  let scored: { row: Row; score: number }[];

  if (type === "lost") {
    rows = await prisma.foundItem.findMany({
      where: {
        status: "open",
        userId: { not: source.userId },
        date: { gte: new Date(t - DAY), lte: new Date(t + 30 * DAY) },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    scored = rows.map((row) => ({ row, score: scoreMatch(source, row) }));
  } else {
    rows = await prisma.lostItem.findMany({
      where: {
        status: "open",
        userId: { not: source.userId },
        date: { gte: new Date(t - 30 * DAY), lte: new Date(t + DAY) },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    scored = rows.map((row) => ({ row, score: scoreMatch(row, source) }));
  }

  return scored
    .filter((s) => s.score >= MATCH_MIN)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) => ({
      id: row.id,
      type: otherType,
      name: row.name,
      category: row.category,
      place: row.location,
      date: row.date.toISOString().slice(0, 10),
      image: row.images[0] || "",
      score,
      userId: row.userId,
    }));
};

export const notifyMatches = async (type: "lost" | "found", created: Matchable) => {
  try {
    const matches = await findMatchesFor(type, created, 5);
    if (matches.length === 0) return;

    const link = `/${type}-item/${created.id}`;
    const otherLabel = type === "lost" ? "found" : "lost";

    await notify({
      userId: created.userId,
      type: "match",
      title: `${matches.length} possible ${otherLabel} match${
        matches.length === 1 ? "" : "es"
      } for "${created.name}"`,
      body: `Top match: "${matches[0].name}" (${matches[0].score}% match). Open your post to see them.`,
      link,
      dedupe: true,
    });

    await Promise.all(
      matches.map((m) =>
        notify({
          userId: m.userId,
          type: "match",
          title: `A new ${type} post may match your ${otherLabel} item "${m.name}"`,
          body: `"${created.name}" (${m.score}% match)`,
          link,
          dedupe: true,
        })
      )
    );
  } catch (err) {
    console.error("[notifyMatches]", err);
  }
};