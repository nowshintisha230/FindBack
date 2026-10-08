import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMatchesFor } from "@/lib/matching";
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

  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const row =
    type === "lost"
      ? await prisma.lostItem.findUnique({ where: { id } })
      : await prisma.foundItem.findUnique({ where: { id } });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.userId !== user.uid || row.status === "returned") {
    return NextResponse.json({ matches: [] });
  }

  const matches = await findMatchesFor(type, row, 5);

  return NextResponse.json({
    matches: matches.map((m) => ({
      id: m.id,
      type: m.type,
      name: m.name,
      category: m.category,
      place: m.place,
      date: m.date,
      image: m.image,
      score: m.score,
    })),
  });
}