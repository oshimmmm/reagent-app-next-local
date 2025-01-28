// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/app/libs/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { username, password, isAdmin } = await req.json()

  // すでに同名ユーザーがないかチェック
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: "ユーザー名が重複しています" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const newUser = await prisma.user.create({
    data: {
      username,
      password: hashed,
      isAdmin: Boolean(isAdmin),
    },
  })

  return NextResponse.json({ id: newUser.id, username: newUser.username, isAdmin: newUser.isAdmin })
}
