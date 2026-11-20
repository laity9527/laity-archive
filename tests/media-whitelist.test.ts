/**
 * 文件：tests/media-whitelist.test.ts
 * 描述：媒体上传白名单回归：扩展名白名单、可执行黑名单、内容签名嗅探与一致性校验、审计条目形态
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 7）。类型判定以内容签名为准，不信任扩展名与 MIME
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MEDIA_MAX_BYTES,
  mediaAuditEntry,
  mediaContentMatchesExtension,
  mediaFileCategory,
  isAllowedMediaFile,
  sniffMedia,
} from "../src/lib/media-whitelist.ts";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PDF = Buffer.from("%PDF-1.4\n%\\xff\n1 0 obj\n", "latin1");
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
const OLE2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const TEXT = Buffer.from("这是一段纯文本内容，用于 txt/md 嗅探。\n", "utf8");

test("图片扩展名在白名单内", () => {
  for (const name of ["a.jpg", "b.jpeg", "c.png", "d.gif", "e.webp"]) {
    assert.equal(isAllowedMediaFile(name), true, name);
  }
});

test("文档扩展名在白名单内", () => {
  for (const name of ["a.pdf", "b.doc", "c.docx", "d.xls", "e.xlsx", "f.ppt", "g.pptx", "h.txt", "i.md"]) {
    assert.equal(isAllowedMediaFile(name), true, name);
  }
});

test("可执行与脚本扩展名一律拒绝", () => {
  for (const name of ["a.exe", "b.dll", "c.sh", "d.bat", "e.cmd", "f.py", "g.js", "h.jar", "i.msi", "j.so"]) {
    assert.equal(isAllowedMediaFile(name), false, name);
  }
});

test("未知扩展名与无扩展名拒绝", () => {
  assert.equal(isAllowedMediaFile("a.bin"), false);
  assert.equal(isAllowedMediaFile("noext"), false);
});

test("扩展名大小写不敏感", () => {
  assert.equal(isAllowedMediaFile("a.PNG"), true);
  assert.equal(isAllowedMediaFile("a.PDF"), true);
});

test("媒体类别映射：图片与文档", () => {
  assert.equal(mediaFileCategory("a.png"), "image");
  assert.equal(mediaFileCategory("a.pdf"), "document");
  assert.equal(mediaFileCategory("a.exe"), null);
});

test("内容签名嗅探：图片/PDF/zip/OLE2/文本各自识别", () => {
  assert.equal(sniffMedia(PNG), "image");
  assert.equal(sniffMedia(JPEG), "image");
  assert.equal(sniffMedia(PDF), "document");
  assert.equal(sniffMedia(ZIP), "document");
  assert.equal(sniffMedia(OLE2), "document");
  assert.equal(sniffMedia(TEXT), "document");
});

test("内容与扩展名类别一致才放行：跨类别伪造被拒", () => {
  assert.equal(mediaContentMatchesExtension("a.png", PNG), true);
  // 类别一致即放行（图片大类内不逐格式挑剔）
  assert.equal(mediaContentMatchesExtension("a.png", JPEG), true);
  // 跨类别：文档内容冒充图片、图片内容冒充文档，一律拒
  assert.equal(mediaContentMatchesExtension("a.png", PDF), false);
  assert.equal(mediaContentMatchesExtension("a.pdf", PNG), false);
  // 可执行扩展名不在白名单，任何内容都不放行
  assert.equal(mediaContentMatchesExtension("a.exe", PNG), false);
});

test("空文件与二进制杂项不被识别为文档", () => {
  assert.equal(sniffMedia(Buffer.alloc(0)), null);
  const random = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x00]);
  assert.equal(sniffMedia(random), null);
});

test("大小上限口径为 20MB", () => {
  assert.equal(MEDIA_MAX_BYTES, 20 * 1024 * 1024);
});

test("审计条目：上传/绑定/解绑/标记/删除的动作与目标形态", () => {
  const upload = mediaAuditEntry("admin_1", "media.upload", { id: "media_1" }, { size: 1024 });
  assert.deepEqual(upload, {
    actorId: "admin_1",
    action: "media.upload",
    targetType: "Media",
    targetId: "media_1",
    meta: { size: 1024 },
  });

  const bind = mediaAuditEntry("admin_1", "media.bind", { id: "media_1" }, { traceId: "trace_1" });
  assert.equal(bind.action, "media.bind");
  assert.equal(bind.targetType, "Media");
});
