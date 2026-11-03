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
