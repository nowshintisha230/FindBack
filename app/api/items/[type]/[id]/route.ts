import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
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
    poster: { name: row.userName, photo: row.userPhoto },
    isOwner: viewer?.uid === row.userId,
    contact: viewer ? { phone: row.phone, email: row.userEmail } : null,
  });
}