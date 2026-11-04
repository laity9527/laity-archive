/**
 * 文件：tests/licenses.test.ts
 * 描述：开源许可清单的漂移与红线测试：每个直接依赖都必须在清单里，且许可不得落在禁用（传染性）集合内
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建。把 AGENTS.md 的"MIT/Apache/BSD 可用，GPL/AGPL 禁止"从口头约定变成可执行断言
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DEPENDENCY_LICENSES,
  FORBIDDEN_LICENSE_PREFIXES,
} from "../src/lib/licenses.ts";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const declared = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
];

test("package.json 里的每个直接依赖都登记在许可清单中", () => {
  const listed = DEPENDENCY_LICENSES.map((item) => item.name);
  const missing = declared.filter((name) => !listed.includes(name));

  assert.deepEqual(
    missing,
    [],
    `新增依赖未登记许可证：${missing.join(", ")}（/licenses 页会漏项）`,
  );
});

test("清单里没有已废弃的条目（依赖被删时要同步清掉）", () => {
  const listed = DEPENDENCY_LICENSES.map((item) => item.name);
  const stale = listed.filter((name) => !declared.includes(name));

  assert.deepEqual(stale, [], `清单里存在已不依赖的条目：${stale.join(", ")}`);
});

test("没有任何依赖使用传染性许可（AGENTS.md 红线）", () => {
  const violations = DEPENDENCY_LICENSES.filter((item) =>
    FORBIDDEN_LICENSE_PREFIXES.some((prefix) =>
      item.license.toUpperCase().includes(prefix),
    ),
  );

  assert.deepEqual(
    violations,
    [],
    `禁用许可：${violations.map((v) => `${v.name}=${v.license}`).join(", ")}`,
  );
});

test("每条清单都写明了用途，致谢页不该只有一串名字", () => {
  for (const item of DEPENDENCY_LICENSES) {
    assert.ok(item.purpose.length > 0, `${item.name} 缺少用途说明`);
    assert.ok(item.license.length > 0, `${item.name} 缺少许可证`);
  }
});
