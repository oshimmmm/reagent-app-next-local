// app/api/reagents/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/app/libs/prisma"

/**
 * GET /api/reagents
 * - PostgreSQL の Reagentテーブルから全データを取得しJSONで返す
 */
export async function GET() {
  try {
    // Reagentテーブルのデータを取得
    const reagents = await prisma.reagent.findMany()
    // 必要があればここで日付変換やロジックを挟んでもOK

    return NextResponse.json(reagents, { status: 200 })
  } catch (error) {
    console.error("Error fetching reagents:", error)
    return NextResponse.json({ error: "Failed to fetch reagents" }, { status: 500 })
  }
}
