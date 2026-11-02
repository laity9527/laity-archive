# Phase 5b 自测表：OSS 图片上传

作者：张磊
日期：2026-11-02
对应：DESIGN.md Phase 5b 验收标准 + `docs/02-测试记录/Phase-5b-待验证清单.md` 第二节/第三节
说明：本轮按清单第二节跑到"静态验证＋构建验证"——第 0 步红基线、装依赖、lint、tsc、跨平台 `npm ci`、
`npm run build`、Phase 6a 镜像实构建，全部为真实执行输出。真上传联调（验收第 1–4 条）需要登录态，
AI 侧没有我的 GitHub 会话（I010/I017），由我本人在浏览器点一次上传后回填。
`npm run build` 首跑因新增依赖的懒加载解析失败，经批准改 `next.config.ts` 后翻绿（第三节）。

---

## 一、验收标准逐条核验

| # | 验收标准 | 执行命令/操作 | 预期结果 | 实际输出（粘贴） | 判定 |
|---|---|---|---|---|---|
| 1 | 编辑器上传 png 返回 OSS 外链，正文引用可显示 | 待我本人登录 `/admin/logs/new` 走一次插入图片 | 预览区出现 `<img>`，保存发布后前台详情页可见 | 本轮未执行（无登录态）。替代验证已做：直链口径 `https://${bucket}.${region}.aliyuncs.com/${key}` 与 DESIGN 记的 `laity-archive`/`oss-cn-beijing` 对得上；渲染侧 `.log-body img{max-width:100%;height:auto}`（`src/app/globals.css:103`）已在 | **未验证** |
| 2 | 服务器本地目录无新增图片文件 | `grep -nE "writeFile\|createWriteStream\|mkdir\|appendFile\|fs\." src/lib/oss.ts src/app/admin/upload-action.ts` | 零命中（不存在本地落盘路径） | `零命中：无本地写盘调用`；真上传后再看 `git status` 与 `tmp/`、`uploads/` | 代码层 PASS / 运行时 **未验证** |
| 3 | 上传 .exe 被拒（IMG_001） | 后台选一个 .exe | 页面显示"图片不合格：仅支持 jpg / png / webp / gif，且不超过 5MB。" | 未跑。静态依据两道：`<input accept="image/png,image/jpeg,image/webp,image/gif">`（`src/components/Editor.tsx:149`，仅过滤选择框）＋服务端 `EXT_BY_MIME[file.type]` 未命中即 `return { ok:false, code:"IMG_001" }`（`src/lib/oss.ts:52-56`），.exe 的 `file.type` 通常为空串，必然走这条 | **未验证** |
| 4 | 上传 6MB 图片被拒（IMG_001） | 造一个 >5MB 的 png 选进去 | 同上提示 | 未跑。静态依据：`src/lib/oss.ts:13` `MAX_BYTES = 5*1024*1024`，`src/lib/oss.ts:60-62` 零字节或超限即 IMG_001 | **未验证** |
| 5 | 未登录调用返回 AUTH_001 | — | 返回 `{ok:false, code:"AUTH_001"}` | 与 I013 同因：Proxy matcher 覆盖 `/admin/:path*`，未登录请求先到不了 action，HTTP 层不可达；不为凑 PASS 伪造会话（I017 已被策略拦过一次）。保留 `src/app/admin/upload-action.ts:22-26` 作为第二道防线 | **未验证** |
| 6 | `npm run lint` 通过 | `npm run lint` | 零 error 零 warning | 装依赖前首轮：`✖ 1 problem (0 errors, 1 warning)`（`upload-action.ts:13` 引入了未使用的 `UploadImageResult`）；删掉该导入后复跑：`> eslint` 无输出，退出 0 | PASS |
| 7 | `npx tsc --noEmit` 通过 | `npx tsc --noEmit` | 退出 0 | 装依赖前：`src/lib/oss.ts(10,17): error TS2307: Cannot find module 'ali-oss' or its corresponding type declarations.`（退出 2，与清单第 0 步预期一致）；装完 `ali-oss@6.23.0` + `@types/ali-oss@6.23.4` 后复跑无输出，退出 0 | PASS |
| 8 | `npm run build` 通过 | `npm run build` | 构建成功 | 首跑 **FAIL**（`Module not found: Can't resolve 'proxy-agent'`，见第三节）；经批准在 `next.config.ts` 加 `serverExternalPackages: ["ali-oss"]` 后复跑：`✓ Compiled successfully in 3.4s`、`Finished TypeScript in 7.5s`、`✓ Generating static pages using 15 workers (13/13) in 1696ms`，路由表 13 条含 `ƒ Proxy (Middleware)`，退出 0 | PASS（经一次批准后的配置修复） |
| 9 | 跨平台 lockfile 复核（I018 的直接教训，清单第二节第 4 步） | 容器内 `npm ci --dry-run`（`node:24-slim`，仓库只读挂载）＋本机 `npm ci --dry-run`＋Phase 6a Dockerfile 实构建 | 两侧均退出 0 | 第一次容器内跑红：`Missing: @emnapi/runtime@1.11.3 from lock file / Missing: @emnapi/core@1.11.3 from lock file`——**I018 复发**。在容器内 `npm install --package-lock-only` 重算后：容器内退出 0（计划为 `added 12 packages, removed 7 packages` 的平台二进制差异，属正常）、本机退出 0（`added 1 package, and removed 1 package`）；再往后 Phase 6a 镜像的 deps 阶段真跑 `npm ci` 也通过（构建退出 0），算是把这条修复端到端验穿了 | PASS（经一次修复） |
| 10 | `output: "standalone"` 产物完整（A 方案的附带风险） | `docker build --target runner`＋在镜像内 `ls node_modules`、`node -e "require('ali-oss')"` | 外部包仍进产物且运行时可 require | 本地产物：`.next/standalone/node_modules/ali-oss`（599K）与 `.../urllib` 均在，standalone 共 91 个顶层包、156M。镜像内：`ls node_modules` 列出 `ali-oss`、`urllib`（`proxy-agent` 不在，符合预期），`require('ali-oss')` 返回 version=6.23.0、ctor=function，用假凭据实例化 client 成功、`put` 为 function，`require_exit=0`。构建镜像 555MB | PASS |


