"use client";

import React, { useEffect, useState } from "react";

// クライアントで利用する型
interface Reagent {
  productNumber: string;
  name: string;
  stock: number;
  maxExpiry: string;    // "YYYY-MM-DD" 形式に整形済み
  valueStock: number;
  orderStatus: string;  // "発注" と表示する場合のみセット
  orderDate?: string;   // "YYYY-MM-DD" 形式
  orderQuantity?: number;
  orderValue?: string;  // 物流コード（orderValue）
}

// API から取得する生データ用の型（DB の各フィールドを含む）
interface APIReagent {
  productNumber: string;
  name: string | null;
  stock: number | null;
  maxExpiry: string | null; // ISO8601 文字列（例："2025-03-15T00:00:00.000Z"）
  valueStock: number | null;
  orderDate: string | null;
  orderQuantity: number | null;
  orderTriggerStock: number | null;
  orderTriggerExpiry: boolean | null;
  noOrderOnZeroStock: boolean | null;
  orderTriggerValueStock: number | null;
  orderValue: string | null;
  hide: boolean; // 非表示フラグ（trueならフロントでは表示しない）
}

/**
 * 日付文字列（ISO8601 など）を "YYYY-MM-DD" に変換する関数
 */
function formatDateString(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

/**
 * 発注条件を判定する関数
 *
 * ※ 在庫数、最長使用期限、各種発注トリガーの値から、発注が必要かを判定します。
 */
function checkOrderStatus(
  stock: number,
  maxExpiryStr: string,
  orderTriggerStock: number,
  orderTriggerExpiry: boolean,
  noOrderOnZeroStock: boolean,
  valueStock: number,
  orderTriggerValueStock: number | null
): boolean {
  let needOrder = false;

  // 1) 在庫が0でも発注しない場合のロジック
  if (noOrderOnZeroStock) {
    if (
      orderTriggerValueStock !== null &&
      valueStock <= orderTriggerValueStock
    ) {
      needOrder = true;
    }
  } else {
    // 通常の在庫発注条件
    if (stock <= orderTriggerStock) {
      needOrder = true;
    }
  }

  // 2) 最長使用期限による発注条件
  if (orderTriggerExpiry && maxExpiryStr) {
    const expiryDate = new Date(maxExpiryStr);
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(now.getMonth() + 1);
    if (expiryDate < oneMonthLater) {
      needOrder = true;
    }
  }

  return needOrder;
}

export default function OrderPage() {
  const [reagents, setReagents] = useState<Reagent[]>([]);

  // 初回に /api/reagents から全試薬データを取得し、発注条件を満たすもののみ抽出
  useEffect(() => {
    const fetchReagents = async () => {
      try {
        const res = await fetch("/api/reagents");
        if (!res.ok) {
          throw new Error("試薬情報の取得に失敗しました");
        }
        // すべての試薬を取得
        const data: APIReagent[] = await res.json();

        // ← ここで非表示フラグが立っているものを除外
        const visible: APIReagent[] = data.filter((item) => !item.hide);

        // 発注対象のみをリスト化
        const list: Reagent[] = [];
        visible.forEach((item) => {
          const maxExpiryStr = item.maxExpiry ? formatDateString(item.maxExpiry) : "";
          const orderDateStr = item.orderDate ? formatDateString(item.orderDate) : "";
          const isOrder = checkOrderStatus(
            item.stock ?? 0,
            maxExpiryStr,
            item.orderTriggerStock ?? 0,
            item.orderTriggerExpiry ?? false,
            item.noOrderOnZeroStock ?? false,
            item.valueStock ?? 0,
            item.orderTriggerValueStock ?? null
          );
          if (isOrder) {
            list.push({
              productNumber: item.productNumber,
              name: item.name ?? "",
              stock: item.stock ?? 0,
              maxExpiry: maxExpiryStr,
              valueStock: item.valueStock ?? 0,
              orderStatus: "発注",
              orderDate: orderDateStr,
              orderQuantity: item.orderQuantity ?? 1,
              orderValue: item.orderValue ?? "",
            });
          }
        });

        setReagents(list);
      } catch (error) {
        console.error("試薬一覧取得エラー:", error);
      }
    };
    fetchReagents();
  }, []);

  /**
   * チェックボックスの変更時に、発注日の更新を行う。
   * checked が true なら現在日時（ISO 文字列）を orderDate にセット、
   * false なら null にする。
   */
  const handleCheck = async (r: Reagent, checked: boolean) => {
    const updatedOrderDate = checked ? new Date().toISOString() : null;
    try {
      const res = await fetch(`/api/reagents/${r.productNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderDate: updatedOrderDate }),
      });
      if (!res.ok) {
        throw new Error("発注日の更新に失敗しました");
      }
      // ローカル状態の更新（発注日を "YYYY-MM-DD" に整形）
      setReagents((prev) =>
        prev.map((item) =>
          item.productNumber === r.productNumber
            ? {
              ...item,
              orderDate: checked
                ? new Date().toISOString().split("T")[0]
                : "",
            }
            : item
        )
      );
    } catch (error) {
      console.error("発注日更新エラー:", error);
      alert("発注日更新中にエラーが発生しました。");
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">発注</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">試薬名</th>
              <th className="px-4 py-3 text-center">在庫数</th>
              <th className="px-4 py-3 text-center">最長使用期限</th>
              <th className="px-4 py-3 text-center">月末残量</th>
              <th className="px-4 py-3 text-center">発注の可否</th>
              <th className="px-4 py-3 text-center">発注数</th>
              <th className="px-4 py-3 text-center">物流コード</th>
              <th className="px-4 py-3 text-center">発注日</th>
              <th className="px-4 py-3 text-center">発注する</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reagents.map((r) => (
              <tr key={r.productNumber} className="hover:bg-gray-100">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 text-center">{r.stock}</td>
                <td className="px-4 py-3 text-center">{r.maxExpiry}</td>
                <td className="px-4 py-3 text-center">
                  {r.valueStock !== undefined && r.valueStock !== 0 ? r.valueStock : ""}
                </td>
                <td className="px-4 py-3 text-center">{r.orderStatus}</td>
                <td className="px-4 py-3 text-center">{r.orderQuantity}</td>
                <td className="px-4 py-3 text-center">{r.orderValue}</td>
                <td className="px-4 py-3 text-center">{r.orderDate || ""}</td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={Boolean(r.orderDate)}
                    onChange={(e) => handleCheck(r, e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-center text-sm text-gray-600">
        ※物流システムで入力したら、「発注する」の欄にチェックを入れてください。<br />
        入庫すると自動でこのリストから消え、ホーム画面の「発注」と「発注日」も自動で消えます。
      </p>
    </div>
  );
}
