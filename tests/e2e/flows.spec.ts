import { test, expect } from "@playwright/test";
import {
  cleanupE2E,
  createPreviewToken,
  loadBaseIds,
  prisma,
  seedAudit,
  seedLog,
} from "./fixtures";

test.describe.configure({ mode: "serial" });
test.afterAll(async () => {
  await cleanupE2E();
});

test("开发登录进入后台，侧栏含审计", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="username"]').fill("admin");
  await page.locator('input[name="password"]').fill("e2e-pass-2026");
  await page.getByRole("button", { name: "本地登录" }).click();

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.locator('nav[aria-label="后台导航"]')).toContainText("审计");
});

test("已发布详情页只显示一个证据面板，含发布时间与摘要前缀", async ({ page }) => {
  const log = await seedLog({
    title: "E2E 证据面板",
    before: "证据面板正文",
    published: true,
  });

  await page.goto(`/u/zhanglei/logs/${log.slug}`);
  const panel = page.locator("#evidence:visible");
  await expect(panel).toHaveCount(1);
  await expect(panel).toContainText("发布时间");
  const evidenceText = (await panel.innerText()).replace(/\s/g, "");
  expect(evidenceText).toContain(log.hash.slice(0, 8));
  await expect(panel).toContainText("内容摘要");
});

test("下架后详情页返回 404", async ({ page }) => {
  const log = await seedLog({
    title: "E2E 下架 404",
    before: "下架正文",
    published: true,
  });

  await prisma.log.update({
    where: { id: log.id },
    data: { isPublished: false },
  });

  const response = await page.goto(`/u/zhanglei/logs/${log.slug}`);
  expect(response?.status()).toBe(404);
});

test("预览令牌匿名可读且 noindex，删除后 404", async ({ page }) => {
  const log = await seedLog({
    title: "E2E 预览",
    before: "预览正文",
    published: false,
  });
  const base = await loadBaseIds();
  const token = await createPreviewToken(log.id, base.userId);

  const preview = await page.goto(`/preview/${token}`);
  expect(preview?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );

  await prisma.previewToken.deleteMany({ where: { logId: log.id } });
  const gone = await page.goto(`/preview/${token}`);
  expect(gone?.status()).toBe(404);
});

test("系列页按决策时间升序，两篇顺序正确", async ({ page }) => {
  const series = `E2E 系列 ${Date.now()}`;
  const first = await seedLog({
    title: "E2E 系列第一篇",
    before: "第一篇",
    series,
    published: true,
    beforeDate: new Date("2026-11-01T00:00:00.000Z"),
  });
  const second = await seedLog({
    title: "E2E 系列第二篇",
    before: "第二篇",
    series,
    published: true,
    beforeDate: new Date("2026-11-02T00:00:00.000Z"),
  });

  await page.goto(`/u/zhanglei/series/${encodeURIComponent(series)}`);
  await expect(page.locator("h1")).toHaveText(series);
  const titles = await page.locator("ol > li > a").allTextContents();
  expect(titles).toEqual([first.title, second.title]);
});

test("反链：目标详情页出现被引用与来源标题", async ({ page }) => {
  const target = await seedLog({
    title: "E2E 反链目标",
    before: "目标正文",
    published: true,
  });
  const source = await seedLog({
    title: "E2E 反链来源",
    before: `引用 [[${target.slug}]]`,
    published: true,
  });

  await page.goto(`/u/zhanglei/logs/${target.slug}`);
  await expect(page.getByText("被引用", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: source.title, exact: true })).toBeVisible();
});

test("新建日志最小路径：保存草稿后进入编辑页", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="username"]').fill("admin");
  await page.locator('input[name="password"]').fill("e2e-pass-2026");
  await page.getByRole("button", { name: "本地登录" }).click();
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/logs/new");
  await page.locator('input[name="title"]').fill("E2E 新建最小路径");
  await page.locator('input[name="slug"]').fill(`e2e-new-${Date.now()}`);
  await page.locator('input[name="tags"]').fill("E2E");
  await page.locator('textarea[name="beforeContent"]').fill("新建最小路径正文。");
  await page.getByRole("button", { name: "保存草稿" }).click();

  await expect(page).toHaveURL(/\/admin\/logs\/[^/]+\/edit\?saved=1/);
  await expect(page.getByText("已保存，当前为草稿", { exact: true })).toBeVisible();
});

test("新建日志：先填 BEFORE、切 AFTER 再填，保存成功", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="username"]').fill("admin");
  await page.locator('input[name="password"]').fill("e2e-pass-2026");
  await page.getByRole("button", { name: "本地登录" }).click();
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/logs/new");
  await page.locator('input[name="title"]').fill("E2E 切页签保存");
  await page.locator('input[name="slug"]').fill(`e2e-tab-${Date.now()}`);
  await page.locator('textarea[name="beforeContent"]').fill("切页签前的 BEFORE 正文。");
  await page.getByRole("button", { name: "AFTER" }).click();
  await page.locator('textarea[name="afterContent"]').fill("切页签后填的 AFTER 正文。");
  await page.getByRole("button", { name: "保存草稿" }).click();

  await expect(page).toHaveURL(/\/admin\/logs\/[^/]+\/edit\?saved=1/);
  await expect(page.getByText("已保存，当前为草稿", { exact: true })).toBeVisible();
});

test("审计页显示有数据行与动作标签", async ({ page }) => {
  const targetId = `e2e-audit-${Date.now()}`;
  await seedAudit(targetId, "feedface");

  await page.goto("/login");
  await page.locator('input[name="username"]').fill("admin");
  await page.locator('input[name="password"]').fill("e2e-pass-2026");
  await page.getByRole("button", { name: "本地登录" }).click();
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/audit");
  const row = page.locator("tbody tr").filter({ hasText: "feedface" });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("发布日志");
});

test("后台系列 CRUD：新建后删除", async ({ page }) => {
  const name = `E2E 管理系列 ${Date.now()}`;

  await page.goto("/login");
  await page.locator('input[name="username"]').fill("admin");
  await page.locator('input[name="password"]').fill("e2e-pass-2026");
  await page.getByRole("button", { name: "本地登录" }).click();
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/series");
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="summary"]').fill("E2E 系列摘要");
  await page.getByRole("button", { name: "新建系列" }).click();
  await expect(page.getByText("已保存", { exact: false })).toBeVisible();

  const row = page.locator("li").filter({ hasText: name });
  await expect(row).toHaveCount(1);
  await row.getByRole("checkbox").check();
  await row.getByRole("button", { name: "删除" }).click();
  await expect(page.getByText("已删除。", { exact: true })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
});
