import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPreviewTokenValue,
  hashPreviewToken,
  isPreviewTokenExpired,
  PREVIEW_TOKEN_TTL_MS,
  previewTokenExpiry,
} from "../src/lib/preview-token.ts";

test("token 为 URL 安全的 32 字符，且两次生成不同", () => {
  const a = createPreviewTokenValue();
  const b = createPreviewTokenValue();

  assert.match(a, /^[A-Za-z0-9_-]{32}$/);
  assert.match(b, /^[A-Za-z0-9_-]{32}$/);
  assert.notEqual(a, b);
});

test("哈希稳定且不同 token 不同哈希", () => {
  assert.equal(hashPreviewToken("abc"), hashPreviewToken("abc"));
  assert.notEqual(hashPreviewToken("abc"), hashPreviewToken("abd"));
  assert.match(hashPreviewToken("abc"), /^[0-9a-f]{64}$/);
});

test("有效期固定 24 小时", () => {
  const now = new Date("2026-11-16T00:00:00.000Z");
  const expires = previewTokenExpiry(now);

  assert.equal(expires.getTime() - now.getTime(), PREVIEW_TOKEN_TTL_MS);
  assert.equal(expires.toISOString(), "2026-11-17T00:00:00.000Z");
});

test("过期判定：到期时刻即过期，未到期不过期", () => {
  const now = new Date("2026-11-16T00:00:00.000Z");

  assert.equal(isPreviewTokenExpired(now, now), true);
  assert.equal(
    isPreviewTokenExpired(new Date("2026-11-16T00:00:00.001Z"), now),
    false,
  );
});
