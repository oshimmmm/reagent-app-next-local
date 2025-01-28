// app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/app/libs/prisma" // PrismaClientをexportしているファイル

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username and password are required")
        }

        // 1) DBからユーザー取得 (idは string のはず)
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        })
        if (!user) {
          throw new Error("User not found")
        }

        // 2) パスワード照合
        if (credentials.password !== user.password) {
          throw new Error("Invalid password")
        }

        // 3) 返り値は「NextAuthが想定するUserオブジェクト」(型は next-auth.d.ts で上書き)
        //    idはstring, username, isAdmin
        return {
          id: user.id,             // e.g. "ckxy29..."
          username: user.username, // e.g. "testuser"
          isAdmin: user.isAdmin,   // e.g. true/false
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",  // or "database"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // user が存在 = 初回ログイン成功時
        token.id = user.id
        token.username = user.username
        token.isAdmin = user.isAdmin
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        // session.user が既存のNextAuth型だと { name: string; email: string; image: string }
        // などになっているため、拡張したい場合は next-auth.d.ts で上書きする
        session.user = {
          id: token.id as string,
          username: token.username as string,
          isAdmin: Boolean(token.isAdmin),
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",  // ログインページへのパス
  },
  // debug: true,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