## 二、新增依赖与 lockfile 变化（按 DESIGN 5b 要求逐项上报）

批准的依赖走 A 方案 `ali-oss@6.23.0`（DESIGN 2026-10-30 已批准）；`@types/ali-oss` 本轮经我批准安装。

执行与 npm 自己的口径：

```
$ npm install ali-oss@6.23.0 --no-audit --no-fund
added 68 packages, and removed 2 packages in 8s

$ npm install -D @types/ali-oss --no-audit --no-fund
added 1 package in 1s
```

`package.json` 净增两行：`dependencies.ali-oss: "^6.23.0"`、`devDependencies.@types/ali-oss: "^6.23.4"`。

`package-lock.json` 逐条对拍（脚本比对 `packages` 键，非估算）：

| 阶段 | 条目数 | 新增 | 删除 | 版本变化 |
|---|---|---|---|---|
| HEAD（b26b7ef）→ Windows 装包后 | 578 → 642 | +68 | −4 | 0 |
| Windows 装包后 → linux 容器重算 | 642 → 646 | +4 | −0 | 0 |

**被删的 4 条**（就是这轮把 linux 打回红的原因，必须一起报）：

```
- node_modules/@emnapi/core                                       1.11.3
- node_modules/@emnapi/runtime                                    1.11.3
- node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/@emnapi/core    1.11.1
- node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/@emnapi/runtime 1.11.1
```

容器重算把这 4 条原样加回来了，且**没有**删掉任何 Windows 侧条目、没有任何版本号变化，
`lockfileVersion` 仍为 3，全部 639 个 `resolved` 仍指向 `https://registry.npmmirror.com`（未引入新源）。
教训与 I018 同一条并再加一级：**Windows 本机 `npm install` 会主动剪掉 linux 才用到的可选依赖边**，
所以每次装完包必须在 linux 容器里重算一次 lockfile，而不是只在容器里验 `npm ci`。

