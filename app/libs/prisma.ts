// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// グローバル変数にキャッシュして二重生成を防ぐパターン
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
