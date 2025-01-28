// app/api/reagents-alphabet/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/app/libs/prisma"

export async function GET() {
  const reagents = await prisma.reagent.findMany();
  // productNumber がアルファベット始まりのみ
  const filtered = reagents.filter(r => /^[A-Za-z]/.test(r.productNumber));
  // name を r.name ?? r.productNumber とするなど
  const result = filtered.map(r => ({
    id: r.productNumber,
    name: r.name ?? r.productNumber
  }));
  return NextResponse.json(result);
}
