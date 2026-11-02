# Phase 5b 待验证清单：OSS 图片上传（交接用）

作者：张磊
日期：2026-10-30
状态：**代码已写完，一行未验证、一行未提交**
用途：本会话的 shell 被运行时安全策略冻结（原因见第六节），这份清单是给下一个会话/下一次动手时的接手单。

> 2026-11-02 更新（新会话）：shell 已恢复，第 0 步实测见第八节（已回填）。
> 第一节的六个文件**已作为 b26b7ef 提交入库**，但"故意不可编译"这一点没变——
> `ali-oss` 依赖仍未安装，`npx tsc --noEmit` 仍报 TS2307。第二节的装包及之后的验证步骤均未执行。
>
> 2026-11-02 续（本轮执行结果，明细见同目录 `Phase-5b-自测表.md`）：第二节已跑到"静态验证＋构建验证"——
> `ali-oss@6.23.0` 与 `@types/ali-oss@6.23.4` 均经我批准并已装上（lockfile 变化含 4 条被删条目，已上报）；
> `npm run lint`、`npx tsc --noEmit` 退出 0；跨平台 `npm ci --dry-run` 首跑红（I018 复发），
> 容器内重算 lockfile 后两侧绿；`npm run build` 首跑红（`urllib` 懒加载 `require('proxy-agent')`），
> 经批准走 I022 方案 A 在 `next.config.ts` 加 `serverExternalPackages: ["ali-oss"]` 后退出 0，
> 并用 Phase 6a 的 Dockerfile 实构建验穿 standalone 产物与镜像内运行时解析。
> **本清单第二节的第 1–4 步（lint / tsc / build / 跨平台 `npm ci`）已全部执行完**；
> 第 5 步真上传联调需我本人登录点一次（AI 侧无 GitHub 会话，不伪造），也就是第三节验收 1–5 条里的运行时部分；
> 第 6 步软著材料重跑排在第 5 步之后。
> 本轮改动全部**未提交**，等真上传回填后一起入库。



---

## 一、当前工作区状态（全部未提交）

| 文件 | 变化 | 内容 |
|---|---|---|
| `src/lib/oss.ts` | 新增 | OSS 上传封装：类型白名单、≤5MB、对象键服务端生成、返回公共读直链 |
| `src/app/admin/upload-action.ts` | 新增 | Server Action：会话校验 + 转发封装，返回对象（不是 redirect 错误码） |
| `src/components/Editor.tsx` | 修改 | 「插入图片」按钮 + 隐藏 file input，成功后在当前页签光标处插入 `![alt](url)`，三态提示 |
| `.env.example` | 修改 | 增加 `OSS_REGION / OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET` 四个键（只有键名） |
| `DESIGN.md` | 修改 | 5b 段记下已确认的 OSS 参数、最小权限策略、密钥不入对话的约定 |
| `tools/软著材料生成.mjs` | 修改 | 收录清单 ORDER 补上 `src/lib/oss.ts` 与 `src/app/admin/upload-action.ts` |

**仓库此刻故意不可编译**：`src/lib/oss.ts` 里 `import OSS from "ali-oss"`，而依赖尚未安装。所以这些改动**不要提交**，等依赖装好、验证过了再一起提交。

## 二、动手顺序（前两步需要你在终端执行，命令里不含任何密钥）

**第 0 步（张磊指定，新会话第一件事）：先跑 `npm run lint` 与 `npx tsc --noEmit`，把红基线原样记下来，再装依赖。**
预期结果不是"通过"，而是两类报错：`找不到模块"ali-oss"或其相应的类型声明`（依赖未装）与 `@types/ali-oss` 缺失导致的类型声明报错。**先看到这两条才说明工作区状态与本清单一致**；若它们没出现，说明依赖已经装好了或代码被动过，要先查清再继续，别照本清单往下套。跑完把输出粘贴到本文件末尾的"第 0 步实测"小节。

```
npm install ali-oss@6.23.0 --no-audit --no-fund
npm install -D @types/ali-oss
```

第二条是**待批准的依赖**：`@types/ali-oss`（MIT，纯类型声明，无运行时依赖）。不装它 `npx tsc --noEmit` 会报找不到模块声明。批准状态：截至本文档写下时**尚未批准**。

