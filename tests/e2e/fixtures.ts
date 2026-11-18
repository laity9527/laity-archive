import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("E2E 需要 DATABASE_URL（从 .env 读取）");
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

export type BaseIds = { userId: string; projectId: string; handle: string };

export async function loadBaseIds(): Promise<BaseIds> {
  const user = await prisma.user.findUnique({
    where: { handle: "zhanglei" },
    select: { id: true, handle: true },
  });
  if (!user) throw new Error("E2E 缺少 zhanglei 用户");

  const project = await prisma.project.findFirst({
    where: { userId: user.id },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!project) throw new Error("E2E 缺少项目");

  return { userId: user.id, projectId: project.id, handle: user.handle };
}

export type SeedLogInput = {
  title: string;
  before: string;
  after?: string | null;
  series?: string | null;
  published?: boolean;
  beforeDate?: Date;
};

export async function seedLog(input: SeedLogInput) {
  const base = await loadBaseIds();
  const slug = `e2e-${randomUUID().slice(0, 8)}`;
  const after = input.after ?? null;
  const hash = createHash("sha256")
    .update(`${input.title}\n${input.before}\n${after ?? ""}`)
    .digest("hex");

  let seriesId: string | null = null;
  if (input.series?.trim()) {
    const name = input.series.trim();
    const slug = `series-${createHash("sha256").update(name).digest("hex").slice(0, 16)}`;
    const series = await prisma.series.upsert({
      where: { userId_slug: { userId: base.userId, slug } },
      update: {},
      create: { userId: base.userId, slug, name },
      select: { id: true },
    });
    seriesId = series.id;
  }

  const log = await prisma.log.create({
    data: {
      userId: base.userId,
      projectId: base.projectId,
      slug,
      title: input.title,
      beforeContent: input.before,
      afterContent: after,
      beforeDate: input.beforeDate ?? new Date("2026-11-01T00:00:00.000Z"),
      lessonLearned: "E2E 种子日志",
      series: input.series ?? null,
      seriesId,
      isPublished: input.published ?? false,
      publishedAt: input.published ? new Date() : null,
      contentHash: input.published ? hash : null,
    },
    select: { id: true, slug: true, title: true, contentHash: true },
  });

  return { ...log, before: input.before, after, hash };
}

export async function createPreviewToken(logId: string, userId: string) {
  const token = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await prisma.previewToken.create({
    data: {
      tokenHash,
      logId,
      userId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return token;
}

export async function seedAudit(targetId: string, hash = "deadbeef") {
  const base = await loadBaseIds();
  return prisma.auditEvent.create({
    data: {
      actorId: base.userId,
      action: "log.publish",
      targetType: "log",
      targetId,
      meta: { scanHits: 0, hash },
    },
    select: { id: true, targetId: true },
  });
}

export async function cleanupE2E() {
  await prisma.auditEvent.deleteMany({
    where: { targetId: { startsWith: "e2e-audit-" } },
  });
  await prisma.auditEvent.deleteMany({
    where: {
      action: { in: ["series.create", "series.update", "series.delete"] },
      meta: { path: ["name"], string_starts_with: "E2E 管理系列" },
    },
  });
  await prisma.previewToken.deleteMany({
    where: { log: { slug: { startsWith: "e2e-" } } },
  });
  await prisma.log.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.series.deleteMany({ where: { name: { startsWith: "E2E " } } });
  await prisma.$disconnect();
}
