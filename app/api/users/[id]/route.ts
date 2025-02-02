// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

// PATCH: ユーザー情報の更新（ここでは isAdmin の更新のみ）
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
  ) {
    const { id } = await context.params;
    try {
      const { isAdmin } = await request.json();
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isAdmin },
      });
      return NextResponse.json(updatedUser, { status: 200 });
    } catch (error) {
      console.error("PATCH /api/users/[id] error:", error);
      return NextResponse.json({ error: "ユーザー更新に失敗しました" }, { status: 500 });
    }
  }

// DELETE: ユーザーの削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const deletedUser = await prisma.user.delete({
      where: { id },
    });
    return NextResponse.json(deletedUser, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json({ error: "ユーザー削除に失敗しました" }, { status: 500 });
  }
}
