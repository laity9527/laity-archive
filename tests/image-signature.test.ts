/**
 * 文件：tests/image-signature.test.ts
 * 描述：图片内容签名判定的回归测试：四种允许格式的头部、伪造与截断一律拒绝
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建（I032 的验收依据）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { sniffImage } from "../src/lib/image-signature.ts";

const pad = (bytes: number[], n = 24) => Buffer.from([...bytes, ...new Array(n).fill(0)]);

test("PNG 八字节签名", () => {
  assert.deepEqual(
    sniffImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    { ext: "png", mime: "image/png" },
  );
});

test("JPEG 以 FF D8 FF 起始", () => {
  assert.deepEqual(sniffImage(pad([0xff, 0xd8, 0xff, 0xe0])), {
    ext: "jpg",
    mime: "image/jpeg",
  });
});

test("GIF 两个版本都认", () => {
  assert.equal(sniffImage(pad([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]))?.ext, "gif");
  assert.equal(sniffImage(pad([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))?.ext, "gif");
});

test("WEBP 要同时满足 RIFF 与第 9-12 字节", () => {
  assert.deepEqual(
    sniffImage(
      pad([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
    ),
    { ext: "webp", mime: "image/webp" },
  );

  // RIFF 头对、第二标记不对（如 AVIF）
  assert.equal(
    sniffImage(
      pad([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x46]),
    ),
    null,
  );
});

test("可执行文件伪装成图片一律拒绝", () => {
  assert.equal(sniffImage(pad([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00])), null);
  assert.equal(sniffImage(pad([0x7f, 0x45, 0x4c, 0x46])), null);
});

test("签名被截断到不足最短长度时拒绝，且不越界读取", () => {
  assert.equal(sniffImage(Buffer.from([0x89, 0x50, 0x4e])), null);
  assert.equal(sniffImage(Buffer.alloc(0)), null);
});

test("PNG 签名只差一个字节也必须拒", () => {
  assert.equal(
    sniffImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b])),
    null,
  );
});
