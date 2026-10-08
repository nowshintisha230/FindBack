import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";
import { notify } from "@/lib/notify";
import { verifyRequestUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;

  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const convo = await prisma.conversation.findUnique({ where: { id } });
  if (!convo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = convo.ownerId === user.uid;
  const isStarter = convo.starterId === user.uid;
  if (!isOwner && !isStarter) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const after = new URL(request.url).searchParams.get("after");
  const afterDate = after ? new Date(after) : null;
  const validAfter = afterDate && !Number.isNaN(afterDate.getTime());

  const rows = validAfter
    ? await prisma.message.findMany({
        where: { conversationId: id, createdAt: { gt: afterDate } },
        orderBy: { createdAt: "asc" },
        take: 200,
      })
    : (
        await prisma.message.findMany({
          where: { conversationId: id },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      ).reverse();

  if (convo.lastSenderId !== user.uid) {
    await prisma.conversation.update({
      where: { id },
      data: isOwner ? { ownerReadAt: new Date() } : { starterReadAt: new Date() },
    });
  }

  return NextResponse.json({
    conversation: {
      id: convo.id,
      itemType: convo.itemType,
      itemId: convo.itemId,
      itemName: convo.itemName,
      other: {
        name: isOwner ? convo.starterName : convo.ownerName,
        photo: isOwner ? convo.starterPhoto : convo.ownerPhoto,
      },
    },
    messages: rows.map((m) => ({
      id: m.id,
      mine: m.senderId === user.uid,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const allowed = await rateLimit(`rl:msg:${user.uid}`, 40, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "You are sending messages too fast." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const text = String(body?.text ?? "").trim();

  if (!text) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }

  if (text.length > 1000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  const convo = await prisma.conversation.findUnique({
    where: { id },
    select: { ownerId: true, starterId: true, itemName: true },
  });

  if (!convo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = convo.ownerId === user.uid;
  const isStarter = convo.starterId === user.uid;
  if (!isOwner && !isStarter) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: id, senderId: user.uid, text, createdAt: now },
    }),
    prisma.conversation.update({
      where: { id },
      data: {
        lastMessage: text.slice(0, 120),
        lastSenderId: user.uid,
        lastMessageAt: now,
        ...(isOwner ? { ownerReadAt: now } : { starterReadAt: now }),
      },
    }),
  ]);

  await notify({
    userId: isOwner ? convo.starterId : convo.ownerId,
    type: "message",
    title: `${user.name || "Someone"} messaged you about "${convo.itemName}"`,
    body: text.slice(0, 100),
    link: `/messages/${id}`,
    dedupe: true,
  });

  return NextResponse.json(
    {
      message: {
        id: message.id,
        mine: true,
        text: message.text,
        createdAt: message.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}