/**
 * 文件：tests/object-key.test.ts
 * 描述：对象存储键的回归测试：生成器产出的键必须通过自己的安全断言，穿越与控制字符必须被拒
 * 作者：张磊
 * 创建日期：2026-11-04
 * 修改记录：
 * - 2026-11-04: 初始创建（I061：断言只允许小写，而 toISOString 的 T/Z 是大写，
 *               真实上传因此一次也没成功过；这条测试就是那条事故的固化）。
 *               写这条测试时又发现第二处：原断言的字符集里 . 与 / 都在白名单，
 *               `logs/../etc/passwd` 完全通过，所谓"防目录穿越"是纸面的——现在逐段判
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildObjectKey, isObjectKeySafe } from "../src/lib/object-key.ts";

test("服务端生成的键一定通过自身断言（大写 T/Z 是 ISO 时间戳固有的）", () => {
  const key = buildObjectKey(
    new Date("2026-11-04T11:16:59.123Z"),
    "png",
    "0077085b200f",
  );

  assert.equal(key, "logs/2026-11/20261104T111659Z-0077085b200f.png");
  assert.ok(isObjectKeySafe(key), `自身断言拒绝了自己生成的键：${key}`);
});

test("月份补零、毫秒丢弃、Z 结尾", () => {
  const key = buildObjectKey(new Date("2026-01-09T07:02:03.999Z"), "jpg", "ab12");

  assert.equal(key, "logs/2026-01/20260109T070203Z-ab12.jpg");
  assert.ok(isObjectKeySafe(key));
});

test("穿越、控制字符、空格、反斜杠与查询串都进不了断言", () => {
  for (const bad of [
    "logs/../etc/passwd",
    "logs/a/../../etc/passwd",
    "logs//a.png",
    "logs/./a.png",
    "../logs/a.png",
    "other/a.png",
    "logs/a\\b.png",
    "logs/a b.png",
    "logs/a?x=1.png",
    "logs/a#1.png",
    "logs/a\u0000.png",
    "",
    "logs/%2e%2e/x.png",
  ]) {
    assert.equal(isObjectKeySafe(bad), false, `不该放过：${JSON.stringify(bad)}`);
  }
});
