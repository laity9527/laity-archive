/**
 * 文件：src/lib/routes.ts
 * 描述：路由归属判定的纯函数：哪些路径属于前台公开区（决定站点导航与页脚是否渲染）
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建。原先这段判断写死在 SiteNav 里，页脚要复用就得复制一份，
 *               而站点相关模块 src/lib/site.ts 读 process.env，客户端组件不能引，故单独成模块
 * - 2026-11-03: 改成按路径段边界匹配并先剥掉查询串（tests/site.test.ts 抓出裸 startsWith
 *               会把 /administrative 误判成后台）
 * - 2026-11-13: 新增 publicProjectHref()——V2.0 把项目页迁到 /u/[handle]/projects/[slug] 后，
 *               首页看板仍自行拼 /projects/[slug]，实测 404；链接口径收成一个纯函数以便单测
 */

// 后台自带一套导航，登录页是孤立页，隐私与错误页不需要站点外壳
const NON_PUBLIC_PREFIXES = ["/admin", "/login"];

export function isPublicRoute(pathname: string): boolean {
  if (!pathname) {
    return false;
  }

  const path = pathname.split("?")[0];

  return !NON_PUBLIC_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

// 公开项目页的唯一拼法。首页看板、精选区与作品页都必须走这里，
// 不再各自拼字符串——V2.0 迁路由时漏改一处，线上直接 404
// （2026-11-13 实测 /projects/laity-archive → 404，真实路由见下）
export function publicProjectHref(handle: string, slug: string) {
  return `/u/${encodeURIComponent(handle)}/projects/${encodeURIComponent(slug)}`;
}
