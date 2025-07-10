"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
// import { useRouter } from "next/navigation";

interface Reagent {
  productNumber: string;
  name: string;
  stock: number;
  valueStock?: number;
}

export default function ManagePage() {
  const { data: session } = useSession();
  // const router = useRouter();

  // // 管理者以外は /home へリダイレクト
  // useEffect(() => {
  //   if (status !== "loading") {
  //     if (!session || !session.user?.isAdmin) {
  //       router.push("/home");
  //     }
  //   }
  // }, [session, status, router]);

  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [selectedReagent, setSelectedReagent] = useState<Reagent | null>(null);
  const [newStock, setNewStock] = useState(0);
  const [newValueStock, setNewValueStock] = useState<number | undefined>(undefined);

  // 編集フォームの位置をスクロールさせるための ref
  const editFormRef = useRef<HTMLDivElement>(null);

  // APIから全試薬情報を取得（GET /api/reagents）
  useEffect(() => {
    const fetchReagents = async () => {
      try {
        const res = await fetch("/api/reagents");
        if (!res.ok) throw new Error("試薬情報の取得に失敗しました");
        const data = (await res.json()) as Reagent[];
        setReagents(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchReagents();
  }, [session]);

  // 管理者なら全件、一般ユーザーなら valueStock に値があるものだけ表示
  const displayedReagents = session?.user?.isAdmin
    ? reagents
    : reagents.filter((r) => r.valueStock !== undefined && r.valueStock !== null && r.valueStock !== 0);

  // 試薬選択時に編集フォームへスクロール
  const handleSelect = (r: Reagent) => {
    setSelectedReagent(r);
    setNewStock(r.stock);
    setNewValueStock(r.valueStock);

    setTimeout(() => {
      if (editFormRef.current) {
        const rect = editFormRef.current.getBoundingClientRect();
        const elementTop = rect.top + window.scrollY;
        const offset = 100; // ヘッダー等の高さ分オフセット
        const scrollTarget = elementTop - offset;
        window.scrollTo({ top: scrollTarget, behavior: "smooth" });
      }
    }, 0);
  };

  // 更新処理：PATCH 試薬情報 & POST 更新履歴
  const handleUpdate = async () => {
    if (!selectedReagent) return;
    try {
      const patchRes = await fetch(`/api/reagents/${selectedReagent.productNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: newStock,
          valueStock: newValueStock || null,
        }),
      });
      if (!patchRes.ok) {
        const errData = await patchRes.json();
        throw new Error(errData.error || "試薬情報の更新に失敗しました");
      }

      const historyRes = await fetch("/api/histories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productNumber: selectedReagent.productNumber,
          actionType: "update",
          date: new Date().toISOString(),
          user: session?.user?.username || "unknown",
          oldStock: selectedReagent.stock,
          newStock: newStock,
          oldValueStock: selectedReagent.valueStock ?? null,
          newValueStock: newValueStock ?? null,
          lotNumber: "",
        }),
      });
      if (!historyRes.ok) {
        const errData = await historyRes.json();
        throw new Error(errData.error || "更新履歴の登録に失敗しました");
      }

      alert("更新しました");
      setReagents((prev) =>
        prev.map((r) =>
          r.productNumber === selectedReagent.productNumber
            ? { ...r, stock: newStock, valueStock: newValueStock }
            : r
        )
      );
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("予期せぬエラーが発生しました");
      }
    }
  };

  // 削除処理：DELETE 試薬情報
  const handleDelete = async () => {
    if (!selectedReagent) return;
    try {
      const res = await fetch(`/api/reagents/${selectedReagent.productNumber}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "試薬の削除に失敗しました");
      }
      alert("削除しました");
      setReagents((prev) =>
        prev.filter((r) => r.productNumber !== selectedReagent.productNumber)
      );
      setSelectedReagent(null);
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("予期せぬエラーが発生しました");
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">月末残量修正</h1>
      <p className="text-red-3xl font-bold text-center mb-8">
        棚卸時の月末残量の修正のみ行う<br />
        ☆在庫数の修正はここで行わない☆<br />
        在庫数がおかしいと思ったら、入庫もしくは出庫処理で帳尻を合わせてください。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 試薬一覧 */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">試薬一覧</h2>
          {displayedReagents.length === 0 ? (
            <p className="text-gray-500">試薬がありません。</p>
          ) : (
            <ul className="space-y-2">
              {[...displayedReagents]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((r) => (
                  <li key={r.productNumber}>
                    <button
                      onClick={() => handleSelect(r)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors underline"
                    >
                      {r.name}{" "}
                      <span className="text-sm text-gray-600">(在庫: {r.stock})</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
        {/* 編集フォーム */}
        <div ref={editFormRef} className="bg-white shadow-md rounded-lg p-6">
          {selectedReagent ? (
            <>
              <h2 className="text-xl font-semibold mb-4">{selectedReagent.name} の編集</h2>
              {session?.user?.isAdmin && (
                <div className="mb-4">
                  <label className="block mb-1 font-medium">在庫数</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              )}
              <div className="mb-6">
                <label className="block mb-1 font-medium">月末残量</label>
                <input
                  type="number"
                  value={newValueStock !== undefined ? newValueStock : ""}
                  onChange={(e) => setNewValueStock(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleUpdate}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                >
                  更新
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                >
                  試薬情報削除
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">左の一覧から編集する試薬を選択してください。</p>
          )}
        </div>
      </div>
    </div>
  );
}
