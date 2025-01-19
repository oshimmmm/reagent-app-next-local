// app/ClientLayout.tsx (クライアントコンポーネント)
"use client";

import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Header from "./components/Header";

/**
 * サーバーコンポーネント（layout.tsx）から呼ばれるクライアントコンポーネント。
 * ここで AuthProvider をラップし、必要なら <Header> を表示する。
 */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClientLayoutInner>{children}</ClientLayoutInner>
    </AuthProvider>
  );
}

function ClientLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      {user && (
        <div className="fixed top-0 left-0 w-full z-50 h-16">
          <Header />
        </div>
      )}
      <main>{children}</main>
    </>
  );
}
