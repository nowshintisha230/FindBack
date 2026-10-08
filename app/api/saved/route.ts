import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";
import { verifyRequestUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const rows = await prisma.savedItem.findMany({
    where: { userId: user.uid },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const keys = rows.map((r) => `${r.itemType}:${r.itemId}`);

  const wantsDetails = new URL(request.url).searchParams.get("details") === "1";
  if (!wantsDetails) {
    return NextResponse.json({ keys });
  }

  const lostIds = rows.filter((r) => r.itemType === "lost").map((r) => r.itemId);
  const foundIds = rows.filter((r) => r.itemType === "found").map((r) => r.itemId);

  const [lostRows, foundRows] = await Promise.all([
    lostIds.length
      ? prisma.lostItem.findMany({ where: { id: { in: lostIds } } })
      : Promise.resolve([]),
    foundIds.length
      ? prisma.foundItem.findMany({ where: { id: { in: foundIds } } })
      : Promise.resolve([]),
  ]);

  const lostMap = new Map(lostRows.map((r) => [r.id, r]));
  const foundMap = new Map(foundRows.map((r) => [r.id, r]));

  const items = rows.flatMap((r) => {
    const row = r.itemType === "lost" ? lostMap.get(r.itemId) : foundMap.get(r.itemId);
    if (!row) return [];

    return [
      {
        type: r.itemType,
        id: row.id,
        name: row.name,
        category: row.category,
        place: row.location,
        date: row.date.toISOString().slice(0, 10),
        reportedAt: row.createdAt.toISOString(),
        description: row.description,
        image: row.images[0] || "",
        status: row.status,
        savedAt: r.createdAt.toISOString(),
      },
    ];
  });

  return NextResponse.json({ keys, items });
}

export async function POST(request: Request) {
  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const allowed = await rateLimit(`rl:save:${user.uid}`, 60, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const type = body?.type;
  const itemId = String(body?.itemId ?? "");

  if ((type !== "lost" && type !== "found") || !itemId) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const exists =
    type === "lost"
      ? await prisma.lostItem.findUnique({ where: { id: itemId }, select: { id: true } })
      : await prisma.foundItem.findUnique({ where: { id: itemId }, select: { id: true } });

  if (!exists) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  await prisma.savedItem.upsert({
    where: { userId_itemType_itemId: { userId: user.uid, itemType: type, itemId } },
    update: {},
    create: { userId: user.uid, itemType: type, itemId },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const itemId = searchParams.get("itemId") || "";

  if ((type !== "lost" && type !== "found") || !itemId) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await prisma.savedItem.deleteMany({
    where: { userId: user.uid, itemType: type, itemId },
  });

  return NextResponse.json({ ok: true });
}