// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

// GET: 全ユーザーを取得する（id, username, email, isAdmin）
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
      },
    });
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "ユーザー取得に失敗しました" }, { status: 500 });
  }
}

// POST: 新規ユーザー登録
export async function POST(request: NextRequest) {
  try {
    const { username, password, isAdmin, email } = await request.json();
    if (!username || !password || !email) {
      return NextResponse.json({ error: "必要な情報が不足しています。" }, { status: 400 });
    }
    // 重複チェック
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "このユーザー名は既に使用されています。" }, { status: 400 });
    }
    // ※ セキュリティ上、パスワードはハッシュ化すべき
    const newUser = await prisma.user.create({
      data: {
        username,
        password, // 実際は bcrypt 等でハッシュ化する
        isAdmin,
        email,
      },
    });
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "ユーザー登録に失敗しました" }, { status: 500 });
  }
}
