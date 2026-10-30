/**
 * 文件：src/app/api/auth/[...nextauth]/route.ts
 * 描述：NextAuth 的 App Router 路由处理，把 GET/POST 交给同一份 authOptions
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
import NextAuth from "next-auth";
import { authOptions } from "@/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