许可证核查（68 个新增条目逐个读 `node_modules/<包>/package.json` 的 `license` 字段）：

| license | 个数 |
|---|---|
| MIT | 60 |
| ISC | 4 |
| BSD-3-Clause | 2 |
| BlueOak-1.0.0 | 1（`sax@1.6.1`） |
| package.json 无 license 字段 | 1（`pause-stream@0.0.11`） |

无 GPL / AGPL 传染性许可，符合红线。`pause-stream@0.0.11` 的包内 `package.json` 确实没写 license 字段，
我没有去核对仓库 LICENSE 文本，这一条按"未核实"记，如需硬合规要单独确认。
另注意新增条目里出现 `lodash@4.18.1`（npmmirror 解析所得），本轮未与官方 registry 逐条对拍版本存在性。

DESIGN 5b 的批准记录写"直接依赖含 lodash、urllib@2、xml2js、ws、socks 等"，实际锁文件新增的 68 条里
**没有 `ws`、也没有 `socks`/`socks-proxy-agent`**。逐个探过目录：

```
ABSENT  ws
ABSENT  socks
ABSENT  socks-proxy-agent
PRESENT lodash@4.18.1
PRESENT urllib@2.44.1
PRESENT xml2js@0.6.2
ABSENT  proxy-agent        ← 第三节的 build 报错就缺这个
```

包数对得上（68），成员对不上：那两个是 ali-oss 的可选/动态路径依赖，这次没被 npm 解析进锁。
不影响本 Phase，但记一笔，避免以后照 DESIGN 那句话去找这两个包。

## 三、build 阻塞项：`ali-oss` 的懒加载依赖解析不到

真实报错（`npm run build`，Next.js 16.4.3 Turbopack，退出码 1）：

```
./node_modules/urllib/lib/detect_proxy_agent.js:24:44
Error: Module not found: Can't resolve 'proxy-agent'
> 24 |   proxyAgent = proxyAgents[proxy] = new (require('proxy-agent'))(proxy);

Import trace:
  Server Component:
    ./node_modules/urllib/lib/detect_proxy_agent.js
    ./node_modules/urllib/lib/urllib.js
    ./node_modules/urllib/lib/index.js
    ./node_modules/ali-oss/lib/client.js
    ./src/lib/oss.ts
    ./src/app/admin/upload-action.ts
```

根因：`urllib@2` 用 `require('proxy-agent')` 做懒加载（只有设了代理环境变量时才会真用到），
`proxy-agent` 是它的可选依赖、本就不在 68 个新增包里。Next 会把 Server Component 用到的依赖打进 bundle，
Turbopack 静态解析这句 require 时找不到模块即判失败——不是代码写错，是打包策略与懒加载写法的冲突。

候选处置（都要改 build 配置或加依赖，均在 AGENTS.md 红线内，等批准）：

| 方案 | 做法 | 代价 |
|---|---|---|
| A（推荐） | `next.config.ts` 加 `serverExternalPackages: ["ali-oss"]` | 改一处 build 配置。语义已按本地文档确认（`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`：把指定依赖排除出 Server Components 打包，改用原生 Node `require`）。不新增依赖。风险：ali-oss 变外部包后 `output: "standalone"` 的产物是否完整带上它的运行时文件，需用 Phase 6a 的 Dockerfile 实构建验一次 |
| B | 安装 `proxy-agent` 让路径能解析 | 再引入一批未评审的传递依赖（pac-proxy-agent、degenerator、http-proxy-agent 等），业务上用不到，纯为喂打包器 |
| C | 停在现状 | lint/tsc 已绿、build 红，Phase 5b 不验收 |

本轮按"未获批准就不动 build 配置"执行，先把这一条挂进 ISSUES（I022）等决策。

**2026-11-02 处置结果（我批准走 A）**：`next.config.ts` 加一行

