// app/api/reagents/[productNumber]/route.ts
// 個々のreagentsデータを取得するAPI
import { NextResponse } from "next/server"
import { prisma } from "@/app/libs/prisma"

export async function GET(
  request: Request,
  { params }: { params: { productNumber: string } }
) {
  const productNumber = params.productNumber
  const reagent = await prisma.reagent.findUnique({
    where: { productNumber }
  })
  if (!reagent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({
    maxExpiry: reagent.maxExpiry,
    stock: reagent.stock,
    valueStock: reagent.valueStock,
    // 必要なフィールドのみ返す
  })
}