之后按序验证：

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. **跨平台 lockfile 复核**（I018 的直接教训）：`docker run --rm -v <仓库路径>:/w:ro -w /w node:24-slim sh -c "npm ci --dry-run"`。Windows 本地 `npm ci` 通过不代表 linux 通过——上次就是栽在 wasm32 可选依赖的边上。
5. 真上传联调（凭据从本地 `.env` 读，值不经过对话）
6. `node tools/软著材料生成.mjs` 重跑软著材料（源码变了，材料必须跟着重出）

## 三、验收标准逐条（DESIGN Phase 5b + SPEC F10/IMG_001）

| # | 标准 | 怎么验 | 状态 |
|---|---|---|---|
| 1 | 编辑器上传 png 得到 OSS 外链，正文引用能显示 | 后台新建日志 → 插入图片 → 预览区出现 `<img>` → 保存草稿 → 发布 → 前台详情页图片可见 | 未验证 |
| 2 | 服务器本地目录无新增图片文件 | 上传后 `git status` 与仓库目录树不变；`uploads/`、`tmp/` 均无新文件（两者本就在 .gitignore 里） | 未验证 |
| 3 | 上传 .exe 被拒（IMG_001） | 选一个 .exe，预期页面显示"图片不合格：仅支持 jpg / png / webp / gif，且不超过 5MB。" | 未验证 |
| 4 | 上传 6MB 图片被拒（IMG_001） | 造一个 >5MB 的 png，同上预期 | 未验证 |
| 5 | 未登录调用返回 AUTH_001 | 与 I013 同类问题：Proxy 会先把未登录请求 307 走，HTTP 层大概率够不到这个分支。**预期结论仍是"未验证"**，不要为了凑 PASS 去伪造会话（I017 已被策略拦过一次） | 未验证 |
| 6 | `npm run lint` / `npm run build` 通过 | 见第二节 1、3 步 | 未验证 |

## 四、联调时要顺手确认的细节

- **直链格式**：代码拼的是 `https://<bucket>.<region>.aliyuncs.com/<key>`，代入即 `https://laity-archive.oss-cn-beijing.aliyuncs.com/logs/2026-11/…`。第一次上传后请在浏览器直接打开这个 URL，确认公共读生效（403 说明 Bucket ACL 或对象继承不对）。
- **对象键**：形如 `logs/2026-11/20261102T091530Z-a1b2c3d4e5f6.png`，全部字符由服务端生成，已过 `/^[a-z0-9./-]+$/` 断言；文件名不来自用户上传，这是有意的（防目录穿越与怪字符）。
- **前缀必须落在 `logs/`**：RAM 策略的 Resource 是 `acs:oss:*:*:laity-archive/logs/*`，写到别的前缀会被拒（AccessDenied），代码里前缀是硬编码的，改它要同步改策略。
- **不设对象级 ACL**：`client.put()` 故意没带 `x-oss-object-acl`，因为策略只给了 `oss:PutObject`，多带这个头有可能被判越权。若实测发现对象不是公共读，再回来讨论加权限而不是先改代码。
- **nginx 上限**：`deploy/nginx.conf` 的 `client_max_body_size 6m` 与 5MB 限制是配套的（留 1MB 余量），线上改限制要两处一起改。
- **Markdown 渲染**：默认 `rehype-sanitize` schema 允许 `img` 与 http/https 的 src，`.log-body img` 已有 `max-width:100%`，所以渲染管线未改。若发现图片被清洗掉，先确认是 markdown 语法问题还是 schema 问题，别急着放宽 schema。
- **未使用 next/image**：正文图片是普通 `<img>`，因此 `next.config.ts` 的 `images.remotePatterns` **本轮没有加**——这与 DESIGN 5b 清单里"next.config.ts（images.remotePatterns 增 OSS 域名）"这一项不符，属我做的简化，需要你追认或要求改回 next/image。
  **2026-11-02 已追认**：张磊选"追认简化，不加 remotePatterns"，DESIGN.md 5b 文件清单项已按实况作废（见 DESIGN 该节修正块），`next.config.ts` 本轮未动。

## 五、代码写完后必须跟着改的文档