```ts
// I022：ali-oss 的依赖 urllib 里有懒加载 require('proxy-agent')，打进 Server bundle 会静态解析失败，
// 故排除出打包，运行时用原生 require
serverExternalPackages: ["ali-oss"],
```

复跑结果：`npm run lint` 退出 0、`npx tsc --noEmit` 退出 0、`npm run build` 退出 0
（`✓ Compiled successfully in 3.4s` / `Finished TypeScript in 7.5s` / `13/13` 静态页）。
再按 A 方案附带的风险点做穿两层：
① 本地产物 `.next/standalone/node_modules/ali-oss`（599K）与 `urllib` 都在，91 个顶层包；
② `docker build --target runner` 出图成功（555MB），镜像内 `require('ali-oss')` 拿到 version=6.23.0、
用假凭据实例化 client 成功且 `put` 是 function，`proxy-agent` 缺席也不报错——证明"排除出打包、运行时原生 require"这条语义真成立。
镜像留了 `laity-archive:5b-verify` 这个标签，不需要就 `docker rmi laity-archive:5b-verify`。

B 方案（补装 `proxy-agent`）未被采用，理由：它只为喂打包器，会把 pac-proxy-agent、degenerator、
http-proxy-agent 等一批业务上用不到的传递依赖请进来，而这句 require 只在设了代理环境变量时才执行。


## 四、清单第四节遗留结论（本轮定的）

- **`next.config.ts` 的 `images.remotePatterns` 不加**（2026-11-02 我追认简化）：正文图片走普通 `<img>`，
  `rehype-sanitize` 默认 schema 允许 http/https 的 `img/src`，`.log-body img` 已限 `max-width:100%`，
  渲染管线不改。DESIGN 5b 清单里"next.config.ts（images.remotePatterns 增 OSS 域名）"这一项按实况作废，
  DESIGN.md 与 `.env.example` 同步改掉。
- `.env` 里除四个批准键外还有 `OSS_ENDPOINT`、`OSS_PUBLIC_BASE_URL` 两个键，而 `src/lib/oss.ts` 一个都不读
  （region/bucket 取自 `OSS_REGION`/`OSS_BUCKET`，直链域名按 `https://${bucket}.${region}.aliyuncs.com` 硬拼）。
  **真上传若 404/AccessDenied，先查这里**：要么代码改用 `OSS_PUBLIC_BASE_URL`，要么删掉这两个误导性键。
- 对象键前缀硬编码 `logs/`，与 RAM 策略 `acs:oss:*:*:laity-archive/logs/*` 配套；不设 `x-oss-object-acl`（策略只有 `oss:PutObject`）。
- `deploy/nginx.conf` 的 `client_max_body_size 6m` 与 5MB 上限配套，改限制要两处一起改。
- **生产侧 OSS 变量曾整段缺失**（`.env.production.example` 没有 OSS 键、`docker-compose.prod.yml` 的 `app` 也不透传），
  已于 2026-11-02 分别补齐（I024）。补法用 `${VAR:?}`，缺键在 `docker compose config` 阶段就退出 1，
  而不是等点上传时才由 `src/lib/oss.ts` 抛"缺少环境变量 OSS_REGION"。
- `src/lib/oss.ts:47` 的 `isSupportedImage()` 全仓库零引用（上传类型判断实际由 `EXT_BY_MIME` 查表完成），
  属死代码。本轮不清理（范围外的小动作），留我决定是否删。

## 五、红线检查

