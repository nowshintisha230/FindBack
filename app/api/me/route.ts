import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toPublic = (row: {
  id: string;
  name: string;
  category: string;
  location: string;
  date: Date;
  createdAt: Date;
  description: string;
  images: string[];
  status: string;
}) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  place: row.location,
  date: row.date.toISOString().slice(0, 10),
  reportedAt: row.createdAt.toISOString(),
  description: row.description,
  image: row.images[0] || "",
  status: row.status,
});

export async function GET(request: Request) {
  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const [lostRows, foundRows, claimRows] = await Promise.all([
    prisma.lostItem.findMany({
      where: { userId: user.uid },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.foundItem.findMany({
      where: { userId: user.uid },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.claim.findMany({
      where: { claimerId: user.uid },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const claimItemIds = [...new Set(claimRows.map((c) => c.itemId))];

  const [claimItems, pendingClaims] = await Promise.all([
    claimItemIds.length
      ? prisma.foundItem.findMany({
          where: { id: { in: claimItemIds } },
          select: { id: true, name: true, location: true, images: true, status: true },
        })
      : Promise.resolve([]),
    foundRows.length
      ? prisma.claim.count({
          where: { itemId: { in: foundRows.map((r) => r.id) }, status: "pending" },
        })
      : Promise.resolve(0),
  ]);

  const claimItemMap = new Map(claimItems.map((i) => [i.id, i]));

  return NextResponse.json({
    profile: {
      name: user.name || "",
      email: user.email || "",
      photo: user.picture || "",
    },
    lost: lostRows.map(toPublic),
    found: foundRows.map(toPublic),
    claims: claimRows.map((c) => {
      const item = claimItemMap.get(c.itemId);
      return {
        id: c.id,
        itemId: c.itemId,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        item: item
          ? {
              name: item.name,
              place: item.location,
              image: item.images[0] || "",
              status: item.status,
            }
          : null,
      };
    }),
    stats: { pendingClaims },
  });
}