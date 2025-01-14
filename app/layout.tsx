// app/layout.tsx (サーバーコンポーネント)
import { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout"; // ← クライアントコンポーネント

export const metadata: Metadata = {
  title: "Reagent Management App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {/* 
          layout.tsx はサーバーコンポーネントなので 
          ここでは直接 useAuth() は使わず、
          クライアントコンポーネントに委譲する
        */}
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