| 检查项 | 方式 | 结果 |
|---|---|---|
| 越界文件 | `git diff --stat` 对照 DESIGN「5b 允许触碰的文件」 | 本轮改动：`package.json`、`package-lock.json`（批准依赖安装）、`src/app/admin/upload-action.ts`（5b 清单内文件，删未使用导入）、`next.config.ts`（I022 方案 A，2026-11-02 经我批准）、`docs/02-测试记录/`（两份自测文档）、`DESIGN.md`、`ISSUES.md`（回填与挂账） |
| 新增依赖 | `package.json` diff | 有：`ali-oss@^6.23.0`（DESIGN 已批准）、`@types/ali-oss@^6.23.4`（本轮批准）。变化明细见第二节；B 方案的 `proxy-agent` 未安装 |
| 配置/lockfile | 是否动 build 配置、CI | **动了 `next.config.ts` 一处**：`serverExternalPackages: ["ali-oss"]`，经我批准（AGENTS.md build 配置红线），已追加文件头修改记录；CI 与 Docker 编排未动。lockfile 因装包被动过，含一次 linux 容器内重算（第二节） |
| 密钥入库 | `git ls-files \| grep ^\.env` | 仅 `.env.example`、`.env.production.example` 被跟踪，`.env` 未被跟踪；本轮 diff 无任何密钥值。镜像内的 require 测试用的是字面量 `FAKE`，没读 `.env` |
| 未提交状态 | `git status --short` | 全部改动仍留在工作区**未提交**：运行时验收（第 1–4 条）还没跑，等真上传回填后一起提交 |

## 六、视觉铁律与留痕核查

| 检查项 | 方式 | 结果 |
|---|---|---|
| 圆角 | `grep -rhoE "rounded-[a-z0-9]+" src/ \| grep -v "^rounded-none$"` | 零命中 |
| 阴影 | `grep -rhoE "shadow-[a-z0-9]+" src/ \| grep -v "^shadow-none$"` | 零命中 |
| 渐变 | `grep -rn "gradient" src/` | 零命中 |
| 图标库 / next/image | `grep -rnE "from \"(lucide-react\|react-icons\|@tabler\|heroicons)\|next/image" src/` | 零命中（上传按钮是字符文案，未引入图标） |
| 裸 HTML 注入 | `grep -rn "dangerouslySetInnerHTML" src/` | 零命中 |
| 文件头注释 | 读 `src/lib/oss.ts`、`src/app/admin/upload-action.ts`、`src/components/Editor.tsx` 头部 | 三者齐全，本轮改的 `upload-action.ts` 追加了 2026-11-02 一行，未覆盖历史 |

## 七、结论

- 判定：**构建层 PASS，功能验收仍缺运行时**。可判 PASS 的：第 6、7、8、9、10 条（lint、tsc、build、跨平台 `npm ci`、standalone 产物与镜像内运行时解析）。
- 未验证项与证据：
  - 第 1–4 条（真上传得外链、本地无落盘、.exe 被拒、6MB 被拒）——AI 侧无 GitHub 会话，Proxy 挡住未登录请求，不伪造会话（I010/I013/I017），需我本人登录点一次；
  - 第 5 条（AUTH_001）——HTTP 层不可达，属结构性未验证，长期靠代码内第二道防线。
- 范围外发现：`isSupportedImage()` 死代码、`.env` 两个未被读取的键（I023），均记录未动手。
- 下一步（按序）：
  1. 我本人登录 `/admin/logs/new` 点一次真上传，回填第 1–4 条：直链在浏览器能否匿名打开（公共读）、`git status` 与 `tmp/`、`uploads/` 无新增图片、.exe 与 >5MB 的拒收提示文案；补 docs/03 带地址栏截图；
  2. 真上传若 404/AccessDenied，先查 I023（`.env` 里 `OSS_PUBLIC_BASE_URL` 与代码硬拼域名不一致）；
  3. 软著材料**已于 2026-11-02 同步**（我指定先于真上传执行）：说明书第十章删掉"仅支持外部链接"那条、新增 5.5 正文插图上传，`node tools/软著材料生成.mjs` 重出两份 HTML（源程序 3637 行/73 页，说明书 323 行/11 页，`oss.ts` 与 `upload-action.ts` 已收录）。
     注意这条是**排在验证前面**的：材料里没有任何一处宣称"已通过上传联调"，但功能描述已按已实现口径写死——若第 1 步真上传不通过，5.5 与第十章要改回，源程序文档需再重出；
  4. 上述都过了再一次性提交本轮改动（含 `next.config.ts`）；
  5. 凭据处置（清单第七节）优先级更高：轮换这把 AccessKey、改服务器口令并关密码登录。
