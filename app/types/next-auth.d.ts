// next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"

// ↓ JWTを使う場合は next-auth/jwt もimport
// import { JWT } from "next-auth/jwt"

// Module Augmentation
declare module "next-auth" {
  /** セッションから参照するユーザーデータ */
  interface Session {
    user?: {
      id: string
      username: string
      isAdmin: boolean
    } & DefaultSession["user"]
  }

  /** authorize() などで返すユーザーオブジェクト */
  interface User {
    id: string
    username: string
    isAdmin: boolean
  }
}
