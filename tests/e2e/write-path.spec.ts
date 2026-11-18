import { test, expect } from "@playwright/test";
import { cleanupE2E, seedLog } from "./fixtures";

test.describe.configure({ mode: "serial" });
test.afterAll(async () => {
  await cleanupE2E();
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="username"]').fill("admin");
  await page.locator('input[name="password"]').fill("e2e-pass-2026");
  await page.getByRole("button", { name: "本地登录" }).click();
  await expect(page).toHaveURL(/\/admin/);
}

test("发布回执 → 二次发布产生修订 → 保存退回草稿 404", async ({ page }) => {
  const title = "E2E 写路径 v1";
  const draft = await seedLog({
    title,
    before: "第一版正文，用于发布回执与修订验证。",
    after: "第一版 AFTER。",
    published: false,
  });
  const slug = draft.slug;
  const id = draft.id;

  await login(page);
  await page.goto(`/admin/logs/${id}/edit`);
  await page.getByRole("button", { name: "保存并发布" }).click();
  const receipt = page.getByRole("status").filter({ hasText: "PUBLISH RECEIPT" });
  await expect(receipt).toContainText("PUBLISH RECEIPT");
  await expect(receipt).toContainText("扫描 · 0 处命中");
  await expect(receipt).toContainText("摘要 ·");
  await expect(receipt).toContainText("发布时间 ·");

  await page.locator('input[name="title"]').fill("E2E 写路径 v2");
  await page.locator('textarea[name="beforeContent"]').fill("第二版正文，制造与第一版的行级差异。");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(page.getByText("已保存，当前为草稿", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "保存并发布" }).click();
  await expect(page.getByRole("status").filter({ hasText: "PUBLISH RECEIPT" })).toContainText("PUBLISH RECEIPT");

  await page.goto(`/admin/logs/${id}/history`);
  await expect(page.getByText("修订历史 · 共 1 版")).toBeVisible();
  await expect(page.getByText(/E2E 写路径 v1/)).toBeVisible();

  await page.goto(`/admin/logs/${id}/edit`);
  await page.locator('input[name="title"]').fill("E2E 写路径草稿");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(page.getByText("已保存，当前为草稿", { exact: true })).toBeVisible();

  const response = await page.goto(`/u/zhanglei/logs/${slug}`);
  expect(response?.status()).toBe(404);
});
