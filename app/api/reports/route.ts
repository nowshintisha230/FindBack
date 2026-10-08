import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";
import { verifyRequestUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REASONS = ["fake", "scam", "incorrect", "spam", "inappropriate", "other"];

export async function GET(request: Request) {
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

  const existing = await prisma.report.findUnique({
    where: {
      itemType_itemId_reporterId: { itemType: type, itemId, reporterId: user.uid },
    },
    select: { id: true },
  });

  return NextResponse.json({ reported: Boolean(existing) });
}

export async function POST(request: Request) {
  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const allowed = await rateLimit(`rl:report:${user.uid}`, 10, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many reports. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const type = body?.type;
  const itemId = String(body?.itemId ?? "");
  const reason = String(body?.reason ?? "");
  const details = String(body?.details ?? "").trim();

  if ((type !== "lost" && type !== "found") || !itemId) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!REASONS.includes(reason)) {
    return NextResponse.json({ error: "Please select a reason." }, { status: 400 });
  }

  if (details.length > 500) {
    return NextResponse.json({ error: "Details are too long." }, { status: 400 });
  }

  if (reason === "other" && details.length < 5) {
    return NextResponse.json(
      { error: "Please tell us a little more about the problem." },
      { status: 400 }
    );
  }

  const select = { name: true, userId: true };
  const item =
    type === "lost"
      ? await prisma.lostItem.findUnique({ where: { id: itemId }, select })
      : await prisma.foundItem.findUnique({ where: { id: itemId }, select });

  if (!item) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (item.userId === user.uid) {
    return NextResponse.json({ error: "You cannot report your own post." }, { status: 400 });
  }

  const existing = await prisma.report.findUnique({
    where: {
      itemType_itemId_reporterId: { itemType: type, itemId, reporterId: user.uid },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "You already reported this post." }, { status: 409 });
  }

  await prisma.report.create({
    data: {
      itemType: type,
      itemId,
      itemName: item.name,
      reporterId: user.uid,
      reporterName: user.name || "",
      reporterEmail: user.email || "",
      reason,
      details,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}