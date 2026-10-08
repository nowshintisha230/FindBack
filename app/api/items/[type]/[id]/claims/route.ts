import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";
import { notify } from "@/lib/notify";
import { verifyRequestUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ type: string; id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { type, id } = await params;

  if (type !== "found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const item = await prisma.foundItem.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (item.userId === user.uid) {
    const claims = await prisma.claim.findMany({
      where: { itemId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      role: "owner",
      claims: claims.map((c) => ({
        id: c.id,
        claimerName: c.claimerName,
        claimerEmail: c.claimerEmail,
        claimerPhoto: c.claimerPhoto,
        phone: c.phone,
        proof: c.proof,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  }

  const mine = await prisma.claim.findUnique({
    where: { itemId_claimerId: { itemId: id, claimerId: user.uid } },
  });

  return NextResponse.json({
    role: "claimer",
    myClaim: mine
      ? { status: mine.status, createdAt: mine.createdAt.toISOString() }
      : null,
  });
}

export async function POST(request: Request, { params }: Params) {
  const { type, id } = await params;

  if (type !== "found") {
    return NextResponse.json({ error: "Only found items can be claimed." }, { status: 404 });
  }

  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const allowed = await rateLimit(`rl:claim:${user.uid}`, 20, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many claims. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const proof = String(body?.proof ?? "").trim();
  const phone = String(body?.phone ?? "").replace(/[\s-]/g, "");

  if (proof.length < 10) {
    return NextResponse.json(
      { error: "Please describe how you can prove this item is yours (at least 10 characters)." },
      { status: 400 }
    );
  }

  if (proof.length > 1000) {
    return NextResponse.json({ error: "Your answer is too long." }, { status: 400 });
  }

  if (!/^(\+?88)?01[3-9]\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }

  const item = await prisma.foundItem.findUnique({
    where: { id },
    select: { userId: true, status: true, name: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (item.userId === user.uid) {
    return NextResponse.json({ error: "You cannot claim your own post." }, { status: 403 });
  }

  if (item.status === "returned") {
    return NextResponse.json({ error: "This item has already been returned." }, { status: 400 });
  }

  const existing = await prisma.claim.findUnique({
    where: { itemId_claimerId: { itemId: id, claimerId: user.uid } },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "You have already claimed this item." }, { status: 409 });
  }

  await prisma.claim.create({
    data: {
      itemId: id,
      claimerId: user.uid,
      claimerName: user.name || "",
      claimerEmail: user.email || "",
      claimerPhoto: user.picture || "",
      proof,
      phone,
    },
  });

  await notify({
    userId: item.userId,
    type: "claim",
    title: `New claim on "${item.name}"`,
    body: `${user.name || "Someone"} says this item is theirs. Review their proof.`,
    link: `/found-item/${id}`,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}