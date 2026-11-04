# Phase 7 合规收口自测表（单人站可做的部分）

日期：2026-11-03
输入：`C:\Users\28335\Downloads\Laity合规需求设计方案.md`（v1.0，多用户平台口径）
裁决与逐条对照：`docs/00-开发方法论/合规需求差距分析与分期方案.md`、DESIGN D19
范围：只吸收与"单人档案库"定位无关、且零新依赖的合规项。多用户平台整块留作 Phase 9 备选，本轮未动 schema。

---

## 一、本轮做了什么（六件）

| # | 事项 | 落点 |
|---|---|---|
| 1 | 发布前敏感信息扫描 + `LOG_003` 确认门 | `src/lib/sensitive-scan.ts`、`src/lib/publish.ts`、`src/app/admin/log-actions.ts`、编辑页 |
| 2 | 日志彻底删除（回填 slug 确认，`LOG_004`） | 同上 + `src/app/admin/page.tsx` 结果提示 |
| 3 | 对外文案中性化（不暗示法律效力；对内保留"证据链"叙事） | `site.ts`、`layout.tsx`、`Seal.tsx`、`logs/page.tsx`、`logs/[slug]/page.tsx` |
| 4 | `/licenses` 开源许可与致谢 + 商标声明 | `src/lib/licenses.ts`、`src/app/licenses/page.tsx` |
| 5 | 页脚三项合规位（公安备案号、对外邮箱、版权行）与容器注入修复 | `SiteFooter.tsx`、`site.ts`、`docker-compose.prod.yml`、两份 env 模板 |
| 6 | 个人信息与凭据泄露应急预案 | `docs/00-开发方法论/个人信息与凭据泄露应急预案.md` |

新依赖：0。schema 变更：0。迁移：0。

## 二、验收判据与实测输出

| # | 判据 | 实测 |
|---|---|---|
| 1 | 扫描器九类形态命中、摘要与版本号不误判、邮箱不拦发布 | `node --test tests/sensitive-scan.test.ts` → 14 条全绿。含三条专门的反例：64 位 contentHash、以手机号数字串开头的 40 位 SHA、`Next.js 16.4.3 发布于 2026-11-03，构建耗时 1234ms` 均零命中 |
| 2 | 阻截级命中时发布被服务端拒绝 | 类型与契约已接（`publishLog` 返回 `LOG_003`，动作透传 `sensitiveConfirmed`）；**端到端点击未验**——需要我本人在浏览器登录后台 |
| 3 | 删除需回填 slug，不符则不执行 | `deleteLog(id, confirmSlug)` 先比对后删除，不一致返回 `LOG_004`；**端到端未验**（同上） |
| 4 | 许可清单与 package.json 不漂移、无传染性许可 | `tests/licenses.test.ts` 4 条全绿：18 个直接依赖逐个对拍、无废弃条目、无 GPL/AGPL/LGPL 前缀、每条都有用途。许可值来自 `node_modules/<包>/package.json` 的 `license` 字段实测（MIT 14 / Apache-2.0 3 / ISC 1） |
| 5 | 对外页面不再出现"存证/防伪"字样 | `curl /` → 标题含"开发复盘档案"；`curl /logs` → 描述含"SHA-256 摘要"、"存证"计数 `0`；`curl /logs/prebuild-index` → "内容摘要" `2`、"存证印章" `0` |
| 6 | `/licenses` 可访问且进 sitemap | `curl -o /dev/null -w %{http_code} /licenses` → `200`；构建路由表 `○ /licenses`（静态预渲染）；`curl /sitemap.xml` 含 `/licenses` |
| 7 | 三项合规位未配置就不渲染 | 页脚 grep "侵权投诉" 计数 `0`（`SITE_CONTACT_EMAIL` 未填）；备案号两行同理不渲染 |
| 8 | 合规位变量真能进容器 | `docker compose --env-file tmp/prod-dummy.env -f docker-compose.prod.yml config --quiet` → 退出 0（模板里缺两个新键也不报错），渲染结果含 `SITE_ICP: ""`、`SITE_POLICE_ICP: ""`、`SITE_CONTACT_EMAIL: ""` |
| 9 | 四道门禁 | `npm test` 48/48、`npx tsc --noEmit` 0、`npm run lint` 0、`npm run build` 0 |
| 10 | 软著材料窗口不被切口打断 | 生成器 `assertWindowFit()` 通过：36 个"必须整份可见"文件全部整份在窗口内；独立脚本只读产物 HTML 复核 21 个关键文件，全部"分隔行与末行同窗口" |

## 三、过程中真正发现的问题

**`SITE_ICP` 从来没有被传进应用容器。** `docker-compose.prod.yml` 的 `app.environment` 只列了数据库、认证、OSS 三类变量，合规位一个都没有——而 compose 的 `--env-file` 只参与变量插值，不会自动把变量注入容器。后果是：我在 `.env.production` 里填好备案号，页脚那一行也永远不显示，而手册第一节的判据恰恰写着"打开首页页脚能看到备案号"。这条判据在补修之前是**不可能成立**的。

修法与口径：补三行显式传递，并用 `${VAR:-}` 而不是 `${VAR:?}`——未备案、还没有公开邮箱时留空是合法状态，硬卡会把整个 `up` 拦死。

第二个发现是来源方案本身的一处技术错误：它把"仅申请 `public_repo` 和 `read:user`"当作最小权限，而 `public_repo` 是**可写** scope，只读公开仓库元数据不需要任何 repo scope。本站未声明 scopes，走 NextAuth 默认 `read:user user:email`（已在浏览器授权 URL 实测），本身已比方案要求更小。照抄反而扩大权限。

## 四、明确不做（避免半成品与虚假承诺）

邮箱注册与密码找回（需 SMTP + 口令哈希库）、手机号验证码（需短信资质与费用）、图形验证码、内容安全 API（付费）、GitHub Webhook 同步与 Token 加密存储、租户隔离、管理员分角色与审计日志、数据导出、账号注销流程、`/privacy` 之外的另外三张法律页（用户协议 / 侵权投诉指引 / 社区规范）。

理由统一：它们的前提是"多用户 + 第三方投稿"，本站不存在该前提；在没有注册系统的产品上写《用户服务协议》与"投诉处理时效"，属于对外虚假陈述，比不写更糟。逐条对照与分期见差距分析文档第四节。

## 五、未验证与待办

1. 第 2、3 条判据的端到端点击：需我本人在浏览器登录后台（同一处阻塞还卡着 5b 的上传联调——本地 `.env` 的 `GITHUB_ID` 形态不合法，GitHub 侧 404，见 I010）。
2. 字体许可证未独立复核上游 LICENSE（两次联网均失败），`/licenses` 页已明写这一句，挂 I040。
3. 三项合规位的真实值：`SITE_ICP`（备案）、`SITE_POLICE_ICP`（公安备案）、`SITE_CONTACT_EMAIL`（对外邮箱）由我本人填；未填之前页脚相应行不显示。
4. 生产编排整体实跑与 `/api/health` 探针在服务器上的表现仍未验（本轮只做了 `config` 渲染核对）。
5. I021（浏览器打印成 PDF 的真实分页）仍未验；本轮材料页数从 96 涨到 107，这条为什么必须验的理由更硬了。
