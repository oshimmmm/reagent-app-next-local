import { prisma } from '@/app/libs/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const reagents = await prisma.reagent.findMany()
  console.log('Reagents from DB:', reagents)

  return NextResponse.json(reagents) 
}
