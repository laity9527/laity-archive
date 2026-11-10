/**
 * 文件：tests/token-crypto.test.ts
 * 描述：token 加密的回归测试：往返一致、篡改必抛、密钥缺失/形态错必抛、IV 随机
 * 作者：张磊
 * 创建日期：2026-11-10
 * 修改记录：
 * - 2026-11-10: 初始创建（V2.0 Step 5 Commit 1）。测试密钥是注入的哑值，不是任何真实凭据；
 *               每条用例自己设/还原环境变量，避免进程内串扰
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptToken, encryptToken } from "../src/lib/token-crypto.ts";

// 64 位 hex 哑钥：只用于测试，与任何真实环境无关
const DUMMY_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function withKey<T>(key: string | undefined, fn: () => T): T {
  const saved = process.env.ENCRYPTION_KEY;

  if (key === undefined) {
    delete process.env.ENCRYPTION_KEY;
  } else {
    process.env.ENCRYPTION_KEY = key;
  }

  try {
    return fn();
  } finally {
    if (saved === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = saved;
    }
  }
}

test("加密后解密往返一致（含中文与长文本）", () => {
  withKey(DUMMY_KEY, () => {
    for (const plain of ["ghp_dummytoken123", "访问令牌形态的哑值", "x".repeat(4096)]) {
      assert.equal(decryptToken(encryptToken(plain)), plain);
    }
  });
});

test("同一明文两次加密产物不同（IV 随机），但都能解回", () => {
  withKey(DUMMY_KEY, () => {
    const a = encryptToken("same-plain");
    const b = encryptToken("same-plain");

    assert.notEqual(a, b);
    assert.equal(decryptToken(a), "same-plain");
    assert.equal(decryptToken(b), "same-plain");
  });
});

test("篡改密文任何一段，解密必抛（GCM 认证标签）", () => {
  withKey(DUMMY_KEY, () => {
    const cipher = encryptToken("tamper-target");
    const parts = cipher.split(".");

    assert.equal(parts.length, 3);

    for (let i = 0; i < 3; i++) {
      const mutated = [...parts];
      const bytes = Buffer.from(mutated[i], "base64");
      bytes[0] ^= 0xff;
      mutated[i] = bytes.toString("base64");

      assert.throws(() => decryptToken(mutated.join(".")), `第 ${i + 1} 段被篡改却没有抛错`);
    }
  });
});

test("密钥缺失时加密与解密都抛错", () => {
  const cipher = withKey(DUMMY_KEY, () => encryptToken("no-key"));

  withKey(undefined, () => {
    assert.throws(() => encryptToken("x"), /ENCRYPTION_KEY/);
    assert.throws(() => decryptToken(cipher), /ENCRYPTION_KEY/);
  });
});

test("密钥形态不对（短了/非 hex）一律抛错", () => {
  for (const bad of ["", "0123456789", "z".repeat(64)]) {
    withKey(bad, () => {
      assert.throws(() => encryptToken("x"), /ENCRYPTION_KEY/);
    });
  }
});

test("换一把密钥解不开旧密文", () => {
  const cipher = withKey(DUMMY_KEY, () => encryptToken("old-key"));
  const otherKey = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

  withKey(otherKey, () => {
    assert.throws(() => decryptToken(cipher));
  });
});

test("密文段数不对或 IV/tag 长度不对，解密抛形态错", () => {
  withKey(DUMMY_KEY, () => {
    assert.throws(() => decryptToken("only-one-part"), /形态/);
    assert.throws(() => decryptToken("a.b"), /形态/);

    const good = encryptToken("shape-check");
    const [iv, tag, data] = good.split(".");
    // 1 字节 IV 与 1 字节 tag 都不是合法形态
    assert.throws(
      () => decryptToken(`${Buffer.from("x").toString("base64")}.${tag}.${data}`),
      /形态/,
    );
    assert.throws(
      () => decryptToken(`${iv}.${Buffer.from("x").toString("base64")}.${data}`),
      /形态/,
    );
  });
});