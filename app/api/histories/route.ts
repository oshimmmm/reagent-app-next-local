// app/api/histories/route.ts
// manage/page.tsxで新規履歴登録用
import { NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

export async function POST(request: Request) {
  try {
    const {
      productNumber,
      actionType,
      date,
      user,
      oldStock,
      newStock,
      oldValueStock,
      newValueStock,
      lotNumber, // 必須項目（必要に応じて空文字列など）
    } = await request.json();

    const newHistory = await prisma.history.create({
      data: {
        productNumber,
        actionType,
        date: date ? new Date(date) : new Date(),
        user,
        oldStock,
        newStock,
        oldValueStock,
        newValueStock,
        lotNumber: lotNumber || "",
      },
    });
    return NextResponse.json(newHistory, { status: 201 });
  } catch (error) {
    console.error("POST /api/histories error:", error);
    return NextResponse.json({ error: "履歴の登録に失敗しました" }, { status: 500 });
  }
}
