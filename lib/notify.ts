import { prisma } from "@/lib/prisma";

type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  dedupe?: boolean;
};

export const notify = async ({
  userId,
  type,
  title,
  body = "",
  link = "",
  dedupe = false,
}: NotifyInput) => {
  try {
    if (dedupe) {
      const existing = await prisma.notification.findFirst({
        where: { userId, type, link, read: false },
        select: { id: true },
      });

      if (existing) {
        await prisma.notification.update({
          where: { id: existing.id },
          data: { title, body, createdAt: new Date() },
        });
        return;
      }
    }

    await prisma.notification.create({
      data: { userId, type, title, body, link },
    });
  } catch (err) {
    console.error("[notify]", err);
  }
};