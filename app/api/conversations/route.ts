import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";
import { notify } from "@/lib/notify";
import { getUserProfile, verifyRequestUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const rows = await prisma.conversation.findMany({
    where: { OR: [{ ownerId: user.uid }, { starterId: user.uid }] },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    conversations: rows.map((c) => {
      const isOwner = c.ownerId === user.uid;
      const readAt = isOwner ? c.ownerReadAt : c.starterReadAt;

      return {
        id: c.id,
        itemType: c.itemType,
        itemId: c.itemId,
        itemName: c.itemName,
        otherName: isOwner ? c.starterName : c.ownerName,
        otherPhoto: isOwner ? c.starterPhoto : c.ownerPhoto,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt.toISOString(),
        unread:
          c.lastSenderId !== "" &&
          c.lastSenderId !== user.uid &&
          c.lastMessageAt > readAt,
      };
    }),
  });
}

export async function POST(request: Request) {
  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const allowed = await rateLimit(`rl:convo:${user.uid}`, 30, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many chats started. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const type = body?.type;
  const itemId = String(body?.itemId ?? "");
  const message = String(body?.message ?? "").trim();

  if ((type !== "lost" && type !== "found") || !itemId) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (message.length > 1000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  const select = { name: true, userId: true, userName: true, userPhoto: true };
  const item =
    type === "lost"
      ? await prisma.lostItem.findUnique({ where: { id: itemId }, select })
      : await prisma.foundItem.findUnique({ where: { id: itemId }, select });

  if (!item) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (item.userId === user.uid) {
    return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });
  }

  const existing = await prisma.conversation.findUnique({
    where: {
      itemType_itemId_starterId: { itemType: type, itemId, starterId: user.uid },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ id: existing.id });
  }

  let ownerName = item.userName;
  let ownerPhoto = item.userPhoto;
  if (!ownerName || !ownerPhoto) {
    const profile = await getUserProfile(item.userId);
    if (profile) {
      ownerName = ownerName || profile.name;
      ownerPhoto = ownerPhoto || profile.photo;
    }
  }

  const created = await prisma.conversation.create({
    data: {
      itemType: type,
      itemId,
      itemName: item.name,
      ownerId: item.userId,
      ownerName,
      ownerPhoto,
      starterId: user.uid,
      starterName: user.name || "",
      starterPhoto: user.picture || "",
      lastMessage: message.slice(0, 120),
      lastSenderId: message ? user.uid : "",
      messages: message
        ? { create: { senderId: user.uid, text: message } }
        : undefined,
    },
    select: { id: true },
  });

  if (message) {
    await notify({
      userId: item.userId,
      type: "message",
      title:
        type === "lost"
          ? `Someone may have found "${item.name}"`
          : `New message about "${item.name}"`,
      body: message.slice(0, 100),
      link: `/messages/${created.id}`,
      dedupe: true,
    });
  }

  return NextResponse.json({ id: created.id }, { status: 201 });
}