import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const unread = await prisma.notification.count({
    where: { userId: user.uid, read: false },
  });

  if (new URL(request.url).searchParams.get("count") === "1") {
    return NextResponse.json({ unread });
  }

  const rows = await prisma.notification.findMany({
    where: { userId: user.uid },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    unread,
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(request: Request) {
  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (body?.all === true) {
    await prisma.notification.updateMany({
      where: { userId: user.uid, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  const id = String(body?.id ?? "");
  if (!id) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: { id, userId: user.uid },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}