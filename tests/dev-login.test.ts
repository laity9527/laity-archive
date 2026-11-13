/**
 * 文件：tests/dev-login.test.ts
 * 描述：本地调试登录的边界测试：生产环境一律关闭、缺配置不启用、正确/错误凭据
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建。锁住“生产不注册调试 provider”与“密码来自环境变量”两条安全边界
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { isDevLoginEnabled, verifyDevCredentials } from "../src/lib/dev-login.ts";

const devEnv = {
  NODE_ENV: "development",
  DEV_LOGIN_PASSWORD: "123456",
} as NodeJS.ProcessEnv;

test("生产环境即使配置了密码也不启用", () => {
  assert.equal(
    isDevLoginEnabled({ NODE_ENV: "production", DEV_LOGIN_PASSWORD: "123456" }),
    false,
  );
  assert.equal(
    verifyDevCredentials("admin", "123456", {
      NODE_ENV: "production",
      DEV_LOGIN_PASSWORD: "123456",
    }),
    false,
  );
});

test("未配置 DEV_LOGIN_PASSWORD 时不启用", () => {
  assert.equal(isDevLoginEnabled({ NODE_ENV: "development" }), false);
  assert.equal(verifyDevCredentials("admin", "", { NODE_ENV: "development" }), false);
});

test("开发环境默认用户名为 admin，密码来自环境变量", () => {
  assert.equal(isDevLoginEnabled(devEnv), true);
  assert.equal(verifyDevCredentials("admin", "123456", devEnv), true);
  assert.equal(verifyDevCredentials("admin", "wrong", devEnv), false);
  assert.equal(verifyDevCredentials("other", "123456", devEnv), false);
});

test("可用 DEV_LOGIN_USER 覆盖用户名", () => {
  const env = { ...devEnv, DEV_LOGIN_USER: "local" } as NodeJS.ProcessEnv;

  assert.equal(verifyDevCredentials("local", "123456", env), true);
  assert.equal(verifyDevCredentials("admin", "123456", env), false);
});
