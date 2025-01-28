"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // NextAuthのCredentials Providerを呼ぶ
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false, // サーバーリダイレクトを抑制
    });

    if (result?.error) {
      alert("ログイン失敗: " + result.error);
      return;
    }

    // ログイン成功
    router.push("/home");
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">ログイン</h1>
      <form onSubmit={onSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block mb-1">ユーザー名</label>
          <input
            type="text"
            className="border px-3 py-2 w-full"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1">パスワード</label>
          <input
            type="password"
            className="border px-3 py-2 w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          ログイン
        </button>
      </form>
    </div>
  );
}
