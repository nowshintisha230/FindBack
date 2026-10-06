import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { cacheDel, cacheGet, cacheSet, rateLimit } from "@/lib/redis";
import { verifyRequestUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_KEY = "items:home:v2";
const CACHE_TTL = 60;
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

type PublicItem = {
  id: string;
  name: string;
  category: string;
  place: string;
  date: string;
  reportedAt: string;
  description: string;
  image: string;
};

type HomePayload = { lost: PublicItem[]; found: PublicItem[] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toPublic = (row: {
  id: string;
  name: string;
  category: string;
  location: string;
  date: Date;
  createdAt: Date;
  description: string;
  images: string[];
}): PublicItem => ({
  id: row.id,
  name: row.name,
  category: row.category,
  place: row.location,
  date: row.date.toISOString().slice(0, 10),
  reportedAt: row.createdAt.toISOString(),
  description: row.description,
  image: row.images[0] || "",
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 80);
  const category = (searchParams.get("category") || "").trim().slice(0, 40);
  const location = (searchParams.get("location") || "").trim().slice(0, 120);
  const type = searchParams.get("type") || "all";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const hasFilters = Boolean(
    q || category || location || from || to || type === "lost" || type === "found"
  );

  if (!hasFilters) {
    const cached = await cacheGet<HomePayload>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (DATE_RE.test(from)) dateFilter.gte = new Date(`${from}T00:00:00.000Z`);
  if (DATE_RE.test(to)) dateFilter.lte = new Date(`${to}T00:00:00.000Z`);

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
    ...(location
      ? { location: { contains: location, mode: "insensitive" as const } }
      : {}),
    ...(dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {}),
  };

  const orderBy = { createdAt: "desc" as const };

  const lostRows =
    type === "found" ? [] : await prisma.lostItem.findMany({ where, orderBy, take: 500 });
  const foundRows =
    type === "lost" ? [] : await prisma.foundItem.findMany({ where, orderBy, take: 500 });

  const payload: HomePayload = {
    lost: lostRows.map(toPublic),
    found: foundRows.map(toPublic),
  };

  if (!hasFilters) {
    await cacheSet(CACHE_KEY, payload, CACHE_TTL);
  }

  return NextResponse.json(payload, {
    headers: { "X-Cache": hasFilters ? "BYPASS" : "MISS" },
  });
}

export async function POST(request: Request) {
  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const allowed = await rateLimit(`rl:post:${user.uid}`, 10, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many posts. Please try again later." },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const val = (key: string) => String(formData.get(key) ?? "").trim();

  const isFound = val("type").toLowerCase() === "found";
  const name = val("title");
  const category = val("category");
  const description = val("description");
  const location = val("location");
  const dateRaw = val("date") || val("dateLost") || val("dateFound");
  const phone = val("phone").replace(/[\s-]/g, "");
  const reward = val("reward");

  if (!name || !category || !location || !dateRaw) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  if (!/^(\+?88)?01[3-9]\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }

  const date = new Date(`${dateRaw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 24 * 3600 * 1000) {
    return NextResponse.json({ error: "Please enter a valid date." }, { status: 400 });
  }

  if (name.length > 80 || description.length > 1000 || location.length > 120 || reward.length > 60) {
    return NextResponse.json({ error: "One of the fields is too long." }, { status: 400 });
  }

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Up to ${MAX_IMAGES} photos only.` }, { status: 400 });
  }

  const processed: Buffer[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Each photo must be 15MB or smaller." }, { status: 400 });
    }

    try {
      const output = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "none" })
        .rotate()
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();
      processed.push(output);
    } catch {
      return NextResponse.json(
        { error: `"${file.name}" could not be read as an image. Please try a JPG or PNG.` },
        { status: 400 }
      );
    }
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const imageUrls: string[] = [];
  for (const buffer of processed) {
    const fileName = `${randomUUID()}.webp`;
    await writeFile(path.join(UPLOAD_DIR, fileName), buffer);
    imageUrls.push(`/api/uploads/${fileName}`);
  }

  const data = {
    name,
    category,
    description,
    location,
    date,
    phone,
    reward,
    images: imageUrls,
    userId: user.uid,
    userName: user.name || "",
    userEmail: user.email || "",
    userPhoto: user.picture || "",
  };

  const created = isFound
    ? await prisma.foundItem.create({ data, select: { id: true } })
    : await prisma.lostItem.create({ data, select: { id: true } });

  await cacheDel(CACHE_KEY);

  return NextResponse.json({ id: created.id }, { status: 201 });
}