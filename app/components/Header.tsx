// components/Header.tsx
"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { usePathname } from "next/navigation";

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname(); // 現在のパスを取得

  // ログインしていない場合はヘッダー非表示
  if (!user) return null;

  // 一般ユーザーが見るリンク
  const commonLinks = [
    { path: "/home", label: "ホーム" },
    { path: "/inbound", label: "入庫" },
    { path: "/outbound", label: "出庫" },
    { path: "/history", label: "履歴" },
    { path: "/order", label: "発注" },
    { path: "/register", label: "試薬登録" },
  ];

  // 管理者ユーザーのみ表示したいリンクを追加
  // 「ユーザー管理」へのリンクを追加
  const adminLinks = [
    ...commonLinks,
    { path: "/manage", label: "試薬情報編集" },
    { path: "/archive", label: "アーカイブ" },
    { path: "/user", label: "ユーザー管理" }, // ← 追加
  ];

  // 管理者なら adminLinks、それ以外なら commonLinks
  const linksToDisplay = user.isAdmin ? adminLinks : commonLinks;

  return (
    <header className="bg-gray-800 text-white px-6 py-4 shadow-md fixed top-0 left-0 w-full z-50">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        {/* ナビゲーション */}
        <nav className="flex space-x-6">
          {linksToDisplay.map((link) => (
            <Link
              href={link.path}
              key={link.path}
              className={`text-lg font-medium ${
                pathname === link.path
                  ? "text-blue-400 underline"
                  : "hover:text-blue-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ユーザー情報とログアウト */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">
            {user.username} さん
          </span>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