| 位置 | 要改什么 | 状态（2026-11-02） |
|---|---|---|
| `docs/04-软著材料/软件操作说明书.md` 第十章 | 现在写着"站内图片上传与对象存储直传……本版正文插图仅支持外部链接"。5b 落地后这句**变成假话**，要移到已实现功能章节，并在第五章补一段上传操作说明 | 已完成：第十章删掉该条并补两条真实限制（无图片库/删除界面、不做二次处理与自定义域名），第五章新增 5.5 正文插图上传，原 5.5/5.6 顺延为 5.6/5.7；另同步了 2.1、3.1、3.2、3.3、第七章、第九章错误码表 |
| `docs/04-软著材料/*.html` | 说明书一改，就要 `node tools/软著材料生成.mjs` 重出两份 HTML | 已完成：源程序 3637 行 / 73 页 / 提交 60 页，说明书 323 行 / 11 页，收录文件数 39 → 41；结构与行宽核验见 Phase-6-软著材料自测表第九节 |
| `DESIGN.md` Phase 5b | 验收标准逐条回填实际结果；`next.config.ts` 那一项按第四节的结论定稿 | 已完成：`images.remotePatterns` 项按追认作废，验收标准下补了实测回填（含 I022 走 A 之后 build 翻绿与镜像验证） |
| `docs/02-测试记录/` | 新增 Phase-5b 自测表，粘贴真实命令输出，未跑成的照 I013/I017 的先例标"未验证 + 原因 + 替代验证" | 已完成：`Phase-5b-自测表.md`，运行时四条标"未验证"并写明原因与替代验证 |
| `ISSUES.md` | 若 `@types/ali-oss` 未获批而改用本地 `declare module` 垫片，要新开一条记录这个取舍 | 不适用：`@types/ali-oss@6.23.4` 本轮获批直接安装，没走垫片。同轮实际新开的是 I022（build 解析失败，已 FIXED）、I023（`.env` 两个未被读取的键）、I024（生产编排未透传 OSS，已 FIXED） |

## 六、本会话为什么停在这里

- 运行时安全策略以"对话中出现明文凭据（OSS AccessKeySecret、服务器 root 口令）"为由，**冻结了本会话的 shell 调用**——连 `git status`、`npm install` 都被拦。按既定原则（官方工具拒绝就不绕），我没有尝试用别的命令绕过。
- 因此：依赖没装、代码没验证、改动没提交。这份清单本身是用手上的文件写入工具写的，不依赖 shell。
- 下一会话的上下文里不应再出现这些明文凭据，shell 预计恢复正常；若仍被拦，就先由你在终端执行第二节的命令，我只负责验证与提交。

## 七、凭据处置（与代码无关，但优先级最高）

1. 在 RAM 控制台**轮换或禁用**这把 AccessKey（它已在对话里出现过）。
2. 修改服务器 root 口令，并改为密钥登录：`PermitRootLogin prohibit-password` + `PasswordAuthentication no`，安全组只放行 22/80/443。
3. 今后只把值写进本地 `.env`（已被 `.gitignore:69` 忽略）与服务器 `.env.production`，**不要贴进对话**；我只需要变量名和 bucket/region 这类非敏感参数。

## 八、第 0 步实测（下一个会话粘贴到这里，不要凭记忆回填）

```
$ npm run lint
> laity-archive@0.1.0 lint
> eslint

D:\ZHANGLEI\laity-archive\src\app\admin\upload-action.ts
  13:28  warning  'UploadImageResult' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)

$ npx tsc --noEmit
src/lib/oss.ts(10,17): error TS2307: Cannot find module 'ali-oss' or its corresponding type declarations.
（退出码 2）
```

与预期一致：`ali-oss` 模块缺失这一条如期出现，说明工作区状态与本清单相符（依赖仍未装）。
类型声明缺失没有单独成第二条报错，TS2307 的文案已把"或其相应的类型声明"并进了同一条。
新增一条本清单没预料到的红点：`src/app/admin/upload-action.ts:13` 从 `@/lib/oss` 引入了
`UploadImageResult` 却没有使用（实际用的是本地定义的 `UploadActionResult`），lint 报未使用变量警告。

