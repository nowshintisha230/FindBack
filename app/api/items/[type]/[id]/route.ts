import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheDel } from "@/lib/redis";
import { getUserProfile, verifyRequestUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_KEY = "items:home:v2";

type Params = { params: Promise<{ type: string; id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { type, id } = await params;

  if (type !== "lost" && type !== "found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row =
    type === "lost"
      ? await prisma.lostItem.findUnique({ where: { id } })
      : await prisma.foundItem.findUnique({ where: { id } });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const viewer = await verifyRequestUser(request);

  let posterName = row.userName;
  let posterPhoto = row.userPhoto;

  if (!posterName || !posterPhoto) {
    const profile = await getUserProfile(row.userId);
    if (profile) {
      posterName = posterName || profile.name;
      posterPhoto = posterPhoto || profile.photo;
    }
  }

  return NextResponse.json({
    id: row.id,
    type,
    name: row.name,
    category: row.category,
    description: row.description,
    location: row.location,
    date: row.date.toISOString().slice(0, 10),
    reportedAt: row.createdAt.toISOString(),
    reward: row.reward,
    images: row.images,
    status: row.status,
    returnedAt: row.returnedAt ? row.returnedAt.toISOString() : null,
    latitude: row.latitude,
    longitude: row.longitude,
    poster: { name: posterName, photo: posterPhoto },
    isOwner: viewer?.uid === row.userId,
    contact: viewer ? { phone: row.phone, email: row.userEmail } : null,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { type, id } = await params;

  if (type !== "lost" && type !== "found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.returned !== "boolean") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const row =
    type === "lost"
      ? await prisma.lostItem.findUnique({ where: { id }, select: { userId: true } })
      : await prisma.foundItem.findUnique({ where: { id }, select: { userId: true } });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.userId !== user.uid) {
    return NextResponse.json(
      { error: "Only the owner of this post can do that." },
      { status: 403 }
    );
  }

  const data = {
    status: body.returned ? "returned" : "open",
    returnedAt: body.returned ? new Date() : null,
  };

  const updated =
    type === "lost"
      ? await prisma.lostItem.update({
          where: { id },
          data,
          select: { status: true, returnedAt: true },
        })
      : await prisma.foundItem.update({
          where: { id },
          data,
          select: { status: true, returnedAt: true },
        });

  await cacheDel(CACHE_KEY);

  return NextResponse.json({
    status: updated.status,
    returnedAt: updated.returnedAt ? updated.returnedAt.toISOString() : null,
  });
}