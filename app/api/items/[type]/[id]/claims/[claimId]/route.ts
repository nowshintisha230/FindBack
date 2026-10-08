import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheDel } from "@/lib/redis";
import { notify } from "@/lib/notify";
import { verifyRequestUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_KEY = "items:home:v2";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string; claimId: string }> }
) {
  const { type, id, claimId } = await params;

  if (type !== "found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await verifyRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const item = await prisma.foundItem.findUnique({
    where: { id },
    select: { userId: true, status: true, name: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (item.userId !== user.uid) {
    return NextResponse.json({ error: "Only the owner of this post can do that." }, { status: 403 });
  }

  const claim = await prisma.claim.findUnique({ where: { id: claimId } });

  if (!claim || claim.itemId !== id) {
    return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  }

  if (claim.status !== "pending") {
    return NextResponse.json({ error: "This claim was already reviewed." }, { status: 400 });
  }

  if (action === "approve") {
    if (item.status === "returned") {
      return NextResponse.json({ error: "This item has already been returned." }, { status: 400 });
    }

    const others = await prisma.claim.findMany({
      where: { itemId: id, id: { not: claimId }, status: "pending" },
      select: { claimerId: true },
    });

    await prisma.$transaction([
      prisma.claim.update({ where: { id: claimId }, data: { status: "approved" } }),
      prisma.claim.updateMany({
        where: { itemId: id, id: { not: claimId }, status: "pending" },
        data: { status: "rejected" },
      }),
      prisma.foundItem.update({
        where: { id },
        data: { status: "returned", returnedAt: new Date() },
      }),
    ]);

    await cacheDel(CACHE_KEY);

    await notify({
      userId: claim.claimerId,
      type: "claim_result",
      title: `Your claim on "${item.name}" was approved`,
      body: "The finder will contact you to hand over the item.",
      link: `/found-item/${id}`,
    });

    await Promise.all(
      others.map((o) =>
        notify({
          userId: o.claimerId,
          type: "claim_result",
          title: `Your claim on "${item.name}" was not accepted`,
          body: "The item was returned to another claimer.",
          link: `/found-item/${id}`,
        })
      )
    );

    return NextResponse.json({ ok: true, status: "approved" });
  }

  await prisma.claim.update({ where: { id: claimId }, data: { status: "rejected" } });

  await notify({
    userId: claim.claimerId,
    type: "claim_result",
    title: `Your claim on "${item.name}" was not accepted`,
    body: "The finder could not verify your details.",
    link: `/found-item/${id}`,
  });

  return NextResponse.json({ ok: true, status: "rejected" });
}